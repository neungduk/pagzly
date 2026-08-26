# 25차 Cursor 구현 브리프 — 유리컵 합성 잔존 원인 (성분/텍스처 섹션 배경 전용 코드 경로)

## 배경

24차(`lib/concept-brief.ts` 4곳 수정)를 Cursor가 브리프대로 정확히 구현한 것을 코드 diff와
`tsc --noEmit`(신규 에러 0건)로 확인한 뒤, 라이브 E2E로 두 차례 재검증했습니다.

1. **1차 재검증** — 기존에 쓰던 상품 사진(손이 병을 쥐고 있는 구도)으로 생성 → 배경 이미지
   4장(`ingredient.png`, `texture.png`, `compare-before.png`, `compare-after.png`) 전부에서
   유리컵 합성이 재현됨.
2. **2차 재검증 (손 없는 사진으로 교체, confound 격리 목적)** — 같은 상품을 손 없이 병만
   놓인 사진으로 교체하여 재생성(`TEST_MODE=false` 실제 실행, `photoCostBreakdown.conceptBrief`
   = $0.00037로 실제 DeepSeek 경로 확인, `backdrop` = $0.08로 실제 flux-kontext-pro 2회 호출
   확인) → **결과가 갈렸습니다**:
   - `compare-after.png`/`...-enhanced-fx-moisture.png` (메인 상품 사진 배경, `flux-kontext-pro`
     경로, `buildBriaBackdropPrompt()`+`moisture` 템플릿 사용) → **유리컵 없이 깨끗하게 생성됨.
     24차 + 23차 수정이 이 경로에서는 정상 작동함이 확인됨.**
   - `ingredient.png`, `texture.png` (성분/텍스처 섹션 배경, `flux-schnell` 경로) →
     **여전히 유리컵 합성 재현됨.**

## 진짜 원인 (3번째) — `generateSectionBackdropVariants()`는 23차·24차가 건드린
어떤 코드 경로와도 무관한 완전히 별도의 프롬프트 테이블을 사용합니다

`lib/photo-enhance.ts`의 `generateSectionBackdropVariants()`(1259-1301행)는 `ingredient.png`/
`texture.png` 두 섹션 배경을 `flux-schnell`(텍스트→이미지 생성 모델, 원본 사진을 입력받지
않음)로 만듭니다. 이 함수는:

- `buildBriaBackdropPrompt()`를 호출하지 않습니다 → 23차가 고친 `moisture` 템플릿의
  "no glass container, no drinking glass, no vessel, no cup" negative가 전혀 적용되지 않습니다.
- 대신 완전히 독립된 프롬프트 테이블 `SECTION_BACKDROP_PROMPTS_BY_CATEGORY`(1183-1229행)를
  사용하는데, 화장품/뷰티 카테고리의 `ingredient`/`texture` 프롬프트(1188-1191행)에는
  유리 용기 금지 문구가 **전혀 없습니다**.
- `conceptBrief`(24차가 고친 파일)의 `formatConceptPromptBlock()` 결과는 `conceptBlock`으로
  주입되긴 하지만(1266, 1274행), 문장 중간에 묻혀 있을 뿐 23차가 `buildBriaBackdropPrompt()`에
  넣은 것과 같은 최하단 강조 negative가 없습니다. `flux-schnell`은 원본 이미지 앵커가 없는
  순수 생성 모델이라 "촉촉/물방울/파스텔 K-beauty" 프롬프트에 대해 유리컵+물방울 스톡사진
  구도로 기본 수렴하는 경향이 `flux-kontext-pro`보다 더 강한 것으로 보입니다.

즉 23차는 `backdrop-prompt-templates.ts`, 24차는 `concept-brief.ts`를 고쳤지만, 이 세 번째
독립 경로(`SECTION_BACKDROP_PROMPTS_BY_CATEGORY` + `generateSectionBackdropVariants()`)는
지금까지 어느 라운드에서도 다루지 않았습니다.

## 재현 증거

- 상품: "글로위스트 드림글로우 카멜리아 에센스 미스트 v3" (손 없는 사진), 화장품/뷰티,
  핵심특징에 수분/촉촉/보습 명시 → `moisture` 테마·`-fx-moisture` 파일명 확인
- `TEST_MODE=false` 실제 실행, `photoCostBreakdown.conceptBrief` ≠ 0 (실제 DeepSeek 경로 확인)
- `ingredient.png`, `texture.png`: 제품이 물이 담긴 유리컵/유리잔 안에 놓인 구도로 합성됨
- `compare-after.png`(메인 배경, 같은 생성 실행 내): 유리컵 없이 정상 — **같은 실행에서
  경로에 따라 결과가 갈린다는 것이 이 코드 분리를 직접 증명**

## 수정 지시사항

### 파일: `lib/photo-enhance.ts`

**1) `SECTION_BACKDROP_PROMPTS_BY_CATEGORY["화장품/뷰티"]` (1188-1191행) — 유리 용기 금지 추가**

```ts
// 기존
"화장품/뷰티": {
  ingredient:
    "extreme close-up of a glowing pastel-toned studio surface, soft {{TONE}} gradient, delicate light bokeh and gentle specular highlights, luminous radiant K-beauty mood, no bottle, no dropper, no product, no packaging, no text, no logo, no human skin, no flat gray, product photography empty backdrop",
  texture:
    "macro photograph of a glowing pastel-toned formula droplet or gentle swirl on a soft {{TONE}} surface, luminous highlight, shallow depth of field, vivid radiant color, no bottle, no packaging, no hands, no text, no logo, no flat gray, empty formula-only frame",
},
```

```ts
// 수정
"화장품/뷰티": {
  ingredient:
    "extreme close-up of a glowing pastel-toned studio surface, soft {{TONE}} gradient, delicate light bokeh and gentle specular highlights, luminous radiant K-beauty mood, no bottle, no dropper, no product, no packaging, no text, no logo, no human skin, no flat gray, no glass container, no drinking glass, no vessel, no cup, no beaker, no jar, product photography empty backdrop",
  texture:
    "macro photograph of a glowing pastel-toned formula droplet or gentle swirl on a soft {{TONE}} surface, luminous highlight, shallow depth of field, vivid radiant color, no bottle, no packaging, no hands, no text, no logo, no flat gray, no glass container, no drinking glass, no vessel, no cup, no beaker, no jar, empty formula-only frame",
},
```

**2) `generateSectionBackdropVariants()` 프롬프트 조립부 (1272-1279행 부근) — 최하단
공통 강조 negative 추가 (23차의 `buildBriaBackdropPrompt()` 패턴과 동일하게)**

```ts
// 기존
const prompt = [
  sectionPrompts[kind].replace(/\{\{TONE\}\}/g, toneDescription),
  conceptBlock,
  lock,
  "obey lighting lock color temperature exactly, no golden hour, no amber gel",
]
  .filter(Boolean)
  .join(", ");
```

```ts
// 수정
const prompt = [
  sectionPrompts[kind].replace(/\{\{TONE\}\}/g, toneDescription),
  conceptBlock,
  lock,
  "obey lighting lock color temperature exactly, no golden hour, no amber gel",
  "no glass container, no drinking glass, no vessel, no cup, no beaker, no jar, keep background empty and out of focus",
]
  .filter(Boolean)
  .join(", ");
```

(다른 카테고리에는 유리 용기 모티프가 원래 없었으므로 이 negative를 모든 카테고리 공통으로
추가해도 부작용이 없습니다 — 24차의 "공통 금지 문구" 패턴과 동일한 안전한 강화입니다.)

## 라이브 검증 시 (이번에도 반드시 확대 육안 확인)

1. 화장품 + 수분/보습/촉촉 키워드로 생성 → **`ingredient.png`와 `texture.png` 둘 다** 확대해서
   유리컵/유리잔/비커/병 등 액체 용기가 없는지 확인 (이번 25차의 핵심 검증 대상 — 메인 배경은
   24차에서 이미 정상 확인되었으므로 재확인만)
2. `photoCostBreakdown.conceptBrief` ≠ 0으로 실제 DeepSeek 경로 확인
3. 원인 1(가짜 UI/텍스트)·라벨 텍스트 선명도 회귀 없는지 재확인
4. 다른 카테고리(전자제품/식품 등) 섹션 배경도 1~2개 생성해 negative 추가로 인한 톤 변화나
   품질 저하가 없는지 가볍게 확인

## 참고 — 이번 조사로 확인된 것

- 24차 수정(`concept-brief.ts`)은 **효과가 있었습니다.** 메인 상품 배경(`flux-kontext-pro`
  경로)에서 유리컵 결함이 사라진 것을 손 없는 사진으로 직접 확인했습니다.
- 이전 라운드(24차 1차 재검증)에서 메인 배경까지 유리컵으로 나온 것은 그때 쓴 테스트
  사진(손으로 병을 쥔 구도)이 `flux-kontext-pro`(이미지 편집 모델)의 결과에 영향을 준
  confound였을 가능성이 높습니다 — 손 없는 사진으로 바꾸자 메인 배경만 즉시 깨끗해졌습니다.
- 성분/텍스처 섹션 배경(`ingredient.png`/`texture.png`)의 잔존 결함은 완전히 별도의
  원인(`generateSectionBackdropVariants()`가 쓰는 독립 프롬프트 테이블)이며, 이번에 처음
  특정되었습니다.
