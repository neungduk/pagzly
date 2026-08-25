# 21차 Cursor 구현 지시서 — 배경/이미지 합성 색상 다양성 개선

## 배경 (사용자 피드백)

사용자가 화장품 상품 4개의 실제 생성 결과(hero, 성분 클로즈업, 텍스처, before/after 배경)를
첨부하며 "이미지 합성 자체가 너무 같은 색상으로 단조롭다"고 지적함. 4장 모두 톤이 pale
pink / blush / peach / ivory 계열로 수렴되어 있었음.

**중요**: 이건 20차에서 고친 `DetailSectionRenderer` UI 섹션 배경색(warm/cool/bold 순환)과는
완전히 다른 파이프라인임. 20차는 텍스트/카드 배경 등 **UI 크롬** 색상이고, 이번 21차는
**AI로 생성하는 실제 합성 사진(배경/성분/텍스처 이미지)** 색상 문제. `lib/design-tokens.ts`,
`components/DetailSectionRenderer.tsx`는 이번 지시서와 무관 — 손대지 않음.

## 근본 원인 (3가지, 코드로 확인됨)

### 원인 1 — 섹션 배경(성분/텍스처) 프롬프트가 100% 고정 리터럴

`lib/photo-enhance.ts` L1170-1216, `SECTION_BACKDROP_PROMPTS_BY_CATEGORY["화장품/뷰티"]`
(L1174-1179):

```ts
ingredient:
  "extreme close-up of a glowing pastel-toned studio surface, soft blush-pink or warm ivory gradient, ...",
texture:
  "macro photograph of a glowing pastel-toned formula droplet or gentle swirl on a soft blush or warm ivory surface, ...",
```

상품이 무엇이든, 브리프 키워드가 무엇이든 **항상 이 리터럴 문자열 그대로** 사용됨
(`generateSectionBackdropVariants`, L1246-1287 — theme 파라미터 자체가 없음). 첨부 이미지의
거품/방울/드로퍼 스플래시 배경이 이 경로일 가능성이 큼.

### 원인 2 — 메인 배경 템플릿 6개 중 4개가 blush/ivory 계열, 게다가 기본값도 그쪽

`lib/backdrop-prompt-templates.ts`, `PHOTOGRAPHY_TEMPLATES`:

- `moisture` (L42-53): `texture`/`prompt`에 "blush-pink and warm ivory" 고정
- `cleansing` (L78-89): "pastel mint **or blush**" — mint 대안이 있지만 blush 병기
- `radiant` (L90-101): "pale blush-pink to warm ivory gradient" 고정
- `minimal` (L119-130): "pale blush-ivory to warm cream" 고정 — 그리고 이게
  `resolvePhotographyTemplate`(L260-277)에서 **브리프 키워드가 하나도 안 걸리면 착지하는
  기본값**(L267, L276)이자 화장품 외 카테고리가 아닌 경우의 최종 폴백임.

`cooling`(cyan/mint)과 `premium_dark`(charcoal/black)만 blush 계열을 벗어나는데, 둘 다
`KEYWORD_TO_ID`(L199-251)의 좁은 키워드에 브리프 문구가 정확히 걸려야만 선택됨. 결과적으로
"어느 쪽에도 강하게 안 걸리는" 흔한 상품 브리프는 거의 다 `minimal`(blush-ivory) 로 떨어짐.

### 원인 3 — 상품별 실제 색감(theme) 신호가 프롬프트에서 구조적으로 약하거나 아예 없음

- `buildBriaBackdropPrompt`(L509-527)/`generateBackdrop`(L542-574)는 `describeColorTone
  (theme.accent/baseNeutral)`을 프롬프트 **맨 끝**에 부가 절로만 붙임(예: "soft {tone} set
  color without shifting key light"). 앞쪽에 두 번 반복되는 강한 리터럴 "blush-pink"/"warm
  ivory" 단어에 실질적으로 묻힘.
- `generateSectionBackdropVariants`는 `theme` 파라미터를 아예 받지 않아서, 성분/텍스처
  배경에는 상품별 색감이 **전혀** 반영되지 않음.

## 수정 방향

### A. `{{TONE}}` 플레이스홀더 도입

`lib/backdrop-prompt-templates.ts`:

1. `moisture`, `radiant`, `cleansing`, `minimal` 4개 템플릿의 `texture`/`prompt` 필드에서
   색상 리터럴("blush-pink", "blush or warm ivory", "pale blush-ivory to warm cream" 등)을
   `{{TONE}}` 토큰으로 교체. 조명/구도/기타 지시문은 그대로 유지.
   - 예 (moisture.prompt): `"...close-up soft blush-pink and warm ivory studio surface..."`
     → `"...close-up soft {{TONE}} studio surface..."`
   - 예 (minimal.prompt): `"...gradient backdrop from pale blush-ivory to warm cream..."`
     → `"...gradient backdrop in {{TONE}} tones..."`
   - `cleansing`은 "pastel mint or blush" → "pastel {{TONE}}"로.
2. 파일 맨 아래 (`resolvePhotographyTemplate` 근처)에 새 export 추가:

```ts
/** photography.prompt/texture 안의 {{TONE}} 자리에 상품별 색조 설명을 채워 넣는다. */
export function applyToneToTemplate(
  template: PhotographyTemplate,
  toneDescription: string,
): PhotographyTemplate {
  const fill = (s: string) => s.replace(/\{\{TONE\}\}/g, toneDescription);
  return { ...template, prompt: fill(template.prompt), texture: fill(template.texture) };
}
```

`resolvePhotographyTemplate` 자체 시그니처/동작은 변경하지 않음 — 순수 텍스트 치환 유틸만
추가.

### B. 메인 배경(hero) 호출부에서 상품별 톤 주입

`lib/photo-enhance.ts` 상단 import에 `applyToneToTemplate` 추가.

- `buildBriaBackdropPrompt` L516:
  ```ts
  const photography = applyToneToTemplate(
    resolvePhotographyTemplate(conceptBrief, category),
    describeColorTone(theme.baseNeutral),
  );
  ```
- `generateBackdrop` L567도 동일하게 수정.

(`describeColorTone`은 이미 L3에서 import되어 있음.)

### C. 성분/텍스처 배경에도 상품 테마 전달

1. `lib/photo-enhance.ts` L1174-1179 — 화장품/뷰티 ingredient/texture 리터럴을 `{{TONE}}`
   으로 교체 (A-1과 동일한 방식).
2. `generateSectionBackdropVariants` (L1246) 시그니처에 4번째 선택 파라미터 추가:
   ```ts
   export async function generateSectionBackdropVariants(
     shadow: ShadowAnalysis,
     conceptBrief?: ConceptBrief,
     category = "기타",
     theme?: Pick<CategoryTheme, "accent" | "baseNeutral" | "deepAccent">,
   ): Promise<{ ingredientUrl: string | null; textureUrl: string | null; cost: number }> {
   ```
   함수 내부, `sectionPrompts[kind]`를 join하기 전(L1257 근처)에 톤 치환:
   ```ts
   const toneDescription = theme ? describeColorTone(theme.baseNeutral) : "soft pastel";
   ...
   const prompt = [
     sectionPrompts[kind].replace(/\{\{TONE\}\}/g, toneDescription),
     conceptBlock,
     lock,
     "obey lighting lock color temperature exactly, no golden hour, no amber gel",
   ]
   ```
   (화장품 외 카테고리 프롬프트에는 `{{TONE}}` 토큰이 없으므로 `.replace`는 안전하게
   no-op — 다른 카테고리 문자열은 손대지 않아도 됨.)
3. `app/api/section-backdrops/route.ts`:
   - 요청 바디 타입(L26-30)에 `theme?: Pick<CategoryTheme, "accent" | "baseNeutral" |
     "deepAccent">` 추가 (import 필요: `import type { CategoryTheme } from
     "@/lib/category-theme";`).
   - `generateSectionBackdropVariants` 호출(L60-64)에 `theme` 그대로 전달.
4. `app/api/generate-backdrop/route.ts`:
   - L100에서 이미 계산되는 `theme` 변수를 응답 JSON(L159-174)에 그대로 추가 (`theme,`).
5. `lib/photo-pipeline-client.ts`:
   - `BackdropGenerateResult` 타입(L16-31)에 `theme?: Pick<CategoryTheme, "accent" |
     "baseNeutral" | "deepAccent">` 필드 추가 (import 필요).
   - `/api/section-backdrops` fetch 바디(L377-381 근처)에 `theme: backdropResult.theme` 추가.

## 이번 브리프 범위 밖 — 참고용 부차 발견

`generateDecorativeGraphic`(장식 오버레이 — 첨부 이미지의 방울/스플래시 그래픽 등)에
전달되는 `theme`는 `enhanceImages` 내부(`photo-pipeline-client.ts` L152-159)에서
`getCategoryTheme(productCategory)`, 즉 **카테고리 공용 기본 테마**를 쓰고 있고, 상품별로
서버에서 추출한 실제 테마(`extractProductTheme`)가 아님. 화장품/뷰티 기본 테마 자체는
slateBlue 계열이라 이번 pink 편중의 직접 원인은 아니지만, "상품마다 달라야 할 색이
카테고리 전체에서 고정되는" 같은 종류의 구조적 문제라 별도로 남겨둠. 이번 C-4에서
`generate-backdrop` 응답에 추가하는 `theme` 값을 `enhanceImages` 체인까지 흘려보내면
같이 고칠 수 있음 — 필요하면 22차로 분리 제안.

## 검증 방법 제안

1. `tsc --noEmit` 통과 확인.
2. TEST_MODE 라이브로 화장품 카테고리 상품 2~3개 생성 — 하나는 브리프 키워드가 뚜렷한 것
   (예: "쿨링/진정" 문구 포함), 하나는 특별한 키워드 없는 것으로 골라서 hero/성분/텍스처
   3장 배경이 실제로 다른 색조로 나오는지 스크린샷 비교.
3. 서버 로그의 `[prompt] generateBackdrop`, `[prompt] generateSectionBackdrop ingredient/texture`
   출력에 `{{TONE}}` 토큰이 치환 안 된 채 그대로 남아있지 않은지 확인 (치환 누락 시 즉시
   눈에 띔).
4. 화장품 외 카테고리(예: 전자제품) 배경 생성이 이번 변경으로 회귀하지 않았는지 1건만
   확인 (해당 카테고리 프롬프트엔 `{{TONE}}`이 없으므로 원칙적으로 영향 없음).

## 커밋

요청 시 진행 (19차+20차분과 함께 아직 미커밋 상태).
