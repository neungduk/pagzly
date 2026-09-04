-- 연간 결제 지원 (94차, 2026-09-03)
alter table public.subscriptions
  add column if not exists billing_cycle text not null default 'monthly'
    check (billing_cycle in ('monthly', 'annual'));

comment on column public.subscriptions.billing_cycle is
  '94차 연간 결제. annual은 12개월치 토큰을 가입/갱신 시 선지급하고 next_billing_at을 +1년으로 잡는다.';
