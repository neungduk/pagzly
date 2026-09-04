# 102차 — Vision 역할 판정이 image_roles에 미반영 (100차 A 미동작)

생성: 2026-09-03

## 실측 (사용자)

상품 `a4e33e41-2348-40b6-b6b8-2536ce17ac3e` (글로위스트 드림글로우, 9장, TEST_MODE=false).

- 드롭다운 미조작 → 저장 `image_roles` 앞 9개 = `defaultRoleForIndex` 그대로
- idx3(옆으로 누운 병)=lifestyle, idx5(박스)=other → Vision이 반영됐다면 나올 수 없는 값
- 서술형 `image_analysis`는 저장됨 → 단계 카드가 "Vision 분석 반영"을 잘못 표시
- 99/100 B·C / 다양성 / lifestyle-ai / fx fan-out 은 정상 (유지)

## 원인 확정

| 가설 | 판정 |
|------|------|
| draft→final에서 `visionImageRoles` 전달 누락 | **경로 자체는 정상** (`CreateProductForm`·`draft/page`가 draft 응답의 `visionImageRoles`/`imageRoles`를 final body에 실음). 다만 draft 시점에 roles가 비면 final도 기본값만 유지. |
| confidence 0.5로 전부 탈락 | **아님** — roles가 비면 임계값 이전에 이미 소실. |
| Vision 응답 JSON에서 roles 유실 | **주원인** — 프롬프트가 `analysis`(장문) → `roles` 순서 + `max_tokens: 2000`. 9장 시 analysis에 토큰이 소진되면 JSON이 잘리고 `parseImageAnalysisResponse`가 **조용히 `roles=[]`**. 서술 analysis만 남으면 UI는 "Vision 분석 반영"처럼 보임. |

코드상 병합 우선순위(사용자 잠금 > Vision ≥0.5 > 기본값)는 맞았고, Vision 입력이 빈 배열이라 기본값이 그대로 저장됐습니다.

## 수정

1. **프롬프트** — `roles`를 `analysis`보다 **먼저** 출력하도록 변경, `max_tokens` 4096
2. **파싱** — `lib/parse-image-analysis-response.ts`: 잘린 JSON에서 `roles` 배열 salvage, 문자열 배열 변형 지원
3. **로그** — raw preview / `stop_reason` / `parsed roles=n` / roles 비면 **roles-only 1회 재시도**
4. **`[image-roles]`** — `visionCount` / `lowConfSkipped` / `visionInput` 추가; draft→final 빈 배열 경고
5. **배지** — `visionRolesApplied`를 `photo_cost_breakdown`에 저장. 단계 카드는 반영 장수 >0일 때만 `Vision 역할 반영 (N장)`, 아니면 `서술 분석 완료`
6. 사용자 드롭다운 잠금(`imageRoleUserSet`) 우선순위 **유지**

## 검증

- `npx tsc --noEmit` — 에러 0
- `npx tsx scripts/102cha-vision-roles-smoke.ts` — OK (salvage·merge·lock·badge)
- `npx tsx scripts/100cha-image-roles-smoke.ts` — OK

### 수동 재현 (비용 발생 — 사용자)

사진 순서 뒤섞어(1번 박스, 4번 정면) 신규 생성, 드롭다운 미조작 후:

1. 서버 로그에 `[image-analysis] parsed roles=…` 및 `[image-roles] vision=[…] … visionCount>0` 확인
2. 결과 콘솔 스니펫으로 `image_roles`가 `defaultRoleForIndex`와 **다른지** 확인
3. 드롭다운으로 지정한 인덱스만 고정값 유지 확인
4. 단계 카드 detail이 `Vision 역할 반영 (N장)`인지 확인

## 되돌리지 않음

99 assign 가드, 100 fx append / ingredient-texture / 단계 카드 골격, 101 URL dedupe.
