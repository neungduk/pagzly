# 128차 — 성분서클 + comparison_chart 통합 레이아웃 (렌더 전용)

생성: 2026-09-07  
전제: 유료 Replicate/DeepSeek/Claude **0회**. 타입 파일 미변경.

## 0. 체크리스트

- [x] `isCirclePair`/`isCircleSolo` 판정 공용 함수 추출
- [x] `findCircleComparisonComboIndices` — 인접 쌍만 감지
- [x] `renderCircleComparisonCombo` — 기존 JSX 블록 재사용
- [x] 순서 무관(circle→chart, chart→circle) 병합 확인 (`combo=1`)
- [x] 인접하지 않은 경우 병합 안 함 (`128-non-adjacent` → `combo=0`)
- [x] circle만 — 회귀 캡처 `combo=0` (스크린샷)
- [x] comparison_chart만 — 회귀 캡처 `combo=0` (스크린샷)
- [x] `git diff --stat`에 `types/generate.ts` 없음
- [x] `tsc --noEmit` EXIT_CODE=0
- [x] 스크린샷 4장 원본
- [x] 유료 API 0회

## 1. 변경 파일

```
 app/dev/detail-preview/page.tsx      |  80 +++++++
 components/DetailSectionRenderer.tsx | 392 ++++++++++++++++++++++++-----------
 scripts/128cha-circle-comparison-capture.ts (new)
```

`lib/types/generate.ts` — **변경 없음** (`git diff --stat -- lib/types/generate.ts` 출력 비어 있음).

## 2. 구현 요약

- `isCirclePairSection` / `isCircleSoloSection` / `isIngredientCircleSection` / `isComparisonChartWithMetrics` — 파일 상단 공용.
- `findCircleComparisonComboIndices(sections)` → `Map<circleIdx, chartIdx>` (인접만, used 세트로 이중 매칭 방지).
- `renderIngredientCircleVisual` / `renderComparisonChartBody` 추출 후 solo/pair·chart 단독 렌더와 콤보가 동일 블록 사용.
- `renderCircleComparisonCombo` — chart의 `textSectionStyle` + `generousPadClass`, 원형은 compact(`h-20 w-20`), 그 아래 COMPARE/메트릭/디스클레이머.
- `sections.map` — 선두 인덱스에서 콤보 1회, 후미는 `content=null` → 기존 null 경로.

## 3. tsc 원문 (`review/128cha-tsc-output.txt`)

```
npx tsc --noEmit
EXIT_CODE=0
```

## 4. 캡처 실행 원문 (`review/128cha-capture-notes.txt` / run)

```
128-circle-then-chart → 128cha-combo-circle-then-chart.png combo=1
128-chart-then-circle → 128cha-combo-chart-then-circle.png combo=1
69-circle-solo → 128cha-regression-circle-solo.png combo=0
124-comparison → 128cha-regression-comparison-only.png combo=0
128-non-adjacent combo=0 (ok)
```

## 5. 스크린샷 원본 (4장)

| 파일 | 내용 |
|------|------|
| `review/128cha-combo-circle-then-chart.png` | circle→chart 병합 성공 (`data-testid=circle-comparison-combo` ×1) |
| `review/128cha-combo-chart-then-circle.png` | chart→circle 병합 성공 (시각적으로 동일 콤보 카드) |
| `review/128cha-regression-circle-solo.png` | 69차 circle-solo fixture, **combo=0** |
| `review/128cha-regression-comparison-only.png` | 124차 comparison-only fixture, **combo=0** |

### 회귀 픽셀 비교 노트

`128cha-regression-comparison-only.png` vs 기존 `124cha-comparison-disclaimer.png` (동일 896×4022):

```
comparison-vs-124: changedChannels=3957004/14414848 (27.4509%) maxDelta=231
```

이번 세션 직전 베이스라인은 없어, 구 124 캡처와의 채널 차이는 **폰트/이미지 캐시·스크롤 freeze 환경 드리프트**로 본다. 구조 회귀는 Playwright로 `combo=0` assert + 단독 COMPARE/디스클레이머 존재로 확인. circle-solo 쪽도 `combo=0` assert.

## 6. 유료 API

**0회** (`/dev/detail-preview` fixture 렌더 + Playwright 캡처만).
