# 475차 notes — 일반 섹션 전수·안전 경계

코퍼스 `scripts/design-corpus` (저장 세션+합성 픽스처) `exportArgsOf().sections` 집계.

| type | 건수 | V5 변형 | 비고 |
|------|------|---------|------|
| image_text | 237 | **대상** | 아래 구간 대부분. full/compact/callout |
| spec_table | 54 | **대상** | 표·구분선 어휘 |
| hero | 27 | 제외 | 첫 화면(471~474) |
| faq | 27 | 임팩트 v4 경유 | v5-parts 유지 |
| ai_disclosure | 27 | **잠금** | 필수 고지 |
| cta_price | 26 | **잠금** | 가격·구매 카드 |
| target_persona | 24 | **대상** | 접점 성격이나 카피 불변·레이아웃만 |
| brand_story | 24 | **대상** | |
| checklist | 24 | 473 분기 있음 | family 시그니처에 포함·강화 |
| stat_infographic | 24 | 임팩트/기존 | 수치 게이트 주의 → **레이아웃만** |
| illustration_banner | 24 | 기존 배너 | 건드리지 않음(사진/생성) |
| caution | 24 | **잠금** | 주의 고지 |
| highlight_box | 23 | **최우선** | 3칸 카드 동일 문제의 본체 |
| gallery | 20 | v5 deck 등 | family 포함 |
| tradeoff_card | 20 | **잠금에 가깝게** | 비교 정책 인접 → 기존 유지 |
| comparison_chart | 19 | **잠금** | 비교 정책 |
| usage_steps | 15 | **대상** | |
| step_card | 6 | usage와 유사 | **대상** |
| color_variation | 3 | 터치 44px 규칙 | **잠금**(회귀) |
| review_highlight | 1 | 기존 | 보류 |

## 잠금 이유 요약
- `cta_price` / `ai_disclosure` / `caution` / `comparison_*` / `tradeoff_card` / `color_variation`: 가격·고지·비교·터치 회귀.
- `hero` / `illustration_banner`: 상위 차수·생성 파이프.

## A 구현 범위(이번)
1. `highlight_box` — 8종 레이아웃(스크롤/스택/bignum/timeline/table/rows/grid/bento)
2. `image_text`(compact+full) — 정렬·카드·스택 표식
3. `spec_table` / `usage_steps` / `checklist` — 시그니처 표 + 기존 checklist V5 연계
4. 그 외 대상은 CSS `data-pz-sf` 표식·면 처리로 1차 분화, DOM 대수술은 export 다이어트 후
