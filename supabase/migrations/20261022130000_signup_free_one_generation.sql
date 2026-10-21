-- 427차 — 가입 무료 혜택을 "첫 1회 생성"으로 축소 (★ 적용 금지: 사람이 검토 후 적용 ★)
--
-- 가입 시 지급 토큰 500 → 100 (완성 1건 최대 차감량 = 긴 구성 100토큰).
-- lib/cost/saas-pricing-config.ts 의 SIGNUP_FREE_TOKENS 와 같은 값이어야 한다.
-- 기존 가입자의 잔액·원장은 변경하지 않는다(이 함수는 신규 가입 트리거에서만 호출됨).
-- 구독·팩 지급 경로(grant_credits 호출부)는 건드리지 않는다.
--
-- 롤백(500 지급으로 복원):
--   create or replace function public.handle_new_user_credits()
--   returns trigger language plpgsql security definer set search_path = public as $$
--   begin
--     perform public.grant_credits(new.id, 500, 'signup_free', null);
--     return new;
--   end;
--   $$;

create or replace function public.handle_new_user_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.grant_credits(new.id, 100, 'signup_free', null);
  return new;
end;
$$;
