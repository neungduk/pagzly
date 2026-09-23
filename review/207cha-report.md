# 207차 — ingredient_circle_pair texture_feel 폴백 (API 0)

생성: 2026-09-16

## 요약

`applyIngredientCircleVisual`의 circle-pair가 `texture_feel` 필수였던 조건을 제거하고, circle-solo와 동일하게 기존 `pickAlternateIndex`만 재사용. 148차부터 남아 있던 “성분 2개+인데 원형 비주얼 스킵” 후커블 격차 해소. 렌더러/템플릿 미수정. API 0.

## 검증

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` | 0 |
| texture_feel 있음 | applied true, imageIndex=texture (회귀 없음) |
| texture_feel 없음 | applied true, alternate 이미지로 pair 2컷 |
| 이미지 1장 | applied false |
| 이미 circle 있음 | applied false |
| DetailSectionRenderer / export-detail-html | 미수정 |
| 신규 함수 | 없음 (`pickAlternateIndex` 재사용만) |
