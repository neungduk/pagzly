# 503 notes

## mutation-492 가드
- 파일은 chromium(`page.pdf`)을 **메인 실행 시** 사용 → `assertHeavyEntry` 필요.
- 회귀가 `htmlFromFieldsForTest` / `buildMutationCases`만 import할 때는 isMain=false라 가드가 막지 않음.

## 픽스처
- 생성: `npx tsx scripts/label-check-make-fixtures-492.ts` → `review/data/samples/regression-503/`
- 총 ~323KB (5MB 이하).
