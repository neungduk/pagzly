import Replicate from "replicate";
import sharp from "sharp";
import { describeColorTone } from "@/lib/color-extract";
import type { CategoryTheme } from "@/lib/category-theme";
import type { ConceptBrief } from "@/lib/concept-brief";
import { formatConceptPromptBlock } from "@/lib/concept-brief";
import { resolvePhotographyTemplate } from "@/lib/backdrop-prompt-templates";
import {
  analyzeShadowDirection,
  applySafeCrop,
  computeSafeCanvasPlacement,
  detectTextRegionsFromUrl,
  lightingLockPrompt,
  DEFAULT_SHADOW,
  type ShadowAnalysis,
  type TextRegion,
} from "@/lib/vision-utils";
import {
  buildProductShadowSvg,
  featherCutout,
  matchCutoutWhiteBalance,
  measureTransparentRatio,
} from "@/lib/photo-composite";
import { isTestMode } from "@/lib/test-mode";
import { logForceRegenerateStatus } from "@/lib/force-regenerate";

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

const CANDIDATE_VARIATIONS = [
  "identical color temperature to the lighting lock, more negative space around empty center",
  "identical color temperature to the lighting lock, slightly closer surface plane",
  "identical color temperature to the lighting lock, softer falloff, same white balance",
  "identical color temperature to the lighting lock, wider empty studio sweep",
  "identical color temperature to the lighting lock, shallow depth of field on the surface only",
  "identical color temperature to the lighting lock, subtle vignette, empty pedestal area",
  "identical color temperature to the lighting lock, higher key but no golden cast",
  "identical color temperature to the lighting lock, lower contrast pastel plane",
  "identical color temperature to the lighting lock, almost white cyc wall",
  "identical color temperature to the lighting lock, centered empty product slot",
];

/** 최종 승인 배경 후보 수. `.env.local`의 BACKDROP_CANDIDATES로 조절 (기본 7, 1–10). */
export function getBackdropCandidateCount(): number {
  const raw = Number(process.env.BACKDROP_CANDIDATES);
  if (Number.isFinite(raw) && raw >= 1) {
    return Math.min(10, Math.max(1, Math.round(raw)));
  }
  return 7;
}

const BACKDROP_PROMPTS: Record<string, string> = {
  "화장품/뷰티":
    "minimalist skincare studio background, empty dimensional set, MATCH the product lighting lock exactly, no golden hour, no amber gel, empty product photography backdrop, no text, no logo, no product",
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function replicateRetryAfterMs(error: unknown): number | null {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/retry_after["']?\s*[:=]\s*(\d+)/i);
  if (match) return Math.max(Number(match[1]), 3) * 1000;
  if (/429|throttled|rate limit/i.test(message)) return 8000;
  return null;
}

/** Replicate 429(throttle) 시 retry_after 만큼 대기 후 재시도 */
async function runReplicateWithRetry<T>(
  label: string,
  run: () => Promise<T>,
  maxAttempts = 4,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      const waitMs = replicateRetryAfterMs(error);
      if (waitMs == null || attempt >= maxAttempts - 1) break;
      console.warn(
        `[replicate] ${label} throttle — ${waitMs}ms 후 재시도 (${attempt + 1}/${maxAttempts - 1})`,
      );
      await sleep(waitMs);
    }
  }
  throw lastError;
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

/** 컨셉 모티프 기반 장식 그래픽 — flux-schnell로 저비용 생성.
 *  히어로 *배경* 위에 얹는 용도. 상품 사진 위 물방울/미스트 오버레이는
 *  `lib/concept-effects.ts` 를 쓴다. */
export async function generateDecorativeGraphic(
  conceptBrief: ConceptBrief,
  theme: Pick<CategoryTheme, "accent" | "baseNeutral" | "deepAccent">,
  shadow: ShadowAnalysis,
): Promise<{ buffer: Buffer; cost: number }> {
  const replicate = getReplicateClient();
  const prompt = [
    conceptBrief.decor_prompt,
    formatConceptPromptBlock(conceptBrief),
    lightingLockPrompt(shadow),
    "decorative graphic elements only, no product, no packaging, no text, no logo",
    "soft edges, professional ecommerce detail page ornament, scattered around frame edges",
    shadow.colorTemperature === "warm"
      ? `soft ${describeColorTone(theme.accent)} accent tones`
      : "neutral white highlights only, no golden ornaments",
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

// 2026-08-18 수정: 예전에는 장식 이미지(물방울/미스트 등)를 캔버스 전체에
// 48% 불투명도로 통짜로 덮어썼다. 장식 이미지와 배경 이미지가 서로 다른
// 톤/구도의 별개 생성물이다 보니, 상품이 놓인 중앙까지 겹쳐지면서 경계가
// 뚜렷한 "이중노출/유령" 사각형처럼 보이는 문제가 있었다 (실제 결과물
// 육안 확인으로 발견, review/before-after-fix 참고).
// 지금은 (1) 기본 불투명도를 크게 낮추고 (2) 중앙(상품 자리)은 완전히
// 비우고 테두리로 갈수록만 보이는 방사형 비네트를 알파에 곱해서, 장식이
// 상품/배경 위에 안 겹치고 프레임 바깥쪽 액센트로만 은은히 남게 한다.
async function compositeDecorOnBackdrop(
  backdropBuffer: Buffer,
  decorBuffer: Buffer,
  opacity = 0.14,
): Promise<Buffer> {
  const resized = await sharp(decorBuffer)
    .resize(CANVAS_SIZE, CANVAS_SIZE, { fit: "cover" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 중앙 55%는 완전 투명, 그 바깥부터 가장자리까지 서서히 불투명해지는
  // 방사형 비네트. 상품과 겹치는 중앙부는 장식이 아예 안 보이게 만든다.
  const vignetteSvg = `
    <svg width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" xmlns="http://www.w3.org/2000/svg">
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
    .resize(CANVAS_SIZE, CANVAS_SIZE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = resized.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const vignetteFactor = vignette.data[i + 3] / 255;
    pixels[i + 3] = Math.round(pixels[i + 3] * opacity * vignetteFactor);
  }

  const decorWithAlpha = await sharp(pixels, {
    raw: { width: CANVAS_SIZE, height: CANVAS_SIZE, channels: 4 },
  })
    .png()
    .toBuffer();

  return sharp(backdropBuffer)
    .composite([{ input: decorWithAlpha, blend: "over" }])
    .png()
    .toBuffer();
}

async function fetchSourceBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`이미지 fetch 실패: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

export type GenerateBackdropResult = {
  buffer: Buffer | null;
  candidateUrls: string[];
  cost: number;
  shadow: ShadowAnalysis;
  claudeCost: number;
  candidateCount: number;
  autoPicked: boolean;
};

// 카테고리+상품 정보 기반으로 flux-fill-dev로 배경 후보를 생성한다.
// TEST_MODE: flux-schnell 1장 자동.
// 최종 승인: 후보 N장(BACKDROP_CANDIDATES)을 반환하고 pickBestBackdrop는 호출하지 않는다.
export async function generateBackdrop(
  category: string,
  productName: string,
  brandName: string | null,
  theme: Pick<CategoryTheme, "accent" | "baseNeutral" | "deepAccent">,
  sourceImageUrl?: string,
  conceptBrief?: ConceptBrief,
): Promise<GenerateBackdropResult> {
  const replicate = getReplicateClient();
  const basePrompt = BACKDROP_PROMPTS[category] ?? BACKDROP_PROMPTS["기타"];
  let claudeCost = 0;

  let shadow: ShadowAnalysis = { ...DEFAULT_SHADOW };
  if (sourceImageUrl) {
    try {
      const sourceBuffer = await fetchSourceBuffer(sourceImageUrl);
      const shadowResult = await analyzeShadowDirection(sourceBuffer);
      shadow = shadowResult.shadow;
      claudeCost += shadowResult.cost;
      console.log(`[shadow] 분석 결과: ${shadow.promptHint}`);
    } catch (error) {
      console.warn("[shadow] 원본 그림자 분석 실패, 기본 조명 사용", error);
    }
  }

  const photography = resolvePhotographyTemplate(conceptBrief);
  const conceptBlock = conceptBrief ? `, ${formatConceptPromptBlock(conceptBrief)}` : "";
  const lock = lightingLockPrompt(shadow);
  const accentClause =
    shadow.colorTemperature === "warm"
      ? `subtle ${describeColorTone(theme.accent)} accent lighting`
      : "no warm accent gel, no amber bounce, keep white balance locked to the product";
  const prompt = `${basePrompt}${conceptBlock}, ${photography.prompt}, ${lock}, ${accentClause}, soft ${describeColorTone(theme.baseNeutral)} set color without shifting key light`;

  console.log(`[shadow] 조명 잠금: ${lock}`);
  console.log(`[prompt] generateBackdrop (TEST_MODE=${isTestMode()}): ${prompt}`);

  if (isTestMode()) {
    logForceRegenerateStatus();
    const cost = REPLICATE_COST_USD.fluxSchnell;
    console.log(`[replicate] CALL flux-schnell x1 (TEST_MODE backdrop)`);
    console.log(`[cost] generateBackdrop (flux-schnell x1, TEST_MODE): $${cost.toFixed(4)}`);

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
      "flux-schnell 배경 생성 (TEST_MODE)",
    );

    const url = extractFluxImageUrl(output);
    if (!url) {
      throw new Error("TEST_MODE 배경 이미지 생성 결과 URL을 받지 못했습니다.");
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("TEST_MODE 배경 이미지를 불러오지 못했습니다.");
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      buffer,
      candidateUrls: [],
      cost,
      shadow,
      claudeCost,
      candidateCount: 1,
      autoPicked: true,
    };
  }

  const [baseImage, fullMask] = await Promise.all([
    buildSolidCanvas(theme.baseNeutral),
    FULL_INPAINT_MASK,
  ]);

  const CANDIDATE_COUNT = getBackdropCandidateCount();
  const cost = CANDIDATE_COUNT * REPLICATE_COST_USD.fluxFillDev;
  logForceRegenerateStatus();
  console.log(`[prompt] generateBackdrop base (flux-fill-dev x${CANDIDATE_COUNT}): ${prompt}`);
  console.log(
    `[replicate] CALL flux-fill-dev x${CANDIDATE_COUNT} (human-pick, no pickBestBackdrop)`,
  );
  console.log(
    `[cost] generateBackdrop (flux-fill-dev x${CANDIDATE_COUNT}, human-pick, no pickBestBackdrop): $${cost.toFixed(4)}`,
  );

  // run()의 반환값(output만 추출된 값)만으로는 실패 원인을 알 수 없어서,
  // progress 콜백으로 완료 시점의 원본 prediction(status/error/logs)을 같이 받아둔다.
  const rawPredictions: unknown[] = [];

  const results = await Promise.allSettled(
    Array.from({ length: CANDIDATE_COUNT }).map((_, i) => {
      const candidatePrompt = `${prompt}, ${CANDIDATE_VARIATIONS[i % CANDIDATE_VARIATIONS.length]}`;
      console.log(`[prompt] generateBackdrop candidate-${i}: ${candidatePrompt}`);
      return withTimeout(
        replicate.run(
          FLUX_FILL_DEV_REF,
          {
            input: {
              prompt: candidatePrompt,
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
      );
    }),
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

  console.log(
    `[generateBackdrop] "${productName}"${brandName ? ` (${brandName})` : ""} 후보 ${candidateUrls.length}장 — pickBestBackdrop 생략, 사람이 선택`,
  );
  return {
    buffer: null,
    candidateUrls,
    cost,
    shadow,
    claudeCost,
    candidateCount: candidateUrls.length,
    autoPicked: false,
  };
}

const SECTION_BACKDROP_PROMPTS = {
  ingredient:
    "extreme close-up of empty clear glass with condensation water droplets and specular reflections, wet glass surface only, no bottle, no dropper, no product, no packaging, no text, no logo, no human skin, product photography empty backdrop",
  texture:
    "macro photograph of a clear watery serum formula slowly dripping and flowing across a glass plane, viscous ribbon smear, shallow depth of field, no bottle, no packaging, no hands, no text, no logo, empty formula-only frame",
} as const;

async function generateSchnellPng(prompt: string): Promise<string> {
  const replicate = getReplicateClient();
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
    "flux-schnell 섹션 배경",
  );
  const url = extractFluxImageUrl(output);
  if (!url) {
    throw new Error("섹션 배경 URL을 받지 못했습니다.");
  }
  return url;
}

/** 히어로에서 고른 스튜디오 배경과 다른 성분/텍스처 연출. flux-schnell ×2. */
export async function generateSectionBackdropVariants(
  shadow: ShadowAnalysis,
  conceptBrief?: ConceptBrief,
): Promise<{ ingredientUrl: string | null; textureUrl: string | null; cost: number }> {
  const lock = lightingLockPrompt(shadow);
  const conceptBlock = conceptBrief ? formatConceptPromptBlock(conceptBrief) : "";
  const kinds = ["ingredient", "texture"] as const;
  const results = await Promise.allSettled(
    kinds.map(async (kind) => {
      const prompt = [
        SECTION_BACKDROP_PROMPTS[kind],
        conceptBlock,
        lock,
        "obey lighting lock color temperature exactly, no golden hour, no amber gel",
      ]
        .filter(Boolean)
        .join(", ");
      console.log(`[prompt] generateSectionBackdrop ${kind}: ${prompt}`);
      console.log(`[replicate] CALL flux-schnell (section-backdrop ${kind})`);
      const url = await generateSchnellPng(prompt);
      console.log(`[section-backdrop] ${kind} 생성`);
      return { kind, url };
    }),
  );

  let ingredientUrl: string | null = null;
  let textureUrl: string | null = null;
  let cost = 0;
  for (const result of results) {
    if (result.status === "fulfilled") {
      cost += REPLICATE_COST_USD.fluxSchnell;
      if (result.value.kind === "ingredient") ingredientUrl = result.value.url;
      else textureUrl = result.value.url;
    } else {
      console.warn("[section-backdrop] 생성 실패:", result.reason);
    }
  }
  console.log(`[cost] generateSectionBackdropVariants: $${cost.toFixed(4)}`);
  return { ingredientUrl, textureUrl, cost };
}

// 원본 상품 사진의 배경을 제거하고, 미리 생성/선택된 backdropBuffer 위에 합성한다.
// 히어로/성분/텍스처는 서로 다른 backdropBuffer를 쓴다.
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
  const origRes = await fetch(cutoutUrl);
  if (!origRes.ok) {
    throw new Error("배경 제거 결과 이미지를 불러오지 못했습니다.");
  }
  const origBuf = Buffer.from(await origRes.arrayBuffer());
  const origAlpha = await measureTransparentRatio(origBuf);

  if (isTestMode()) {
    console.log(
      `[cost] sharpenCutout: TEST_MODE — clarity-upscaler 생략 (cutout alpha=${origAlpha.toFixed(3)})`,
    );
    return { url: cutoutUrl, cost: REPLICATE_COST_USD.backgroundRemover };
  }

  console.log(
    `[cost] sharpenCutout: clarity-upscaler ON (TEST_MODE=false): $${REPLICATE_COST_USD.clarityUpscaler.toFixed(4)}`,
  );

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

    const upRes = await fetch(upscaledUrl);
    if (upRes.ok) {
      const upBuf = Buffer.from(await upRes.arrayBuffer());
      const upAlpha = await measureTransparentRatio(upBuf);
      // clarity-upscaler는 종종 RGB-only JPEG/PNG를 반환해 알파가 사라지고,
      // 합성 시 원본 사진 사각형이 그대로 얹히는 P0 버그가 난다.
      if (origAlpha > 0.08 && upAlpha < 0.05) {
        console.warn(
          `[sharpenCutout] clarity-upscaler stripped alpha (${origAlpha.toFixed(3)} → ${upAlpha.toFixed(3)}), pre-upscale cutout 사용`,
        );
        return { url: cutoutUrl, cost: REPLICATE_COST_USD.backgroundRemover };
      }
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
): Promise<{ buffer: Buffer; cost: number; decorBuffer?: Buffer; decorCost?: number; claudeCost: number }> {
  const { shadowHint, conceptBrief, applyDecor, decorBuffer: reuseDecor, theme } = options;
  const replicate = getReplicateClient();
  const modelRef = await getBackgroundRemoverRef(replicate);
  let claudeCost = 0;

  // 크롭 안전: 원본에서 라벨/로고/텍스트 영역을 Haiku 비전으로 감지
  let textRegions: TextRegion[] = [];
  try {
    const detected = await detectTextRegionsFromUrl(sourceImageUrl);
    textRegions = detected.regions;
    claudeCost += detected.cost;
    if (textRegions.length > 0) {
      console.log(
        `[safeCrop] ${textRegions.length}개 텍스트 영역 감지:`,
        textRegions.map((r) => r.kind).join(", "),
      );
    }
  } catch (error) {
    console.warn("[safeCrop] 텍스트 영역 감지 실패, 기본 crop 사용", error);
  }

  const output = await runReplicateWithRetry("851-labs/background-remover", () =>
    replicate.run(modelRef, {
      input: { image: sourceImageUrl },
    }),
  );

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
  const cutoutAlpha = await measureTransparentRatio(cutoutBuffer);
  console.log(
    `[cutout] transparentRatio=${cutoutAlpha.toFixed(3)} source=${sourceImageUrl.slice(-48)}`,
  );
  if (cutoutAlpha < 0.05) {
    console.warn(
      "[cutout] 배경 제거 결과에 투명 영역이 거의 없음 — 합성 시 '이미지 안에 이미지' 사각형 아티팩트 가능",
    );
  }

  // DEBUG_CUTOUT_DIR 설정 시 cutoutBuffer를 디스크에 저장 (P0 디버깅)
  const debugDir = process.env.DEBUG_CUTOUT_DIR;
  if (debugDir) {
    const fs = await import("fs");
    const path = await import("path");
    fs.mkdirSync(debugDir, { recursive: true });
    const stamp = Date.now();
    fs.writeFileSync(path.join(debugDir, `${stamp}-cutout.png`), cutoutBuffer);
    console.log(`[cutout] debug saved → ${debugDir}/${stamp}-cutout.png`);
  }

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
      const shadowResult = await analyzeShadowDirection(sourceBuffer);
      shadow = shadowResult.shadow;
      claudeCost += shadowResult.cost;
    } catch {
      shadow = { ...DEFAULT_SHADOW };
    }
  }

  let decorCost = 0;
  let decorBuffer = reuseDecor;
  const shouldApplyDecor = applyDecor && !isTestMode();
  if (shouldApplyDecor && conceptBrief && theme && !decorBuffer) {
    try {
      const generated = await generateDecorativeGraphic(conceptBrief, theme, shadow);
      decorBuffer = generated.buffer;
      decorCost = generated.cost;
    } catch (error) {
      console.warn("[decor] 장식 그래픽 생성 실패, 배경만 사용", error);
    }
  } else if (applyDecor && isTestMode()) {
    console.log("[decor] TEST_MODE — 장식 그래픽 생성 생략, 기본 배경 사용");
  }

  let backdropWithDecor = backdropResized;
  if (decorBuffer != null) {
    try {
      backdropWithDecor = await compositeDecorOnBackdrop(backdropResized, decorBuffer);
    } catch (error) {
      console.warn("[decor] 장식 합성 실패, 배경만 사용", error);
    }
  }

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

  let cutoutForComposite = cutoutResized;
  try {
    const feathered = await featherCutout(cutoutResized);
    cutoutForComposite = await matchCutoutWhiteBalance(feathered, backdropWithDecor);
    console.log(
      `[composite] feather + WB match, lightFrom=${shadow.lightFrom} temp=${shadow.colorTemperature}`,
    );
  } catch (error) {
    console.warn("[composite] feather/WB 실패, 컷아웃 그대로 합성", error);
  }

  const shadowSvg = buildProductShadowSvg(CANVAS_SIZE, placement, shadow);
  const shadowBuffer = await sharp(Buffer.from(shadowSvg)).png().toBuffer();

  const finalBuffer = await sharp(backdropWithDecor)
    .composite([
      { input: shadowBuffer, left: 0, top: 0 },
      { input: cutoutForComposite, left: placement.left, top: placement.top },
    ])
    .png()
    .toBuffer();

  const totalCost = cost + decorCost;
  if (decorCost > 0) {
    console.log(
      `[cost] enhanceProductImage total=$${totalCost.toFixed(5)} (enhance=$${cost.toFixed(5)} decor=$${decorCost.toFixed(4)})`,
    );
  }

  return { buffer: finalBuffer, cost: totalCost, decorBuffer, decorCost: decorCost || undefined, claudeCost };
}
