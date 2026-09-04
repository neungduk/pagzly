# 93차 — 라이프스타일 합성 ensemble 코드 feature flag off (92차 후속)

생성: 2026-09-03
전제: 92차 결론 — "true grip +33%p 이득 vs rubbing 33% 오탐률"로 ensemble을 프로덕션에 그대로 배포하면 안 됨. 89차 구성(retry 3회, ensemble 없음)이 안전 기준. 92차는 "코드 변경 없음"으로 종료됐기 때문에 91차에서 넣은 ensemble 코드가 여전히 라이브에 켜진 상태로 남아있음 — 이번 라운드에서 되돌립니다.

## 배경

`lib/lifestyle-product-composite.ts`의 `detectHandPlacementWithGraspRetry()`는 3회 재시도 모두 `not-overlapping-grasp-region`으로 실패하면(`allGraspReject`) 무조건 `tryGraspEnsembleFromAttempts()`를 호출해 grasp bbox 합집합으로 마지막 판정을 시도합니다. 92차 라이브 A/B(24회) 결과 true grip 성공률은 25%→58%로 올랐지만 rubbing(쥐지 않는 손동작) 오탐이 0/12→4/12로 명백히 회귀했습니다. 코드를 삭제하지 않고 **기본값 off인 feature flag로 감싸서** 나중에 다시 켤 수 있게 남겨둡니다(92차 권고: "feature flag off 또는 revert").

## 작업 A — feature flag 추가

`lib/lifestyle-product-composite.ts` 상단 상수 근처(`DEFAULT_GRASP_OVERLAP_FRACTION` 등이 정의된 곳)에 추가:

```ts
/** 92차 — true grip +33%p 이득 vs rubbing 33% 오탐 회귀. 기본 off. 다시 켜려면 env로만. */
const LIFESTYLE_GRASP_ENSEMBLE_ENABLED = process.env.LIFESTYLE_GRASP_ENSEMBLE_ENABLED === "true";
```

`detectHandPlacementWithGraspRetry()` 안의 `allGraspReject` 처리 블록(현재 `if (allGraspReject) { const ensemble = tryGraspEnsembleFromAttempts(attemptRecords); ... }`)을 아래처럼 감쌉니다:

```ts
if (allGraspReject && LIFESTYLE_GRASP_ENSEMBLE_ENABLED) {
  // 기존 ensemble 시도 블록 내용 그대로 (tryGraspEnsembleFromAttempts 호출부터
  // "ensemble failed" 로그까지 전부)
}
```

`LIFESTYLE_GRASP_ENSEMBLE_ENABLED`가 false면(기본값) 이 블록 전체를 건너뛰고 바로 아래 `const fallback = attemptRecords[...] ?? {...}` 경로로 가서 `viaEnsemble: false`, `mergedGraspRegion: null`로 반환합니다 — 이게 89차와 동일한 동작입니다.

`tryGraspEnsembleFromAttempts` 함수 자체와 `lib/detect-held-object-placement.ts`의 `mergeGraspRegionsUnion`/`pickRepresentativeGraspRegion`은 **삭제하지 않습니다** — 나중에 rubbing 안전장치를 보강한 뒤 다시 켤 수 있게 그대로 둡니다.

## 작업 B — 로그 보강

`detectHandPlacementWithGraspRetry` 진입 시점에 ensemble 활성 여부를 한 줄 남깁니다:

```ts
console.log(`[hand-placement-retry] ensembleEnabled=${LIFESTYLE_GRASP_ENSEMBLE_ENABLED}`);
```

## 작업 C — 환경변수 문서화

`.env.local`이나 `README.md`에 환경변수 예시 목록이 이미 정리되어 있다면 `LIFESTYLE_GRASP_ENSEMBLE_ENABLED=false`(기본, 생략 가능) 한 줄을 추가하세요. 그런 목록이 따로 없다면 새로 만들지 않아도 됩니다.

## 하지 않는 것

- `tryGraspEnsembleFromAttempts`, `mergeGraspRegionsUnion`, `pickRepresentativeGraspRegion` 등 91차 코드 삭제 없음 — flag만 추가.
- threshold(0.4), `GRASP_VISION_MAX_ATTEMPTS`(3), feathering 등 89차 로직 자체는 변경하지 않습니다.
- rubbing 안전장치 보강(마스크 인페인팅 등 새 접근)은 이번 범위 밖 — 92차가 "추가 코드 투자 ROI 낮음"이라 결론낸 부분이므로 별도 라운드에서 논의합니다.

## 검증 방법

- `npx tsc --noEmit` 에러 0건.
- `LIFESTYLE_GRASP_ENSEMBLE_ENABLED` 미설정(기본) 상태에서 grasp 3회 전부 실패하는 케이스가 ensemble 없이 89차와 동일하게 fallback(nano-banana-fallback)으로 빠지는지 로그로 확인(`viaEnsemble=false` 유지).
- `LIFESTYLE_GRASP_ENSEMBLE_ENABLED=true`로 설정했을 때는 기존 91~92차와 동일하게 ensemble 경로가 동작하는지 확인(회귀 없음).

## 완료 보고 체크리스트

- [ ] `LIFESTYLE_GRASP_ENSEMBLE_ENABLED` flag 추가, 기본값 false
- [ ] `allGraspReject` 블록이 flag로 감싸짐
- [ ] flag off일 때 89차와 동일하게 fallback 경로로 감
- [ ] ensembleEnabled 로그 라인 추가
- [ ] `npx tsc --noEmit` 에러 0건
