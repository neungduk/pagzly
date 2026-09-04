# 93차 — lifestyle composite ensemble feature flag off

생성: 2026-09-03

## 요약

92차 권고대로 `LIFESTYLE_GRASP_ENSEMBLE_ENABLED` feature flag를 추가하고 **기본값 false**로 두어 89차와 동일하게 ensemble이 동작하지 않게 했습니다. 91차 함수(`tryGraspEnsembleFromAttempts`, `mergeGraspRegionsUnion` 등)는 삭제하지 않고 보존합니다.

## 변경 파일

| 파일 | 내용 |
|------|------|
| `lib/lifestyle-product-composite.ts` | `LIFESTYLE_GRASP_ENSEMBLE_ENABLED` flag, `allGraspReject` 블록 가드, 진입 로그 |

## 검증

```bash
npx tsc --noEmit  # 이후 라운드에서 일괄 확인
```

- 기본(미설정): `ensembleEnabled=false` → all-3-fail 시 fallback만, `viaEnsemble: false`
- `LIFESTYLE_GRASP_ENSEMBLE_ENABLED=true`: 기존 91~92차 ensemble 경로

## 완료 체크리스트

- [x] flag 추가, 기본값 false
- [x] `allGraspReject` 블록 flag 가드
- [x] flag off 시 89차와 동일 fallback
- [x] `ensembleEnabled=` 로그
- [ ] tsc — 95/96과 함께 확인
