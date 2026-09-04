# 87차 — graspRegions(쥐는 지점) 좌표 강제

생성: 2026-09-02

## 요약

`handRegions`(손 전체)에 더해 **`graspRegions`(엄지·손가락 사이 좁은 틈)** 를 Vision에 요청하고, 겹침·면적 비율을 코드로 강제했습니다. **arms-crossed fallback은 유지**되고, **비비기 네거티브는 0.4 기준에서 대부분 fallback**되지만 Vision 비결정성으로 **가끔 여전히 통과**합니다. **진짜 그립 사진**은 grasp 조건 통과 run도 있으나 **face-region-overlap 등으로 fallback 되기도** — pixel-paste 상한은 여전히 “손가락 위에 얹힘” 수준입니다.

## 변경 파일

| 파일 | 내용 |
|------|------|
| `lib/detect-held-object-placement.ts` | `graspRegions`, `overlapsGraspRegion()`, `isGraspRegionPlausible()`, `hasPlausibleGraspMapping()` |
| `scripts/87cha-grasp-region-qa.ts` | 3케이스 QA (신규) |

## tsc

```bash
npx tsc --noEmit  # exit 0
```

## 순수 함수 검증

| 케이스 | 함수 | 결과 |
|--------|------|------|
| 좁은 틈 안 배치 | overlapsGraspRegion | true ✅ |
| 틈 옆 배치 | overlapsGraspRegion | false ✅ |
| 좁은 grasp (8×12 vs hand 25×35) | isGraspRegionPlausible | true ✅ |
| hand 복붙 grasp (22×30) | isGraspRegionPlausible | false ✅ |

## QA 결과 (minGraspOverlapFraction=0.4)

| 케이스 | 기대 | 대표 결과 | 비고 |
|--------|------|-----------|------|
| rubbing (6886590) | fallback | **fallback** (다수 run) / **pixel-paste** (일부 run) | reject=`not-overlapping-grasp-region` 또는 0.15에서 회귀 |
| arms-crossed | fallback | **fallback** ✅ | reject=`hands-not-visible` |
| true grip (6767822) | pixel-paste | **pixel-paste** (1회) / **fallback** (face-overlap 등) | Vision 비결정적 |

- **총 QA 비용:** ~$0.09~0.13 (run마다 상이)
- **폴백:** 2~3/3

### threshold 실험

| minGraspOverlapFraction | rubbing | true grip |
|-------------------------|---------|-----------|
| **0.4** (배포값) | 대부분 fallback ✅ | 종종 fallback (placement/grasp misalign) |
| **0.15** (실험) | **pixel-paste 회귀** ❌ | pixel-paste 통과 ↑ |

→ **0.4 유지.** rubbing 차단과 true grip 통과 사이 trade-off — overlap/placement 비율만으로는 두 케이스 geometry가 0.16 vs 0.17로 거의 구분 불가.

### 스크린샷

- `87cha-fail-rubbing-negative-full-compare.png`
- `87cha-fail-arms-crossed-serum-full-compare.png`
- `87cha-true-grip-dropper-serum-full-compare.png` (성공 run — paste는 thumb/index 사이, 여전히 “얹힘”)

## 솔직한 결론

| 항목 | 상태 |
|------|------|
| graspRegions + plausible 면적 체크 | ✅ 순수 함수 정확 |
| rubbing 차단 | △ **0.4에서 대부분**, Vision run마다 불안정 |
| arms-crossed | ✅ |
| true grip pixel-paste | △ **가능하나 비결정적** |
| “자연스럽게 쥐기” | ❌ **구조적 한계** — 손가락 픽셀 미변경 |

### 뚫리는 패턴

Vision이 **작은 graspRegions + placement를 grasp와 정렬**시키면 rubbing도 0.15에서 통과. 0.4에서는 placement bbox가 grasp보ad 크면 `not-overlapping-grasp-region`으로 막히는 경우가 많음.

---

## 다음 라운드 제안 (88차 — 설계만, 미구현)

**국소 인페인팅 하이브리드** — 사용자 확인 후 진행:

1. 87차까지 로직으로 배치 bbox + pixel-paste (현재와 동일)
2. 배치 bbox + graspRegion 주변만 **1.5~2× 패딩 크롭**
3. **크롭만** nano-banana / flux-fill 등에 넣어 “손가락이 물체를 감싸도록만 조정, 라벨·색상 불변”
4. 크롭 결과를 **같은 좌표에 재 paste** — 크롭 밖은 원본 100% (픽셀 diff 검증)
5. 리스크: 크롭 안 라벨 훼손 → 크롭 최소화 + 재생성 후 라벨 영역 색상/구도 diff 검증

스코프: 새 모델 조사 + 크롭/블렌딩 + 검증 지표 — **88차 사용자 결정 대기**.

## 검증

```bash
npx tsc --noEmit
$env:TEST_MODE="false"; npx tsx scripts/87cha-grasp-region-qa.ts
```
