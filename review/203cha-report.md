# 203차 — 식품 재구매 의사 리뷰 신호 (API 0)

생성: 2026-09-16

## 요약

192차 pet 나이·체중 정규식 패턴을 식품 재구매 의사(`countRepurchaseMentions`)로 확장. DeepSeek 호출 경로 불변(기존 1~2회 재시도만). 카테고리 게이팅은 폼 값 `식품/건강기능식품`(브리프의 `"식품"`은 템플릿 키라 실제 `body.category`와 불일치 → 펫과 동일하게 폼 카테고리 문자열 사용).

## 검증

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` | 0 |
| smoke | regex hit 2 / miss 0 / mixed 3, extract 2, food gate 2, beauty gate undefined, deepseekCalls 0 |
| `callDeepSeekReviewJson` 호출 위치 | `extractReviewInsights` 내부 **2곳만**(first + empty-praises retry) — 신규 호출 없음 |
| 생성 API | 0 |

## 배선

- `lib/review-insights.ts` — `REPURCHASE_PATTERN` + `countRepurchaseMentions` + 반환 3경로 필드
- `lib/types/generate.ts` — `ReviewInsightsInput` / `ReviewHighlightSection`
- `app/api/generate/route.ts` — enrich 매핑 + `식품/건강기능식품` 게이팅
- `lib/section-inserts.ts` — build/insert 시그니처
- `DetailSectionRenderer.tsx` / `export-detail-html.ts` — 캡션
- `scripts/203cha-food-repurchase-signal-smoke.ts`
