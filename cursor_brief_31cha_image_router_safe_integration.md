# 31차 브리프 — ImageRouter(멀티 프로바이더)를 기존 파이프라인에 안전하게 통합

## 배경 및 결정 사항

STEP1-10에서 만든 새 파이프라인(`runPageGenerationPipeline`)과 기존 서비스(`/api/generate` 계열)
둘 중 하나를 프로덕션으로 키울지 논의했고, **기존 파이프라인을 그대로 두고 이미지 생성
부분에만 ImageRouter(멀티 프로바이더: FLUX.2 Pro / Kontext Pro / Gemini)를 얹는 방향**으로
결정했다. 이유: 기존 파이프라인에는 26~30차에 걸쳐 쌓은 카테고리별 슬롯 규칙
(`lib/section-templates.ts`), 유리컵/카드/UI 금지 negative 프롬프트(23~25차, 28차),
`FALLBACK_BY_CATEGORY`(29차), 원본 사진 조기 보호(30차) 등이 전부 들어있다 — 이걸 버리고
새 파이프라인으로 옮기면 그 작업을 전부 다시 해야 한다.

**즉시 현황**: 현재 로컬 `.env.local`에 `IMAGE_ROUTER_ENABLED`가 없어서 코드 기본값(ON)으로
켜져 있었고, 그 결과 `/api/section-backdrops`(성분/텍스처 배경)가 조용히 Gemini로 샐 수 있는
상태였다. **이 브리프 작업 전까지는 `.env.local`에 `IMAGE_ROUTER_ENABLED=false`를 유지해서
꺼둘 것.** 이 브리프가 끝나야 다시 켠다.

## 절대 규칙 (이번 브리프 범위)

- **히어로 배경(`BACKDROP_PROVIDER=flux-kontext-pro`, `generate-backdrop/route.ts`)은 이번
  범위 밖.** 그대로 둘 것 — 28차에서 막 안정화한 경로라 건드리지 않는다.
- 슬롯/템플릿 구조 변경 금지, 가짜 후기/인증 데이터 추가 금지 — 기존 하드 룰 그대로.
- `lib/section-templates.ts`/`lib/concept-brief.ts`/`lib/assign-section-images.ts`/
  `lib/cosmetics-compliance.ts` 등 카피·구조·컴플라이언스 로직은 건드리지 않는다 — 이번 건
  순수하게 "섹션 배경 이미지를 누가 생성하느냐"만 다룬다.

## 확인 및 수정 지시

### 1. Router 경유 시 negative 프롬프트가 실제로 전달되는지 확인 (최우선)

`lib/photo-enhance.ts`의 `generateSectionBackdropVariants()`는 `flux-schnell` 직접 호출
경로에서 `SECTION_BACKDROP_PROMPTS_BY_CATEGORY`(화장품 ingredient/texture 유리 금지 문구,
23~25차)와 전 카테고리 공통 negative 문자열(28차, "no glass container...no card...")을 최종
프롬프트에 반드시 포함시킨다. 이번 STEP 작업으로 추가된 `tryGenerateImageViaRouter` 호출부가
**이 완성된 최종 프롬프트 문자열을 그대로 Router에 넘기는지, 아니면 별도의(더 짧은/오래된)
프롬프트를 새로 조립해서 넘기는지** 코드로 확인해달라. 후자라면 이게 오늘 하루 종일 잡은
유리컵/카드 회귀가 Gemini 경로에서 그대로 재발하는 직접 원인이 된다 — 반드시 전자로
통일할 것.

### 2. 프로바이더별 negative 프롬프트 처리 방식 확인

`lib/image-router/`의 Gemini/FLUX.2 Pro/Kontext Pro 각 provider 구현이 `negative_prompt`
같은 별도 파라미터를 지원하는지, 아니면 (기존에 확인했던 bria/nano-banana/flux-kontext-pro
셋이 그랬듯) 본문 프롬프트 텍스트에 자연어로 녹여야만 하는지 프로바이더별로 표로 정리해서
보고해달라. 파라미터가 없는 프로바이더는 1번 항목의 negative 문자열이 반드시 본문 프롬프트
끝에 텍스트로 붙어야 한다.

### 3. 비용 캡 확인

Gemini는 STEP7 요약상 "budget-aware premium fallback"으로 설계됐다고 돼 있다. 섹션 배경
생성(`DETAIL_PAGE_GRAPHIC` 또는 해당 task 타입)에 대해 ImageRouter의 budget 설정이 실제로
얼마인지, 어떤 파일/상수에서 관리되는지 확인해서 보고해달라. 무제한이거나 기존 flux-schnell
대비 과도하게 높으면(예: 상품 1건당 성분+텍스처 배경 2장 생성 비용이 기존 대비 몇 배인지)
경고와 함께 낮춰서 제안해달라 — 구현은 승인 후.

### 4. 비교 테스트 (구현 아님, 결과만 보고)

같은 상품 데이터로 `IMAGE_ROUTER_ENABLED=true`/`false` 두 가지 상태에서 성분/텍스처 배경을
각각 생성해서 (화장품/뷰티 1건 필수, 가능하면 전자제품 1건 추가) 결과 이미지를 나란히
비교해달라. 특히 화장품 쪽은 **유리컵/유리잔/비커/카드/UI 프레임이 하나도 없는지** 육안으로
확인. TEST_MODE 캐시 때문에 옛날 결과가 재사용되지 않도록 캐시 무효화하거나 새 상품명으로
테스트할 것.

## 이번 라운드에서 하지 말아야 할 것

- 1~3번 확인 결과, negative 프롬프트가 Router 경유 시 누락되는 게 확인되면 **즉시 고치지
  말고** 정확히 어디서 누락되는지 코드 위치와 함께 먼저 보고해달라 — 프로바이더마다 프롬프트
  조립 방식이 다를 수 있어 한 번에 몰아서 고치면 회귀 위험이 있다.
- `IMAGE_ROUTER_ENABLED=true`로 다시 켜는 것은 1~4번이 전부 확인·수정·검증된 뒤에만.
- 히어로 배경 경로(`flux-kontext-pro`)를 Router로 옮기는 건 이번 브리프에 포함하지 않는다
  — 별도 브리프로.

## 검증 방법 (완료 보고 시 Claude가 재확인)

- 코드 대조: `lib/photo-enhance.ts`(`generateSectionBackdropVariants`/`tryGenerateImageViaRouter`
  연동부), `lib/image-router/*`(프로바이더별 프롬프트 조립).
- `tsc --noEmit` 클린.
- 4번 비교 테스트 결과 이미지(Router ON/OFF 각각)를 실제로 받아서 육안 재확인 — 특히 화장품
  유리컵 회귀 여부.
- 비용 캡 값과 근거를 보고서에 포함했는지 확인.
