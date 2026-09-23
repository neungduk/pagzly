# 240차 브리프 — 라이프스타일 픽셀 합성에 hero급 안전장치(재시도+손-오염검사+화질보정) 추가

생성: 2026-09-23 · 예상 유료 API: **프로덕션 기본값 영구 변경(사용자 명시 허가) + 실사진 재검증 2건**

## 배경

239차("솔직한 레벨 체크")에서 정리한 대로, Pagzly의 정보구조·레이아웃 축은 후커블/디자이너
벤치마크와 근접했지만 **사진 합성, 특히 라이프스타일 픽셀 페이스트 경로**는 hero 대비 명백히
약한 상태로 8라운드 넘게(64/81/211/214~218/233~235/238차) 미해결로 남아 있었습니다. 원인은
235/238차가 각각 독립적으로 확인한 구조적 비대칭입니다:

- **hero**(`lib/photo-enhance.ts`): preCrop 3단계 재시도(`cropAttempts`) → 매 시도마다
  투명도·모서리알파·플레이트리스크·손-오염 4중 스코어링(`scoreCutout`/`isCutoutAcceptable`) →
  최고점 채택, 전부 기준 미달이면 원본 세이프크롭 폴백. 여기에 `sharpenCutout()`으로
  Replicate `clarity-upscaler` 화질보정까지.
- **라이프스타일 픽셀 페이스트**(`lib/lifestyle-product-composite.ts`의
  `removeProductBackground()`): rembg를 **1번만** 호출, 재시도·품질 스코어링·손-오염 검사·
  화질보정이 전혀 없음.

사용자 지시: "이거 하는데 지금 유료api 호출은 더 해도 상관은 없어" — **라이프스타일 합성에
hero급 안전장치를 기본값으로 영구 적용**(판매자가 라이프스타일 합성을 쓸 때마다 유료 API
호출이 계속 늘어나는 것을 명시적으로 승인)하고, 211~218차가 유닛 테스트로만 확인했던
매칭 3축(화이트밸런스·선명도·그레인) 개선이 실제 사진에서 자연스러운지 **실사진 생성 API
2건**으로 재검증합니다.

## 조사 — 재사용 가능한 hero 로직을 전부 코드로 확인함

새로 설계하지 않고, hero가 이미 쓰고 있는 검증된 로직을 그대로 재사용합니다:

- `lib/photo-enhance.ts`의 `preCropSourceToProduct()`(819행)·`sharpenCutout()`(1484행)는
  **현재 파일 내부 private 함수** — export만 추가하면 그대로 재사용 가능(로직 변경 없음).
- `lib/vision-utils.ts`의 `detectCutoutHasHandOrPerson()`(316행)은 **이미 export돼 있고
  hero가 실제로 쓰고 있는 바로 그 손-오염 검사 함수**(Claude Haiku Vision, max_tokens 80,
  저비용) — §4 문서가 "신규 추가 필요"라고 적어뒀던 것과 달리 **이미 존재하는 함수를
  재사용하면 됨**을 코드로 확인했습니다. 신규 Claude Vision 프롬프트 설계 불필요.
- `lib/photo-composite.ts`의 `measureTransparentRatio`/`measureCornerMeanAlpha`/
  `measureCutoutPlateRisk`는 이미 export돼 있고 `lifestyle-product-composite.ts`가
  `matchCutoutWhiteBalance` 등 같은 파일의 다른 export를 이미 쓰고 있어 import 추가만
  필요.
- 컷아웃 후처리(`trimCutoutToOpaqueBounds`/`purgeDarkPlateFringe`/`defringeCutoutEdges`)는
  현재 `compositeProductOnLifestylePhoto()`의 `removeProductBackground()` **호출 후** 별도로
  적용되고 있음(233/165차) — hero는 이 처리를 `sharpenCutout()` 직후, **스코어링 이전에**
  적용해서 "trim/purge 이후의 진짜 최종 컷아웃"을 기준으로 점수를 매김. 이번 라운드에서
  라이프스타일도 hero와 동일한 순서로 맞춥니다(스코어링 정확도를 위해 필요한 변경).
- `runNanoBanana()` 폴백 경로(1157~1204행)가 `cutout.cutoutUrl`을 그대로 쓰고 있어,
  `removeProductBackground()`의 반환 타입에서 `cutoutUrl`을 없애면 안 됨 — 새 로직은
  `cutoutUrl`(최고점 시도의 후처리 완료 URL)과 `cutoutBuffer`(같은 시도의 처리된 버퍼)를
  **둘 다** 반환하도록 설계했습니다.

## 수정 1 — `lib/photo-enhance.ts`: export 2개 추가 (로직 변경 없음)

```ts
// 819행
-async function preCropSourceToProduct(
+export async function preCropSourceToProduct(

// 810행 근처 PreCropOptions 타입도 export
-type PreCropOptions = {
+export type PreCropOptions = {

// 1484행
-async function sharpenCutout(cutoutUrl: string): Promise<{ url: string; cost: number }> {
+export async function sharpenCutout(cutoutUrl: string): Promise<{ url: string; cost: number }> {
```

**이 파일의 다른 부분은 절대 건드리지 마세요** — `export` 키워드 2개(+타입 1개) 추가가 전부이고,
함수 본문·호출 방식·내부 로직은 100% 동일합니다. hero 파이프라인 자체의 동작은 바뀌지 않습니다
(같은 함수를 여전히 자기 자신도 그대로 호출).

## 수정 2 — `lib/lifestyle-product-composite.ts`

### 2-1. import 추가

```ts
import {
  buildProductShadowSvg,
  buildSilhouetteShadowBuffer,
  defringeCutoutEdges,
  featherCutout,
  matchCutoutGrain,
  matchCutoutSharpness,
  matchCutoutWhiteBalance,
  purgeDarkPlateFringe,
  sampleBackdropAmbientColor,
  tintedShadowColor,
  trimCutoutToOpaqueBounds,
+ measureCornerMeanAlpha,
+ measureCutoutPlateRisk,
+ measureTransparentRatio,
} from "@/lib/photo-composite";
+import { preCropSourceToProduct, sharpenCutout, type PreCropOptions } from "@/lib/photo-enhance";
-import { DEFAULT_SHADOW, type ShadowAnalysis } from "@/lib/vision-utils";
+import {
+  DEFAULT_SHADOW,
+  detectCutoutHasHandOrPerson,
+  type ShadowAnalysis,
+} from "@/lib/vision-utils";
```

`REPLICATE_COST_USD` 로컬 상수(35행)에 `clarityUpscaler: 0.016` 추가(hero의 동일 상수와
같은 값 — 2026-08-14 확인 단가):

```ts
-const REPLICATE_COST_USD = { nanoBanana: 0.039, backgroundRemover: 0.00047 } as const;
+const REPLICATE_COST_USD = {
+  nanoBanana: 0.039,
+  backgroundRemover: 0.00047,
+  clarityUpscaler: 0.016,
+} as const;
```

### 2-2. `removeProductBackground()` 재작성 (601~619행)

현재:

```ts
async function removeProductBackground(productImageUrl: string): Promise<{ cutoutUrl: string; cost: number }> {
  const replicate = getReplicateClient();
  const modelRef = await getBackgroundRemoverRef();
  let imageInput = productImageUrl;
  if (!productImageUrl.startsWith("data:")) {
    try {
      const { buffer } = await fetchImageBuffer(productImageUrl);
      imageInput = bufferToDataUrl(buffer);
    } catch {
      // Replicate에 원본 URL 그대로 전달
    }
  }
  const output = await runReplicateWithRetry("851-labs/background-remover", () =>
    replicate.run(modelRef, { input: { image: imageInput } }),
  );
  const cutoutUrl = extractFluxImageUrl(output);
  if (!cutoutUrl) throw new Error("상품 컷아웃 URL을 받지 못했습니다.");
  return { cutoutUrl, cost: REPLICATE_COST_USD.backgroundRemover };
}
```

변경 후 (hero의 `cropAttempts`+`scoreCutout`+`isCutoutAcceptable` 패턴을 그대로 이식,
상수·공식 전부 동일):

```ts
type LifestyleCutoutAttempt = {
  buffer: Buffer;
  url: string;
  transparentRatio: number;
  cornerMaxAlpha: number;
  plateRisk: Awaited<ReturnType<typeof measureCutoutPlateRisk>>;
  handContaminated: boolean;
};

// hero(photo-enhance.ts)와 동일 임계값 — 두 파이프라인이 같은 rembg 모델을 쓰므로
// 기준을 다르게 둘 이유가 없음.
const LIFESTYLE_CUTOUT_CORNER_ALPHA_FAIL = 40;

function scoreLifestyleCutout(attempt: LifestyleCutoutAttempt): number {
  if (attempt.handContaminated) return -1000;
  if (attempt.plateRisk.risky) return -500;
  if (attempt.transparentRatio < 0.05) return -400;
  if (attempt.cornerMaxAlpha >= LIFESTYLE_CUTOUT_CORNER_ALPHA_FAIL) return -300;
  return (
    attempt.transparentRatio * 120 -
    attempt.cornerMaxAlpha * 0.8 -
    attempt.plateRisk.opaqueAreaRatio * 45 -
    attempt.plateRisk.softAlphaRatio * 20
  );
}

function isLifestyleCutoutAcceptable(attempt: LifestyleCutoutAttempt): boolean {
  return (
    attempt.transparentRatio >= 0.05 &&
    attempt.cornerMaxAlpha < LIFESTYLE_CUTOUT_CORNER_ALPHA_FAIL &&
    !attempt.plateRisk.risky &&
    !attempt.handContaminated
  );
}

/**
 * 240차 — hero(photo-enhance.ts)와 동일한 preCrop 3단계 재시도 + 4중 품질
 * 스코어링(투명도/모서리알파/플레이트리스크/손-오염) + clarity-upscaler 화질보정.
 * 235/238차가 확인한 "rembg 1회만·안전장치 전무" 격차를 hero급으로 맞춘다.
 * 사용자 명시 허가(2026-09-23) — 판매자가 라이프스타일 합성을 쓸 때마다 유료 API
 * 호출이 늘어나는 것을 감수하고 프로덕션 기본값으로 영구 적용.
 */
async function removeProductBackground(
  productImageUrl: string,
  productName: string,
): Promise<{ cutoutUrl: string; cutoutBuffer: Buffer; acceptable: boolean; cost: number }> {
  const replicate = getReplicateClient();
  const modelRef = await getBackgroundRemoverRef();

  const cropAttempts: PreCropOptions[] = [
    { pad: 0.04 },
    { pad: 0.025, strict: true },
    { pad: 0.012, strict: true, skipIfBoxAreaAbove: 0.95 },
  ];

  let totalCost = 0;
  let best: LifestyleCutoutAttempt | null = null;

  for (let i = 0; i < cropAttempts.length; i += 1) {
    try {
      // productImageUrl이 이미 data: URL이면(QA 스크립트 등) 크롭용 fetch가 실패할 수
      // 있으니, preCrop은 hosted URL일 때만 시도하고 data: URL이면 원본 그대로 rembg에.
      let bgRemoveInput = productImageUrl;
      if (!productImageUrl.startsWith("data:")) {
        const cropped = await preCropSourceToProduct(productImageUrl, productName, cropAttempts[i]!);
        totalCost += cropped.cost;
        bgRemoveInput = cropped.url;
      }

      let imageInput = bgRemoveInput;
      if (!imageInput.startsWith("data:")) {
        try {
          const { buffer } = await fetchImageBuffer(imageInput);
          imageInput = bufferToDataUrl(buffer);
        } catch {
          // Replicate에 원본 URL 그대로 전달
        }
      }

      const output = await runReplicateWithRetry("851-labs/background-remover", () =>
        replicate.run(modelRef, { input: { image: imageInput } }),
      );
      const rawCutoutUrl = extractFluxImageUrl(output);
      if (!rawCutoutUrl) {
        console.warn(`[lifestyle-composite] cutout attempt ${i}: rembg URL 없음`);
        continue;
      }

      const { url: sharpenedUrl, cost: sharpenCost } = await sharpenCutout(rawCutoutUrl);
      totalCost += sharpenCost;

      const cutoutRes = await fetch(sharpenedUrl);
      if (!cutoutRes.ok) continue;
      let buffer = Buffer.from(await cutoutRes.arrayBuffer());
      // 233차 — hero와 동일 순서(trim → 어두운 플레이트 제거)로, 스코어링 이전에 적용.
      buffer = await trimCutoutToOpaqueBounds(buffer);
      buffer = await purgeDarkPlateFringe(buffer);
      try {
        buffer = await defringeCutoutEdges(buffer);
      } catch (error) {
        console.warn("[lifestyle-composite] defringe 실패, 후처리 전 컷아웃 사용", error);
      }

      const transparentRatio = await measureTransparentRatio(buffer);
      const corner = await measureCornerMeanAlpha(buffer);
      const plateRisk = await measureCutoutPlateRisk(buffer);
      const handCheck = await detectCutoutHasHandOrPerson(buffer);
      totalCost += handCheck.cost;

      const attempt: LifestyleCutoutAttempt = {
        buffer,
        url: sharpenedUrl,
        transparentRatio,
        cornerMaxAlpha: corner.maxMeanAlpha,
        plateRisk,
        handContaminated: handCheck.contaminated,
      };
      console.log(
        `[lifestyle-cutout:${i}] transparent=${transparentRatio.toFixed(3)} ` +
          `corner=${corner.maxMeanAlpha.toFixed(1)} plateRisk=${plateRisk.risky} ` +
          `hand=${handCheck.contaminated}`,
      );

      if (!best || scoreLifestyleCutout(attempt) > scoreLifestyleCutout(best)) {
        best = attempt;
      }
      if (isLifestyleCutoutAcceptable(attempt)) break;
    } catch (err) {
      console.warn(`[lifestyle-composite] cutout attempt ${i} failed`, err);
    }
  }

  if (!best) {
    throw new Error("상품 컷아웃을 받지 못했습니다.");
  }

  console.log(
    `[lifestyle-cutout] best score=${scoreLifestyleCutout(best).toFixed(1)} ` +
      `acceptable=${isLifestyleCutoutAcceptable(best)}`,
  );

  return {
    cutoutUrl: best.url,
    cutoutBuffer: best.buffer,
    acceptable: isLifestyleCutoutAcceptable(best),
    cost: totalCost,
  };
}
```

### 2-3. 호출부 수정 (`compositeProductOnLifestylePhoto()`, 현재 956~990행 부근)

현재는 `removeProductBackground(productImageUrl)` 호출 후 별도로 trim/purge/defringe를
다시 적용하고 있습니다 — 이제 그 처리가 `removeProductBackground()` 내부로 이동했으니
**중복 적용을 제거**합니다:

```ts
  let cost = 0;
  let pixelPasteFailReason: string | undefined;
  try {
-   const cutout = await removeProductBackground(productImageUrl);
+   const cutout = await removeProductBackground(productImageUrl, productName);
    cost += cutout.cost;

-   if (!qaForceFallback) {
+   if (!qaForceFallback && !cutout.acceptable) {
+     // 240차 — 재시도 3회 + 품질 게이트를 전부 통과 못한 컷아웃은 실제 인물 사진에
+     // 붙이지 않는다(생략이 오인보다 낫다 — package_contents/color_variation과 동일 결).
+     // requirePixelPaste가 아니면 아래 nano-banana 폴백으로 넘어간다(cutoutUrl 재사용).
+     pixelPasteFailReason = "cutout-quality-below-threshold";
+     console.warn("[lifestyle-composite] cutout quality below threshold after retries");
+   } else if (!qaForceFallback) {
      try {
        const lifestyle = await fetchImageBuffer(lifestyleImageUrl);
-       let cutoutImage = await fetchImageBuffer(cutout.cutoutUrl);
-       try {
-         const trimmed = await trimCutoutToOpaqueBounds(cutoutImage.buffer);
-         const platePurged = await purgeDarkPlateFringe(trimmed);
-         cutoutImage = { ...cutoutImage, buffer: platePurged };
-       } catch (error) {
-         console.warn("[lifestyle-composite] trim/plate-fringe 정리 실패, 컷아웃 그대로 사용", error);
-       }
-       try {
-         const defringed = await defringeCutoutEdges(cutoutImage.buffer);
-         cutoutImage = { ...cutoutImage, buffer: defringed };
-       } catch (error) {
-         console.warn("[lifestyle-composite] defringe 실패, 컷아웃 그대로 사용", error);
-       }
+       // 240차 — trim/plate-fringe/defringe는 이제 removeProductBackground() 내부
+       // 재시도 루프 안에서(스코어링 이전에) 이미 적용됨. 여기서 다시 적용하지 않는다.
+       const cutoutImage: { buffer: Buffer; mediaType: "image/jpeg" | "image/png" } = {
+         buffer: cutout.cutoutBuffer,
+         mediaType: "image/png",
+       };

        const detection = await detectHandPlacementWithGraspRetry(lifestyle, cutoutImage);
        ...(이하 기존 코드 그대로, cutoutImage 참조 부분 전부 동일하게 유지)...
```

나머지(`detection`~`pasteCutoutOnScene`~grasp-refine~`nano-banana` 폴백)는 전부 기존
그대로 — `pixelPasteFailReason`이 설정되면 기존 로직이 그대로 처리(1157행
`if (requirePixelPaste) return {...}`, 아니면 1168행 nano-banana 폴백에서
`cutout.cutoutUrl` 재사용)하므로 추가 분기가 필요 없습니다.

`compositeProductOnLifestylePhoto()`의 `const { lifestyleImageUrl, productImageUrl,
category, ... }` 구조분해에 `productName`이 이미 파라미터 타입엔 있지만 구조분해 목록에
빠져 있으면 추가하세요(`removeProductBackground` 호출에 필요).

## 검증 스크립트 요청 (§4 항목 2 — 사용자 허가 실사진 2건 포함)

`scripts/240cha-lifestyle-hero-parity-verify.ts` 신규 작성:

1. `npx esbuild lib/photo-enhance.ts lib/lifestyle-product-composite.ts --bundle=false
   --format=esm --outfile=NUL` 구문 통과
2. **유닛(API 0건)**: `removeProductBackground` 스코어링 공식(`scoreLifestyleCutout`/
   `isLifestyleCutoutAcceptable`)을 hero의 `scoreCutout`/`isCutoutAcceptable`과 나란히
   놓고 상수·공식이 정확히 동일한지 코드 문자열 대조
3. `hero급 재시도 로직이 실제로 3회까지 도는지` — 합성 이미지(테스트 픽스처)로
   `preCropSourceToProduct`를 3회 호출하는 mock/spy 테스트 또는 실제 실행 로그로 확인
4. **실사진 유료 검증 2건**(사용자 2026-09-23 명시 허가, 이 2건 외 생성 API 추가 호출
   금지): `scripts/214cha-lifestyle-matching-live.ts`/`215cha-lifestyle-matching-live.ts`와
   동일한 방식(전체 `/api/generate`가 아니라 `compositeProductOnLifestylePhoto()`를 직접
   호출)으로, 서로 다른 카테고리(예: 전자제품 1건 + 패션 또는 식품 1건) 실제 상품 사진 +
   실제 라이프스타일 사진 페어로 전체 파이프라인(재시도+손검사+화질보정+매칭3축)을
   실행하고 before/after 스크린샷 + 콘솔 로그(각 시도의 transparent/corner/plateRisk/hand
   점수, 최종 채택 시도 번호) 저장
5. 231/232/236/237/238차 기존 회귀 스크립트 재실행(무관 기능 회귀 없는지)
6. `lib/photo-composite.ts`·`lib/generate-lifestyle-shots.ts`는 mtime 불변 확인(이번
   라운드는 `photo-enhance.ts`의 export 2개 추가와 `lifestyle-product-composite.ts`만
   건드림 — `generate-lifestyle-shots.ts`의 `compositeProductOnLifestylePhoto()` 호출부는
   시그니처 변경 없이 그대로 호환됨)

## 완료 보고에 반드시 포함할 것

- 실사진 2건 각각의 before(원본 상품 사진 + 라이프스타일 사진) / after(합성 결과) 스크린샷
- 각 시도(최대 3회)의 스코어링 로그 원문 — 몇 번째 시도에서 채택됐는지, 손-오염 검사가
  실제로 걸린 사례가 있었는지
- 실제 발생한 유료 API 호출 총 횟수·비용 내역(rembg 재시도 횟수·clarity-upscaler 호출
  횟수·Claude Vision 손검사 횟수를 전부 합산 — 사용자가 "영구 비용 증가를 감수한다"고
  승인했지만, 정확한 실측치를 알아야 다음 판단이 가능합니다)
- `requirePixelPaste: true` 경로(AI 일상샷)가 실제로 `cutout-quality-below-threshold`로
  드롭되는 케이스가 있었는지(전부 통과했다면 그것도 정직하게 보고)

## 포함하지 않는 것 (이번엔 손대지 않음)

- 그림자 방향(광원 각도) 매칭 — §2 의도적 보류, 추정 로직 자체가 없고 니즈 불확실
- Vision 주석 오버레이 4카테고리 확장(§4, 238차 발견) — 이번 사용자 허가는 "라이프스타일
  합성 안전장치"와 "매칭 3축 실사진 재검증" 2건에 한정된 것으로 해석, 별개 항목이라 미포함
- hero(`photo-enhance.ts`) 자체의 동작 변경 — export 2개 추가 외 완전히 무변경

## 절대 원칙 (재확인)

- anti-hallucination 완화 금지 — 이번 변경은 전부 기존에 검증된 품질 게이트를 라이프스타일
  경로에도 동일하게 적용하는 것이지, 게이트를 느슨하게 하는 게 아닙니다(오히려 강화).
- 손-오염 검사·품질 게이트를 전부 통과 못하면 **컷아웃을 억지로 붙이지 않고 드롭**(생략이
  오인보다 낫다 원칙, 238차 color_variation 수정과 동일한 결).
- 이번 라운드에서 승인된 유료 API 범위: (1) 라이프스타일 픽셀 합성 안전장치 — 프로덕션
  기본값 영구 적용(매 생성마다 재시도·화질보정·손검사 비용 발생), (2) 실사진 재검증 —
  정확히 2건. 이 2가지 외의 신규 유료 API 확장(§4의 다른 항목들)은 이번에도 미승인 상태
  그대로 유지.
