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
