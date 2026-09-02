# 46차 후속 – 마이그레이션 파일 컬럼명 버그 수정

## 요약

`supabase/migrations/20260831120000_credit_to_token_scale.sql`에 제가(브리프 작성자) 낸 지시가 틀렸고, Cursor가 그걸 그대로 구현해서 파일에 버그가 있습니다. **프로덕션 DB는 제가 직접 Supabase SQL Editor에서 올바른 컬럼명으로 수동 실행해서 이미 정상적으로 마이그레이션 완료했습니다.** 하지만 저장소에 커밋된 마이그레이션 파일 자체는 여전히 틀린 상태라, 로컬/스테이징에서 처음부터 마이그레이션을 재실행하면 깨집니다. 이 파일을 고쳐주세요.

## 근본 원인

`credit_ledger` 테이블의 실제 컬럼명은 `amount`가 아니라 `delta`입니다 (원래 스키마: `supabase/migrations/20260831100000_billing_credits_schema.sql` 31~42번 줄). 또한 감사 스냅샷 컬럼인 `balance_after`도 함께 ×100 스케일링이 필요한데 원래 브리프에서 누락됐습니다.

## 수정 내용

파일: `supabase/migrations/20260831120000_credit_to_token_scale.sql`

기존 (버그):
```sql
-- 2) 원장 히스토리 ×100 (감사 일관성)
update public.credit_ledger set amount = amount * 100;
```

수정 (올바른 컬럼명 + balance_after 포함):
```sql
-- 2) 원장 히스토리 ×100 (감사 일관성)
update public.credit_ledger set delta = delta * 100, balance_after = balance_after * 100;
```

나머지 (1번 `user_credits.balance` 업데이트, 3번 `handle_new_user_credits()` 함수 교체)는 원래 파일 그대로 맞았습니다 — 손대지 마세요.

## 프로덕션에 실제 적용한 내용 (참고용, 이미 완료됨)

1. `update public.user_credits set balance = balance * 100;` — 1 row 적용
2. `update public.credit_ledger set delta = delta * 100, balance_after = balance_after * 100;` — 3 rows 적용
3. `handle_new_user_credits()` 함수 재정의 (500 토큰 지급) — 정상 적용, `position()`으로 함수 본문에 `grant_credits(new.id, 500,` 존재 확인함

적용 전/후 검증 (합계 기준):
- `user_credits.balance` 합계: 115.00 → 11500.00 (정확히 ×100)
- `credit_ledger.delta` 합계: 115.00 → 11500.00 (정확히 ×100), min 5.00→500.00, max 55.00→5500.00
- `credit_ledger.balance_after` 최댓값: 115.00 → 11500.00 (정확히 ×100)
- 정합성: `user_credits.balance` 합계(11500.00) == `credit_ledger.delta` 합계(11500.00) — 캐시와 원장 일치 확인

## 다음 단계

1. 위 파일 수정 부탁드립니다 (`amount` → `delta`, `balance_after` 스케일링 추가). 프로덕션엔 이미 반영됐으니 이 수정은 "파일을 실제 이력과 일치시키는" 정합성 작업이며, 프로덕션에 다시 실행할 필요는 없습니다 (재실행 시 이미 ×100된 값이 또 ×100 되어 잘못됨 — 만약 로컬/스테이징 DB에서 처음부터 마이그레이션을 돌리는 용도로만 씁니다).
2. 이 파일 수정 후 tsc / lint 재확인.
3. 프로덕션 마이그레이션은 이미 완료됐으니, **46차 코드는 이제 배포 가능**합니다 (마이그레이션 선행 규칙 충족).
