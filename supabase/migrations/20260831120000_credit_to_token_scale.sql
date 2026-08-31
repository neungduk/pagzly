-- 46차: 크레딧 → 토큰 단위 환산 (×100)
-- ⚠️ 이 마이그레이션을 프로덕션에 적용한 뒤에만 46차 코드를 배포하세요.

-- 1) 기존 잔액 ×100
update public.user_credits set balance = balance * 100;

-- 2) 원장 히스토리 ×100 (감사 일관성)
update public.credit_ledger set delta = delta * 100, balance_after = balance_after * 100;

-- 3) 가입 시 무료 지급 5 → 500 토큰
--    lib/cost/saas-pricing-config.ts SIGNUP_FREE_TOKENS 와 동기화
create or replace function public.handle_new_user_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.grant_credits(new.id, 500, 'signup_free', null);
  return new;
end;
$$;
