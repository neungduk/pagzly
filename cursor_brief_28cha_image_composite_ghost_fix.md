# 28차 — 상세페이지 이미지 합성 품질 (유령 사각형 오버레이 + 관련 이슈)

## 배경

사용자가 실제 운영 중인 결과 페이지를 보고 "이미지가 너무 겹치는 것들이 많고 합성 자체가 잘못된 것도 많다"고 리포트:

```
https://www.pagzly.com/create/result?id=309b193f-831a-47d1-a33f-4773556c8a09
```

진단을 위해 **동일 상품/카테고리로 새로 한 번 더 생성**했다 (사진 8장 중 실제로 두 개의 실제 병이 함께 찍힌 `pexels-16233812.jpeg` 1장만 의도적으로 제외):

```
https://pagzly.com/create/result?id=89efb842-8491-4710-8bab-6c11c0c11441
```

이 새 결과에서도 "겹쳐 보이는" 현상이 재현됐다. 원인은 원래 페이지와 **다르다** — 이번엔 진짜 코드 버그를 하나 특정했다.

## 발견 1 (핵심, 높은 확신도) — `lib/concept-effects.ts`의 미스트/물방울 오버레이가 반투명 사각형을 남긴다

`3중 히알루론`(POINT 01과 공유) / `진정 케어` 이미지를 원본 해상도(1200×1200)로 열어보면, 제품 사진 위에 **연한 회색~베이지 사각형 패치**가 반투명하게 겹쳐 있다. 스모크/워터스플래시 장식 그래픽과 위치가 겹쳐서, 마치 카드나 프레임이 반쯤 비쳐 보이는 것처럼 보인다.

이건 이미 코드 안에 기록된 적 있는 버그와 **증상이 똑같다.** `lib/photo-enhance.ts` 374~381줄 주석:

```ts
// 2026-08-18 수정: 예전에는 장식 이미지(물방울/미스트 등)를 캔버스 전체에
// 48% 불투명도로 통짜로 덮어썼다. 장식 이미지와 배경 이미지가 서로 다른
// 톤/구도의 별개 생성물이다 보니, 상품이 놓인 중앙까지 겹쳐지면서 경계가
// 뚜렷한 "이중노출/유령" 사각형처럼 보이는 문제가 있었다 (실제 결과물
// 육안 확인으로 발견, review/before-after-fix 참고).
// 지금은 (1) 기본 불투명도를 크게 낮추고 (2) 중앙(상품 자리)은 완전히
// 비우고 테두리로 갈수록만 보이는 방사형 비네트를 알파에 곱해서, 장식이
// 상품/배경 위에 안 겹치고 프레임 바깥쪽 액센트로만 은은히 남게 한다.
```

이 수정은 `compositeDecorOnBackdrop()` (히어로 **배경** 위 장식 전용, `photo-enhance.ts` 382~428줄)에만 적용됐다. 그런데 **완전히 같은 클래스의 문제가 형제 함수인 `concept-effects.ts`의 `overlayConceptEffectOnProduct()`(316~357줄, 제품 컷 위 물방울/미스트/거품 오버레이)에는 없다.**

`overlayConceptEffectOnProduct()`의 현재 로직 (336~344줄):

```ts
const pixels = resized.data;
for (let i = 0; i < pixels.length; i += 4) {
  const pixelLuma =
    0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
  if (pixelLuma < 28) {
    pixels[i + 3] = 0;
  } else {
    pixels[i + 3] = Math.round(pixels[i + 3] * opacity);
  }
}
```

이 함수가 쓰는 소스 그래픽은 flux-schnell에 `"isolated on a pure black background"`라고만 프롬프트를 준 결과물이다 (`overlayPrompt`, 44~142줄). 생성형 모델이라 배경이 항상 완벽한 순흑(RGB 0,0,0)은 아니고, 압축 아티팩트나 은은한 비네트로 밝기(luma)가 28을 살짝 넘는 영역이 종종 남는다. 지금 코드는:

- 임계값이 **하드 컷오프**라 luma 28 근처에서 사각형/블록 형태의 경계가 그대로 남는다 (`compositeDecorOnBackdrop`처럼 부드러운 그라디언트가 없음).
- **중앙 안전지대(vignette)가 아예 없다** — 상품이 있는 정중앙까지 오버레이가 그대로 덮인다.
- 기본 불투명도도 0.38~0.48로, 이미 고친 배경 장식(0.14)보다 3배 이상 진하다.

세 가지가 겹쳐서, flux-schnell이 만든 "검은 배경"이 완벽하지 않을 때마다 상품 사진 위에 흐릿한 회색 사각형이 반투명하게 얹히는 것 — 지금 눈으로 확인한 정확히 그 현상이다.

### 수정 제안

`lib/concept-effects.ts`의 `overlayConceptEffectOnProduct()`를 `compositeDecorOnBackdrop()`과 같은 방어 패턴으로 맞춘다:

1. **중앙 안전지대 vignette 추가** — 제품이 위치한 중앙부는 오버레이를 거의 비우고, 프레임 가장자리 쪽에서만 보이게. `compositeDecorOnBackdrop`의 `vignetteSvg` (395~405줄)를 그대로 재사용/이식.
2. **하드 컷오프 → 부드러운 램프** — `pixelLuma < 28 ? 0 : alpha*opacity` 대신, 예를 들어 `luma 15~45` 구간을 선형/smoothstep으로 0→1 램프시켜서 완전한 순흑이 아닌 잔여 배경이 살아남더라도 딱 잘린 사각형 경계 대신 자연스럽게 사라지게.
3. **기본 opacity 하향 검토** — 현재 0.38~0.48 → `compositeDecorOnBackdrop`처럼 0.14~0.2대로 낮추는 걸 함께 테스트. (단, 이 값은 물방울/미스트가 아예 안 보일 정도로 낮추면 안 되니 실제 생성물로 육안 확인 필요.)

예시 (기존 로직을 최소로 바꾸는 방향):

```ts
// vignette: 중앙 55%는 완전 투명, 가장자리로 갈수록만 보이게
// (compositeDecorOnBackdrop과 동일한 SVG 재사용 — CANVAS_SIZE 대신 width/height 사용)
const vignetteSvg = `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="v" cx="50%" cy="50%" r="65%">
        <stop offset="0%" stop-color="white" stop-opacity="0" />
        <stop offset="55%" stop-color="white" stop-opacity="0" />
        <stop offset="100%" stop-color="white" stop-opacity="1" />
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#v)" />
  </svg>`;
const vignette = await sharp(Buffer.from(vignetteSvg))
  .resize(width, height)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const pixels = resized.data;
for (let i = 0; i < pixels.length; i += 4) {
  const pixelLuma =
    0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
  // 하드컷 대신 15~45 구간 램프
  const lumaFactor = Math.min(1, Math.max(0, (pixelLuma - 15) / 30));
  const vignetteFactor = vignette.data[i + 3] / 255;
  pixels[i + 3] = Math.round(pixels[i + 3] * opacity * lumaFactor * vignetteFactor);
}
```

`width`/`height`는 이미 39줄 위(`const meta = await sharp(productBuffer).metadata()`)에서 구해놓은 값을 그대로 쓰면 된다.

### 검증 방법

코드만으로는 100% 재현이 보장되지 않는다 (flux-schnell 생성 결과가 매번 조금씩 다름). 화장품/뷰티 카테고리로 최소 2~3회 실제 생성해서, `-fx-` 접미사가 붙은 이미지들을 원본 해상도로 열어 사각형/카드 형태 잔상이 남는지 육안 확인해야 한다.

## 발견 2 (낮은 확신도, 추가 조사 필요) — 섹션 배경(`ingredient`/`texture`) 자체에 남는 흐릿한 사각형

같은 "3중 히알루론" 이미지(`-fx-` 접미사 없음, 파일명이 `...-enhanced.png`로 끝남)에는 조개껍질+마른 넝쿨 장식 아래쪽에 **또 다른** 흐릿한 회색 사각형이 있다. 이 이미지는 `generateSectionBackdropVariants()` (`photo-enhance.ts` 1259~1302줄)가 만든 `ingredient`/`texture` 배경 위에 제품이 합성된 결과다.

`generateSectionBackdropVariants()`는 flux-schnell에 프롬프트 문자열만 던지는 순수 text-to-image 함수라 (마스킹/비네트 로직 없음), 이 사각형이 (a) flux-schnell이 프롬프트에 없는 사각형/카드 형태를 그냥 그려버린 것인지, (b) 이 배경 위에도 `compositeDecorOnBackdrop`의 장식 레이어가 한 번 더 얹히면서 발견 1과 비슷한 잔상이 남는 것인지 아직 특정하지 못했다.

**요청:** 실제 코드에서 `generateSectionBackdropVariants()`가 리턴한 backdrop이 이후 어디서 `compositeDecorOnBackdrop`을 한 번 더 거치는지 확인해달라. 만약 거친다면 발견 1과 같은 원인일 가능성이 크다. 만약 안 거친다면, `SECTION_BACKDROP_PROMPTS_BY_CATEGORY["화장품/뷰티"]`의 `ingredient`/`texture` 프롬프트(1187~1192줄)에 다른 섹션에 이미 쓰고 있는 `NO_TEXT_LOCK` 계열처럼 `"no card, no rectangle, no frame, no UI panel, no watermark box"` 를 추가하고 몇 번 더 생성해 재발 여부를 확인해달라.

## 발견 3 (참고용, 코드 버그 아님) — 테스트 사진 자산 중 일부가 실제 타사 브랜드 제품

이번 진단 중 생성된 합성 이미지에 `The Ordinary`, `babaria` 같은 **실존하는 타사 스킨케어 브랜드**의 라벨이 그대로, 선명하게 노출됐다. 원인은 `scripts/test-assets/`에 있는 테스트용 "상품 사진" 중 일부가 실제로 이런 타사 브랜드의 스톡 사진이기 때문이다 — Pagzly 파이프라인은 배경 제거 + 재합성을 정직하게 수행했을 뿐이고, 이건 실제 셀러가 자기 브랜드 사진을 올렸을 때는 전혀 문제 되지 않는 정상 동작이다.

다만 팀 내부 테스트/데모 때 화면에 `The Ordinary`, `babaria` 같은 실제 경쟁사 브랜드명이 그대로 찍혀 나오면 오해나 불필요한 리스크가 생길 수 있다. **코드 수정 대상 아님** — `scripts/test-assets/`를 정리할 때 참고만 해달라는 메모.

## 아직 남아있는 것 — 25차(글래스 백드롭) 미구현

이번 재확인 생성(89efb842)에는 "화장병/그릇에 담긴 액체 안에 제품이 떠 있는" 형태의 글래스 백드롭 결함이 뚜렷하게 재현되지는 않았다. 다만 이건 매 생성마다 프롬프트 결과가 달라서 우연히 안 나왔을 수 있고, 이전 세션에서 이미 코드로 `"화장품/뷰티"` 카테고리의 `SECTION_BACKDROP_PROMPTS_BY_CATEGORY`와 `generateSectionBackdropVariants()`에 "no glass container" 계열 텍스트가 아직 없는 것도 확인했었다. `cursor_brief_25cha_section_backdrop_glass.md`가 아직 구현 안 된 상태이니, 이번 28차와 묶어서 처리하거나 순서상 먼저 처리해달라.

## 확인 못한 것 — 일러스트 배너 텍스트/UI 환각

이전 결과 페이지(309b193f)의 "오늘의 수분 루틴" 일러스트 배너에서 가짜 브라우저 UI(신호등 점, 주소창)가 보였던 건이 있었는데, 이번 재생성(89efb842)에서는 애초에 `illustration_banner` 타입 섹션이 아예 생성되지 않아서 (섹션 구성이 매번 AI가 다르게 짬) 재확인이 불가능했다. 23차에서 고친 `NO_TEXT_LOCK`/`asciiMotifOnly()`가 살아있는지는 **이번 브리프 범위 밖**으로 남겨둔다 — 다음에 `illustration_banner`가 포함된 생성이 나오면 그때 다시 확인하자.

## 검증 체크리스트

- [ ] `lib/concept-effects.ts`의 `overlayConceptEffectOnProduct()`에 vignette + 부드러운 luma 램프 적용
- [ ] `npx tsc --noEmit` 통과
- [ ] 화장품/뷰티 카테고리로 2~3회 실 생성 → `-fx-` 이미지들 원본 해상도로 열어서 사각형 잔상 없는지 육안 확인
- [ ] `generateSectionBackdropVariants()` → `compositeDecorOnBackdrop` 경유 여부 확인, 필요시 프롬프트에 no-card/no-rectangle 텍스트 추가
- [ ] 25차(글래스 백드롭) 브리프도 같이 구현했는지 확인
- [ ] 커밋 메시지에 "발견 1"(핵심 버그) 위주로 남기고, 발견 2/3는 별도 메모로 남겨두면 다음 라운드에 추적하기 쉬움
