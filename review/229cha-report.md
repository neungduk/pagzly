# 229차 — 식품 원재료 비율 도넛, spec_table 중복 렌더 제거

생성: 2026-09-22 · 유료 API 0건 · 삭제 1블록

## 한줄 결론

`spec_table` case에 슬롯 없이 붙어 있던 `FoodRatioDiagram`을 제거해, 원재료 비율 도넛이 `sourcing_story`에만 1회 표시되도록 맞춤(라이브=export).

---

## 1. 변경

| 파일 | 내용 |
|------|------|
| `components/DetailSectionRenderer.tsx` | `case "spec_table"`의 `isFoodCategory` → `FoodRatioDiagram` 블록 **삭제만** |

미변경: `lib/food-ratio-diagram.ts`, `lib/export-detail-html.ts`(export는 `slot === "spec_table"` 가드로 사실상 미발동), sourcing_story 분기 2곳, import 유지.

---

## 2. 검증

`npx tsx scripts/229cha-food-ratio-dedupe-verify.ts`  
픽스처: `181cha-live/food` + ingredients=`귀리 40%, 견과 25%, 기타 35%`

| | 라이브 도넛 | export 도넛 |
|--|------------|-------------|
| 수정 전 | **3** (sourcing + nutrition + shipping) | **1** |
| 수정 후 | **1** (sourcing_story만) | **1** (변화 없음) |

- 스크린샷: `review/229cha-food-ratio-dedupe/before-donut-section-{0,1,2}.png` · `after-donut-section-0.png`
- 전자제품 export에 식품 도넛 0
- esbuild `DetailSectionRenderer.tsx` OK
- export `spec_table`의 `foodSlices`는 `slot === "spec_table"`이라 nutrition/shipping에는 죽은 코드(정리 스코프 밖, 확인만)

---

## 3. 완료 기준

- [x] 1파일 · 해당 블록만 삭제
- [x] 라이브·export 모두 sourcing_story 1회
- [x] API 0 · 비식품 회귀 없음
