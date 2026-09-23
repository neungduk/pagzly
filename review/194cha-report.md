# 194차 — 섹션 배경 장식 텍스처 비활성화

생성: 2026-09-15 · API **0**

**변경:** `CATEGORY_PATTERN_ENABLED = false` — `getCategoryPatternBackground()`가 항상 `undefined`. SVG 데이터·인코딩 로직은 보존(재활성화 시 상수만 true).  
**효과:** live/export 공통 `composeSectionBackground`가 그라데이션(A/B/D/E)만 반환. 패턴 C·호출부 미수정.  
**검증:** `tsc` 0. 6카테고리 전부 `undefined`. compose === gradient, `data:image/svg+xml` 없음.

diff: `lib/design-tokens.ts` 플래그 1개 + early return 1줄.  
백로그 마스터는 Cursor 미갱신.
