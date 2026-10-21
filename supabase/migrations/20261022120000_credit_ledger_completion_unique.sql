-- 426차 W7 — 완성 차감 멱등성 최종 방어선 (★ 적용 금지: 사람이 중복 행 점검 후 적용 ★)
--
-- 같은 상품(reference_id)에 대해 reason='completion' 원장 행이 둘 이상 생기지 않게 한다.
-- 앱 코드는 이미 차감 전에 같은 reference_id의 completion 행을 조회해 있으면 재차감하지 않는다(lib/cost/completion-charge.ts).
-- 이 인덱스는 동시 요청이 조회를 동시에 통과하는 경합까지 막는다. 인덱스가 있으면 두 번째 deduct_credits는 unique 위반으로 실패하고,
-- deduct_credits가 하나의 트랜잭션이면 잔액도 함께 롤백된다 → 앱은 [charge-failed] 로그만 남기고 사용자 응답은 정상 유지.
--
-- 적용 전 점검(중복이 있으면 인덱스 생성이 실패한다):
--   select reference_id, count(*) from public.credit_ledger
--   where reason = 'completion' and reference_id is not null
--   group by reference_id having count(*) > 1;
--   (결과가 있으면 어느 행이 정당한지 사람이 판단. 이 SQL은 데이터를 지우지 않는다.)
-- 또한 deduct_credits RPC가 원장 insert와 잔액 차감을 같은 트랜잭션에서 하는지 확인한다.
--
-- 롤백:
--   drop index if exists public.credit_ledger_completion_ref_uniq;

create unique index if not exists credit_ledger_completion_ref_uniq
  on public.credit_ledger (reference_id)
  where reason = 'completion' and reference_id is not null;
