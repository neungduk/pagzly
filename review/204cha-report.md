# 204차 — 패션 사이즈/핏 리뷰 신호 (API 0)

생성: 2026-09-16

## 요약

192/203차와 동일 배선으로 `countSizeFitMentions()`(`SIZE_FIT_PATTERN`) 추가. 게이팅은 `CreateProductForm.tsx` `CATEGORIES`와 동일한 **`의류/패션`**. DeepSeek 호출 불변. 생성 API 0.

## 검증

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` | 0 |
| smoke hit / falsePositive / mixed | 2 / **0** / 3 |
| 오탐 케이스 | "가격이 크게…", "작다고 느낄…" → **0건** (기대 0) |
| extract + deepseekCalls | sizeFit=2, calls=0 |
| 게이팅 | fashion=2, beauty=undefined |
| `callDeepSeekReviewJson` | 정의 1 + 호출 2곳(first+retry) — 203차와 동일 |
| 카테고리 대조 | `components/CreateProductForm.tsx` `CATEGORIES[0]` = `"의류/패션"` |
