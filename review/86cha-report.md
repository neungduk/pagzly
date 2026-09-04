# 86차 — handRegions 좌표 강제 + 진짜 그립 사진 최초 검증

생성: 2026-09-02

## 요약

`gripSpaceVisible` 자기 신고 대신 **handRegions bbox와 배치 bbox 겹침(40%+)을 코드로 강제**했습니다. **진짜 그립 사진(Pexels 6767822)으로 pixel-paste를 처음 검증**했고, **arms-crossed fallback은 유지**됩니다. 다만 **비비기 네거티브는 여전히 통과** — Vision이 넓은 handRegions를 주면 overlapsHandRegion도 통과합니다.

## 변경 파일

| 파일 | 내용 |
|------|------|
| `lib/detect-held-object-placement.ts` | `handRegions` 스키마, `overlapsHandRegion()`, `evaluateHandPlacementReliability()`에서 gripSpaceVisible 제거 |
| `scripts/86cha-hand-region-grip-qa.ts` | 3케이스 QA (신규) |

## tsc

```bash
npx tsc --noEmit  # exit 0
```

## overlapsHandRegion() 좌표 검증 (Vision 없음)

| 케이스 | placement | hand | 결과 | 기대 |
|--------|-----------|------|------|------|
| placement-inside-hand-overlaps | (45,55,12×20) | (40,50,25×35) | **true** | true |
| placement-beside-hand-no-overlap | (10,10,12×20) | (40,50,25×35) | **false** | false |
| partial-overlap-below-threshold | (62,50,12×20) | (40,50,25×35) | **false** | false |

## QA 결과

| 케이스 | 기대 | 결과 | Vision 신호 | met |
|--------|------|------|-------------|-----|
| `86cha-fail-arms-crossed-serum` | fallback | **nano-banana-fallback** | hands=false, handRegions=0, conf=low | ✅ |
| `86cha-fail-rubbing-negative` | fallback | **pixel-paste** | hands=true, handRegions=2, conf=high, grip=true(log) | ❌ |
| `86cha-true-grip-dropper-serum` | pixel-paste | **pixel-paste** | hands=true, handRegions=1, conf=high | ✅ |

- **폴백:** 1/3
- **pixel-paste:** 2/3
- **총 QA 비용:** ~$0.055

### 신규 포지티브 — 진짜 그립 사진 (Pexels 6767822)

- **기술적:** pixel-paste 성공 (프로젝트 최초 진짜 그립 사진에서 성공 경로 확인)
- **육안:** 손가락 사이 배치는 그립 사진 대비 **그럴듯한 편**. 다만 원본에 **이미 흰 병이 쥐어져 있어** paste 세럼과 **이중 객체** — 84차 rubbing 케이스와 같은 패턴(원본 prop + paste)
- 스크린샷: `86cha-true-grip-dropper-serum-full-compare.png`

### 네거티브 — 비비기 (self-care-6886590)

- Vision: handRegions 2개 `(30,40,20×25)`, `(45,50,18×22)` + placement `(35,45,12×28)` → **40% 겹침 충족**
- gripSpaceVisible=true(log-only) — 여전히 오판
- **overlapsHandRegion도 뚫림** — hand bbox가 넓어서 “손 위에 붙이기”도 통과
- 스크린샷: `86cha-fail-rubbing-negative-full-compare.png`

### 회귀 — arms-crossed

- 85차와 동일하게 fallback ✅
- `86cha-fail-arms-crossed-serum-full-compare.png`

## 81~85차 “성공” 재해석

`self-care-6886590`(손 비비기)을 labeled-serum/jar “성공”으로 쓰던 것은 **잘못된 픽스처**였습니다. 86차부터:
- **포지티브:** 실제 그립 사진 (6767822 등)
- **네거티브:** self-care-6886590 (비비기)

## 솔직한 결론

| 항목 | 상태 |
|------|------|
| arms-crossed fallback | ✅ 유지 |
| 진짜 그립 pixel-paste | ✅ **최초 성공** (기술 경로) |
| 진짜 그립 품질 | △ 배치는 나음, **원본 병+paste 이중 객체** |
| 비비기 네거티브 차단 | ❌ handRegions bbox가 너무 넓으면 통과 |
| gripSpaceVisible | ❌ log-only로도 여전히 대부분 true |

### 안전장치를 뚫는 새 패턴

**Vision handRegions bbox가 과대** — rubbing 사진에서도 손 전체를 크게 잡아 placement가 40% 겹침을 만족. 다음 라운드 후보: handRegions 대비 placement **중심점**이 hand bbox 내부인지 추가 검증, 또는 handRegions 면적 대비 placement 면적 비율 상한.

## 검증

```bash
npx tsc --noEmit
$env:TEST_MODE="false"; npx tsx scripts/86cha-hand-region-grip-qa.ts
```

스크린샷: `review/qa-screenshots/86cha-*`  
요약 JSON: `review/86cha-composite-summary.json`
