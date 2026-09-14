# 144차 — "$0.50 프리미엄 페이지" 전면 실측 탐색 (배선 변경 없음)

생성: 2026-09-08

## 배경

사용자 질문: "상세페이지 1건에 최소 $0.50 이상 쓰면서 정말 상품성 있게 나오게 하려면?" 에 대한
답변으로, 이미 143차까지 검증된 아이콘 모델 업그레이드(recraft-v4-svg, flux-dev)만 적용해도
카테고리에 따라 $0.45~0.55 구간에 자연스럽게 도달한다는 추정을 드렸습니다. 이번 라운드는
그 추정을 **실측으로 검증**하고, 지금까지 가격을 확인하지 않은 채 "이렇게 하면 더 좋아질
것"이라고만 알고 있던 항목들(배경 후보 다장화, AI 라이프스타일샷 상시 적용, 라이프스타일
합성 상시 적용, 이펙트 오버레이 확장)의 **진짜 원가**를 확인하는 라운드입니다.

**143차와 동일한 원칙**: 비교·실측만 하고, 이번에도 프로덕션 기본값/배선은 전환하지
않습니다. 결과 리포트를 보고 다음 라운드에서 실제 적용 여부를 결정합니다.

### 먼저 확인해야 할 기존 문서 불일치

`review/127cha-report.md`에 이미 기록된 내용인데, 후속 원가 문서들에 반영이 안 됐을 수
있습니다 — 이번 라운드에서 확정해 주세요:

> "env 주의: `BACKDROP_PROVIDER=flux-kontext-pro`는 후보 수를 `BRIA_BACKDROP_CANDIDATES`
> (기본 2)로 읽어, `BACKDROP_CANDIDATES=1` 설정과 무관하게 kontext **2회** 호출됨."

즉 `pagzly-pricing-cost-model-2026.md`의 "히어로 배경 단독 $0.04" 앵커가 **현재 실제
프로덕션 경로(kontext, 후보 2장)에서는 $0.08(2×$0.04)일 가능성이 있습니다.** 이번 라운드
1번 항목으로 이걸 실제 로그로 확정해 주세요 (기존 앵커가 틀렸다면 다음 원가 문서 갱신 때
같이 고쳐야 합니다).

## 목표 — 5개 항목 실측, 배선 미변경

### A. 배경 후보 다장화

1. 위 불일치부터 확정: 현재 라이브 경로(`BACKDROP_PROVIDER=flux-kontext-pro`)가 실제로
   몇 회 호출되는지 로그로 재확인.
2. `BRIA_BACKDROP_CANDIDATES`를 2 → 4로 올려 1회 실측 (원가 변화 확인).
3. 후보가 늘면 `pickBestBackdrop`(vision 기반 자동 선택 or 사람 선택 UI)의 선택 품질이
   체감상 나아지는지 육안 비교 (2장 세트 vs 4장 세트 결과물 스크린샷).
4. **테스트 종료 후 `.env.local`을 원래 값(`BRIA_BACKDROP_CANDIDATES=2`)으로 반드시 복구**
   하고, 복구 확인 로그(before/after diff)를 리포트에 남길 것 — 105차 워크플랜의
   "비용 직결 설정값은 사용자 지시 없이 바꾸지 않는다" 원칙을 지키기 위한 절차입니다
   (이번엔 사용자가 이 탐색 자체를 요청했으므로 측정은 진행하되, 실측 후 원복은 필수).

### B. 스튜디오 컴포지트 확장 (`computeStudioCompositeLimit`)

1. 현재 `lib/lifestyle-shot-planner.ts`의 `computeStudioCompositeLimit`는 업로드 8장
   이상이면 4장까지만 배경합성하고 나머지는 원본을 그대로 씁니다(스킵 로그:
   `[enhance] idx=N skip studio composite — keep original`).
2. 업로드 8장 픽스처로, 이 리밋을 4 → 8(전체)로 올렸을 때 실제 `enhance-image` API 호출
   횟수·원가 증가분을 실측.
3. 스킵되던 인덱스(4~7)가 실제로 배경합성됐을 때 결과물이 시각적으로 나아지는지 스크린샷
   비교 (현재 raw 원본/이펙트만 얹힌 상태 vs 풀 배경합성 상태).
4. 코드 변경은 스크립트 내 로컬 오버라이드로만 하고, `lifestyle-shot-planner.ts` 자체는
   수정하지 않음(다음 라운드 결정 사항).

### C. AI 라이프스타일샷 상시 적용 (`enableAiLifestyleShots`)

1. 현재 옵트인(기본 꺼짐, `photo-pipeline-client.ts`의 `enableAiLifestyleShots` 파라미터가
   `true`일 때만 실행)입니다. `lib/generate-lifestyle-shots.ts`의
   `estimateLifestyleShotUnitCostUsd()`가 "단가 **추정**"이라고 스스로 명시하고 있습니다
   (standard=Kontext $0.04/장 고정값, premium=Gemini 계산식) — **이건 추정치지 실측이
   아니므로, 이번에 실제 API 호출로 확정해 주세요.**
2. `LIFESTYLE_SHOT_QUALITY=standard`(기본)와 `=premium` 두 경로 모두 1~2장씩 실제 생성해
   실측 단가를 확인.
3. `gate.cost`/`retryShot.cost`(품질 게이트 실패 시 재시도 비용)가 실제로 발생하는 케이스가
   있는지도 로그로 확인 — 재시도가 잦으면 추정 단가보다 실제 원가가 높아질 수 있음.
4. standard vs premium 결과물 육안 비교 스크린샷.

### D. 라이프스타일 합성(`/api/lifestyle-composite`) 상시 적용

1. 현재는 사용자가 별도 라이프스타일 참고 이미지(`lifestyleImageUrl`)를 넣었을 때만 실행.
2. 이 API의 실제 원가를 아직 확정 문서가 없습니다 — `photoCostBreakdown.lifestyleComposite`
   필드로 실측치를 찍어 확인.
3. 제품 높이(cm) 있는 케이스/없는 케이스(스킵 경로) 모두 1회씩 실측.

### E. 아이콘/배너 — recraft-v4-svg + flux-dev 전면 적용 (143차 결과 재사용, 실제 조합 실측)

1. 143차는 개별 비교만 했습니다. 이번엔 **한 페이지 안에서 동시에**:
   - `illustration_banner` + `stat_infographic` → `recraft-v4-svg` ($0.08/장)
   - `checklist` / `usage_steps` / `spec_table` → `flux-dev` ($0.025/장)
   로 전부 켜서 실제 카테고리별(화장품 기준 우선, 가능하면 5개 카테고리 전부) 아이템
   개수로 실측 원가를 뽑아 주세요. 143차 추정 방식(항목당 1~2장 대표 샘플)이 아니라
   **실제 DeepSeek 카피가 채우는 아이템 개수 그대로**를 써야 사용자에게 드린 "$0.45~0.55"
   추정이 맞는지 검증됩니다.

### F. 이펙트 오버레이 확장 (`concept-effects.ts`)

1. 현재 화장품 카테고리에만 1장 적용됩니다 (`applyConceptOverlaysToProductImages`,
   `cosmeticsOnly: true`).
2. 원가 자체는 이미 알려진 모델(flux-schnell 계열로 추정)이라 단가보다는 **몇 장까지
   늘렸을 때 실제로 비용이 얼마나 붙는지**를 확인 (예: 1장 → 3장). 카테고리 확장(화장품
   외)은 이번 라운드에서 코드로 구현하지 말고, 실측만 위해 로컬 스크립트에서 강제 호출.

## G. 종합 실측 — "$0.50 페이지" 전체 조합

A~F를 전부 켠 상태로, 업로드 8장짜리 화장품 픽스처 1건을 실제로 끝까지 생성해서:

- 컴포넌트별 원가 내역표 (backdrop / studio-composite / lifestyle-shots / lifestyle-composite
  / icons-banner / effects / DeepSeek·Claude 등 나머지)
- 합계가 실제로 $0.50 근처에 오는지, 아니면 크게 벗어나는지
- 최종 결과물 스크린샷(풀 페이지) — 상품성이 체감상 확실히 좋아졌는지 육안 평가도 남겨
  주세요 (숫자만큼 품질도 따라오는지가 이 라운드의 핵심 질문)

## 검증

- `review/144cha-report.md`
- `review/144cha-cost-breakdown.json` (컴포넌트별 실측 원가, byModel/byStage 구조)
- `review/qa-screenshots/144cha-backdrop-candidates-2v4.png`
- `review/qa-screenshots/144cha-studio-composite-4v8.png`
- `review/qa-screenshots/144cha-lifestyle-shots-standard-vs-premium.png`
- `review/qa-screenshots/144cha-full-050-page.png` (종합 실측 최종 결과물)
- `.env.local` before/after diff (A 항목 원복 증빙)
- `tsc --noEmit` EXIT_CODE=0
- 이번에도 프로덕션 기본값/142차 그룹 배선 미변경 확인

## 하지 않는 것

- `ICON_MODEL` 전역 기본값, 142차 그룹 배선(statInfographic/banner=recraft), 143차 이후
  확정된 어떤 기본값도 변경 금지 — 이번에도 **실측만**
- `lifestyle-shot-planner.ts`, `lifestyle-shot-config.ts`, `photo-pipeline-client.ts`,
  `concept-effects.ts` 등 프로덕션 lib 파일 자체 수정 금지 — 오버라이드는 탐색 스크립트
  안에서만
- `.env.local`의 `BRIA_BACKDROP_CANDIDATES` 등 실측 중 임시로 바꾼 값은 **측정 끝나면
  반드시 원복** (원복 안 하고 리포트 제출 금지)
- `section-templates.ts` 슬롯 구조 변경 금지
- 경쟁사 카피/디자인 그대로 베끼기, 근거 없는 공포 마케팅 문구, 가짜 후기/통계/인증마크
  금지 (기존 스탠딩 룰 동일 적용)
- 가격/스키마 추측 금지 — 이미 알려진 값(recraft-v4-svg $0.08, flux-dev $0.025 등)도
  이번 조합 실측에서 실제 청구 로그로 다시 확인

## 완료 체크리스트

- [ ] 배경 후보 수 불일치(127차 기록) 확정 — 현재 실제 호출 횟수/원가
- [ ] 배경 후보 2→4장 실측 + 선택 품질 비교
- [ ] 스튜디오 컴포지트 4→8장 실측 + 결과물 비교
- [ ] AI 라이프스타일샷 standard/premium 실측 단가 확정 (추정치 아님)
- [ ] 라이프스타일 합성 API 실측 원가 확정
- [ ] recraft-v4-svg + flux-dev 동시 적용, 실제 아이템 개수 기준 원가 실측
- [ ] 이펙트 오버레이 장수 확장 원가 실측
- [ ] 종합: $0.50 조합 1건 풀 생성 + 컴포넌트별 원가표 + 최종 스크린샷
- [ ] `.env.local` 원복 확인 (before/after diff)
- [ ] `tsc --noEmit` EXIT_CODE=0
- [ ] 프로덕션 기본값/배선 미변경 확인
