# Cursor 지시서 — 23차: 배경 합성 텍스트 환각 + 유리컵 오합성 근본 수정

작성: Claude (Cowork) · 2026-08-26
대상 세션 컨텍스트: `claude/cursor_handoff_brief.md` 22차 후속 참고 (22차에서 배경 합성 모델
기본값을 `flux` → `flux-kontext-pro`로 전환, 이번 23차는 그 직후 발견된 시각적 결함 수정)

## 배경 — 사용자가 실제 생성 결과에서 발견한 두 가지 결함

22차 검증 때 Claude가 보낸 스크린샷 2장에서 사용자가 직접 문제를 짚었다:

1. **가짜 텍스트/UI 환각**: 전자제품(휴대용 미니 가습기) 히어로 배경에 실제로 존재하지 않는
   쇼핑몰 웹사이트 네비게이션 바("Btoe숩볼링막벌", 검색 아이콘, 메뉴 항목)와 깨진 한글 텍스트
   ("지금가없을 미머캐스 축중현 등랍자" 등 의미 없는 글자)가 배경 이미지 안에 통째로 그려져 있음.
2. **비논리적 합성**: 화장품/뷰티 세럼("glowiest") 히어로 배경에서 제품 병이 물이 가득 찬 유리컵
   안에 놓인 것처럼 합성됨 — 세럼 병이 유리컵에 반쯤 잠긴 이상한 장면.

**중요**: 두 결과 모두 22차 검증에서 Claude가 직접 생성해 사용자에게 보낸 스크린샷이다. 당시
Claude는 `sessionStorage`의 섹션 구조·비용 데이터로 22차 기능(인포 포맷/색상 개인화/배경 모델
전환)이 정확히 반영됐는지만 검증했고, 배경 이미지 자체의 시각적 타당성(가짜 텍스트 유무, 합성이
논리적으로 말이 되는지)은 육안으로 비판적으로 검토하지 않았다 — 이번 지시서는 그 사각지대에서
나온 실제 결함을 다룬다.

두 결함 모두 **flux-kontext-pro(그리고 같은 경로를 타는 nano-banana/bria)가 원본 사진 전체를
그대로 놓고 편집하는 image-to-image 방식**이기 때문에 드러난 문제다. 기존 `flux`(flux-fill-dev)는
배경을 상품과 완전히 분리해서 별도로 생성한 뒤 나중에 상품을 오려 붙이는 방식이라 이 두 문제가
구조적으로 발생하지 않았다 — 22차에서 프로덕션 기본값을 flux-kontext-pro로 바꾸면서 잠재해 있던
프롬프트 설계 결함이 실제 결함으로 드러난 것.

## 근본 원인 1 — `sanitizePromptForBria()`가 "no text"/"no logo" 지시를 프롬프트에서 통째로 삭제

**파일**: `lib/photo-enhance.ts`, 함수 `sanitizePromptForBria()` (약 154~169행)

```ts
function sanitizePromptForBria(prompt: string): string {
  return prompt
    .replace(/\bno product\b/gi, "")
    .replace(/\bno packaging\b/gi, "")
    .replace(/\bno bottle\b/gi, "")
    .replace(/\bno text\b/gi, "")        // ← 문제: 여기서 텍스트 금지 지시를 지워버림
    .replace(/\bno logo\b/gi, "")        // ← 문제: 여기서 로고 금지 지시를 지워버림
    .replace(/\bempty product photography backdrop\b/gi, "")
    .replace(/\bempty dimensional set\b/gi, "")
    .replace(/\bempty backdrop\b/gi, "")
    .replace(/\bempty center(?: for product placement)?\b/gi, "")
    .replace(/(?:,\s*){2,}/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/^,\s*|\s*,$/g, "")
    .trim();
}
```

이 함수는 `buildBriaBackdropPrompt()`(약 514~535행) **내부에서 무조건 호출**되고, 이
`buildBriaBackdropPrompt()`는 `generateBackdropViaBria()`/`generateBackdropViaNanoBanana()`/
`generateBackdropViaFluxKontext()` **세 provider 전부**가 공통으로 사용한다(각각 791/891/981행에서
호출). 즉 지금 프로덕션 기본값인 flux-kontext-pro를 포함해 이미지 합성형 provider 전부가, 매
배경 생성 요청마다 프롬프트에서 "no text"/"no logo" 지시를 스스로 지운 채로 Replicate에 보내고
있다.

함수 위 주석("Bria는 상품을 유지한 채 배경만 바꾸므로 empty/no-product 문구를 뺀다")은 **"no
product"/"empty backdrop" 계열 문구를 빼는 이유만** 설명한다 — Bria/nano-banana/flux-kontext-pro는
배경을 완전히 새로 그리는 게 아니라 원본 사진에 이미 있는 상품을 유지한 채 주변만 바꾸는 방식이라
"제품 없음"/"빈 배경"을 요구하면 모델이 오히려 혼란을 일으키기 때문 — 이건 타당한 처리다. 하지만
"no text"/"no logo"까지 같은 줄에서 지워버리는 것은 저 주석의 근거와 무관하고, 어디에도 별도로
설명돼 있지 않다 — 실수로 같이 묶여 들어간 코드로 보인다. 게다가 이 세 provider의 Replicate API
input에는 별도의 `negative_prompt` 파라미터가 아예 없다(`prompt`/`input_image`(또는
`image_input`/`image_url`)/`aspect_ratio`/`output_format`만 있음, photo-enhance.ts 993~999행/
903~910행/808~817행에서 직접 확인) — 즉 "no text, no logo"는 이 provider들이 가짜 텍스트/UI를
그려 넣지 않도록 막을 수 있는 **유일한 방어선**인데 그게 매번 삭제된 채로 나가고 있었다.

### 수정 지시

`sanitizePromptForBria()`에서 아래 두 줄을 **삭제**한다:

```ts
.replace(/\bno text\b/gi, "")
.replace(/\bno logo\b/gi, "")
```

나머지 줄(`no product`/`no packaging`/`no bottle`/`empty ...` 계열)은 그대로 유지한다 — 저건
정말로 이 provider들과 충돌하는 지시라 계속 제거해야 한다.

추가로, 방어선을 하나 더 두기 위해 `buildBriaBackdropPrompt()`가 최종적으로 반환하는 문자열
끝부분(약 533행, `keep the original product unchanged, replace only the surrounding background,
realistic studio set` 뒤)에 아래 구문을 명시적으로 덧붙이는 것을 권장한다(중복 강조가 diffusion/
edit 계열 모델에서 부정 지시 준수율을 높이는 경우가 많음, 기존 `no text, no logo`가 이미
BACKDROP_PROMPTS/각 템플릿 앞부분에 있었지만 방금 발견했듯 그걸로는 부족했다):

```ts
return sanitizePromptForBria(
  `${fluxStylePrompt}, keep the original product unchanged, replace only the surrounding background, realistic studio set, no fake website UI, no navigation bar, no browser chrome, no on-screen text of any kind, no watermark, no logo`,
);
```

(정확한 문구는 자유롭게 다듬어도 되지만, "no text, no logo"가 삭제되지 않는 것이 핵심이고 이
추가 문구는 보강용이다.)

## 근본 원인 2 — `moisture` 템플릿에 남아있는 "glass"(유리컵) 리터럴 모티프

**파일**: `lib/backdrop-prompt-templates.ts`, `PHOTOGRAPHY_TEMPLATES.moisture` (약 42~53행)

```ts
moisture: {
  ...
  texture:
    "condensation droplets on glass over a soft {{TONE}} surface, dewy glowing micro-reflections, wet sheen without pooling",
  prompt:
    "... shallow depth of field, close-up soft {{TONE}} studio surface, condensation droplets on glass, dewy glowing surface sheen, ...",
},
```

10차에서 `SECTION_BACKDROP_PROMPTS_BY_CATEGORY`의 성분/텍스처 배경 프롬프트에 있던 "빈 유리컵"
리터럴은 이미 한 번 제거된 적이 있다(핵심 원인: "extreme close-up of empty clear glass with
condensation water droplets" — 모든 화장품 상품이 유리컵/투명 액체로만 나오는 문제). 그런데 이
`moisture` 촬영 템플릿에는 같은 계열의 "glass" 리터럴이 아직 남아있다.

`flux`(flux-fill-dev, 배경을 상품과 완전히 분리해서 생성한 뒤 나중에 상품을 오려 붙이는 방식)에서는
"condensation droplets on glass"가 안전했다 — 배경 이미지 안에 유리컵이 그려져도 그 위에 상품
사진을 나중에 합성하니 상품이 유리컵 "안에" 들어갈 방법이 없었다. 하지만 flux-kontext-pro/
nano-banana/bria는 **원본 사진 전체(상품 포함)를 그대로 두고 그 주변만 다시 그리는** 방식이라,
모델이 "glass"를 문자 그대로 해석해 실제 유리컵 형태의 물체를 만들어내고, 그 유리컵과 이미 사진
안에 있던 상품 병을 공간적으로 겹쳐서 "병이 유리컵 안에 담긴" 것처럼 합성해버린다 — 스크린샷에서
본 결함이 정확히 이 경로다. `PHOTOGRAPHY_TEMPLATES`의 다른 6개 템플릿(`cooling`/`nourishing`/
`cleansing`/`radiant`/`premium_dark`/`minimal`/`studio`)은 전부 "no glass" 또는 애초에 glass
자체를 언급하지 않아 이 문제가 없다 — `moisture` 하나만 예외로 남아있었다.

### 수정 지시

`moisture` 템플릿의 `texture`/`prompt`에서 "glass"가 포함된 문구를 표면 텍스처 묘사로 교체하고,
명시적 배제 문구를 추가한다:

```ts
moisture: {
  id: "moisture",
  labelKo: "수분/보습",
  lighting:
    "soft side lighting matching the product lighting lock, no golden hour, gentle glowing specular highlights on wet surfaces",
  composition:
    "shallow depth of field, empty center for product placement, close-up of surface plane",
  texture:
    "fine condensation-like water droplets scattered directly on a soft {{TONE}} surface, dewy glowing micro-reflections, wet sheen without pooling, no glass container",
  prompt:
    "soft side lighting matching the lighting lock white balance, no golden hour, no amber gel, shallow depth of field, close-up soft {{TONE}} studio surface, fine water droplets scattered on the surface itself, dewy glowing surface sheen, vivid radiant K-beauty product photography backdrop, no flat gray, realistic product photography backdrop, no glass container, no drinking glass, no vessel, no cup, no product, no text, no logo",
},
```

핵심 변경: "condensation droplets **on glass**" → "water droplets scattered **directly on a
{{TONE}} surface**"(유리라는 물체 대신 표면 텍스처로 한정), 그리고 `no glass container, no
drinking glass, no vessel, no cup`을 명시적으로 추가해 모델이 실제 그릇/용기 형태를 만들지 않도록
막는다.

## 추가 점검 권장 (이번 라운드 필수는 아님, 낮은 우선순위)

`moisture`는 이번에 실제 스크린샷으로 결함이 확인돼 확정 수정 대상이지만, 나머지 촬영 템플릿에도
"상품을 담는 그릇/용기"로 오인될 수 있는 단어(예: 뭔가를 감싸는 프롭, 콘테이너류)가 더 있는지
한 번 훑어보는 것을 권장한다. 이번 라운드에서 코드로 확인한 범위에서는 나머지 템플릿들이 전부
"no glass"류 배제 문구를 이미 갖고 있어 추가 수정이 필요하지 않았다 — 다만 다음에 새 템플릿을
추가할 때는 "flux-kontext-pro 같은 합성형 provider는 상품이 이미 사진 안에 있는 채로 편집한다"는
전제를 반드시 염두에 두고 프롭 단어를 골라야 한다는 점을 원칙으로 남겨둔다.

## 검증 체크리스트 (구현 완료 후 이 세션이 재검증할 항목)

1. `sanitizePromptForBria()` 코드 대조 — "no text"/"no logo" 삭제 줄이 실제로 빠졌는지, 나머지
   줄(no product/no packaging/no bottle/empty 계열)은 그대로인지.
2. `moisture` 템플릿 코드 대조 — texture/prompt에서 "glass"가 표면 텍스처 표현으로 바뀌고 `no
   glass container` 등 배제 문구가 추가됐는지.
3. `tsc --noEmit` 재실행 — 기존 24줄 베이스라인과 일치하는지(신규 에러 0건 기대, 순수 문자열 수정
   이라 타입 에러가 날 이유는 없지만 항상 확인).
4. **라이브 E2E — 이번엔 반드시 배경 이미지를 실제로 확대해서 육안 검사할 것** (이전 라운드의
   사각지대를 반복하지 않기 위해):
   - 화장품/뷰티 카테고리, 브리프에 "수분"/"보습"/"촉촉" 등 `moisture` 템플릿을 의도적으로
     트리거하는 키워드를 넣어 재생성 → 히어로 배경에 유리컵/용기 형태가 더 이상 나타나지 않고,
     상품이 표면 위에 자연스럽게 놓인 것처럼 합성되는지 확인.
   - 전자제품 등 비화장품 카테고리 1건 재생성 → 히어로 배경에 가짜 UI/네비게이션 바/텍스트가
     더 이상 나타나지 않는지 확인(이번에 결함이 나온 "휴대용 미니 가습기"와 같은 조건으로
     재현 시도 권장).
   - 두 케이스 모두 배경 이미지를 확대(zoom) 스크린샷으로 저장해 텍스트/용기 형태 유무를
     직접 눈으로 대조할 것 — `sessionStorage`나 비용 데이터만으로는 이 결함이 안 잡힌다(22차
     검증에서 실제로 놓쳤던 부분).
5. 회귀 확인 — `no text`/`no logo` 복원이 상품 자체의 라벨/로고(원본 사진에 있는 것)까지 지우는
   부작용을 만들지 않는지 확인. 이 지시는 배경에 대한 것이고 원본 상품은 "keep the original
   product unchanged"로 별도 보호되므로 이론상 문제 없어야 하지만, 라이브 테스트에서 상품 라벨
   텍스트가 여전히 선명하게 보이는지 한 번 더 확인.
