# 192차 — 반려동물 리뷰 나이·체중 언급 신호

생성: 2026-09-15 · API **0** (DeepSeek 호출 증가 없음)

**추가:** `countPetAgeWeightMentions()` — 리뷰 `lines` 순수 정규식(품종 제외). `ReviewInsights.petAgeWeightMentionCount`는 DeepSeek 성공 여부와 무관하게 항상 계산.  
**표시:** `review_highlight`에 캡션 1줄 — **반려동물** 카테고리 + count>0일 때만(`route.ts` 게이팅).  
**정규식:** 브리프의 `\b`는 JS에서 한글 뒤 미매칭 → `(?![0-9])`로만 치환(나머지 동일).  
**검증:** `tsc` 0. smoke: hit=1, miss=0, extract=2, 전자 게이팅=undefined, `sourceReviewCount` 회귀 없음.

| 샘플 | count |
|------|------:|
| 「3살… 5kg…」 | 1 |
| 「배송이 빨라요」 | 0 |
| 3줄 txt extract (API 키 없음) | 2 |

diff: `review-insights.ts`, `types/generate.ts`, `section-inserts.ts`, `generate/route.ts`, `DetailSectionRenderer`, `export-detail-html.ts`  
백로그 마스터는 Cursor 미갱신.
