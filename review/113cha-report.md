# 113차 — 설명형 다이어그램 확장

생성: 2026-09-04  
전제: `TEST_MODE=true`, 상품 생성 미실행.

## 완료 체크리스트

- [x] 식품 원재료 비율 도넛 (`lib/food-ratio-diagram.ts` + `FoodRatioDiagram`) — 입력 없으면 미렌더, 예시 % 금지
- [x] 전자 구성품 배치도 (`lib/package-contents-diagram.ts` + `PackageContentsDiagram`) — 심플 SVG 원/사각, AI 아이콘 없음
- [x] `DetailSectionRenderer` + `export-detail-html` 인라인 SVG 배선
- [x] 생활용품/패션 — 기존 `SizeComparisonDiagram` / `FashionSizeDiagram` 재사용 확인 (중복 구현 없음)
- [x] 화장품 3번째 — **미구현** (사유 아래)
- [x] 새 섹션 타입 없음 — `spec_table` / `package_contents` / `sourcing_story`에 얹음
- [x] `113cha-diagrams-smoke` PASS + `tsc --noEmit`

## 카테고리별

| 대상 | 결과 |
|------|------|
| 식품 | `ingredients`/`keyFeatures`에서 `이름 N%` 파싱 → 도넛. food-compliance sanitize + 효능 라벨 스킵. 합 50–110%만 |
| 전자 | `package_contents` body / keyFeatures 목록 → 2열 원+라벨 |
| 패션 | `FashionSizeDiagram` (size_table) 유지 |
| 생활용품 등 | `SizeComparisonDiagram` (spec 치수 행) 유지 |
| 화장품 | 용량·사용순서(110)만 유지. 3번째 없음 |

## 화장품 3번째 미구현 사유

폼 `ingredients`는 자유 텍스트(예: "히알루론산")이며, 판매자 입력 **성분 함량 % 구조화 필드가 없음**.  
마유에스테식 지방산 비교표를 만들면 함량을 환각하거나 효능으로 읽힐 위험이 커서 **만들지 않음**.

## 스모크

```bash
npx tsx scripts/113cha-diagrams-smoke.ts
```
