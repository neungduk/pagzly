# 38차 Cursor 브리프 — 결제·구독·크레딧 DB 스키마 + RPC + 가입 트리거

생성: 2026-08-31
근거: `claude/pagzly-billing-architecture-2026.md` (전체 아키텍처), `claude/pagzly-pricing-cost-model-2026.md` (숫자 근거), `claude/cursor_brief_37cha_saas_pricing_config_ssot.md` (37차, 완료됨)
범위: **DB 스키마 + RPC 함수 + 가입 트리거만.** 토스페이먼츠 SDK·API 라우트·`/api/generate` 연동은 전부 다음 라운드(39차부터).
전제: 사업자등록 전이라도 이 마이그레이션은 지금 바로 적용·테스트 가능 (외부 의존성 없음).

---

## 1. 배경

`profiles` 테이블은 존재하지 않는다는 걸 확인했습니다 — 기존 코드는 전부 `auth.users(id)`를 직접 참조하는 패턴(`public.user_onboarding`, `public.products`)을 씁니다. 이번 마이그레이션도 동일한 패턴을 따릅니다.

크레딧 지급/차감은 반드시 원자적(atomic)이어야 합니다 — 동시 요청으로 잔액이 음수가 되거나 이중 차감되는 걸 막기 위해, Postgres RPC 함수(`security definer`)로만 처리하고 **`authenticated` 롤에는 EXECUTE 권한을 주지 않습니다**. Next.js API 라우트가 service-role 클라이언트로만 호출합니다 (다음 라운드에서 연동).

---

## 2. 신규 마이그레이션 파일

파일명: `supabase/migrations/20260831100000_billing_credits_schema.sql` (기존 마이그레이션 중 가장 최신인 `20260827150000_image_generation_attempts.sql`보다 뒤 타임스탬프로 생성 — 실제 적용 시점 기준으로 타임스탬프 조정 가능)

```sql
-- 결제·구독·크레딧 시스템 기반 스키마 (38차, 2026-08-31)
-- 근거: claude/pagzly-billing-architecture-2026.md
-- 이 마이그레이션은 스키마 + RPC 함수 + 가입 트리거만 만든다.
-- 토스페이먼츠 연동(SDK, API 라우트)은 39차 이후 별도 브리프.

-- =====================================================================
-- 1) 크레딧 잔액 캐시
-- =====================================================================
create table public.user_credits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance numeric(10, 2) not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.user_credits is
  '크레딧 잔액 캐시. 진짜 원장은 credit_ledger — 불일치 시 credit_ledger 합산이 항상 맞다.';

alter table public.user_credits enable row level security;

create policy "Users can view own credit balance"
  on public.user_credits
  for select
  to authenticated
  using (auth.uid() = user_id);

-- insert/update 정책 없음: grant_credits/deduct_credits RPC(security definer)로만 변경.

-- =====================================================================
-- 2) 크레딧 원장 (감사 로그)
-- =====================================================================
create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  delta numeric(10, 2) not null,
  reason text not null check (reason in (
    'signup_free', 'subscription_grant', 'pack_purchase',
    'completion', 'retry_overage', 'admin_adjustment'
  )),
  reference_id text,
  balance_after numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

comment on table public.credit_ledger is
  '크레딧 지급/차감 전체 이력. user_credits.balance가 안 맞으면 이 테이블의 delta 합산이 정답.';

create index credit_ledger_user_id_idx on public.credit_ledger (user_id);
create index credit_ledger_created_at_idx on public.credit_ledger (created_at desc);

alter table public.credit_ledger enable row level security;

create policy "Users can view own credit ledger"
  on public.credit_ledger
  for select
  to authenticated
  using (auth.uid() = user_id);

-- insert 정책 없음: grant_credits/deduct_credits RPC로만 기록.

-- =====================================================================
-- 3) 구독
-- =====================================================================
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tier_id text not null check (tier_id in ('starter', 'growth', 'pro')),
  status text not null default 'pending' check (status in ('pending', 'active', 'past_due', 'canceled')),
  toss_customer_key text not null unique,
  toss_billing_key text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  next_billing_at timestamptz,
  failed_charge_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.subscriptions is
  '구독 상태 + 토스페이먼츠 빌링키. toss_billing_key는 민감 정보라 서버(service role)에서만 다룬다.';

alter table public.subscriptions enable row level security;

create policy "Users can view own subscription"
  on public.subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- insert/update 정책 없음: /api/billing/* 라우트가 service-role 클라이언트로만 기록.

-- =====================================================================
-- 4) 결제 시도 기록 (멱등성·감사)
-- =====================================================================
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  toss_payment_key text unique,
  order_id text not null unique,
  amount numeric(12, 2) not null,
  status text not null default 'ready' check (status in ('ready', 'done', 'failed', 'canceled')),
  purchase_type text not null check (purchase_type in ('pack_purchase', 'subscription_initial', 'subscription_renewal')),
  item_id text not null,
  credits_granted numeric(10, 2),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index payments_user_id_idx on public.payments (user_id);

alter table public.payments enable row level security;

create policy "Users can view own payments"
  on public.payments
  for select
  to authenticated
  using (auth.uid() = user_id);

-- insert/update 정책 없음: /api/billing/* 라우트가 service-role 클라이언트로만 기록.

-- =====================================================================
-- 5) draft별 재시도 카운터 (재시도 소프트 캡 전용, 36차 섹션 압축과 무관)
-- =====================================================================
create table public.draft_usage_counters (
  draft_token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  draft_regen_count int not null default 0,
  photo_reenhance_count int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.draft_usage_counters enable row level security;

create policy "Users can view own draft usage"
  on public.draft_usage_counters
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own draft usage"
  on public.draft_usage_counters
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own draft usage"
  on public.draft_usage_counters
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =====================================================================
-- 6) 크레딧 지급/차감 RPC (security definer, authenticated에는 EXECUTE 미부여)
-- =====================================================================
create or replace function public.grant_credits(
  p_user_id uuid,
  p_amount numeric,
  p_reason text,
  p_reference_id text default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance numeric;
begin
  if p_amount <= 0 then
    raise exception 'grant_credits: amount must be positive';
  end if;

  insert into public.user_credits (user_id, balance)
    values (p_user_id, p_amount)
    on conflict (user_id) do update
      set balance = public.user_credits.balance + excluded.balance,
          updated_at = now()
    returning balance into v_new_balance;

  insert into public.credit_ledger (user_id, delta, reason, reference_id, balance_after)
    values (p_user_id, p_amount, p_reason, p_reference_id, v_new_balance);

  return v_new_balance;
end;
$$;

create or replace function public.deduct_credits(
  p_user_id uuid,
  p_amount numeric,
  p_reason text,
  p_reference_id text default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_balance numeric;
  v_new_balance numeric;
begin
  if p_amount <= 0 then
    raise exception 'deduct_credits: amount must be positive';
  end if;

  select balance into v_current_balance
    from public.user_credits
    where user_id = p_user_id
    for update;

  if v_current_balance is null then
    raise exception 'deduct_credits: user % has no credit row', p_user_id;
  end if;

  if v_current_balance < p_amount then
    raise exception 'insufficient_credits';
  end if;

  v_new_balance := v_current_balance - p_amount;

  update public.user_credits
    set balance = v_new_balance, updated_at = now()
    where user_id = p_user_id;

  insert into public.credit_ledger (user_id, delta, reason, reference_id, balance_after)
    values (p_user_id, -p_amount, p_reason, p_reference_id, v_new_balance);

  return v_new_balance;
end;
$$;

-- authenticated 롤에는 절대 EXECUTE 권한을 주지 않는다.
-- 반드시 Next.js API 라우트 안에서 Supabase service-role 클라이언트로만 호출.
revoke all on function public.grant_credits(uuid, numeric, text, text) from public, authenticated, anon;
revoke all on function public.deduct_credits(uuid, numeric, text, text) from public, authenticated, anon;
grant execute on function public.grant_credits(uuid, numeric, text, text) to service_role;
grant execute on function public.deduct_credits(uuid, numeric, text, text) to service_role;

-- =====================================================================
-- 7) 가입 시 무료 크레딧 자동 지급 트리거
--    ⚠️ 여기 하드코딩된 5는 lib/cost/saas-pricing-config.ts의
--    SIGNUP_FREE_CREDITS와 별도 관리됨. 무료 크레딧 수를 바꾸면
--    TS 상수 + 이 함수를 갱신하는 새 마이그레이션 둘 다 필요.
-- =====================================================================
create or replace function public.handle_new_user_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.grant_credits(new.id, 5, 'signup_free', null);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_grant_credits on auth.users;

create trigger on_auth_user_created_grant_credits
  after insert on auth.users
  for each row execute function public.handle_new_user_credits();
```

---

## 3. 하드 룰

1. **이 마이그레이션 파일 하나만 신규 생성.** 기존 마이그레이션 파일을 수정하지 않는다.
2. **`app/`, `lib/`, `components/` 아래 어떤 파일도 수정하지 않는다.** 이번 라운드는 순수 DB 스키마만 — 37차의 `lib/cost/saas-pricing-config.ts`를 이 마이그레이션이 참조하지 않아도 된다(SQL과 TS는 별개 소스이며, §2의 주석대로 수동 동기화 대상임을 인지만 하면 됨).
3. **`grant_credits`/`deduct_credits`에 `authenticated`·`anon` EXECUTE 권한을 절대 주지 않는다.** 이 규칙이 깨지면 사용자가 자기 크레딧을 직접 조작할 수 있게 된다 — 가장 중요한 보안 규칙.
4. **`user_credits`/`credit_ledger`/`subscriptions`/`payments`에 `authenticated`용 insert/update RLS 정책을 추가하지 않는다.** select만 허용 — 쓰기는 전부 RPC 또는 서버의 service-role 클라이언트를 통해서만.
5. `draft_usage_counters`만 예외적으로 `authenticated`가 자기 행을 insert/update 가능 (돈이 걸린 테이블이 아니라 카운터일 뿐이므로 — 실제 크레딧 차감은 이 카운터를 서버가 읽어 `deduct_credits`를 호출하는 방식으로 다음 라운드에서 연동).
6. 토스페이먼츠 SDK 설치·API 라우트·Stripe 등 결제 코드 일체 추가 금지 (39차부터).

---

## 4. 검증 체크리스트

- [ ] 로컬(또는 스테이징) Supabase에 마이그레이션 적용 — `supabase db push` 또는 `supabase migration up` 등 프로젝트에서 쓰는 방식대로. 에러 없이 적용되는지 확인.
- [ ] **`auth.users`에 트리거 생성 권한 문제가 있는지 확인** — 만약 원격 프로젝트(호스팅된 Supabase)에서 `auth` 스키마 트리거 생성이 권한 오류로 막히면, 그 사실을 완료 보고에 반드시 남겨주세요. (막힐 경우 대안: 로그인 콜백 라우트에서 신규 유저 최초 로그인 시 `grant_credits` RPC를 직접 호출하는 방식으로 38-B 후속 브리프 필요 — 지금은 시도만 해보고 결과를 보고)
- [ ] 테스트 계정으로 신규 가입 1회 → `select * from user_credits where user_id = '...'`로 balance가 5인지 확인, `select * from credit_ledger where user_id = '...'`에 `signup_free` 행 1개 있는지 확인
- [ ] SQL 콘솔에서 `select grant_credits('테스트유저id', 10, 'admin_adjustment', null);` 직접 호출 → 잔액이 정확히 늘어나는지 확인
- [ ] SQL 콘솔에서 `select deduct_credits('테스트유저id', 3, 'completion', 'test-product-id');` 호출 → 잔액이 정확히 줄어드는지, 원장에 음수 delta로 기록되는지 확인
- [ ] 잔액보다 큰 금액으로 `deduct_credits` 호출 시 `insufficient_credits` 예외가 나는지 확인 (음수 잔액 방지 확인)
- [ ] `authenticated` 롤로 `grant_credits`/`deduct_credits`를 직접 호출 시도 → 권한 거부(permission denied)로 실패하는지 확인 (이게 성공하면 §3-3 하드 룰이 깨진 것이므로 반드시 확인 필요)
- [ ] `npx tsc --noEmit` — 이번 변경은 SQL뿐이라 타입 영향 없어야 하지만 형식상 확인

---

## 5. 완료 보고 형식

마이그레이션 적용 결과, 트리거 권한 이슈 여부, 위 검증 체크리스트 각 항목의 실제 결과(특히 `authenticated` 권한 거부 확인과 `insufficient_credits` 예외 확인 — 이 두 개가 이번 라운드의 핵심 안전장치입니다)를 포함해서 보고해 주세요.
