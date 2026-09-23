# 231차 — 흐름·인포그래픽 강화 + 컷아웃 선명도 양방향

생성: 2026-09-22 · 유료 API **0** · 코드 전용

## 한줄 결론

(A) 펫 `material_feature` 에디토리얼 블리드에 성분 링 배선 + 표시예산 예외  
(B) export에 `shouldInsertBreather` 패리티  
(C) `matchCutoutSharpness` 상한(선명화) 분기 추가

---

## 트랙 A — 펫 성분 링

| 파일 | 내용 |
|------|------|
| `components/DetailSectionRenderer.tsx` | editorial bleed 본문 뒤 `material_feature`+`isIngredientRingCategory` → `IngredientRingDiagram` |
| `lib/export-detail-html.ts` | 동일 조건으로 `ringHtml` |
| `lib/section-display-budget.ts` | **231 보강** — 반려동물 `material_feature`는 EXTRA_IMAGE demote 제외(190 `MAX_EXTRA_IMAGE_LOW=0`이면 섹션이 통째로 사라져 링이 다시 죽음) |

검증:
- `prepareIngredientRingLabels("닭가슴살, 연어, 고구마, 현미, 오메가3")` → 5라벨; 2개/9개 → null
- 라이브 펫 링 1 · export 펫 링 1 · 생활용품 링 0
- 샷: `review/231cha-flow-infographic/pet-live-ring-after.png`

---

## 트랙 B — export 브리더

| 파일 | 내용 |
|------|------|
| `lib/export-detail-html.ts` | `shouldInsertBreather` import + `lastRenderedSection` 추적 후 그라디언트선+점 HTML |

| 카테고리 | 기대 | export |
|----------|------|--------|
| pet | 7 | 7 |
| food | 10 | 10 |
| fashion | 10 | 10 |

샷: `food-export-breather.png` · `fashion-export-breather.png`  
라이브 `DetailSectionRenderer` 브리더 로직 **무변경**(A용 다이어그램만 추가).

---

## 트랙 C — 선명도 양방향

| 파일 | 내용 |
|------|------|
| `lib/photo-composite.ts` | `ratio > 1.8`이면 보수적 `.sharpen({sigma:0.6~1.3})`; 기존 블러 분기 유지 |

유닛:
- soft cutout vs sharp bg: edge **19.277 → 19.622** (선명화)
- sharp cutout vs soft bg: **57.815 → 50.315** (기존 블러 회귀 OK)
- mid-band: 거의 불변  
216차 로컬 자산 재검증은 스킵(쌍 매칭 없이 파일만 존재).

---

## 공통

- esbuild 3파일(+budget) OK · API 0
- 파일 분리: A/B = renderer·export·budget / C = photo-composite만
- 스크립트: `scripts/231cha-flow-infographic-verify.ts` → ALL PASS
