# 212차 — productSizeHint → spec_table 배선 (API 0)

생성: 2026-09-17

## 요약

판매자 폼의 `productSizeHint`가 라이프스타일 스케일에만 쓰이고 `enrichSectionsWithProductMetadata`에는 안 넘어가던 배선 누락을 수정. 전자/가전 스켈레톤에 「크기·용량·형태」 행 추가 + 용량/사이즈/규격 계열 라벨에 힌트 폴백. API 0.

## 핵심 diff

1. `SPEC_SKELETONS["전자/가전"]` — 모델명 다음 `크기·용량·형태` 행
2. `resolveSkeletonValue` — `SIZE_HINT_LABELS` + `productSizeHint` 폴백 (existing 우선)
3~5. `mergeSpecRows` / `enrichSpecTableSection` / `enrichSectionsWithProductMetadata` meta 타입에 필드
6. `route.ts` meta 리터럴에 `productSizeHint: body.productSizeHint`

## 검증

| # | 항목 | 결과 |
|---|------|------|
| 1 | 전자 + hint → 크기·용량·형태 = hint | pass |
| 2 | 뷰티 + hint → 용량 = hint | pass |
| 3 | hint null → 플레이스홀더 | pass |
| 4 | 기존 용량 있음 → 덮어쓰지 않음 | pass |
| 5 | KC 미입력 → 행 생략 | pass |
| 6 | `npx tsc --noEmit` | 0 |
