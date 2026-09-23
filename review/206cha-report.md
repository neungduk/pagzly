# 206차 — 전자제품 표시광고법 컴플라이언스 (API 0)

생성: 2026-09-16

## 요약

식품/화장품과 동일 구조의 `lib/electronics-compliance.ts` 신규. `route.ts`에 프롬프트 가이드 + 최종 `reviewElectronicsCopy` 분기 추가. DeepSeek 호출 횟수 불변(프롬프트 텍스트만 삽입). API 0. 카테고리 문자열 **`전자제품`** (`CreateProductForm.tsx` CATEGORIES).

## 검증

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` | 0 |
| 금지 표현 치환 | 13+ 규칙 OK |
| 중첩(반영구/평생 보장) | "반장기간" 없음 · 장기간+품질 보증 지원 |
| 정상 카피 | replacements `[]` |
| 게이팅 | `전자제품`만 true, 나머지 6개 false |
| DeepSeek | 호출 경로 미추가 (`review-insights` 미수정) |
| cosmetics/food 분기 | 삼항 순서 cosmetics→food→electronics→null 유지 |
