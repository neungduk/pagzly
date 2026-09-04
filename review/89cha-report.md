# 89차 — Vision grasp 재시도 + 크롭 페더링

생성: 2026-09-03

## 요약

`not-overlapping-grasp-region`일 때만 Vision을 **최대 3회 재호출**하도록 했습니다(threshold 0.4 유지). **12회 반복 측정** 결과 true grip 성공률 **8% → 25%**로 올랐고, rubbing **오탐 0/12**로 회귀 없었습니다. 크롭 paste에 **8% 알파 페더링**을 적용해 hard-edge 직사각형 이음매가 **육안으로 거의 사라졌고**, labelDelta도 true grip에서 **5.07 → 1.81**로 개선됐습니다.

## 변경 파일

| 파일 | 내용 |
|------|------|
| `lib/lifestyle-product-composite.ts` | `detectHandPlacementWithGraspRetry()`, 페더링 paste, `verifyFeatherBlendRegion()` |
| `lib/detect-held-object-placement.ts` | `getBestGraspOverlapFraction()` (overlap 로그용) |
| `scripts/89cha-grasp-retry-stats.ts` | Vision 12회×2케이스 통계 |
| `scripts/89cha-feather-compare-qa.ts` | hard-edge vs feather + labelDelta 누적 |

## tsc

```bash
npx tsc --noEmit  # exit 0
```

## 재시도 성공률 / 오탐률 (12회 반복, Vision만)

| 케이스 | 단일 호출 reliable=true | 3회 재시도 reliable=true | 오탐 (rubbing만) |
|--------|----------------------|--------------------------|------------------|
| **true grip (6767822)** | **1/12 (8%)** | **3/12 (25%)** | — |
| **rubbing (6886590)** | 0/12 (차단 100%) | 0/12 (차단 100%) | **single=0, retry=0** |

### 해석

- **순효과 있음:** true grip +17%p (8→25%), rubbing 오탐 증가 **없음**
- 재시도 평균 Vision 호출: true grip **2.58회**, rubbing **2.75회**
- 실패 run 대부분 overlap **0.15~0.34** — 0.4 threshold 바로 아래에 몰림(87차 geometry 한계 재확인)
- true grip retry 성공 3건 중 2건은 **face-region-overlap** 등 다른 reject로도 실패하는 run �재 — 재시도만으로 production 성공 보장은 아님

## 페더링 전/후

스크린샷: `89cha-feather-vs-hard-edge.png`

| 항목 | 88차 hard-edge | 89차 feather (8%) |
|------|----------------|-------------------|
| 직사각형 이음매 | **눈에 띔** | **거의 안 보임** ✅ |
| 크롭 밖 diff | 0/1,959,936 | 0/1,959,936 |
| featherBlendMaxError | — | **1** (채널 단위) |
| labelDelta (true grip) | 5.07 | **1.81** |

페더링으로 이음매는 **실사용 가능 수준**까지 개선. 다만 feather run에서 **작은 floating bottle artifact** 1건 관찰(nano-banana 비결정).

## labelDelta 관찰값 누적 (89차 probe)

| 케이스 | labelDelta | 비고 |
|--------|------------|------|
| true grip + hard-edge | 5.07 | 88차 7.90과 유사 범위 |
| true grip + feather | **1.81** | 페더링 후 감소 |
| rubbing + feather | **0.78** | 회귀 케이스, 낮음 |

→ 아직 3건뿐이라 강제 차단 임계값 정하기 이르지만, **페더링이 label 쪽 색상 변화를 줄이는 경향** 관찰.

## 총 비용

| 항목 | USD |
|------|-----|
| Vision 통계 QA (12×2, single+retry) | **0.455** |
| 페더링 비교 QA (3× refine) | **0.134** |
| **합계** | **~0.59** |
| production 1회 추가 Vision (재시도 worst) | +~$0.010 (Haiku ×2) |

88차 대비 production 성공 시 Vision 비용 최대 **~3배**(grasp reject 시에만).

## 솔직한 결론

| 항목 | 상태 |
|------|------|
| grasp 재시도 (threshold 0.4 유지) | ✅ true grip **+17%p**, rubbing 오탐 **0** |
| production refine 도달 | △ 25%도 여전히 낮음 — 대부분 run은 overlap 0.3대 |
| 페더링 | ✅ **이음매 실사용 가능**, blend 검증 maxErr=1 |
| 라벨 훼손 | △ feather 후 delta 감소 경향, 표본 3건 |
| 다음 후보 | 마스크 inpainting(flux-fill), floating artifact 억제 프롬프트 |

**재시도는 rubbing 구멍을 다시 열지 않으면서 true grip 회복에 실제 도움** — 다만 25%면 여전히 3/4 run은 fallback. threshold 낮추기(0.15)는 rubbing 회귀 확인됐으므로 **이번 라운드에서 하지 않음**이 맞음.

## 검증

```bash
npx tsc --noEmit
$env:TEST_MODE="false"; npx tsx scripts/89cha-grasp-retry-stats.ts
$env:TEST_MODE="false"; npx tsx scripts/89cha-feather-compare-qa.ts
```
