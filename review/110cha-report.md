# 110차 — 설명형 다이어그램 (SVG 템플릿)

생성: 2026-09-04  
전제: `TEST_MODE=true`, 유료 생성 없음. 화장품 2종만 (브리프 1차 범위).

## 재사용 조사

| 기존 | 판정 |
|------|------|
| `SizeComparisonDiagram` / cm·캔 비교 | 화장품 mL에는 부적합 → **용량 없을 때만** 유지 |
| `FashionSizeDiagram` | 패션 전용, 그대로 |

## 완료 체크리스트

- [x] 화장품 용량 비교 — `lib/volume-comparison-diagram.ts` + `VolumeComparisonDiagram.tsx` (병 실루엣, 일반 100mL 기준)
- [x] 사용 순서 흐름 — `lib/usage-order-diagram.ts` + `UsageOrderFlowDiagram.tsx` (`usage_steps` / `step_card`)
- [x] 입력 없으면 미렌더 (`matchProductVolumeMl` null / steps < 2)
- [x] cosmetics-compliance + 효능 휴리스틱 필터
- [x] 새 섹션 타입 없음 — `spec_table` / `usage_steps` / `step_card`에 얹음
- [x] 카테고리 테마 색상만 사용
- [x] export 인라인 SVG (`xmlns` SVG만, 외부 이미지 URL 없음)
- [x] `npx tsc --noEmit` 0 + `110cha-diagrams-smoke.ts` PASS

## 미확장 (브리프대로)

식품 도넛·전자 구성품 배치 등은 후속 라운드.
