# 92차 — grasp ensemble 라이브 A/B 완주 (91차 마무리)

생성: 2026-09-03

## 요약

91차 스크립트를 **24회 라이브 Vision QA 완주**(true grip 12 + rubbing 12, 크레딧 소진 없음). **코드 변경 없음.**

| 지표 | true grip | rubbing |
|------|-----------|---------|
| **end-to-end reliable=true** | **7/12 (58%)** — 89차 **25%** 대비 **+33%p** | **4/12 오탐** — 89차 **0/12** 대비 **회귀** |
| **ensemble 조건부 구제율** | **4/8 (50%)** | 4/10 ensemble 발동, **전부 오탐** |
| **viaEnsemble 오탐** | 0 | **4/12** |

**핵심:** true grip 도달률 상승의 **전부(+4 run)가 ensemble 기여**. 개별 재시도만 성공한 run은 **3/12(25%)** 로 89차와 동일. rubbing에서는 ensemble이 **0.4 threshold 구멍**을 열어 **4건 오탐**.

## 변경 파일

없음 (92차는 QA·report만).

## tsc

```bash
npx tsc --noEmit  # exit 0 (코드 변경 없음)
```

## 1. end-to-end 성공률 (89차 25% 대비)

| 케이스 | 89차 retry | 92차 retry+ensemble | Δ |
|--------|-----------|----------------------|---|
| **true grip (6767822)** | 3/12 (**25%**) | **7/12 (58%)** | **+33%p** |
| **rubbing (6886590)** | 0/12 오탐 | **4/12 오탐** | **+4건 회귀** |

### true grip 7건 breakdown

| run | 경로 | graspOverlap | 비고 |
|-----|------|--------------|------|
| 1 | attempt 3 개별 성공 | 0.429 | viaEnsemble=false |
| 2 | **ensemble** | 0.531 | raw best 0.309 |
| 3 | **ensemble** | 0.443 | raw best 0.254 |
| 6 | **ensemble** | 0.590 | raw best 0.317 |
| 8 | attempt 2 개별 성공 | 0.480 | viaEnsemble=false |
| 9 | **ensemble** | 0.823 | raw best 0.343 |
| 11 | attempt 1 개별 성공 | 0.429 | viaEnsemble=false |

- **개별 재시도만:** 3/12 = **25%** (89차와 동일)
- **ensemble 추가 구제:** +4 run → **58%**

## 2. ensemble 조건부 구제율

> 분모 = 3회 attempt **전부** `not-overlapping-grasp-region`으로 개별 실패한 run

| 케이스 | 분모 (all-3-fail) | ensemble 구제 (viaEnsemble=true & reliable) | 구제율 |
|--------|-------------------|---------------------------------------------|--------|
| **true grip** | **8** | **4** | **50%** |
| **rubbing** | **10** | **4** (전부 **오탐**) | 40% — **안전 실패** |

### true grip — ensemble 실패 4건 (all-3-fail이지만 구제 못함)

| run | raw best overlap | ensemble overlap | merged hPct |
|-----|------------------|------------------|-------------|
| 4 | 0.222 | (failed) | — |
| 5 | 0.247 | (failed) | — |
| 7 | 0.360 | (failed) | 0.36 < 0.4 |
| 10 | 0.247 | (failed) | — |

run 7은 ensemble overlap **0.36**까지 올랐으나 0.4 미달.

## 3. rubbing 오탐 (12회, viaEnsemble)

**4건 전부 `viaEnsemble: true`로 잘못 통과** — 숨기지 않음.

| run | raw best | ensemble overlap | merged bbox |
|-----|----------|------------------|-------------|
| 2 | 0.343 | **0.514** | (38,48,12×18) |
| 4 | 0.229 | **0.429** | (38,45,12×25) |
| 5 | 0.229 | **0.486** | (38,50,18×20) |
| 10 | 0.190 | **0.578** | (35,42,13×28) |

### 60% `isGraspRegionPlausible` 판단

- 4건 모두 plausible **통과** — merged grasp가 handRegion 면적의 60% 이하
- rubbing에서 Y축 grasp 분산이 커지면 합집합이 **0.15~0.23 → 0.43~0.58**로 overlap 급증
- 91차 offline은 max ensemble overlap **0.362** (< 0.4)라 안전해 보였으나, **live 12회에서 4건 0.4 초과** 확인
- **60%를 낮추는 것만으로는 부족** — run 10 merged (13×28)도 plausible 통과하면서 overlap 0.578
- 근본 원인: rubbing 사진에서 Vision이 **grasp bbox를 rubbing 동작 근처에 반복 배치** → 3회 합집합이 실제 grip처럼 placement와 겹침

## 4. 오프라인 추정 vs live 실측

| 지표 | 91차 offline replay | 92차 live | 차이 |
|------|---------------------|-----------|------|
| true grip end-to-end | ~30–35% (보수 추정) / sliding-3 **80%** (낙관) | **58% (7/12)** | 보수 추정 **과소**, sliding-3 **과대** |
| true grip ensemble 구제 (조건부) | sliding-3 **8/10 (80%)** | **4/8 (50%)** | offline **+30%p 낙관** |
| rubbing viaEnsemble 오탐 | **0/5** | **4/12** | offline **안전 과신** — 치명적 |
| rubbing ensemble overlap max | **0.362** | **0.578** | offline max **0.22 낮게 추정** |

**교훈:** 90cha raw bbox sliding-3 replay는 (1) 실제 all-3-fail 조건 미적용, (2) rubbing 표본 5회·분포 편향으로 **안전성을 과대평가**. 앞으로 offline 근사는 **true grip 상한 참고용**으로만 쓰고, rubbing·안전성 판단은 **live 필수**.

## 비용

| 항목 | 값 |
|------|-----|
| Vision 호출 (실제) | **63회** (true grip 31 + rubbing 32, early exit 포함) |
| 총 Vision 비용 | **$0.326** |
| ensemble 단계 추가 비용 | **$0** |

## 솔직한 결론 — 81~92차 라인 마무리

| 질문 | 답 |
|------|-----|
| ensemble이 true grip을 올렸나? | ✅ **25% → 58%** (+33%p). 단 **개별 재시도만으론 25% 유지** — gain은 ensemble 전용 |
| ensemble 조건부 구제는? | true grip **50% (4/8)** — 3회 전부 실패 run의 절반을 살림 |
| rubbing 안전? | ❌ **4/12 오탐**, 전부 viaEnsemble. 89차 0/12 대비 **명확한 회귀** |
| offline replay 신뢰도? | rubbing 안전 **과대평가** — live 없이 ship하면 안 됨 |

### 프로덕션 판단 (사용자 결정용)

**현재 ensemble 포함 코드 그대로 ship — 비추**

- true grip +33%p 이득 vs rubbing 33% 오탐률은 **ecommerce rubbing 사진에서 pixel-paste 오탐** → 제품이 손에 안 쥐어진 채 붙는 결과
- **89차 구성(retry 3회, ensemble 없음)** 이 rubbing 안전 기준: true grip 25%, rubbing 0/12

**권고 옵션**

| 옵션 | true grip | rubbing | 비고 |
|------|-----------|---------|------|
| **A. 89차 그대로 (ensemble off)** | ~25% | 0/12 | **안전 우선**, 검증됨 |
| **B. ensemble + rubbing 추가 gate** | ~58% | ? | 92차 스코프 밖 — 새 안전장치 필요 |
| **C. 25~30% + nano-banana fallback 수용** | fallback 70~75% | fallback 처리 | **현실적 baseline** |

**81~92차 라인 정리:** Vision grasp geometry + retry + feathering + ensemble까지 탐색 완료. **한계는 Vision bbox Y 노이즈와 rubbing/grasp 구분 불가** — threshold 0.4 유지 시 true grip ceiling ~50–60%(ensemble), rubbing은 ensemble이 구멍을 염. **추가 코드 투자 ROI 낮음.** mask inpainting·다른 접근은 별도 라인.

→ **프로덕션 baseline: 89차(retry 3회, ensemble 없음) + nano-banana fallback + 89차 feathering** 을 최종 채택하고, ensemble 코드는 **feature flag off 또는 revert** 권장.

## 검증

```bash
npx tsc --noEmit
$env:TEST_MODE="false"; npx tsx scripts/91cha-grasp-ensemble-qa.ts
```

Raw: `review/92cha-grasp-ensemble-qa.json`, log: `review/92cha-qa-run.log`
