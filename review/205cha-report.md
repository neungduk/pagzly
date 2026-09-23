# 205차 — 장기 사용 후기 review-signal (API 0)

생성: 2026-09-16

## 요약

`countLongTermUseMentions()` 추가. 게이팅 3종 — `화장품/뷰티`, `전자제품`, `생활용품` (`CreateProductForm.tsx` CATEGORIES와 일치). **6개 실제 카테고리 review-signal 롤아웃 완료**(기타 제외). DeepSeek 호출 불변. API 0.

## 검증

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` | 0 |
| regex hit / falsePositive / mixed | 2 / **0** / 3 |
| 오탐 | "10개월 전에 상했어요", "가격이 10만원대" → **0** |
| extract | longTerm=2, deepseekCalls=0 |
| 게이팅 ON | 뷰티·전자·생활 각 **2** |
| 게이팅 OFF | 의류/패션·식품·반려동물 **undefined** |
| `callDeepSeekReviewJson` | first+retry 2곳 불변 |
