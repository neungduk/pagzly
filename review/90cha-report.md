# 90차 — overlap 편향/노이즈 재분석 + labelDelta 측정 위치 검증

생성: 2026-09-03

## 요약

**production 코드 변경 없음** — QA/분석 스크립트만 추가.

1. **Overlap raw 12회 재수집:** true grip overlap **mean=0.276, max=0.370** — 전 run 0.4 미만(체계적 편향). grasp **X 중심은 안정**(std≈0.8%p), **Y·placement 높이는 요동**(cy std≈4.7%p, h std≈5.8%p) → **혼합(편향+노이즈)**.
2. **labelDelta:** 측정 샘플 rect는 **크롭 코어 100% 안**(페더 밴드 0%) — 89차 5.07→1.81이 페더링 희석 착시 **아님**. 동일 paste 재측정에서도 hard **3.73** vs feather **2.47**로 feather 우위 유지.

## 변경 파일

| 파일 | 내용 |
|------|------|
| `scripts/90cha-overlap-variance-analysis.ts` | Vision-only raw bbox + overlap 수집/통계 |
| `scripts/90cha-labeldelta-sample-audit.ts` | 샘플 rect vs crop/feather 감사 + probe paste 재측정 |

## tsc

```bash
npx tsc --noEmit  # exit 0
```

## 1. Overlap raw — true grip (6767822, 12회)

| run | placement (x,y,w×h) | grasp (x,y,w×h) | overlap | reliable |
|-----|---------------------|-----------------|---------|----------|
| 1 | 35,40, 20×35 | 38,52, 12×18 | 0.309 | ✗ |
| 2 | 35,38, 18×45 | 38,45, 10×25 | 0.309 | ✗ |
| 3 | 35,38, 20×35 | 38,42, 10×22 | 0.343 | ✗ |
| 4 | 35,40, 20×35 | 38,50, 12×20 | 0.300 | ✗ |
| 5 | 35,38, 20×35 | 38,48, 12×22 | 0.343 | ✗ |
| 6 | 35,38, 22×45 | 38,45, 10×25 | 0.343 | ✗ |
| 7 | 35,40, 20×35 | 38,52, 12×18 | 0.242 | ✗ |
| 8 | 35,38, 18×45 | 38,42, 8×20 | 0.148 | ✗ |
| 9 | 35,38, 20×35 | 38,45, 10×22 | 0.198 | ✗ |
| 10 | 35,40, 20×35 | 38,50, 12×20 | 0.313 | ✗ |
| 11 | 35,38, 18×45 | 38,48, 10×25 | 0.229 | ✗ |
| 12 | 35,38, 20×55 | 38,42, 12×25 | 0.370 | ✗ |

### 통계 (true grip)

| 지표 | overlap | grasp cx | grasp cy | placement cx | placement cy | grasp w | placement h |
|------|---------|----------|----------|--------------|--------------|---------|-------------|
| mean | **0.276** | 43.6 | 55.6 | 44.8 | 53.7 | 11.2 | **43.8** |
| std | 0.061 | **0.76** | **4.72** | **0.55** | **3.17** | 1.52 | **5.82** |
| min | 0.178 | 42 | 48 | 44 | 49.5 | 8 | 35 |
| max | **0.370** | 44 | 62.5 | 46 | 60.5 | 12 | 55 |

### rubbing (6886590) — 유효 5회 + run 6~12 Vision 크레딧 소진

| run | overlap | grasp | 비고 |
|-----|---------|-------|------|
| 1–5 | 0.152–0.190 | (38–42, 48–50, 8×12~15) | 모두 ✗ |
| 6–12 | 0 | API 실패 | Anthropic credit exhausted |

| 지표 | overlap (5회 유효) |
|------|-------------------|
| mean | 0.167 |
| std | 0.016 |
| max | 0.190 |

### 편향 vs 노이즈 판단

| 케이스 | 판단 | 근거 |
|--------|------|------|
| **true grip** | **혼합 — 편향 우세 + Y축 노이즈** | overlap **전 run 0.4 미만**(max 0.37) → threshold 아래 **체계적 편향**. grasp/placement **X는 안정**(std<1%p). **Y·placement h 분산 큼**(cy std 4.7, h std 5.8) → overlap std 0.06의 주 원인 |
| **rubbing** | **편향** (유효 5회) | overlap 0.15~0.19로 **일관되게 0.4 아래**. grasp 중심 std≈1.5%p로 비교적 안정 |

**앙상블(bbox 평균/합집합) 시도 가치:** **조건부 있음 (true grip만)**

- X축 grasp 위치가 안정적 → **grasp bbox 합집합/평균**으로 overlap 분자(교집합)를 키우면 0.4 돌파 가능성 **있음**
- 다만 **placement hPct가 35~55로 요동** → 분모(placement 면적) 변동이 overlap을 깎음 → 앙상블만으로는 **불충분할 수 있음**
- rubbing은 overlap max 0.19 → 앙상블해도 0.4 근처 도달 **어려움** (오탐 risk 낮을 것으로 예상, 단 표본 5회)

## 2. labelDelta 측정 위치

### 89차 logged params 기하 감사

| run | sample 위치 (px) | crop core 안 | feather 밴드 | outside crop |
|-----|------------------|--------------|--------------|--------------|
| 89cha hard-edge | (558,665) 81×235 | **100%** | **0%** | 0% |
| 89cha feather | (558,623) 90×302 | **100%** | **0%** | 0% |
| 88cha probe | (427,819) 81×302 | **100%** | **0%** | 0% |

→ `measureLabelOppositeColorDelta()` 샘플은 **페더링 알파 구간에 걸치지 않음**. 코어 불투명 영역 안.

### 동일 paste 재측정 (88cha-probe-paste, Replicate-only)

| 조건 | defaultSample Δ | coreSample Δ |
|------|-----------------|--------------|
| hard-edge | **3.73** | 3.73 |
| feather | **2.47** | 2.47 |

- default vs coreSample 동일 → 샘플이 이미 코어 안이라 core 재정렬 효과 없음
- **89차 reported 5.07 vs 1.81**은 서로 **다른 Vision run**(placement/grasp 다름) + 다른 paste에서 측정된 값 → **직접 비교에 한계**
- **동일 paste·동일 측정 위치**에서도 feather **2.47 < hard 3.73** → **페더링 희석 착시가 아닌 실제 차이**로 보는 게 타당

## 비용

| 항목 | USD |
|------|-----|
| overlap analysis (24 Vision calls, rubbing 후반 credit fail) | 0.088 |
| labelDelta audit (2× nano-banana, probe paste) | 0.078 |
| **합계** | **~0.17** |

## 솔직한 결론

| 질문 | 답 |
|------|-----|
| 실패 overlap이 편향? 노이즈? | true grip: **threshold 아래 편향 + Y/size 노이즈 혼합**. rubbing: **편향** |
| 앙상블 다음 라운드? | **true grip에 한해 시도 가치 있음** — grasp X 안정, 합집합으로 overlap↑ 기대. placement h 통합도 같이 검토 |
| labelDelta 5.07→1.81 신뢰? | **측정 위치 오염 아님**(코어 100%). **동일 paste에서도 feather 우위(3.73→2.47)** — 방향은 신뢰 가능, 89차 절대값은 run 간 비교 한계 |

### 다음 라운드 후보 (코드 변경은 91차+)

1. **graspRegions bbox 합집합/평균 앙상블** — true grip overlap 0.37→0.4+ 돌파 여부 A/B
2. **placement hPct 안정화** — Vision 프롬프트 또는 중앙값 선택
3. 재시도 횟수/threshold 조정 — **이번 분석 근거로는 threshold 낮추기 비추**

## 검증

```bash
npx tsc --noEmit
$env:TEST_MODE="false"; npx tsx scripts/90cha-overlap-variance-analysis.ts
$env:TEST_MODE="false"; npx tsx scripts/90cha-labeldelta-sample-audit.ts
```

Raw data: `review/90cha-overlap-raw.json`, `review/90cha-labeldelta-audit.json`
