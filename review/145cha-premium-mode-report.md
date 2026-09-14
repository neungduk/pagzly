# 145차 — PREMIUM_QUALITY_MODE 환경변수 옵션 추가 (Claude 직접 구현)

생성: 2026-09-08
작업자: Claude (Cursor 사용량 소진으로 클라우드 샌드박스 검증 파이프라인으로 직접 구현)
원칙: **프로덕션 기본값 불변**. `PREMIUM_QUALITY_MODE=true`를 명시적으로 켜지 않는 한
지금까지와 완전히 동일하게 동작합니다.

## 배경

144차 실측으로 도출한 "스마트 $0.50 레시피"(참고: `pagzly-pricing-cost-model-2026.md` §8,
`cursor_brief_144cha_premium_050_cost_probe.md`) 중 원가 대비 체감 이득이 확실한 항목만
골라 옵션으로 추가했습니다. 스펙 아이콘 전면 교체처럼 144차 자체가 "체감 대비 원가만 크다"고
권고했던 항목은 제외했습니다. 결제/크레딧 시스템이 아직 없어 전체 기본값을 올리면 매출 없이
비용만 늘어나므로, 사용자님 선택대로 **환경변수로 켜고 끄는 옵션**으로만 추가했습니다.

## 켜는 방법

`.env.local`에 아래 한 줄을 추가하면 즉시 적용됩니다 (재배포/재시작 필요):

```
PREMIUM_QUALITY_MODE=true
```

끄려면 그 줄을 지우거나 `false`로 두면 됩니다 (부재 시 기본 false).

## 변경 내용

`PREMIUM_QUALITY_MODE=true`일 때만 아래 3가지가 바뀝니다:

| 항목 | 기본(false) | 프리미엄(true) | 근거 |
|---|---|---|---|
| `illustration_banner` 모델 | recraft-v3 ($0.04) | recraft-v4-svg ($0.08) | 143차: 동일 계열 중 가장 또렷한 벡터 결과 |
| checklist / usageSteps 아이콘 모델 | ICON_MODEL(기본 flux-schnell, $0.003) | flux-dev ($0.025) | 143차 A/B: schnell 글리프 환각 2/2 vs flux-dev 0/2 |
| 스튜디오 컴포지트 한도 (업로드 8장 이상) | 4 | 8 | 144차 실측: idx4-7 원본→합성 전환, 밀도 균일해짐 |

**바뀌지 않는 것 (144차 권고에 따라 의도적으로 제외)**:
- `spec_table` 아이콘은 프리미엄이어도 flux-schnell 유지 — 144차 실측(스펙 13장 케이스)에서
  이 항목만 flux-dev로 바꿔도 페이지당 +$0.325로, 배너/체크리스트보다 원가 기여가 훨씬 크면서
  작게 보여 체감 이득은 낮다고 확인됨.
- `stat_infographic`은 이미 142차부터 recraft-v3 고정 — 이번엔 건드리지 않음(업그레이드는
  다음 라운드 후보로 남겨둠).
- 배경 후보 수(`BRIA_BACKDROP_CANDIDATES`)는 미변경 — 코드 상한(`Math.min(3, …)`)이 있어
  env만으로 4장을 못 만들고, 자동 선택 로직도 없어 후보 확장 자체가 별도 작업 필요.
- 이펙트 오버레이 개수는 미변경 — 이미 프로덕션 라이브 상한 2로 고정돼 있음.

## 예상 원가 영향 (화장품 기준, 144차 실측 단가)

프리미엄 모드로 checklist 4개 + banner 1개 + 업로드 8장 케이스라면:
- banner: $0.04 → $0.08 (+$0.04)
- checklist 4장: $0.012 → $0.10 (+$0.088)
- 스튜디오 컴포지트: +$0.087 (144차 실측 델타 그대로)
- **합계 대략 +$0.215/건** (spec_table 등 나머지는 그대로)

144차의 "합 ≈$0.84~0.92" 전면 프리미엄 스택보다 훨씬 낮습니다 — 스펙 아이콘 전면 교체를
뺐기 때문입니다.

## 구현 파일

- **`lib/premium-mode.ts`** (신규) — `isPremiumQualityMode()` 단일 함수, `test-mode.ts`와
  동일 패턴.
- **`lib/concept-icons.ts`**:
  - `IconModelKey`에 `recraft-v4` / `recraft-v4-svg` / `flux-dev` 3개 추가 (143차 실측
    Replicate UI 가격 + OpenAPI 스키마 기준 `ICON_MODEL_REF`/`ICON_COST_USD_BY_MODEL` 반영).
  - `buildIconModelInput`에 두 모델 입력 스키마 추가 (v4/v4-svg는 style 파라미터 없음 —
    143차 확인, outline 미학은 프롬프트로만 지시; flux-dev는 `num_inference_steps` 등 포함).
  - `modelForIconGroup`: `PREMIUM_QUALITY_MODE=true`일 때 checklist/usageSteps만
    flux-dev로 전환, specTable은 그대로.
  - recraft-v4-svg는 **실제 SVG를 반환**(143차 확인)하므로, 응답을 `sharp`로 PNG
    래스터화한 뒤 기존과 동일한 `data:image/png;base64,...` 형식으로 반환 — 렌더러·
    다운스트림 코드는 전혀 손대지 않아도 됩니다.
  - recraft 계열(v3/v4/v4-svg) 전체를 동시성 1(+11초 간격)로 묶음 — 기존 v3 전용 로직을
    일반화 (저크레딧 계정 burst 제한 대응, 143차와 동일 패턴).
- **`lib/concept-illustration.ts`**:
  - 고정 상수였던 `ILLUSTRATION_BANNER_MODEL`을 `resolveIllustrationBannerModel()` 함수로
    바꿔 프리미엄 여부에 따라 recraft-v3/v4-svg 분기.
  - v4-svg용 outline 프롬프트 힌트 추가, SVG→PNG 변환 로직 추가(concept-icons와 동일 패턴).
- **`lib/lifestyle-shot-planner.ts`**:
  - `computeStudioCompositeLimit`: 업로드 8장 이상 + 프리미엄이면
    `Math.min(uploadCount, 8)`(사실상 8), 아니면 기존 4. 5~7장 구간은 144차가 검증하지
    않은 범위라 손대지 않음(기존 3 유지).

## 검증 방법 (Cursor 없이, 클라우드 샌드박스)

Cursor 사용량이 소진된 상태라 이번엔 제가 직접 코드를 작성했습니다. PC에 터미널 접근이
없어서, 프로덕션에 필요한 소스 전체(lib 176개 + components 61개 + app 48개 + 루트 설정,
총 291개 파일 — `.env.local`은 시크릿이라 placeholder로 대체)를 클라우드 작업공간에
가져와 `npm install` → `next dev`로 Next.js 타입 생성 → `npx tsc --noEmit`을 돌리는
파이프라인을 이번에 처음 구축·검증했고, 이 변경도 그 파이프라인으로 확인했습니다.

- `npx tsc --noEmit` → **EXIT_CODE=0** (에러 0건)
- 수정 전 원본 3개 파일을 PC에서 다시 가져와 diff — 제가 작업을 시작한 시점과 완전히
  동일함을 확인(중간에 다른 변경 없었음)
- PC에 반영 후 다시 가져와 diff — 보낸 내용과 바이트 단위로 동일함을 확인
- `.env.local`은 이번 작업에서 전혀 건드리지 않았습니다(원본 그대로) — `PREMIUM_QUALITY_MODE`를
  켜려면 위 "켜는 방법"대로 직접 한 줄 추가해주세요.

**주의**: 이번 검증은 `npx tsc --noEmit`(타입 체크)까지만입니다. 실제 Replicate API를
호출해 recraft-v4-svg/flux-dev 아이콘이 기대대로 나오는지, SVG→PNG 변환이 실제 응답에서도
깨끗하게 되는지는 143차에서 이미 검증된 스키마/패턴을 그대로 재사용했지만, 이번 코드
경로로 실제 이미지를 뽑아보는 라이브 검증은 아직 하지 않았습니다. `PREMIUM_QUALITY_MODE=true`로
한 번 켜서 실제 페이지를 만들어 보시는 걸 권합니다 — 결과가 궁금하시면 다음 라운드에서
스크린샷 비교까지 해드릴 수 있습니다.

## 다음 후보 (미적용)

- `stat_infographic`도 recraft-v3 → recraft-v4로 업그레이드 (동일가 $0.04, 143차 확인상
  디테일↑).
- 배경 후보 확장(`getBriaBackdropCandidateCount` 코드 상한 3 제거 + 후보 중 자동/수동 선택
  UI) — 144차가 후보 4장의 시각적 이득은 확인했지만, 자동 선택 로직이 없어 별도 작업 필요.
