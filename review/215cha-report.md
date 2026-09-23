# 215차 — 라이프스타일 합성 매칭 3축 실사 검증 재시도

생성: 2026-09-17 · 유료 허가 **정확히 4건** (`TEST_MODE=false`) · 코드 변경 없음

## 한줄 결론

4건 모두 `composited=true`로 끝났으나 **전부 `nano-banana-fallback`**.  
`pasteCutoutOnScene`(211차 화이트밸런스·선명도·그레인 매칭)은 **0/4건 미실행**.  
214차와 달리 “쥐는 포즈 + 형태 일치” 페어로 골랐는데도 grasp 세이프가드가 통과하지 못했습니다. 211 매칭 3축 육안 검증은 **여전히 미완**입니다.

---

## 실행 조건

| 항목 | 값 |
|------|-----|
| 스크립트 | `scripts/215cha-lifestyle-matching-live.ts` |
| 호출 | `compositeProductOnLifestylePhoto` |
| AI 라이프스타일 img2img | OFF |
| `TEST_MODE` | `false` |
| 실행 건수 | **4 / 4** (5건째 없음) |
| 실패 시 | 기록 후 다음 건 진행 |
| 산출물 | `review/215cha-live/` |

---

## 4건 결과 요약

| # | id | method | direct-paste | 최고 graspOverlap | 최종 reject |
|---|-----|--------|--------------|-------------------|-------------|
| 1 | beauty | nano-banana-fallback | skipped | 0.206 | `not-overlapping-hand-region` (attempt 2) |
| 2 | electronics | nano-banana-fallback | skipped | **0.382** | `not-overlapping-grasp-region` |
| 3 | food | nano-banana-fallback | skipped | 0.000 | `parse-failed` (attempt 1에서 조기 종료) |
| 4 | living | nano-banana-fallback | skipped | **0.333** | `not-overlapping-grasp-region` |

**pixel-paste / pixel-paste+grasp-refine 성공: 0건**

---

## 1) 화장품/뷰티 (`beauty`)

| | |
|--|--|
| 상품 | `beauty-6800936.jpeg` ← `_181cha-live/` |
| 라이프스타일 | `04-pexels-8131568.jpeg` ← `화장품-뷰티/` |
| 합성 | `review/215cha-live/beauty-composite.png` |
| 원본 LS | `review/215cha-live/beauty-lifestyle.jpeg` |
| method | `nano-banana-fallback` |
| cost (반환) | $0.050120 |

### grasp 재시도 로그

```
[hand-placement-retry] ensembleEnabled=false
[cost] claude/handPlacementForProduct: $0.0053
[hand-placement] confidence=high hands=true grip=true handRegions=2 graspRegions=2
  reliable=false reject=not-overlapping-grasp-region
  box=(35.0,30.0,20.0x35.0) rot=5.0
[hand-placement-retry] attempt=1/3 reliable=false reject=not-overlapping-grasp-region graspOverlap=0.206

[cost] claude/handPlacementForProduct: $0.0053
[hand-placement] confidence=high hands=true grip=true handRegions=2 graspRegions=2
  reliable=false reject=not-overlapping-hand-region
  box=(35.0,40.0,20.0x35.0) rot=5.0
[hand-placement-retry] attempt=2/3 reliable=false reject=not-overlapping-hand-region graspOverlap=0.051

[lifestyle-composite] stage=direct-paste skipped, reason=safeguard-not-overlapping-hand-region
[lifestyle-composite] CALL nano-banana (fallback-full)
[cost] lifestyle-composite (fallback): $0.0501
```

※ attempt 3 미실행 — attempt 2에서 hand-region reject로 스킵 확정.

### 비용 로그

```
[cost] claude/handPlacementForProduct ×2: $0.0053 each
[cost] lifestyle-composite (fallback): $0.0501
→ result cost=0.05012
```

---

## 2) 전자제품 (`electronics`)

| | |
|--|--|
| 상품 | `02-pexels-33936400.jpeg` ← `전자제품/` |
| 라이프스타일 | `01-pexels-35599938.jpeg` ← `전자기기-액세서리/` |
| 합성 | `review/215cha-live/electronics-composite.png` |
| 원본 LS | `review/215cha-live/electronics-lifestyle.jpeg` |
| method | `nano-banana-fallback` |
| cost (반환) | $0.054365 |

### grasp 재시도 로그

```
[hand-placement-retry] ensembleEnabled=false
[cost] claude/handPlacementForProduct: $0.0050
[hand-placement] confidence=high hands=true grip=true handRegions=1 graspRegions=1
  reliable=false reject=not-overlapping-grasp-region
  box=(35.0,45.0,28.0x32.0) rot=8.0
[hand-placement-retry] attempt=1/3 reliable=false reject=not-overlapping-grasp-region graspOverlap=0.382

[cost] claude/handPlacementForProduct: $0.0050
[hand-placement] confidence=high hands=true grip=true handRegions=1 graspRegions=1
  reliable=false reject=not-overlapping-grasp-region
  box=(35.0,40.0,28.0x28.0) rot=15.0
[hand-placement-retry] attempt=2/3 reliable=false reject=not-overlapping-grasp-region graspOverlap=0.230

[cost] claude/handPlacementForProduct: $0.0050
[hand-placement] confidence=high hands=true grip=true handRegions=1 graspRegions=1
  reliable=false reject=not-overlapping-grasp-region
  box=(35.0,40.0,30.0x35.0) rot=15.0
[hand-placement-retry] attempt=3/3 reliable=false reject=not-overlapping-grasp-region graspOverlap=0.286

[lifestyle-composite] stage=direct-paste skipped, reason=safeguard-not-overlapping-grasp-region
[lifestyle-composite] CALL nano-banana (fallback-full)
[cost] lifestyle-composite (fallback): $0.0544
```

※ 이번 라운드 **최고 overlap 0.382** — 그래도 세이프가드 미통과.

### 비용 로그

```
[cost] claude/handPlacementForProduct ×3: $0.0050 each
[cost] lifestyle-composite (fallback): $0.0544
→ result cost=0.054365
```

---

## 3) 식품 (`food`)

| | |
|--|--|
| 상품 | `food-29197695.jpeg` ← `_181cha-live/` |
| 라이프스타일 | `03-pexels-13779116.jpeg` ← `식품/` |
| 합성 | `review/215cha-live/food-composite.png` |
| 원본 LS | `review/215cha-live/food-lifestyle.jpeg` |
| method | `nano-banana-fallback` |
| cost (반환) | $0.044347 |

### grasp 재시도 로그

```
[hand-placement-retry] ensembleEnabled=false
[cost] claude/handPlacementForProduct: $0.0049
[hand-placement] confidence=unknown hands=false grip=false
  handRegions=0 graspRegions=0
  reliable=false reject=parse-failed
  face=null hands=none grasps=none
[hand-placement-retry] attempt=1/3 reliable=false reject=parse-failed graspOverlap=0.000

[lifestyle-composite] stage=direct-paste skipped, reason=safeguard-parse-failed
[lifestyle-composite] CALL nano-banana (fallback-full)
[cost] lifestyle-composite (fallback): $0.0443
```

※ Vision 파싱 실패로 attempt 1에서 즉시 skip (2·3회 미실행). 포즈 품질과 무관한 조기 차단.

### 비용 로그

```
[cost] claude/handPlacementForProduct ×1: $0.0049
[cost] lifestyle-composite (fallback): $0.0443
→ result cost=0.044347
```

---

## 4) 생활용품 (`living`) — 214 대조 실험

| | |
|--|--|
| 상품 | `mug-8250986.jpeg` ← `_168cha-living/` (머그 — 형태 일치) |
| 라이프스타일 | `hand-31203656.jpeg` ← `_168cha-living/` (**214차와 동일 LS**) |
| 합성 | `review/215cha-live/living-composite.png` |
| 원본 LS | `review/215cha-live/living-lifestyle.jpeg` |
| method | `nano-banana-fallback` |
| cost (반환) | $0.054659 |

### grasp 재시도 로그

```
[hand-placement-retry] ensembleEnabled=false
[cost] claude/handPlacementForProduct: $0.0051
[hand-placement] confidence=high hands=true grip=true handRegions=1 graspRegions=1
  reliable=false reject=not-overlapping-grasp-region
  box=(35.0,40.0,20.0x28.0) rot=8.0
[hand-placement-retry] attempt=1/3 reliable=false reject=not-overlapping-grasp-region graspOverlap=0.268

[cost] claude/handPlacementForProduct: $0.0051
[hand-placement] confidence=high hands=true grip=true handRegions=1 graspRegions=1
  reliable=false reject=not-overlapping-grasp-region
  box=(28.0,35.0,18.0x28.0) rot=8.0
[hand-placement-retry] attempt=2/3 reliable=false reject=not-overlapping-grasp-region graspOverlap=0.333

[cost] claude/handPlacementForProduct: $0.0051
[hand-placement] confidence=high hands=true grip=true handRegions=1 graspRegions=1
  reliable=false reject=not-overlapping-grasp-region
  box=(35.0,45.0,20.0x28.0) rot=8.0
[hand-placement-retry] attempt=3/3 reliable=false reject=not-overlapping-grasp-region graspOverlap=0.214

[lifestyle-composite] stage=direct-paste skipped, reason=safeguard-not-overlapping-grasp-region
[lifestyle-composite] CALL nano-banana (fallback-full)
[cost] lifestyle-composite (fallback): $0.0547
```

### 214 대조

| | 214 electronics (디퓨저+동일 LS) | 215 living (머그+동일 LS) |
|--|--------------------------------|---------------------------|
| overlap 최고 | ~0.360 | **0.333** |
| reject | not-overlapping-grasp-region | not-overlapping-grasp-region |
| method | nano-banana-fallback | nano-banana-fallback |

→ **카테고리/형태를 맞춰도** 이 LS에서는 grasp 세이프가드가 통과하지 않음. “잘못된 짝짓기”만의 문제는 아니었음.

### 비용 로그

```
[cost] claude/handPlacementForProduct ×3: $0.0051 each
[cost] lifestyle-composite (fallback): $0.0547
→ result cost=0.054659
```

---

## 합성 이미지 경로 (device_stage_files용)

```
review/215cha-live/beauty-composite.png
review/215cha-live/beauty-lifestyle.jpeg
review/215cha-live/beauty-product.jpeg
review/215cha-live/electronics-composite.png
review/215cha-live/electronics-lifestyle.jpeg
review/215cha-live/electronics-product.jpeg
review/215cha-live/food-composite.png
review/215cha-live/food-lifestyle.jpeg
review/215cha-live/food-product.jpeg
review/215cha-live/living-composite.png
review/215cha-live/living-lifestyle.jpeg
review/215cha-live/living-product.jpeg
review/215cha-live/summary.json
review/215cha-live/run-log.txt
```

※ pixel-paste 성공 건이 없어 “매칭 3축 비교용” 페어는 없음. fallback 결과 + 원본 LS는 위 경로에 함께 저장됨.

---

## API 비용 합계 (4건 증명)

| 구분 | 금액 |
|------|------|
| lifestyle-composite 반환 cost 합 (`summary.json`) | **$0.203491** |
| Vision handPlacement (로그 합산) | 2×$0.0053 + 3×$0.0050 + 1×$0.0049 + 3×$0.0051 ≈ **$0.0462** |
| 관측 총액 (composite + Vision) | ≈ **$0.250** |
| 실행 건수 | **runsAttempted=4**, maxRuns=4 |

`summary.json`:

```json
{
  "testMode": "false",
  "maxRuns": 4,
  "runsAttempted": 4,
  "totalCost": 0.20349099999999998
}
```

→ 유료 final 경로 **정확히 4건**만 실행됨 (5건째 없음).

---

## 육안 1차 소견 (참고용 — 최종은 이미지 직접 확인)

전원 **생성형 fallback**이라 211 매칭(컷아웃 페이스트) 품질은 평가 대상 밖.

| 건 | 소견 |
|----|------|
| beauty | 양손 세럼 홀드 스튜디오컷. 원본 LS와 비슷한 구도·핑크 배경으로 재생성된 느낌. “붕 뜸”보다 **풀 재합성**. |
| electronics | 손바닥에 흰 이어폰 케이스(닫힌 상태). 원본은 연 케이스였을 가능성 — 생성형이 형태를 단순화. |
| food | 보충제병 + 손바닥 알약. 손가락이 라벨을 가리는 자연스러운 쥐기. 브랜드/카피가 생성물에 새로 그려짐. |
| living | 흰 머그(“WAKE UP…”)를 양손으로 쥠. 214와 동일 배경(아웃도어 보케). 머그 페어로도 paste는 미진입. |

### 211 매칭 검증 관점

| 축 | 이번 4건에서 검증 가능? |
|----|------------------------|
| 화이트밸런스 매칭 | ❌ pasteCutoutOnScene 0회 |
| 선명도 매칭 | ❌ |
| 그레인 매칭 | ❌ |

---

## 관찰 (다음 라운드용 — 코드 미변경)

1. **임계값 바로 아래**: `minGraspOverlapFraction` 기본값 **0.4** (`evaluateHandPlacementReliability`). electronics 최고 overlap **0.382** → 0.018 부족으로 reject. living 최고 0.333. Vision이 “거의 맞는” box를 내도 현 게이트는 통과하지 않음.
2. **214 대조**: 동일 LS에 머그를 넣어도 결과는 동일(fallback). “잘못된 카테고리 짝”만의 원인은 아님.
3. **food `parse-failed`**: 포즈와 무관하게 Vision 응답 파싱 실패 → 재시도 없이 즉시 fallback. 드물지만 관측됨.
4. 211 매칭을 보려면 grasp 세이프가드를 **통과하는** 페어가 필요하거나, (별도 허가 시) 임계/디버그 경로 조정이 필요. 이번 브리프 범위에서는 **여기서 중단**.
