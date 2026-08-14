import Anthropic from "@anthropic-ai/sdk";
import Replicate from "replicate";
import sharp from "sharp";
import { describeColorTone } from "@/lib/color-extract";
import type { CategoryTheme } from "@/lib/category-theme";
import type { ConceptBrief } from "@/lib/concept-brief";
import { formatConceptPromptBlock } from "@/lib/concept-brief";
import {
  analyzeShadowDirection,
  applySafeCrop,
  computeSafeCanvasPlacement,
  detectTextRegionsFromUrl,
  type ShadowAnalysis,
  type TextRegion,
} from "@/lib/vision-utils";

const CANVAS_SIZE = 1200;
const FILL_BASE_SIZE = 1024;

let replicateClient: Replicate | null = null;

function getReplicateClient(): Replicate {
  if (!replicateClient) {
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error("REPLICATE_API_TOKEN이 설정되지 않았습니다.");
    }
    // useFileOutput 기본값(true)이면 run()이 URL 문자열 대신 FileOutput
    // 객체(ReadableStream 서브클래스, JSON 직렬화 시 {}로 보임)를 반환해
    // 이 파일의 URL 문자열 기대 코드(extractFluxImageUrl 등)가 깨진다.
    replicateClient = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
      useFileOutput: false,
    });
  }
  return replicateClient;
}

// Replicate 각 모델의 실행당 비용(USD). 모델 페이지에 공개된 단가
// (2026-08-14 확인) 기준으로 고정값을 쓴다 — 매 요청마다 가격 API를 조회하지
// 않고, 단가가 바뀌면 이 상수만 갱신하면 된다.
const REPLICATE_COST_USD = {
  backgroundRemover: 0.00047, // 851-labs/background-remover — Nvidia T4, ~3s/run
  clarityUpscaler: 0.016, // philz1337x/clarity-upscaler — Nvidia A100(40GB), ~14s/run
  // black-forest-labs/flux-fill-dev: Replicate가 이 모델 전용 단가를 페이지에
  // 공개하지 않아, 같은 체급(FLUX.1 [dev])의 공식 단가($0.025/image)로 근사한다.
  // 정확한 단가가 확인되면 이 값만 교체하면 된다.
  fluxFillDev: 0.025,
  // black-forest-labs/flux-schnell — 공식 단가 ~$0.003/image (2026-08-14)
  fluxSchnell: 0.003,
} as const;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} 타임아웃 (${ms}ms)`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

const BACKDROP_PROMPTS: Record<string, string> = {
  "화장품/뷰티":
    "minimalist skincare studio background, soft pastel marble surface, gentle natural window light, subtle water droplets, empty product photography backdrop, maintain natural product shadow direction and intensity from the original photo, realistic studio lighting, no text, no logo, no product",
  "식품/건강기능식품":
    "warm rustic wooden table background, soft natural light, fresh ingredients softly blurred in background, empty food photography backdrop, maintain natural product shadow direction and intensity from the original photo, realistic studio lighting, no text, no logo, no product",
  "전자제품":
    "clean minimal tech studio background, cool gray gradient, soft studio lighting, subtle geometric shapes, empty product photography backdrop, maintain natural product shadow direction and intensity from the original photo, realistic studio lighting, no text, no logo, no product",
  "의류/패션":
    "soft neutral fabric-textured studio background, warm editorial lighting, empty product photography backdrop, maintain natural product shadow direction and intensity from the original photo, realistic studio lighting, no text, no logo, no product",
  "생활용품":
    "bright airy home interior background, soft natural light, minimal styling, empty product photography backdrop, maintain natural product shadow direction and intensity from the original photo, realistic studio lighting, no text, no logo, no product",
  "반려동물":
    "warm cozy home background, soft natural light, playful pastel tones, empty product photography backdrop, maintain natural product shadow direction and intensity from the original photo, realistic studio lighting, no text, no logo, no product",
  "기타":
    "clean minimal product photography studio background, soft gradient, empty backdrop, maintain natural product shadow direction and intensity from the original photo, realistic studio lighting, no text, no logo, no product",
};

function extractFluxImageUrl(output: unknown): string | null {
  const url = Array.isArray(output) ? output[0] : output;
  return typeof url === "string" && url.length > 0 ? url : null;
}

// Replicate ApiError는 message에 상태코드/본문이 항상 담기지 않아서,
// response가 있으면 status + body를 직접 읽어 로그/에러 메시지에 남긴다.
async function describeReplicateError(error: unknown): Promise<string> {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    (error as { response?: Response }).response instanceof Response
  ) {
    const response = (error as { response: Response }).response;
    let bodyText = "<본문 읽기 실패>";
    try {
      // body가 이미 소비된 Response에서 clone()을 호출하면 그 자체로 던져서
      // (Promise reject가 아니라 동기 예외) 아래 try/catch로 감싸야 한다.
      bodyText = response.bodyUsed ? "<본문 이미 소비됨>" : await response.clone().text();
    } catch {
      // no-op, bodyText는 기본값 유지
    }
    return `HTTP ${response.status} ${response.statusText} — ${bodyText}`;
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

async function buildSolidCanvas(hexColor: string): Promise<Buffer> {
  return sharp({
    create: {
      width: FILL_BASE_SIZE,
      height: FILL_BASE_SIZE,
      channels: 3,
      background: hexColor,
    },
  })
    .png()
    .toBuffer();
}

// black-forest-labs/flux-fill-dev는 인페인팅 모델이라 prompt만으로는 호출할
// 수 없고 image(+선택적 mask)가 필수다. 전체를 새로 그리게 하려면 흰색
// (= 전부 채워 넣기) 마스크를 함께 준다. base 이미지 자체는 baseNeutral
// 색으로 깔아 두어, 모델이 그 톤 근처에서 배경을 생성하도록 유도한다.
const FULL_INPAINT_MASK = sharp({
  create: {
    width: FILL_BASE_SIZE,
    height: FILL_BASE_SIZE,
    channels: 3,
    background: "#FFFFFF",
  },
})
  .png()
  .toBuffer();

// Replicate 모델 버전을 코드에 직접 고정한다. owner/name 형식으로만
// predictions를 생성하면 비공식(커뮤니티) 모델은 항상 404가 나고
// (851-labs/background-remover 사례), 매 호출마다 models.get()으로 최신
// 버전을 조회하면 트래픽이 몰릴 때 429가 날 수 있다. 아래 버전 ID는
// Replicate API(models.get)로 2026-08-14에 직접 조회해 고정한 값이며,
// 모델이 새 버전을 배포하면 이 상수도 함께 갱신해야 한다.
type ModelRef = `${string}/${string}:${string}`;

const CLARITY_UPSCALER_REF: ModelRef =
  "philz1337x/clarity-upscaler:dfad41707589d68ecdccd1dfa600d55a208f9310748e44bfe35b4a6291453d5e";
const FLUX_FILL_DEV_REF: ModelRef =
  "black-forest-labs/flux-fill-dev:a053f84125613d83e65328a289e14eb6639e10725c243e8fb0c24128e5573f4c";
const FLUX_SCHNELL_REF = "black-forest-labs/flux-schnell" as const;

export type EnhanceImageOptions = {
  shadowHint?: ShadowAnalysis;
  conceptBrief?: ConceptBrief;
  /** 장식 그래픽 합성 여부 (히어로 섹션 필수) */
  applyDecor?: boolean;
  /** 첫 히어로에서 생성한 장식을 재사용할 때 */
  decorBuffer?: Buffer;
  theme?: Pick<CategoryTheme, "accent" | "baseNeutral" | "deepAccent">;
};

/** 컨셉 모티프 기반 장식 그래픽 — flux-schnell로 저비용 생성 */
export async function generateDecorativeGraphic(
  conceptBrief: ConceptBrief,
  theme: Pick<CategoryTheme, "accent" | "baseNeutral" | "deepAccent">,
  shadow: ShadowAnalysis,
): Promise<{ buffer: Buffer; cost: number }> {
  const replicate = getReplicateClient();
  const prompt = [
    conceptBrief.decor_prompt,
    formatConceptPromptBlock(conceptBrief),
    `soft ${describeColorTone(theme.accent)} accent tones on ${describeColorTone(theme.baseNeutral)} background`,
    shadow.promptHint,
    "decorative graphic elements only, no product, no packaging, no text, no logo",
    "soft edges, professional ecommerce detail page ornament, scattered around frame edges",
  ].join(", ");

  const cost = REPLICATE_COST_USD.fluxSchnell;
  console.log(`[cost] generateDecorativeGraphic (flux-schnell): $${cost.toFixed(4)}`);

  const output = await withTimeout(
    replicate.run(FLUX_SCHNELL_REF, {
      input: {
        prompt,
        num_outputs: 1,
        aspect_ratio: "1:1",
        output_format: "png",
        output_quality: 90,
      },
      wait: { mode: "poll", interval: 1000 },
    }),
    60000,
    "flux-schnell 장식 그래픽",
  );

  const url = extractFluxImageUrl(output);
  if (!url) {
    throw new Error("장식 그래픽 생성 결과 URL을 받지 못했습니다.");
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("장식 그래픽 이미지를 불러오지 못했습니다.");
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return { buffer, cost };
}

async function compositeDecorOnBackdrop(
  backdropBuffer: Buffer,
  decorBuffer: Buffer,
  opacity = 0.48,
): Promise<Buffer> {
  const decorWithAlpha = await sharp(decorBuffer)
    .resize(CANVAS_SIZE, CANVAS_SIZE, { fit: "cover" })
    .ensureAlpha()
    .linear([1, 1, 1, opacity], [0, 0, 0, 0])
    .png()
    .toBuffer();

  return sharp(backdropBuffer)
    .composite([{ input: decorWithAlpha, blend: "over" }])
    .png()
    .toBuffer();
}

function buildShadowSvg(shadow: ShadowAnalysis): string {
  const cx = CANVAS_SIZE * shadow.shadowCenterX;
  const cy = CANVAS_SIZE * shadow.shadowCenterY;
  const opacity = Math.min(0.28, Math.max(0.08, shadow.shadowIntensity));
  return `
    <svg width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(0,0,0,${opacity})" />
          <stop offset="100%" stop-color="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
      <ellipse cx="${cx}" cy="${cy}" rx="${CANVAS_SIZE * 0.22}" ry="${CANVAS_SIZE * 0.06}" fill="url(#shadow)" />
    </svg>`;
}

async function fetchSourceBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`이미지 fetch 실패: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

// 카테고리+상품 정보 기반으로 flux-fill-dev로 배경 후보 3장을 생성하고,
// Claude Vision이 그중 가장 상품 사진과 어울릴 배경을 골라 반환한다.
// 상품 1건당 한 번만 호출해서, 모든 사진에 같은 배경을 재사용한다.
// theme(accent/baseNeutral/deepAccent)은 호출부(색상 추출 실패 시
// 카테고리 기본 테마로 폴백)가 결정해서 넘긴다 — 이 함수는 그 값을
// 프롬프트 톤 힌트로만 사용한다.
export async function generateBackdrop(
  category: string,
  productName: string,
  brandName: string | null,
  theme: Pick<CategoryTheme, "accent" | "baseNeutral" | "deepAccent">,
  sourceImageUrl?: string,
  conceptBrief?: ConceptBrief,
): Promise<{ buffer: Buffer; cost: number; shadow: ShadowAnalysis }> {
  const replicate = getReplicateClient();
  const basePrompt = BACKDROP_PROMPTS[category] ?? BACKDROP_PROMPTS["기타"];

  let shadow: ShadowAnalysis = {
    promptHint: "soft studio lighting from upper left, natural product shadow falling gently to the lower right",
    shadowCenterX: 0.5,
    shadowCenterY: 0.83,
    shadowIntensity: 0.18,
  };
  if (sourceImageUrl) {
    try {
      const sourceBuffer = await fetchSourceBuffer(sourceImageUrl);
      shadow = await analyzeShadowDirection(sourceBuffer);
      console.log(`[shadow] 분석 결과: ${shadow.promptHint}`);
    } catch (error) {
      console.warn("[shadow] 원본 그림자 분석 실패, 기본 조명 사용", error);
    }
  }

  const conceptBlock = conceptBrief ? `, ${formatConceptPromptBlock(conceptBrief)}` : "";
  const prompt = `${basePrompt}${conceptBlock}, ${shadow.promptHint}, soft ${describeColorTone(theme.baseNeutral)} tone, subtle ${describeColorTone(theme.accent)} accent lighting`;

  const [baseImage, fullMask] = await Promise.all([
    buildSolidCanvas(theme.baseNeutral),
    FULL_INPAINT_MASK,
  ]);

  const CANDIDATE_COUNT = 3;
  const cost = CANDIDATE_COUNT * REPLICATE_COST_USD.fluxFillDev;
  console.log(
    `[cost] generateBackdrop (flux-fill-dev x${CANDIDATE_COUNT}): $${cost.toFixed(4)}`,
  );

  // run()의 반환값(output만 추출된 값)만으로는 실패 원인을 알 수 없어서,
  // progress 콜백으로 완료 시점의 원본 prediction(status/error/logs)을 같이 받아둔다.
  const rawPredictions: unknown[] = [];

  const results = await Promise.allSettled(
    Array.from({ length: CANDIDATE_COUNT }).map((_, i) =>
      withTimeout(
        replicate.run(
          FLUX_FILL_DEV_REF,
          {
            input: {
              prompt,
              image: baseImage,
              mask: fullMask,
              output_format: "png",
            },
            // 기본 wait:{mode:"block"}은 Replicate 서버 쪽 동기 대기 타임아웃이
            // 만료되면 prediction이 "processing" 상태로 남아있어도 완료로
            // 간주해 output: null을 반환하는 문제가 있어(generate-backdrop
            // 500 에러의 원인이었음), poll 모드로 강제해 실제 종료 상태
            // (succeeded/failed)까지 폴링하도록 한다.
            wait: { mode: "poll", interval: 1000 },
          },
          (prediction) => {
            rawPredictions[i] = prediction;
          },
        ),
        120000,
        "flux-fill-dev 배경 생성",
      ),
    ),
  );

  const failureReasons: string[] = [];

  const candidateUrls = (
    await Promise.all(
      results.map(async (result, i) => {
        if (result.status !== "fulfilled") {
          const detail = await describeReplicateError(result.reason);
          console.error("[generateBackdrop] flux-fill-dev 호출 실패:", detail);
          failureReasons.push(detail);
          return null;
        }

        const url = extractFluxImageUrl(result.value);
        if (!url) {
          const rawPrediction = rawPredictions[i];
          const predictionSummary =
            rawPrediction && typeof rawPrediction === "object"
              ? JSON.stringify({
                  status: (rawPrediction as { status?: string }).status,
                  error: (rawPrediction as { error?: unknown }).error,
                  logs: (rawPrediction as { logs?: string }).logs,
                })
              : JSON.stringify(rawPrediction);
          console.error(
            "[generateBackdrop] flux-fill-dev 결과 URL 없음. output:",
            JSON.stringify(result.value),
            "prediction:",
            predictionSummary,
          );
          failureReasons.push(
            `결과에 URL 없음 (output=${JSON.stringify(result.value)}, prediction=${predictionSummary})`,
          );
          return null;
        }

        return url;
      }),
    )
  ).filter((url): url is string => url !== null);

  if (candidateUrls.length === 0) {
    throw new Error(
      `배경 이미지 생성에 모두 실패했습니다. 원인: ${failureReasons.join(" | ")}`,
    );
  }

  const bestIndex =
    candidateUrls.length === 1
      ? 0
      : await pickBestBackdrop(candidateUrls, productName, brandName ?? null);

  const chosenUrl = candidateUrls[bestIndex] ?? candidateUrls[0];
  const chosenResponse = await fetch(chosenUrl);
  if (!chosenResponse.ok) {
    throw new Error("선택된 배경 이미지를 불러오지 못했습니다.");
  }
  const buffer = Buffer.from(await chosenResponse.arrayBuffer());
  return { buffer, cost, shadow };
}

async function pickBestBackdrop(
  urls: string[],
  productName: string,
  brandName: string | null,
): Promise<number> {
  if (!process.env.ANTHROPIC_API_KEY) {
    // 키가 없으면 그냥 첫 번째 후보 사용 (배경 생성 자체는 계속 동작해야 하므로)
    return 0;
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const imageBlocks = await Promise.all(
      urls.map(async (url) => {
        const response = await fetch(url);
        const buffer = Buffer.from(await response.arrayBuffer());
        return {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: "image/png" as const,
            data: buffer.toString("base64"),
          },
        };
      }),
    );

    const content = imageBlocks.flatMap((block, index) => [
      { type: "text" as const, text: `배경 후보 ${index}:` },
      block,
    ]);

    const indexOptions = urls.map((_, i) => String(i)).join(", ");
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 10,
      messages: [
        {
          role: "user",
          content: [
            ...content,
            {
              type: "text",
              text: `"${productName}"${brandName ? ` (${brandName})` : ""} 상품 사진을 올려둘 배경으로, 위 ${urls.length}개(${indexOptions}) 중 가장 깔끔하고 상품이 돋보일 배경 하나를 고르세요. 숫자 하나만 답하세요.`,
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const indexPattern = new RegExp(`[0-${urls.length - 1}]`);
    const match =
      textBlock && textBlock.type === "text" ? textBlock.text.match(indexPattern) : null;
    const parsed = match ? parseInt(match[0], 10) : 0;
    return Math.min(Math.max(parsed, 0), urls.length - 1);
  } catch (error) {
    console.warn("[pickBestBackdrop] 실패, 첫 번째 후보 사용", error);
    return 0;
  }
}

// 원본 상품 사진의 배경을 제거하고, 미리 생성/선택된 backdropBuffer 위에 합성한다.
// backdropBuffer는 generateBackdrop()으로 상품당 한 번만 만들어 여러 사진에 재사용.
// 851-labs/background-remover는 공식(official) 모델이 아니라서, 버전을
// 지정하지 않고 "owner/name"으로 predictions를 생성하면 항상 404가 난다
// (owner/name 미지정 경로는 공식 모델에만 열려 있음. flux-schnell은 공식
// 모델이라 문제없이 동작). 최신 버전 해시를 조회해 버전을 명시해서 호출한다.
let backgroundRemoverVersionRef: ModelRef | null = null;

async function getBackgroundRemoverRef(replicate: Replicate): Promise<ModelRef> {
  if (!backgroundRemoverVersionRef) {
    const model = await replicate.models.get("851-labs", "background-remover");
    const versionId = model.latest_version?.id;
    if (!versionId) {
      throw new Error("851-labs/background-remover 모델의 최신 버전을 찾을 수 없습니다.");
    }
    backgroundRemoverVersionRef = `851-labs/background-remover:${versionId}`;
  }
  return backgroundRemoverVersionRef;
}

// 배경 제거 직후, 배경 합성 이전에 clarity-upscaler로 화질(디테일/노이즈)을
// 보정한다. 실패해도(타임아웃 포함) 전체 파이프라인을 막지 않도록 배경
// 제거 결과(cutout)로 조용히 폴백한다.
async function sharpenCutout(cutoutUrl: string): Promise<{ url: string; cost: number }> {
  try {
    const replicate = getReplicateClient();
    const output = await withTimeout(
      replicate.run(
        CLARITY_UPSCALER_REF,
        {
          input: { image: cutoutUrl },
          // flux-fill-dev와 동일한 이유로 poll 모드 강제 (조기 반환 방지).
          wait: { mode: "poll", interval: 1000 },
        },
      ),
      90000,
      "clarity-upscaler 화질 보정",
    );

    const upscaledUrl = extractFluxImageUrl(output);
    if (!upscaledUrl) {
      console.warn(
        "[sharpenCutout] clarity-upscaler 결과 URL 없음, 보정 전 컷아웃 사용. output:",
        JSON.stringify(output),
      );
      return { url: cutoutUrl, cost: REPLICATE_COST_USD.backgroundRemover };
    }

    return {
      url: upscaledUrl,
      cost: REPLICATE_COST_USD.backgroundRemover + REPLICATE_COST_USD.clarityUpscaler,
    };
  } catch (error) {
    console.warn(
      "[sharpenCutout] clarity-upscaler 실패, 보정 전 컷아웃으로 폴백:",
      await describeReplicateError(error),
    );
    return { url: cutoutUrl, cost: REPLICATE_COST_USD.backgroundRemover };
  }
}

export async function enhanceProductImage(
  sourceImageUrl: string,
  backdropBuffer: Buffer,
  options: EnhanceImageOptions = {},
): Promise<{ buffer: Buffer; cost: number; decorBuffer?: Buffer; decorCost?: number }> {
  const { shadowHint, conceptBrief, applyDecor, decorBuffer: reuseDecor, theme } = options;
  const replicate = getReplicateClient();
  const modelRef = await getBackgroundRemoverRef(replicate);

  // 크롭 안전: 원본에서 라벨/로고/텍스트 영역을 Haiku 비전으로 감지
  let textRegions: TextRegion[] = [];
  try {
    textRegions = await detectTextRegionsFromUrl(sourceImageUrl);
    if (textRegions.length > 0) {
      console.log(
        `[safeCrop] ${textRegions.length}개 텍스트 영역 감지:`,
        textRegions.map((r) => r.kind).join(", "),
      );
    }
  } catch (error) {
    console.warn("[safeCrop] 텍스트 영역 감지 실패, 기본 crop 사용", error);
  }

  const output = await replicate.run(modelRef, {
    input: { image: sourceImageUrl },
  });

  const cutoutUrl = Array.isArray(output) ? output[0] : output;
  if (!cutoutUrl || typeof cutoutUrl !== "string") {
    throw new Error("배경 제거 결과를 받지 못했습니다.");
  }

  const { url: sharpenedUrl, cost } = await sharpenCutout(cutoutUrl);
  console.log(`[cost] enhanceProductImage: $${cost.toFixed(5)}`);

  const cutoutResponse = await fetch(sharpenedUrl);
  if (!cutoutResponse.ok) {
    throw new Error("보정된 이미지를 불러오지 못했습니다.");
  }
  const cutoutBuffer = Buffer.from(await cutoutResponse.arrayBuffer());

  // 라벨·로고가 잘리지 않도록 안전 여백 crop (배경 제거 후 동일 좌표계)
  const safeCutout = textRegions.length > 0
    ? await applySafeCrop(cutoutBuffer, textRegions)
    : cutoutBuffer;

  const backdropResized = await sharp(backdropBuffer)
    .resize(CANVAS_SIZE, CANVAS_SIZE, { fit: "cover" })
    .png()
    .toBuffer();

  let shadow = shadowHint;
  if (!shadow) {
    try {
      const sourceBuffer = await fetchSourceBuffer(sourceImageUrl);
      shadow = await analyzeShadowDirection(sourceBuffer);
    } catch {
      shadow = {
        promptHint: "soft studio lighting from upper left",
        shadowCenterX: 0.5,
        shadowCenterY: 0.83,
        shadowIntensity: 0.18,
      };
    }
  }

  let decorCost = 0;
  let decorBuffer = reuseDecor;
  if (applyDecor && conceptBrief && theme && !decorBuffer) {
    try {
      const generated = await generateDecorativeGraphic(conceptBrief, theme, shadow);
      decorBuffer = generated.buffer;
      decorCost = generated.cost;
    } catch (error) {
      console.warn("[decor] 장식 그래픽 생성 실패, 배경만 사용", error);
    }
  }

  const backdropWithDecor =
    decorBuffer != null
      ? await compositeDecorOnBackdrop(backdropResized, decorBuffer)
      : backdropResized;

  const shadowSvg = buildShadowSvg(shadow);
  const shadowBuffer = await sharp(Buffer.from(shadowSvg)).png().toBuffer();

  const cutoutMetaRaw = await sharp(safeCutout).metadata();
  const rawW = cutoutMetaRaw.width ?? 1;
  const rawH = cutoutMetaRaw.height ?? 1;

  const placement = computeSafeCanvasPlacement(
    CANVAS_SIZE,
    rawW,
    rawH,
    textRegions,
  );
  const targetW = Math.round(rawW * placement.scale);
  const targetH = Math.round(rawH * placement.scale);

  const cutoutResized = await sharp(safeCutout)
    .resize(targetW, targetH, { fit: "inside", withoutEnlargement: false })
    .toBuffer();

  const finalBuffer = await sharp(backdropWithDecor)
    .composite([
      { input: shadowBuffer, left: 0, top: 0 },
      { input: cutoutResized, left: placement.left, top: placement.top },
    ])
    .png()
    .toBuffer();

  const totalCost = cost + decorCost;
  if (decorCost > 0) {
    console.log(
      `[cost] enhanceProductImage total=$${totalCost.toFixed(5)} (enhance=$${cost.toFixed(5)} decor=$${decorCost.toFixed(4)})`,
    );
  }

  return { buffer: finalBuffer, cost: totalCost, decorBuffer, decorCost: decorCost || undefined };
}
