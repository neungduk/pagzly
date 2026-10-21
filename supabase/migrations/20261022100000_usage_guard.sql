-- 426차 R1 — 비용 남용 방어: 사용자 일일 사용량·전역 일일 비용·동시 생성 락. (적용 금지 — 파일로만 작성, 사람이 검토 후 적용)
-- 앱 코드(lib/usage-guard.ts)는 이 테이블·함수가 없어도 죽지 않는다: 조회/증가 오류 시 USAGE_GUARD_FAIL_MODE(open|closed, 기본 open)에 따라 통과/차단하고
-- 서버 로그에 [usage-guard-unavailable]를 남긴다. 적용 후 운영에서는 USAGE_GUARD_FAIL_MODE=closed를 권장한다.
--
-- 적용 순서(보고서 표 참고): 이 파일 → (선택) 20261022110000_storage_images_policies.sql → (선택) 20261022120000_credit_ledger_completion_unique.sql
-- 롤백(맨 아래 주석)은 역순으로.

-- 1) 사용자별 일일 사용량 (KST 기준 날짜)
create table if not exists public.user_daily_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default ((now() at time zone 'Asia/Seoul')::date),
  draft_calls int not null default 0,
  photo_calls int not null default 0,
  text_calls int not null default 0,
  est_cost_usd numeric(10, 4) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
comment on table public.user_daily_usage is
  '일일 유료 호출 횟수·추정 비용(USD). 증가는 usage_reserve RPC(service_role)로만. 클라이언트 insert/update 정책 없음.';

alter table public.user_daily_usage enable row level security;
-- 429차: 두 번 실행해도 에러가 나지 않게 정책을 먼저 지운다
drop policy if exists "Users can view own daily usage" on public.user_daily_usage;
create policy "Users can view own daily usage"
  on public.user_daily_usage for select to authenticated using (auth.uid() = user_id);
-- insert/update/delete 정책 없음: service_role 함수로만 변경

-- 2) 전역 일일 비용(서비스 전체 상한)
create table if not exists public.global_daily_usage (
  day date primary key default ((now() at time zone 'Asia/Seoul')::date),
  est_cost_usd numeric(12, 4) not null default 0,
  calls int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.global_daily_usage enable row level security;
-- 정책 없음: 클라이언트 접근 불가(service_role만)

-- 3) 동시 생성 락(서버리스에서도 동작하도록 DB 행 기반, 최대 10분 만료)
create table if not exists public.generation_locks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  acquired_at timestamptz not null default now()
);
alter table public.generation_locks enable row level security;
-- 정책 없음: service_role만

-- 4) 예약 증가(원자적): 한도 안이면 호출 수·비용을 늘리고 허용, 넘으면 거절 사유를 돌려준다
create or replace function public.usage_reserve(
  p_user uuid,
  p_kind text,
  p_est numeric,
  p_max_calls int,
  p_max_user_cost numeric,
  p_max_global_cost numeric
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := ((now() at time zone 'Asia/Seoul')::date);
  u public.user_daily_usage;
  g public.global_daily_usage;
  v_calls int;
begin
  if p_kind not in ('draft', 'photo', 'text') then
    raise exception 'usage_reserve: invalid kind %', p_kind;
  end if;
  if p_est is null or p_est < 0 then
    p_est := 0;
  end if;

  insert into public.global_daily_usage (day) values (v_day) on conflict (day) do nothing;
  insert into public.user_daily_usage (user_id, day) values (p_user, v_day) on conflict (user_id, day) do nothing;

  select * into g from public.global_daily_usage where day = v_day for update;
  select * into u from public.user_daily_usage where user_id = p_user and day = v_day for update;

  v_calls := case p_kind when 'draft' then u.draft_calls when 'photo' then u.photo_calls else u.text_calls end;

  if v_calls + 1 > p_max_calls then
    return jsonb_build_object('allowed', false, 'reason', 'user_calls_limit', 'calls', v_calls);
  end if;
  if u.est_cost_usd + p_est > p_max_user_cost then
    return jsonb_build_object('allowed', false, 'reason', 'user_cost_limit', 'cost', u.est_cost_usd);
  end if;
  if g.est_cost_usd + p_est > p_max_global_cost then
    return jsonb_build_object('allowed', false, 'reason', 'global_cost_limit', 'cost', g.est_cost_usd);
  end if;

  update public.user_daily_usage
    set draft_calls = draft_calls + (case when p_kind = 'draft' then 1 else 0 end),
        photo_calls = photo_calls + (case when p_kind = 'photo' then 1 else 0 end),
        text_calls = text_calls + (case when p_kind = 'text' then 1 else 0 end),
        est_cost_usd = est_cost_usd + p_est,
        updated_at = now()
    where user_id = p_user and day = v_day;
  update public.global_daily_usage
    set est_cost_usd = est_cost_usd + p_est, calls = calls + 1, updated_at = now()
    where day = v_day;

  return jsonb_build_object('allowed', true, 'reason', 'ok', 'calls', v_calls + 1, 'cost', u.est_cost_usd + p_est);
end;
$$;

-- 5) 예약 되돌리기(호출이 시작되기 전에 실패한 경우 등): 하한 0
create or replace function public.usage_release(p_user uuid, p_kind text, p_est numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := ((now() at time zone 'Asia/Seoul')::date);
begin
  update public.user_daily_usage
    set draft_calls = greatest(0, draft_calls - (case when p_kind = 'draft' then 1 else 0 end)),
        photo_calls = greatest(0, photo_calls - (case when p_kind = 'photo' then 1 else 0 end)),
        text_calls = greatest(0, text_calls - (case when p_kind = 'text' then 1 else 0 end)),
        est_cost_usd = greatest(0, est_cost_usd - coalesce(p_est, 0)),
        updated_at = now()
    where user_id = p_user and day = v_day;
  update public.global_daily_usage
    set est_cost_usd = greatest(0, est_cost_usd - coalesce(p_est, 0)),
        calls = greatest(0, calls - 1),
        updated_at = now()
    where day = v_day;
end;
$$;

-- 6) 동시 생성 락 획득/해제 (만료된 락은 덮어쓴다)
create or replace function public.generation_lock_acquire(p_user uuid, p_ttl_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  insert into public.generation_locks (user_id, expires_at, acquired_at)
    values (p_user, now() + make_interval(secs => greatest(p_ttl_seconds, 1)), now())
    on conflict (user_id) do update
      set expires_at = excluded.expires_at, acquired_at = now()
      where public.generation_locks.expires_at < now()
    returning true into v_ok;
  return coalesce(v_ok, false);
end;
$$;

create or replace function public.generation_lock_release(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.generation_locks where user_id = p_user;
end;
$$;

-- 7) 함수 권한: authenticated·anon에는 절대 EXECUTE를 주지 않는다(Next.js 라우트의 service-role 클라이언트에서만 호출)
revoke all on function public.usage_reserve(uuid, text, numeric, int, numeric, numeric) from public, authenticated, anon;
revoke all on function public.usage_release(uuid, text, numeric) from public, authenticated, anon;
revoke all on function public.generation_lock_acquire(uuid, int) from public, authenticated, anon;
revoke all on function public.generation_lock_release(uuid) from public, authenticated, anon;
grant execute on function public.usage_reserve(uuid, text, numeric, int, numeric, numeric) to service_role;
grant execute on function public.usage_release(uuid, text, numeric) to service_role;
grant execute on function public.generation_lock_acquire(uuid, int) to service_role;
grant execute on function public.generation_lock_release(uuid) to service_role;

-- ────────────────────────── 롤백(적용했다면 역순으로) ──────────────────────────
-- drop function if exists public.generation_lock_release(uuid);
-- drop function if exists public.generation_lock_acquire(uuid, int);
-- drop function if exists public.usage_release(uuid, text, numeric);
-- drop function if exists public.usage_reserve(uuid, text, numeric, int, numeric, numeric);
-- drop table if exists public.generation_locks;
-- drop table if exists public.global_daily_usage;
-- drop table if exists public.user_daily_usage;
-- (정책은 테이블과 함께 삭제됨)
