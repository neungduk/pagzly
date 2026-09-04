# 88차 — grasp 지점 국소 재생성 (pixel-paste+grasp-refine)

생성: 2026-09-03

## 요약

87차 pixel-paste 성공 뒤 **graspRegion과 겹치는 작은 크롭만** nano-banana에 넣어 손가락만 조정하는 **1단계 하이브리드**를 구현했습니다. **크롭 밖 픽셀 100% 동일**은 기계적으로 검증됐고(`0/1,959,936 diff`), **probe에서 refine 성공 시 손가락 감싸기가 육안으로 개선**됐습니다. 다만 **production QA 3케이스 모두 Vision이 grasp overlap(0.4) 미달** → pixel-paste 자체가 실행되지 않아 **refine 시도 0건**. 회귀(arms-crossed/rubbing)는 **fallback 유지** ✅.

## 변경 파일

| 파일 | 내용 |
|------|------|
| `lib/lifestyle-product-composite.ts` | `computeRefineCropRect()`, `refineGraspAreaLocally()`, `verifyPixelsOutsideCropUnchanged()`, `measureLabelOppositeColorDelta()`, pipeline `pixel-paste+grasp-refine`, crop max 45% cap, bg-remove data URI fallback |
| `lib/detect-held-object-placement.ts` | `findMatchingGraspRegion()` (87차에서 추가) |
| `scripts/88cha-grasp-refine-qa.ts` | production 경로 QA 3케이스 |
| `scripts/88cha-grasp-refine-probe.ts` | QA probe — paste+refine 기계적 검증 (safeguard 우회, grasp 0.15 완화) |

## tsc

```bash
npx tsc --noEmit  # exit 0
```

## computeRefineCropRect() 좌표 검증

| 케이스 | scene | placement | grasp | padding | crop (px) | inBounds |
|--------|-------|-----------|-------|---------|-----------|----------|
| union-with-padding-clamped | 1000×800 | (35,42,18×35)% | (38,50,12×25)% | 0.8 | (126,112,628×688) | ✅ |
| near-edge-clamp | 800×600 | (2,3,15×20)% | (5,8,10×15)% | 0.6 | (0,0,264×264) | ✅ |

추가: Vision placement가 클 때 padding만으로 전체 장면 크롭되는 것을 막기 위해 **crop max = scene의 45%** cap 추가 (probe 1차 run에서 1280×1920 전체 크롭 관찰 → cap 후 576×864로 정상화).

## Production QA (safeguard 그대로)

| 케이스 | 기대 | 결과 | refine 시도 |
|--------|------|------|-------------|
| true grip (6767822) | pixel-paste 또는 +refine | **nano-banana-fallback** | ❌ (reject=`not-overlapping-grasp-region`) |
| rubbing (6886590) | fallback | **nano-banana-fallback** ✅ | ❌ |
| arms-crossed | fallback | **nano-banana-fallback** ✅ | ❌ |

- **refine 성공/시도:** 0/0 (production)
- **87차 대비 비용 증가분:** $0 (refine 미실행)
- **QA 총비용 (production 3케이스 + true-grip 1회 재시도):** ~$0.178

### 회귀 스크린샷

- `88cha-fail-arms-crossed-serum-full-compare.png` — fallback, 손 생성 ✅
- `88cha-fail-rubbing-negative-full-compare.png` — fallback ✅ (재생성 미시도)

## QA Probe (기계적 검증 — production safeguard 우회)

Vision이 production에서 `not-overlapping-grasp-region`으로 막힌 동일 사진에 대해, **paste 후 grasp 0.15 완화 매칭**으로 refine만 직접 실행.

| 항목 | 값 |
|------|-----|
| crop rect | (352,528) 576×864 px |
| refine 적용 | **true** |
| 크롭 밖 픽셀 동일 | **true** — diff **0 / 1,959,936** |
| 라벨 반대쪽 RGB Δ | **7.90** (관찰값, 강제 차단 없음) |
| refine 비용 | $0.039 |

### paste vs refined (probe)

`88cha-probe-paste-vs-refined.png`

- **paste (87차 equivalent):** 병이 손바닥 위에 얹힘, 떠 있는 duplicate dropper artifact
- **refined (88차):** 크롭 안에서 **엄지·손가락이 병을 감싸는 형태로 개선**, duplicate artifact 제거
- **한계:** hard-edge paste로 **직사각형 이음매 눈에 띔** (88차 스코프에서 feathering 미적용)
- **라벨:** "mi solo" 로고 대체로 유지, 하단 "SERUM ANTE…" 텍스트는 약간 흐려짐 관찰 (labelDelta=7.90)

## 재생성 성공/실패 빈도

| 경로 | 시도 | 성공 | 실패 사유 |
|------|------|------|-----------|
| production pipeline | 0 | 0 | grasp overlap 0.4 미달 → paste 자체 skip |
| QA probe | 2 | 2 | 1차: 전체장면 crop(수정 전), 2차: capped crop 성공 |

## 총 비용

| 항목 | USD |
|------|-----|
| production QA (4 runs) | ~0.178 |
| probe QA (2 runs) | ~0.090 |
| **합계** | **~0.268** |
| 87차 pixel-paste 1회 추정 | 0.005 |
| refine 1회 추가 (성공 시) | +0.039 |

## 솔직한 결론

| 항목 | 상태 |
|------|------|
| 국소 크롭 + 단일 이미지 nano-banana | ✅ 구현 완료 |
| 크롭 밖 픽셀 보존 | ✅ **0 diff / 1.96M outside pixels** (probe) |
| 손가락 감싸기 육안 품질 | △ **probe에서 확실히 개선**, production은 grasp gate 때문에 미검증 |
| production grasp gate | ❌ **6767822도 이번 run 전부 overlap<0.4** — 87차와 동일한 Vision 비결정성 |
| 라벨 훼손 | △ 하단 텍스트 약화 관찰 (labelDelta 7.9), 로고는 대체로 유지 |
| 이음매 | ❌ hard-edge paste seam 눈에 띔 |

### 다음 라운드 후보

1. **production에서 refine까지 도달** — grasp threshold 추가 튜닝보다 placement/grasp 정렬 자체가 불안정(87차 결론 재확인). QA probe처럼 paste는 통과시키고 refine만 시도하는 **별도 “soft grasp” tier** 검토 가능.
2. **마스크 기반 inpainting (flux-fill 등)** — nano-banana full-crop refine은 손가락+라벨 동시 변형 risk. labelDelta 관찰값이 쌓이면 교체 우선.
3. **crop 이음매 feathering** — 스크린샷에서 seam이 blocker로 보임.

## 검증

```bash
npx tsc --noEmit
$env:TEST_MODE="false"; npx tsx scripts/88cha-grasp-refine-qa.ts
$env:TEST_MODE="false"; npx tsx scripts/88cha-grasp-refine-probe.ts
```

(probe 전 `review/qa-screenshots/88cha-input-product.png` 필요 — QA 또는 PowerShell로 Supabase에서 다운로드)
