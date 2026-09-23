# 232차 — FOOD 무게 게이트 복구 + spec_table 행 필터 동기화

생성: 2026-09-22 · 유료 API **0** · 파일 2개만

## 한줄 결론

FOOD `nutrition_table`에서 무게 비교 다이어그램이 다시 도달 가능하고, export도 라이브와 같이 빈 라벨 행을 걸러 유령 무게 매칭을 막는다.

---

## 1. 변경

| 파일 | 내용 |
|------|------|
| `components/DetailSectionRenderer.tsx` | `weightMatch` 게이트에 `isFoodCategory && slot===nutrition_table` 추가 |
| `lib/export-detail-html.ts` | 동일 게이트 + `visibleRows` 필터(매처 6종·테이블 바디) |

미변경: `lib/weight-comparison-diagram.ts`, `lib/section-display-budget.ts`, Finding 3(죽은 foodSlices) 정리 보류.

---

## 2. 검증

`npx tsx scripts/232cha-food-weight-rows-verify.ts` → **ALL PASS**

| 검사 | 결과 |
|------|------|
| esbuild 2파일 | OK |
| FOOD `nutrition_table` + `중량 450g` | `{g:450}` |
| `spec_table` 레거시 경로 | 유지 |
| 빈 라벨 + `250g` 값 | 필터 전 유령 매치 / 필터 후 `null` |
| FOOD export | `무게 비교` 다이어그램 1 |
| 전자·펫·생활 회귀 | 각 1 |
| 샷 | `review/232cha-food-weight-rows/food-weight-diagram.png` |

API generate: 0
