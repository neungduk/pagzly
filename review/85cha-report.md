# 85차 — Vision confidence 보정 + 얼굴/목 배치 하드 세이프가드

생성: 2026-09-02

## 요약

84차에서 `confidence: high`만 믿다 발생한 **얼굴/목 paste 파손**을 막기 위해, Vision 응답에 `handsVisible`/`gripSpaceVisible`/`faceRegion` 필드를 추가하고 **코드 AND 조건 + `overlapsExclusionZone()` 하드 차단**을 넣었습니다.

**arms-crossed(얼굴 클로즈업) 케이스는 fallback으로 정상 전환**됐습니다. **non-grip rubbing 케이스는 Vision이 `gripSpaceVisible: true`를 계속 반환**해 여전히 pixel-paste로 통과합니다 — boolean 필드도 프롬프트만으로는 결정적이지 않다는 패턴이 반복됩니다.

## 변경 파일

| 파일 | 내용 |
|------|------|
| `lib/detect-held-object-placement.ts` | 응답 스키마 확장, `evaluateHandPlacementReliability()`, `overlapsExclusionZone()`, `expandRegionWithPadding()` |
| `lib/lifestyle-product-composite.ts` | skip 시 `rejectReason` 로깅 |
| `scripts/85cha-lifestyle-safeguard-qa.ts` | QA + 순수 함수 좌표 검증 (신규) |

## tsc

```bash
npx tsc --noEmit  # exit 0
```

## 하드 세이프가드 로직 (순수 함수 검증)

Vision 호출 없이 좌표만으로 검증 — QA 로그 3건 모두 pass:

| 케이스 | placement | faceRegion | overlaps (pad 25%) | 기대 |
|--------|-----------|------------|-------------------|------|
| chin-placement-overlaps-face | (42,45,12×28) | (30,5,40×35) | **true** | true |
| hand-lower-frame-no-overlap | (45,55,12×28) | (30,5,40×35) | **false** | false |
| edge-touching-padded-zone | (20,36,10×20) | (30,5,40×35) | **true** | true |

expanded face (pad 25%): `(21.3, -3.8, 57.5×52.5)`

## QA 결과

| 케이스 | 기대 | 85차 결과 | Vision 신호 | met |
|--------|------|-----------|-------------|-----|
| `85cha-fail-arms-crossed-serum` | fallback | **nano-banana-fallback** | hands=false, grip=false, conf=low | ✅ |
| `85cha-fail-non-grip-rubbing` | fallback | pixel-paste | hands=true, **grip=true**, conf=high, face=null | ❌ |
| `85cha-regression-labeled-serum-hands` | composited | pixel-paste | hands=true, grip=true, conf=high | ✅ |
| `85cha-regression-labeled-jar-hands` | composited | pixel-paste | hands=true, grip=true, conf=high | ✅ |

- **폴백:** 1/4 (arms-crossed)
- **pixel-paste:** 3/4
- **총 QA 비용:** ~$0.059

### (1) 84차 실패 케이스 재테스트

**arms-crossed — 해결됨**

- 84차: 세럼이 턱/목에 paste (`84cha-arms-crossed-serum-full-compare.png`)
- 85차: `handsVisible=false` → fallback → 손바닥에 자연스럽게 든 결과 (`85cha-fail-arms-crossed-serum-full-compare.png`)
- 84 vs 85: `85cha-fail-arms-crossed-serum-vs-84cha.png`

**non-grip rubbing — 미해결**

- Vision: `gripSpaceVisible=true` (오판 유지)
- 84차와 동일하게 손가락 사이에 병 paste (`85cha-fail-non-grip-rubbing-vs-84cha.png`)
- `faceRegion=null`이라 얼굴 겹침 차단도 발동 안 함

### (2) 회귀 확인 (84차 성공 케이스)

세럼/튜브 hands 케이스 모두 **pixel-paste 유지** — 과도 차단 없음.

- `85cha-regression-labeled-serum-hands-full-compare.png`
- `85cha-regression-labeled-jar-hands-full-compare.png`

(참고: 이 lifestyle 사진은 손 비비기 제스처라 품질상 여전히 부자연스럽지만, 84차와 동일 경로로 통과.)

## 솔직한 결론

| 항목 | 상태 |
|------|------|
| 얼굴/목 paste (arms-crossed) | ✅ **fallback으로 차단** |
| `overlapsExclusionZone()` | ✅ 좌표 검증 pass |
| 회귀 (세럼/튜브 hands) | ✅ pixel-paste 유지 |
| non-grip rubbing | ❌ **Vision `gripSpaceVisible` 오판** — 코드 AND만으로는 못 막음 |
| 라벨 보존 검증 | △ 이번 라운드 스코프 밖, 여전히 불확실 |

### 안전장치를 뚫는 패턴

**손은 보이지만 쥐는 공간이 없는 제스처(비비기/맞닿음)** — Vision이 `gripSpaceVisible: true`를 반환하면 현재 코드는 통과시킵니다. boolean 필드도 confidence와 같은 한계가 있습니다.

다음 라운드 후보(범위 밖 제안):
- gripSpaceVisible을 별도 Vision 호출로 교차 검증
- 또는 손 pose 분류 휴리스틱(과설계 주의)

## 검증

```bash
npx tsc --noEmit
$env:TEST_MODE="false"; npx tsx scripts/85cha-lifestyle-safeguard-qa.ts
```

스크린샷: `review/qa-screenshots/85cha-*`  
요약 JSON: `review/85cha-composite-summary.json`
