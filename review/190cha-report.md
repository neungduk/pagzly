# 190차 — 저관여 표시 예산 추가 축소

생성: 2026-09-15 · API **0**

**변경:** `lib/section-display-budget.ts` 상수만 — `MAX_EVIDENCE_LOW` 2→**1**, `MAX_EXTRA_IMAGE_LOW` 1→**0**. 메커니즘·슬롯 목록 미변경.  
**결과 (181 live):** living/pet raw 28 → displayed **18** (183차는 20). 뷰티/패션/식품/전자 demoted **0**.  
**step_card:** 유지 — living「설치와 정리」(조립·벽고정), pet「급여 순서」(급여량·보관)로 구매 실정보 (a).  
**검증:** `tsc` 0. 샷: `190cha-before|after-living-export-full.png` (export section 22→20).

| cat | raw | 183 displayed | 190 displayed | demoted (190) |
|-----|-----:|-------------:|-------------:|---------------|
| living | 28 | 20 | **18** | +stat_infographic, +material_feature (vs 183) |
| pet | 28 | 20 | **18** | +stat_infographic, +material_feature (vs 183) |
| beauty/fashion/food/electronics | — | — | 변화 없음 | |

diff 요지: `MAX_EVIDENCE_LOW=1`, `MAX_EXTRA_IMAGE_LOW=0` (+한글 라벨은 `\u` 이스케이프로 보존).  
백로그 마스터는 Cursor 미갱신.
