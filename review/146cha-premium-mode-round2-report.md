# 146차 — PREMIUM_QUALITY_MODE 확장 (배경 후보 4장 + stat_infographic 업그레이드)

생성: 2026-09-08
작업자: Claude (145차와 동일한 클라우드 샌드박스 파이프라인으로 직접 구현)
원칙: 145차와 동일 — **프로덕션 기본값 불변**. `PREMIUM_QUALITY_MODE=true`를 켜지 않는 한
지금까지와 완전히 동일하게 동작합니다. 새 env 변수는 추가하지 않았습니다(같은 토글 재사용).

## 배경

"더 업그레이드 해봐 자동으로" 요청에 따라, 145차 리포트의 "다음 후보(미적용)" 두 항목을
이번 라운드에 적용했습니다:

1. 배경 후보 수 확장 — 145차 당시엔 "자동 선택 로직이 없어 별도 작업 필요"라고 적었지만,
   이번에 `BackdropCandidatePicker.tsx`와 `app/api/generate-backdrop/route.ts`를 직접
   읽어보니 **이미 사람이 고르는 선택 UI가 프로덕션에 붙어 있고(`grid-cols-7`까지 대응),
   후보 수와 무관하게 그대로 동작**한다는 걸 확인했습니다. 즉 별도 UI 작업 없이 코드
   상한선 숫자만 바꾸면 되는 훨씬 가벼운 변경이었습니다 — 145차의 판단을 정정합니다.
2. `stat_infographic` 아이콘 모델을 recraft-v3 → recraft-v4로 (프리미엄 한정) 업그레이드.

## 변경 내용

`PREMIUM_QUALITY_MODE=true`일 때만 아래 2가지가 추가로 바뀝니다 (145차의 3가지에 더해):

| 항목 | 기본(false) | 프리미엄(true) | 근거 |
|---|---|---|---|
| 배경 후보 수 상한 | 최대 3 (미설정 시 2) | 최대 4 (미설정 시 4) | 143/144차 실측: 후보 4장이 선택 폭을 넓힘. 선택 UI는 이미 후보 수 무관하게 동작 |
| `stat_infographic` 아이콘 모델 | recraft-v3 ($0.04) | recraft-v4 ($0.04, 동일가) | 143차 실측: 동일가에 디테일 향상 |

**바뀌지 않는 것**:
- `BRIA_BACKDROP_CANDIDATES` env로 명시적으로 지정한 값은 여전히 존중됩니다 — 다만
  프리미엄 모드에서는 그 상한이 3이 아니라 4로 늘어납니다.
- `BackdropCandidatePicker.tsx`, `app/api/generate-backdrop/route.ts`는 전혀 손대지
  않았습니다 — 이미 후보 수에 무관하게 동작하는 코드였기 때문입니다.
- `spec_table` 아이콘은 여전히 flux-schnell 유지 (145차와 동일 사유).

## 예상 원가 영향 (화장품 기준)

- 배경 후보: 2장 → 4장이면 flux-kontext-pro 단가 기준 +2장 비용 (건당 대략 +$0.03~0.06대,
  프로바이더별 단가차 있음 — 실제 프로덕션은 `BACKDROP_PROVIDER=flux-kontext-pro` 사용 중).
- stat_infographic: recraft-v3→v4는 **동일가**라 원가 영향 없음 (품질만 향상).
- 145차의 +$0.215/건에 배경 후보 확장분만 추가되는 수준으로, 큰 폭의 원가 증가는 아닙니다.

## 구현 파일

- **`lib/photo-enhance.ts`**:
  - `isPremiumQualityMode` import 추가.
  - `getBriaBackdropCandidateCount()`: 상한을 `isPremiumQualityMode() ? 4 : 3`으로,
    미설정 시 기본값을 `isPremiumQualityMode() ? 4 : 2`로 변경. 4곳의 호출부
    (`generateBackdropViaBria`, `generateBackdropViaNanoBanana`,
    `generateBackdropViaFluxKontext`, `generateBackdropViaBriaGenFill`)는 모두 이 함수를
    통해서만 후보 수를 얻으므로 별도 수정이 필요 없었습니다.
- **`lib/concept-icons.ts`**:
  - `modelForIconGroup()`: `statInfographic` 케이스를 프리미엄 여부로 분기
    (`recraft-v4` vs `recraft-v3`). recraft 계열 공통 로직(동시성 1, outline 프롬프트,
    SVG 처리)은 145차에서 이미 일반화돼 있어 추가 변경이 필요 없었습니다.
  - 진단 로그 문구를 프리미엄 여부에 맞게 갱신 (기능에는 영향 없음).

## 검증 방법

145차와 동일한 클라우드 샌드박스 파이프라인 재사용 (기존 `node_modules`/dev-types 그대로):

- `npx tsc --noEmit` → **EXIT_CODE=0** (에러 0건)
- 수정 전, PC에서 두 파일을 다시 가져와 diff — 제가 작업을 시작한 시점의 원본과 완전히
  동일함을 확인 (그사이 다른 변경 없었음)
- PC에 반영 후 다시 가져와 diff — 보낸 내용과 바이트 단위로 동일함을 확인
- `.env.local`은 이번에도 전혀 건드리지 않았습니다.

**주의**: 이번에도 타입 체크까지만 검증했습니다. 배경 후보 4장이 실제로 Bria/flux-kontext
호출에서 잘 나오는지, `stat_infographic`이 recraft-v4로 실제 더 또렷하게 나오는지는 아직
라이브로 확인하지 않았습니다. `PREMIUM_QUALITY_MODE=true`로 켜고 실제 페이지를 하나
만들어 보시는 걸 권합니다.

## 145차 이후 누적 — PREMIUM_QUALITY_MODE=true일 때 전체 변경 목록

1. `illustration_banner` 모델: recraft-v3 → recraft-v4-svg
2. checklist / usageSteps 아이콘 모델: ICON_MODEL(기본 flux-schnell) → flux-dev
3. 스튜디오 컴포지트 한도 (업로드 8장 이상): 4 → 8
4. 배경 후보 수 상한: 3(기본 2) → 4(기본 4) *(146차 신규)*
5. `stat_infographic` 아이콘 모델: recraft-v3 → recraft-v4, 동일가 *(146차 신규)*

## 다음 후보 (미적용, 확인만 함)

- `spec_table` 아이콘 전면 교체 — 144차 자체가 "체감 대비 원가만 크다"고 명시적으로
  권고한 항목이라 145/146차 모두 의도적으로 제외했습니다. 사용자님이 원하시면 다음
  라운드에 옵션으로 추가할 수 있습니다.
