# 91차 — grasp bbox 합집합 ensemble (90차 후속)

생성: 2026-09-03

## 요약

89차 재시도(최대 3회) **유지** + 3회 모두 `not-overlapping-grasp-region`일 때 **grasp bbox 합집합으로 마지막 1회 판정** 추가(Vision 추가 호출 없음). `mergeGraspRegionsUnion()` 좌표 단위 검증 통과, `npx tsc --noEmit` exit 0.

**라이브 QA(12×2)는 Anthropic 크레딧 소진으로 실행 불가** — 90차와 동일 API 오류. 대신 **90cha raw bbox 오프라인 replay**로 ensemble 효과·rubbing 안전성을 근사 검증함.

## 변경 파일

| 파일 | 내용 |
|------|------|
| `lib/detect-held-object-placement.ts` | `pickRepresentativeGraspRegion()`, `mergeGraspRegionsUnion()` |
| `lib/lifestyle-product-composite.ts` | `tryGraspEnsembleFromAttempts()`, `detectHandPlacementWithGraspRetry()` ensemble 단계 + `viaEnsemble` 로그 |
| `scripts/91cha-grasp-ensemble-qa.ts` | 단위 검증 + 라이브 12×2 QA (크레딧 필요) |
| `scripts/91cha-ensemble-offline-replay.ts` | 90cha raw bbox 오프라인 ensemble 시뮬레이션 |

## tsc

```bash
npx tsc --noEmit  # exit 0
```

## mergeGraspRegionsUnion() 좌표 검증

```
[91cha-unit] two-disjoint-horizontal OK → {"xPct":10,"yPct":20,"wPct":32,"hPct":13}
[91cha-unit] three-overlapping OK → {"xPct":38,"yPct":48,"wPct":15,"hPct":12}
[91cha-unit] single OK → {"xPct":5,"yPct":5,"wPct":20,"hPct":30}
[91cha-unit] empty input → null OK
```

| 입력 | 기대 합집합 |
|------|------------|
| (10,20,15×10) + (30,25,12×8) | (10,20,32×13) |
| 3개 overlapping | min/max → (38,48,15×12) |
| 빈 배열 | null |

## 라이브 QA — **실행 불가 (Anthropic credit exhausted)**

```
Your credit balance is too low to access the Anthropic API.
```

- true grip 12회 / rubbing 12회 **미완료**
- QA 시작 직후 run 1부터 Vision 실패 → **89차 25% baseline과의 live A/B 비교 불가**
- 크레딧 충전 후 재실행:

```powershell
$env:TEST_MODE="false"; npx tsx scripts/91cha-grasp-ensemble-qa.ts
```

## 오프라인 replay (90cha raw bbox, Vision 0회)

> ⚠️ **한계:** 90cha는 run당 Vision 1회 데이터. 실제 3회 retry 세션 bbox가 아니라 **동일 사진 12회 단일 호출 분포**로 근사. live 성공률을 직접 대체할 수 없음.

### true grip (6767822, 12 attempts)

| 시나리오 | raw best overlap | ensemble overlap | viaEnsemble |
|----------|------------------|------------------|-------------|
| **상한** — 12 grasp 전부 합집합 | 0.370 | **0.519** | ✅ |
| **sliding-3** — 인접 3 run씩 10 세션 | 0.309~0.370 | 0.325~0.489 | **8/10 (80%)** |
| 단일 grasp (baseline) | max 0.370 | — | 0/12 |

- Y축 분산이 큰 grasp들을 합치면 overlap **0.37 → 0.42~0.52** 구간으로 올라갈 **여지 있음** (90차 분석과 일치)
- sliding-3 80%는 **낙관적 상한** — 실제 3회 retry는 Y 분산이 이만큼 넓지 않을 수 있음

### rubbing (6886590, 유효 5 attempts — 90cha와 동일)

| 시나리오 | raw best | ensemble overlap | viaEnsemble |
|----------|----------|------------------|-------------|
| 5 grasp 전부 합집합 | 0.190 | **0.362** | ❌ (< 0.4) |
| sliding-3 (3 세션) | 0.171~0.190 | 0.271~0.362 | **0/3** |

- **viaEnsemble 오탐 0건** (유효 5회 기준)
- 합집합 최대 overlap **0.362** — 0.4 threshold **미달**, 60% plausible 체크도 통과했으나 overlap gate에서 차단
- run 6~12 rubbing 표본은 90cha/91cha 모두 **크레딧 소진으로 미수집** — 12회 완전 검증은 미완

## true grip 최종 성공률 (89차 25% 대비)

| 측정 | 결과 | 비고 |
|------|------|------|
| **89차 live retry** | **3/12 (25%)** | baseline |
| **91차 live retry+ensemble** | **미측정** | credit blocked |
| **91cha offline sliding-3** | 8/10 (80%) | 상한 근사, live 대체 불가 |

→ live 기준 **25% → ?%** 는 크레딧 충전 후 QA 필요. 오프라인 신호만 보면 **+5~15%p 추가 회복 가능성** 있으나 보수적으로 **30~35% ceiling** 정도로 예상.

## rubbing 오탐 (viaEnsemble)

| 표본 | viaEnsemble=true | ensemble overlap max |
|------|------------------|----------------------|
| offline 5회 (6886590) | **0** | 0.362 |
| live 12회 | **미측정** | — |

60% `isGraspRegionPlausible` 안전장치: rubbing 합집합은 plausible 통과하나 **overlap 0.4에서 차단** — 현재 threshold 유지 시 rubbing 위험 **낮아 보임** (단, 표본 5회).

## 비용

| 항목 | USD |
|------|-----|
| ensemble 단계 (production) | **0** (순수 좌표 계산) |
| 91cha live QA 시도 | ~0 (API 즉시 거부) |
| offline replay | 0 |
| **크레딧 충전 후 live QA 예상** | ~0.35–0.45 (12×2 retry, 89cha 수준) |

## 솔직한 결론

| 항목 | 판단 |
|------|------|
| 코드/안전장치 | ✅ 구현 완료, tsc 통과, 단위 검증 OK |
| 합집합이 도달률을 올리는가? | **가능성 있음** — true grip offline에서 0.37→0.42+ 확인. live 증명은 **미완** |
| rubbing 안전장치 | ✅ offline 5회 **오탐 0**, max ensemble overlap 0.362. 12회 완전 검증 필요 |
| 추가 투자 가치 | **조건부 낮음~중간** |

### 프로덕션 권고

- **ensemble 코드는 merge 비용 0**이라 production에 넣어도 harm 없음 — 3회 grasp reject run에서만 동작
- 다만 **live A/B 없이** “25%보다 올랐다”고 단정할 수 없음
- 90차 분석대로 **근본 한계는 placement hPct 요동 + grasp Y 노이즈** — ensemble은 Y-span을 키워 overlap 분자만 보완
- **25~30% reliable + nano-banana fallback**을 프로덕션 baseline으로 받아들이는 게 현실적. ensemble은 “공짜 incremental”로 ship, **threshold 0.4 유지**, rubbing 12회 live 확인은 크레딧 복구 후 1회 더

### 다음 액션 (크레딧 복구 시)

1. `scripts/91cha-grasp-ensemble-qa.ts` 12×2 완주 → 89cha 25% vs 91cha live rate
2. rubbing 7회 부족분 포함 12회 `viaEnsemble` 오탐 확인
3. offline 80% sliding-3와 live gap 비교 → ensemble 기대치 calibration

## 검증

```bash
npx tsc --noEmit
npx tsx scripts/91cha-ensemble-offline-replay.ts
# 크레딧 있을 때:
$env:TEST_MODE="false"; npx tsx scripts/91cha-grasp-ensemble-qa.ts
```

Raw: `review/91cha-ensemble-offline-replay.json`
