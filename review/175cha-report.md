# 175차 — 나머지 5개 다이어그램 Recraft 정적 아이콘

생성: 2026-09-14

## 요약

| 항목 | 결과 |
|------|------|
| Recraft `recraft-v4-svg` 호출 | **8회 (1회성)** · 약 **$0.64** |
| 적용 다이어그램 | noise / size / weight / power / fashion-size |
| 런타임 Recraft | **0** |
| 좌표·눈금 로직 | **미변경** (소음 cx 전후 동일) |
| `npx tsc --noEmit` | **EXIT 0** |
| 패밀리 완성 | **10/10** (174의 5 + 175의 5) |

---

## 생성한 아이콘

| 다이어그램 | 아이콘 ID | 제목에 사용 |
|------------|-----------|-------------|
| Noise | `noise-speaker`, `noise-wave` | speaker |
| Size | `size-ruler` | ruler |
| Weight | `weight-scale` | scale |
| Power | `power-plug`, `power-battery` | plug |
| FashionSize | `fashion-shirt`, `fashion-hanger` | shirt |

경로: `public/icons/diagrams/{id}.svg` · `lib/diagram-icon-assets.ts`에 병합 (총 18개)

---

## 변경 파일

| 파일 | 역할 |
|------|------|
| `scripts/175cha-generate-diagram-icons.ts` | 신규 8개 Recraft 생성 + assets 재조립 |
| `scripts/175cha-diagram-icons-preview.ts` | 전/후·tint 스모크 |
| `lib/noise-comparison-diagram.ts` | `diagramTitleWithIconHtml` |
| `lib/size-comparison-diagram.ts` | 동일 |
| `lib/weight-comparison-diagram.ts` | 동일 |
| `lib/power-consumption-diagram.ts` | 동일 |
| `lib/fashion-size-diagram.ts` | 제목+아이콘 추가 |
| `components/NoiseComparisonDiagram.tsx` | lib 빌더 위임 (174 Waterproof와 동일) |
| `components/SizeComparisonDiagram.tsx` | 동일 |
| `components/WeightComparisonDiagram.tsx` | 동일 |
| `components/PowerConsumptionDiagram.tsx` | 동일 |
| `components/FashionSizeDiagram.tsx` | 동일 |
| `lib/diagram-icon-assets.ts` | 18종 임베드 |
| `public/icons/diagrams/noise-*.svg` 등 | 정적 원본 8개 |

`export-detail-html.ts`는 기존 `build*DiagramSvg` 사용 → **미수정으로 export에도 반영**.

---

## 검증

- `review/qa-screenshots/175cha-track-diagrams-before-after.png` — 소음/무게/전력
- `review/qa-screenshots/175cha-size-fashion-before-after.png` — 크기/패션 실측
- `review/qa-screenshots/175cha-icon-tint-compare.png` — 전자 / 식품 / 패션 tint
- 메타: `review/175cha-diagram-icons-meta.json` (`recraftCalls: 8`)

## 하지 않은 것

- 좌표/눈금/트랙 계산 미변경
- 아이콘 다색 금지
- 런타임 Recraft 배선 없음
- `comparison-chart-guard.ts` / `assign-section-images.ts` 미수정
