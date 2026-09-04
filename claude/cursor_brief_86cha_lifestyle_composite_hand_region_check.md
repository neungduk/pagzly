# 86차 — 85차 후속: "쥐는 자세" 판정을 좌표 기반으로 강제 + 진짜 그립 사진으로 최초 검증

생성: 2026-09-02

## 배경 — 85차에서 드러난 두 가지 문제

1. **boolean 필드도 confidence와 같은 한계**: 85차에서 `handsVisible`/`gripSpaceVisible` 필드를 추가했는데, 얼굴 제외(`faceRegion` + `overlapsExclusionZone`)처럼 **좌표를 코드로 직접 계산해서 강제하는 조건은 확실히 먹혔지만**, `gripSpaceVisible`처럼 **모델이 스스로 "그렇다/아니다"를 자기 신고하는 조건은 이번에도 결정적으로 안 지켜졌습니다** (손을 비비는 사진에도 계속 `true` 반환).
2. **더 근본적인 문제**: 85차 QA에서 우연히 발견했는데, 81~85차 내내 "성공 케이스"로 취급해온 `labeled-serum-hands`/`labeled-jar-hands` 테스트가 사실 **매번 똑같은 사진**(`self-care-6886590` — 손을 맞대고 비비는 자세, 실제로 뭔가를 쥐는 자세가 아님)을 재사용해온 것이었습니다. 즉 지금까지 우리가 "잘 된다"고 봐온 결과들은 진짜 그립 사진에서 나온 게 아니라, 우연히 그럴듯해 보이는 위치에 붙어서 문제로 안 보였던 것뿐입니다. **이 파이프라인이 진짜 그립 사진에서 얼마나 잘 되는지, 사실 한 번도 제대로 검증한 적이 없습니다.**

이번 라운드는 이 두 가지를 같이 고칩니다: (1) 자기 신고 boolean 대신 좌표로 강제하는 조건 추가, (2) 진짜 그립 사진으로 최초 검증.

## 지시

### 1. Vision에 "손 자체의 위치"를 bbox로 물어보고, 배치가 그 안에 들어가는지 좌표로 강제 검증

`lib/detect-held-object-placement.ts`의 `detectHandPlacementForProduct()` 응답 스키마에 필드를 추가하세요:

```json
{
  "xPct": 0-100, "yPct": 0-100, "wPct": 0-100, "hPct": 0-100,
  "rotationDeg": -45~45,
  "confidence": "high" | "low",
  "handsVisible": true | false,
  "gripSpaceVisible": true | false,
  "faceRegion": { ... } | null,
  "handRegions": [ { "xPct": 0-100, "yPct": 0-100, "wPct": 0-100, "hPct": 0-100 } ]
}
```

- `handRegions`: 이미지 1에서 실제로 보이는 손(들)의 대략적인 bbox. 손이 안 보이면 빈 배열 `[]`.
- 기존 `gripSpaceVisible` 필드는 유지하되(참고용 로그로만 남기고), **판정 로직에서는 더 이상 이 필드를 신뢰하지 마세요.**

`evaluateHandPlacementReliability()`에 좌표 기반 조건을 추가하세요:

- 새 순수 함수 `overlapsHandRegion(placement, handRegions, minOverlapFraction)`(85차의 `overlapsExclusionZone`과 비슷한 패턴)를 만들어서, **제안된 배치 bbox 면적의 일정 비율(예: 40% 이상)이 `handRegions` 중 하나와 겹치는지** 계산하세요.
- `handRegions`가 비어있거나, 배치가 어떤 `handRegions`와도 충분히 겹치지 않으면 → `confidence`나 `gripSpaceVisible`이 뭐라고 하든 **무조건 `reliable: false`**, `rejectReason: "not-overlapping-hand-region"`.
- 즉 최종 조건은 대략: `confidence==="high" && handsVisible && handRegions.length > 0 && overlapsHandRegion(...) && isHeldObjectPlacementReasonable(...) && !overlapsExclusionZone(faceRegion)`.

이건 85차에서 확실히 효과를 본 패턴(얼굴 제외)을 "손 안에 있어야 한다"는 조건에도 그대로 적용하는 겁니다 — 모델의 판단을 믿는 게 아니라 좌표 겹침을 코드로 기계적으로 계산합니다.

### 2. 진짜 "쥐는" 사진으로 처음 검증 (신규 테스트 픽스처 필수)

지금까지 재사용해온 `self-care-6886590`(손 비비기, 그립 아님) 대신, **실제로 손가락이 작은 물체를 쥐고 있는 게 명확한 라이프스타일 사진**을 최소 1개 새로 구해서 QA에 추가하세요 — 예: 손으로 작은 병/튜브를 쥐고 있는 스톡 사진(Pixabay 등에서 "hand holding small bottle", "holding dropper bottle" 류로 검색). 기존 `self-care-6886590`은 이제부터 "그립 아님" 네거티브 케이스로만 쓰고, "성공 케이스"라고 부르지 마세요.

이 새 사진으로 pixel-paste가 실제로 자연스러운 결과를 내는지 — 이번 프로젝트에서 **처음으로 진짜 긍정 케이스 검증**이 됩니다.

## 회귀 확인

- `arms-crossed-serum`(85차에서 fallback 전환 확인됨) — 계속 fallback으로 가는지.
- `self-care-6886590`(비비기, 이제 네거티브 케이스) — 이번엔 `overlapsHandRegion` 조건으로 확실히 fallback 되는지 확인. 여전히 통과하면 숨기지 말고 그대로 보고.
- 신규 진짜 그립 사진 — pixel-paste 성공 + 결과가 실제로 자연스러운지 육안 확인.

## 하지 않는 것

- 라벨 문자 일치 검증 — 계속 스코프 밖.
- 원근 변형, 손가락 가림 처리 — 계속 스코프 밖.
- `gripSpaceVisible` 필드를 완전히 제거하지는 마세요 — 로그/디버깅용으로 남겨서 이후에도 Vision이 이 필드를 얼마나 못 맞추는지 계속 관찰할 수 있게.

## 검증 방법

- `overlapsHandRegion()` 순수 함수를 좌표 예시 2~3개로 직접 검증(겹침/비겹침 각 1개 이상) — 85차 방식과 동일하게 로그로 남기세요.
- 위 3개 케이스(arms-crossed, 비비기-네거티브, 신규 그립-포지티브) 전체 비교 스크린샷.
- `npx tsc --noEmit` 에러 0건.
- 비용 기록.

## 완료 보고 형식

기존과 동일 — 변경 파일, `tsc` 결과, `overlapsHandRegion()` 좌표 검증 로그, 3개 케이스 스크린샷, 폴백 발동 빈도, 총 비용, **솔직한 결론** — 이번엔 진짜 그립 사진에서 pixel-paste 품질이 실제로 어느 수준인지(처음으로 진짜 데이터 기준), 그리고 `handRegions` 기반 검증도 뚫리는 새로운 패턴이 있는지.
