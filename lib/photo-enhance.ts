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
  computeSafeCropBox,
  computeSafeCanvasPlacement,
  detectProductRegion,
  detectTextRegionsFromUrl,
  lightingLockPrompt,
  DEFAULT_SHADOW,
  type ShadowAnalysis,
  type TextRegion,
} from "@/lib/vision-utils";
import {
  buildProductShadowSvg,
  buildSilhouetteShadowBuffer,
  buildSoftContactShadowSvg,
  featherCutout,
  matchCutoutWhiteBalance,
  measureTransparentRatio,
  unifyCompositeGrain,
} from "@/lib/photo-composite";
import { isTestMode } from "@/lib/test-mode";
import { logForceRegenerateStatus } from "@/lib/force-regenerate";

const CANVAS_SIZE = 1200;
/** flux-fill / 마스크 생성 해상도 — CANVAS_SIZE와 맞춰 업스케일 없이 합성 (합성 티 완화). */
const FILL_BASE_SIZE = 1200;

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
  // bria/generate-background — Background Replace. Replicate 페이지 단가 근사 $0.04/image
  briaBackgroundReplace: 0.04,
  // bria/genfill — 마스크 기반 배경 생성. Replicate 페이지 단가 근사 $0.04/image
  briaGenfill: 0.04,
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

const BRIA_REPLACE_CATEGORIES = new Set<string>(["화장품/뷰티", "전자제품", "생활용품", "반려동물"]);
const BRIA_GENFILL_CATEGORIES = new Set<string>(["의류/패션", "식품/건강기능식품"]);

export type BackdropProvider = "flux" | "bria-replace" | "bria-genfill";

/** `.env.local` BACKDROP_PROVIDER=bria 일 때 카테고리별 Bria 경로 분기. */
export function getBackdropProvider(category?: string): BackdropProvider {
  if (process.env.BACKDROP_PROVIDER !== "bria") return "flux";
  if (category && BRIA_GENFILL_CATEGORIES.has(category)) return "bria-genfill";
  if (category && BRIA_REPLACE_CATEGORIES.has(category)) return "bria-replace";
  return "flux";
}

/** Bria Background Replace 후보 수. `.env.local` BRIA_BACKDROP_CANDIDATES (기본 2, 1–3). */
export function getBriaBackdropCandidateCount(): number {
  const raw = Number(process.env.BRIA_BACKDROP_CANDIDATES);
  if (Number.isFinite(raw) && raw >= 1) {
    return Math.min(3, Math.max(1, Math.round(raw)));
  }
  return 2;
}

/** Bria는 상품을 유지한 채 배경만 바꾸므로 empty/no-product 문구를 뺀다. */
function sanitizePromptForBria(prompt: string): string {
  return prompt
    .replace(/\bno product\b/gi, "")
    .replace(/\bno packaging\b/gi, "")
    .replace(/\bno bottle\b/gi, "")
    .replace(/\bno text\b/gi, "")
    .replace(/\bno logo\b/gi, "")
    .replace(/\bempty product photography backdrop\b/gi, "")
    .replace(/\bempty dimensional set\b/gi, "")
    .replace(/\bempty backdrop\b/gi, "")
    .replace(/\bempty center(?: for product placement)?\b/gi, "")
    .replace(/(?:,\s*){2,}/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/^,\s*|\s*,$/g, "")
    .trim();
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
const BRIA_GENERATE_BACKGROUND_REF: ModelRef =
  "bria/generate-background:ba437a62603f1205b253fd7bad0d0b5c326d7857242d11753c0cbcd2c5008602";
const BRIA_GENFILL_REF: ModelRef =
  "bria/genfill:797f0f06f83cbf44562f704989c06d1d00d637fb41b505828947524385740352";
const GENFILL_ALPHA_KEEP_THRESHOLD = 16;
const GENFILL_MASK_BLUR = 6;

export type EnhanceImageOptions = {
  shadowHint?: ShadowAnalysis;
  conceptBrief?: ConceptBrief;
  /** 장식 그래픽 합성 여부 (히어로 섹션 필수) */
  applyDecor?: boolean;
  /** 첫 히어로에서 생성한 장식을 재사용할 때 */
  decorBuffer?: Buffer;
  theme?: Pick<CategoryTheme, "accent" | "baseNeutral" | "deepAccent">;
  /** 배경제거 실패 시 상품 영역 감지 재시도에 사용 */
  productName?: string;
  /**
   * backdropBuffer에 상품이 이미 합성돼 있는 경우 (bria-replace / bria-genfill 배경).
   * true면 원본 재컷아웃 + 재합성을 건너뛰고 배경을 그대로 사용한다 (이중노출 방지).
   */
  backdropAlreadyComposited?: boolean;
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
  return Buffer.from(await response.arrayBuffer()) as Buffer;
}

function toDataUri(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

async function buildGenfillSolidCanvas(hexColor: string): Promise<Buffer> {
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

async function placeCutoutOnGenfillCanvas(
  cutout: Buffer,
  canvasHex: string,
): Promise<{
  canvas: Buffer;
  resizedCutout: Buffer;
  left: number;
  top: number;
}> {
  const meta = await sharp(cutout).metadata();
  const rawW = meta.width ?? 1;
  const rawH = meta.height ?? 1;
  const placement = computeSafeCanvasPlacement(FILL_BASE_SIZE, rawW, rawH, []);
  const targetW = Math.max(1, Math.round(rawW * placement.scale));
  const targetH = Math.max(1, Math.round(rawH * placement.scale));
  const resizedCutout = await sharp(cutout)
    .resize(targetW, targetH, { fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
  const base = await buildGenfillSolidCanvas(canvasHex);
  const canvas = await sharp(base)
    .composite([{ input: resizedCutout, left: placement.left, top: placement.top }])
    .png()
    .toBuffer();
  return {
    canvas,
    resizedCutout,
    left: placement.left,
    top: placement.top,
  };
}

/** GenFill: 검정=상품 유지, 흰색=배경 편집 영역 */
async function buildGenfillKeepProductMask(
  resizedCutout: Buffer,
  left: number,
  top: number,
): Promise<Buffer> {
  const { data, info } = await sharp(resizedCutout)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const mask = Buffer.alloc(FILL_BASE_SIZE * FILL_BASE_SIZE, 255);
  for (let y = 0; y < info.height; y += 1) {
    const destY = top + y;
    if (destY < 0 || destY >= FILL_BASE_SIZE) continue;
    for (let x = 0; x < info.width; x += 1) {
      const destX = left + x;
      if (destX < 0 || destX >= FILL_BASE_SIZE) continue;
      const alpha = data[(y * info.width + x) * 4 + 3];
      if (alpha > GENFILL_ALPHA_KEEP_THRESHOLD) {
        mask[destY * FILL_BASE_SIZE + destX] = 0;
      }
    }
  }
  return sharp(mask, {
    raw: { width: FILL_BASE_SIZE, height: FILL_BASE_SIZE, channels: 1 },
  })
    .blur(GENFILL_MASK_BLUR)
    .png()
    .toBuffer();
}

function buildBriaBackdropPrompt(
  category: string,
  theme: Pick<CategoryTheme, "accent" | "baseNeutral" | "deepAccent">,
  shadow: ShadowAnalysis,
  conceptBrief?: ConceptBrief,
): string {
  const basePrompt = BACKDROP_PROMPTS[category] ?? BACKDROP_PROMPTS["기타"];
  const photography = resolvePhotographyTemplate(conceptBrief, category);
  const conceptBlock = conceptBrief ? `, ${formatConceptPromptBlock(conceptBrief, category)}` : "";
  const lock = lightingLockPrompt(shadow);
  const accentClause =
    shadow.colorTemperature === "warm"
      ? `subtle ${describeColorTone(theme.accent)} accent lighting`
      : "no warm accent gel, no amber bounce, keep white balance locked to the product";
  const fluxStylePrompt = `${basePrompt}${conceptBlock}, ${photography.prompt}, ${lock}, ${accentClause}, soft ${describeColorTone(theme.baseNeutral)} set color without shifting key light`;
  return sanitizePromptForBria(
    `${fluxStylePrompt}, keep the original product unchanged, replace only the surrounding background, realistic studio set`,
  );
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

  const photography = resolvePhotographyTemplate(conceptBrief, category);
  const conceptBlock = conceptBrief ? `, ${formatConceptPromptBlock(conceptBrief, category)}` : "";
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
        180000,
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
    console.warn(
      `[generateBackdrop] flux-fill-dev 전부 실패, flux-schnell 폴백. 원인: ${failureReasons.join(" | ")}`,
    );
    try {
      const fallbackUrl = await generateSchnellPng(prompt);
      return {
        buffer: null,
        candidateUrls: [fallbackUrl],
        cost: cost + REPLICATE_COST_USD.fluxSchnell,
        shadow,
        claudeCost,
        candidateCount: 1,
        autoPicked: false,
      };
    } catch (fallbackError) {
      throw new Error(
        `배경 이미지 생성에 모두 실패했습니다. 원인: ${failureReasons.join(" | ")} | schnell 폴백: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
      );
    }
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

/**
 * Bria Background Replace — 원본 상품 사진을 넣고 배경만 교체.
 * 반환 타입은 generateBackdrop()과 동일해서 enhanceProductImage() 호출부를 바꾸지 않는다.
 * 스키마: image | image_url, bg_prompt | ref_image_url, seed, fast, refine_prompt, original_quality, force_rmbg
 */
export async function generateBackdropViaBria(
  category: string,
  productName: string,
  brandName: string | null,
  theme: Pick<CategoryTheme, "accent" | "baseNeutral" | "deepAccent">,
  sourceImageUrl?: string,
  conceptBrief?: ConceptBrief,
): Promise<GenerateBackdropResult> {
  if (!sourceImageUrl) {
    throw new Error("Bria Background Replace는 원본 상품 사진(sourceImageUrl)이 필요합니다.");
  }

  const replicate = getReplicateClient();
  let claudeCost = 0;

  let shadow: ShadowAnalysis = { ...DEFAULT_SHADOW };
  try {
    const sourceBuffer = await fetchSourceBuffer(sourceImageUrl);
    const shadowResult = await analyzeShadowDirection(sourceBuffer);
    shadow = shadowResult.shadow;
    claudeCost += shadowResult.cost;
    console.log(`[shadow] 분석 결과: ${shadow.promptHint}`);
  } catch (error) {
    console.warn("[shadow] 원본 그림자 분석 실패, 기본 조명 사용", error);
  }

  const lock = lightingLockPrompt(shadow);
  const bgPrompt = buildBriaBackdropPrompt(category, theme, shadow, conceptBrief);
  const candidateCount = getBriaBackdropCandidateCount();
  logForceRegenerateStatus();
  console.log(`[shadow] 조명 잠금: ${lock}`);
  console.log(`[prompt] generateBackdropViaBria (bria-replace): ${bgPrompt}`);
  console.log(`[replicate] CALL bria/generate-background x${candidateCount} (sequential)`);

  const candidateUrls: string[] = [];
  const failureReasons: string[] = [];
  for (let i = 0; i < candidateCount; i += 1) {
    const candidatePrompt = sanitizePromptForBria(
      `${bgPrompt}, ${CANDIDATE_VARIATIONS[i % CANDIDATE_VARIATIONS.length]}`,
    );
    console.log(`[prompt] generateBackdropViaBria candidate-${i}: ${candidatePrompt}`);
    try {
      const output = await runReplicateWithRetry(`bria/generate-background#${i}`, () =>
        withTimeout(
          replicate.run(BRIA_GENERATE_BACKGROUND_REF, {
            input: {
              image_url: sourceImageUrl,
              bg_prompt: candidatePrompt,
              seed: 1100 + i * 137,
              fast: true,
              refine_prompt: true,
              original_quality: true,
              force_rmbg: false,
            },
            wait: { mode: "poll", interval: 1000 },
          }),
          120000,
          "bria/generate-background",
        ),
      );
      const url = extractFluxImageUrl(output);
      if (!url) {
        failureReasons.push(`결과에 URL 없음 (candidate=${i})`);
        continue;
      }
      candidateUrls.push(url);
    } catch (error) {
      const detail = await describeReplicateError(error);
      console.error("[generateBackdropViaBria] 호출 실패:", detail);
      failureReasons.push(detail);
    }
  }

  const cost = candidateUrls.length * REPLICATE_COST_USD.briaBackgroundReplace;
  console.log(
    `[cost] generateBackdrop (bria/generate-background x${candidateUrls.length}): $${cost.toFixed(4)}`,
  );

  if (candidateUrls.length === 0) {
    throw new Error(
      `Bria 배경 생성에 모두 실패했습니다. 원인: ${failureReasons.join(" | ")}`,
    );
  }

  console.log(
    `[generateBackdropViaBria] "${productName}"${brandName ? ` (${brandName})` : ""} 후보 ${candidateUrls.length}장`,
  );
  return {
    buffer: null,
    candidateUrls,
    cost,
    shadow,
    claudeCost,
    candidateCount: candidateUrls.length,
    autoPicked: candidateUrls.length === 1,
  };
}

/**
 * Bria GenFill — 컷아웃 알파 마스크로 상품을 고정하고 배경 영역만 inpaint.
 * 반환 타입은 generateBackdrop()과 동일.
 * 스키마: image, mask, prompt, mask_type, preserve_alpha, seed
 */
export async function generateBackdropViaBriaGenFill(
  category: string,
  productName: string,
  brandName: string | null,
  theme: Pick<CategoryTheme, "accent" | "baseNeutral" | "deepAccent">,
  sourceImageUrl?: string,
  conceptBrief?: ConceptBrief,
): Promise<GenerateBackdropResult> {
  if (!sourceImageUrl) {
    throw new Error("Bria GenFill은 원본 상품 사진(sourceImageUrl)이 필요합니다.");
  }

  const replicate = getReplicateClient();
  let claudeCost = 0;

  let shadow: ShadowAnalysis = { ...DEFAULT_SHADOW };
  try {
    const sourceBuffer = await fetchSourceBuffer(sourceImageUrl);
    const shadowResult = await analyzeShadowDirection(sourceBuffer);
    shadow = shadowResult.shadow;
    claudeCost += shadowResult.cost;
    console.log(`[shadow] 분석 결과: ${shadow.promptHint}`);
  } catch (error) {
    console.warn("[shadow] 원본 그림자 분석 실패, 기본 조명 사용", error);
  }

  const lock = lightingLockPrompt(shadow);
  const bgPrompt = buildBriaBackdropPrompt(category, theme, shadow, conceptBrief);
  const candidateCount = getBriaBackdropCandidateCount();
  logForceRegenerateStatus();
  console.log(`[shadow] 조명 잠금: ${lock}`);
  console.log(`[prompt] generateBackdropViaBriaGenFill (bria-genfill): ${bgPrompt}`);

  const bgRemoverRef = await getBackgroundRemoverRef(replicate);
  const cutoutOutput = await runReplicateWithRetry("851-labs/background-remover", () =>
    replicate.run(bgRemoverRef, {
      input: { image: sourceImageUrl },
      wait: { mode: "poll", interval: 1000 },
    }),
  );
  const cutoutUrl = extractFluxImageUrl(cutoutOutput);
  if (!cutoutUrl) {
    throw new Error("Bria GenFill용 배경 제거 결과 URL을 받지 못했습니다.");
  }
  const cutoutResponse = await fetch(cutoutUrl);
  if (!cutoutResponse.ok) {
    throw new Error("Bria GenFill용 컷아웃 이미지를 불러오지 못했습니다.");
  }
  const cutoutBuffer = Buffer.from(await cutoutResponse.arrayBuffer()) as Buffer;

  const placed = await placeCutoutOnGenfillCanvas(cutoutBuffer, theme.baseNeutral);
  const keepMask = await buildGenfillKeepProductMask(
    placed.resizedCutout,
    placed.left,
    placed.top,
  );
  const imageDataUri = toDataUri(placed.canvas);
  const maskDataUri = toDataUri(keepMask);

  console.log(
    `[cost] generateBackdrop (851-labs/background-remover x1): $${REPLICATE_COST_USD.backgroundRemover.toFixed(4)}`,
  );
  console.log(`[replicate] CALL bria/genfill x${candidateCount} (sequential)`);

  const candidateUrls: string[] = [];
  const failureReasons: string[] = [];
  for (let i = 0; i < candidateCount; i += 1) {
    const candidatePrompt = sanitizePromptForBria(
      `${bgPrompt}, ${CANDIDATE_VARIATIONS[i % CANDIDATE_VARIATIONS.length]}`,
    );
    console.log(`[prompt] generateBackdropViaBriaGenFill candidate-${i}: ${candidatePrompt}`);
    try {
      const output = await runReplicateWithRetry(`bria/genfill#${i}`, () =>
        withTimeout(
          replicate.run(BRIA_GENFILL_REF, {
            input: {
              image: imageDataUri,
              mask: maskDataUri,
              prompt: candidatePrompt,
              mask_type: "manual",
              preserve_alpha: true,
              sync: true,
              seed: 2100 + i * 137,
            },
            wait: { mode: "poll", interval: 1000 },
          }),
          120000,
          "bria/genfill",
        ),
      );
      const url = extractFluxImageUrl(output);
      if (!url) {
        failureReasons.push(`결과에 URL 없음 (candidate=${i})`);
        continue;
      }
      candidateUrls.push(url);
    } catch (error) {
      const detail = await describeReplicateError(error);
      console.error("[generateBackdropViaBriaGenFill] 호출 실패:", detail);
      failureReasons.push(detail);
    }
  }

  const genfillCost = candidateUrls.length * REPLICATE_COST_USD.briaGenfill;
  const cost = REPLICATE_COST_USD.backgroundRemover + genfillCost;
  console.log(
    `[cost] generateBackdrop (bria/genfill x${candidateUrls.length}): $${genfillCost.toFixed(4)}`,
  );

  if (candidateUrls.length === 0) {
    throw new Error(
      `Bria GenFill 배경 생성에 모두 실패했습니다. 원인: ${failureReasons.join(" | ")}`,
    );
  }

  console.log(
    `[generateBackdropViaBriaGenFill] "${productName}"${brandName ? ` (${brandName})` : ""} 후보 ${candidateUrls.length}장`,
  );
  return {
    buffer: null,
    candidateUrls,
    cost,
    shadow,
    claudeCost,
    candidateCount: candidateUrls.length,
    autoPicked: candidateUrls.length === 1,
  };
}

type SectionBackdropKind = "ingredient" | "texture";

const SECTION_BACKDROP_PROMPTS_BY_CATEGORY: Record<
  string,
  Record<SectionBackdropKind, string>
> = {
  "화장품/뷰티": {
    ingredient:
      "extreme close-up of a glowing pastel-toned studio surface, soft blush-pink or warm ivory gradient, delicate light bokeh and gentle specular highlights, luminous radiant K-beauty mood, no bottle, no dropper, no product, no packaging, no text, no logo, no human skin, no flat gray, product photography empty backdrop",
    texture:
      "macro photograph of a glowing pastel-toned formula droplet or gentle swirl on a soft blush or warm ivory surface, luminous highlight, shallow depth of field, vivid radiant color, no bottle, no packaging, no hands, no text, no logo, no flat gray, empty formula-only frame",
  },
  "전자제품": {
    ingredient:
      "extreme macro of brushed aluminum and matte polymer texture, cool gray tech surface detail, subtle geometric light streaks, empty product photography backdrop, no device, no cable, no logo, no text",
    texture:
      "soft bokeh modern desk workspace ambient blur, minimal tech lifestyle background, cool neutral tones, shallow depth of field, empty center, no product, no screen, no logo, no text",
  },
  "식품/건강기능식품": {
    ingredient:
      "macro wooden table grain with fresh ingredient texture hints softly blurred, warm natural food photography surface, empty backdrop, no plate, no packaging, no logo, no text",
    texture:
      "soft steam wisps over ceramic surface, warm kitchen ambient blur, shallow depth of field, empty food photography backdrop, no dish, no product, no logo, no text",
  },
  "의류/패션": {
    ingredient:
      "extreme macro fabric weave and stitch detail, soft textile texture, neutral editorial studio surface, empty backdrop, no garment, no model, no logo, no text",
    texture:
      "soft neutral fashion studio floor and wall blur, editorial runway ambient, shallow depth of field, empty center, no model, no clothing, no logo, no text",
  },
  "생활용품": {
    ingredient:
      "macro natural material texture, linen or ceramic micro-detail, bright airy home surface, empty lifestyle photography backdrop, no product, no logo, no text",
    texture:
      "bright home interior soft bokeh, minimal styled shelf ambient blur, warm natural light, empty backdrop, no product, no logo, no text",
  },
  "반려동물": {
    ingredient:
      "soft cozy fabric texture macro, warm pastel home surface detail, empty pet product photography backdrop, no animal, no product, no logo, no text",
    texture:
      "warm cozy home interior bokeh, playful pastel ambient blur, shallow depth of field, empty backdrop, no pet, no product, no logo, no text",
  },
  "기타": {
    ingredient:
      "macro subtle surface grain and soft specular highlights, clean minimal studio plane, empty product photography backdrop, no product, no logo, no text",
    texture:
      "soft gradient studio ambient blur, neutral minimal backdrop variation, shallow depth of field, empty center, no product, no logo, no text",
  },
};

function getSectionBackdropPrompts(category: string): Record<SectionBackdropKind, string> {
  return SECTION_BACKDROP_PROMPTS_BY_CATEGORY[category] ?? SECTION_BACKDROP_PROMPTS_BY_CATEGORY["기타"];
}

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
    90000,
    "flux-schnell 섹션 배경",
  );
  const url = extractFluxImageUrl(output);
  if (!url) {
    throw new Error("섹션 배경 URL을 받지 못했습니다.");
  }
  return url;
}

/** 히어로에서 고른 스튜디오 배경과 다른 섹션(업로드 2·3번) 연출. flux-schnell ×2. */
export async function generateSectionBackdropVariants(
  shadow: ShadowAnalysis,
  conceptBrief?: ConceptBrief,
  category = "기타",
): Promise<{ ingredientUrl: string | null; textureUrl: string | null; cost: number }> {
  const lock = lightingLockPrompt(shadow);
  const conceptBlock = conceptBrief ? formatConceptPromptBlock(conceptBrief, category) : "";
  const sectionPrompts = getSectionBackdropPrompts(category);
  const kinds = ["ingredient", "texture"] as const;
  const results = await Promise.allSettled(
    kinds.map(async (kind) => {
      const prompt = [
        sectionPrompts[kind],
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
          "[sharpenCutout] FALLBACK: clarity-upscaler stripped alpha " +
            `(${origAlpha.toFixed(3)} → ${upAlpha.toFixed(3)}), pre-upscale cutout 사용`,
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
      "[sharpenCutout] FALLBACK: clarity-upscaler 실패, 보정 전 컷아웃으로 폴백:",
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
  const {
    shadowHint,
    conceptBrief,
    applyDecor,
    decorBuffer: reuseDecor,
    theme,
    productName,
    backdropAlreadyComposited,
  } = options;

  // backdropBuffer에 이미 상품이 합성돼 있는 경우 (bria-replace / bria-genfill):
  // 원본을 다시 컷아웃해서 겹쳐 합성하면 이중노출(반투명 유리판 아티팩트)이 생기므로
  // 재컷아웃/재합성을 전부 건너뛰고 배경을 그대로 사용한다.
  if (backdropAlreadyComposited) {
    const backdropResized = await sharp(backdropBuffer)
      .resize(CANVAS_SIZE, CANVAS_SIZE, { fit: "cover" })
      .png()
      .toBuffer();

    let decorCost = 0;
    let decorBuffer = reuseDecor;
    const shouldApplyDecor = applyDecor && !isTestMode();
    if (shouldApplyDecor && conceptBrief && theme && !decorBuffer) {
      try {
        const shadow = shadowHint ?? { ...DEFAULT_SHADOW };
        const generated = await generateDecorativeGraphic(conceptBrief, theme, shadow);
        decorBuffer = generated.buffer;
        decorCost = generated.cost;
      } catch (error) {
        console.warn("[decor] 장식 그래픽 생성 실패, 배경만 사용", error);
      }
    } else if (applyDecor && isTestMode()) {
      console.log("[decor] TEST_MODE — 장식 그래픽 생성 생략, 기본 배경 사용");
    }

    let finalBuffer: Buffer = backdropResized;
    if (decorBuffer != null) {
      try {
        finalBuffer = await compositeDecorOnBackdrop(backdropResized, decorBuffer);
      } catch (error) {
        console.warn("[decor] 장식 합성 실패, 배경만 사용", error);
      }
    }

    // Bria 결과물에도 약한 접지 그림자 + 통일 그레인 (재컷아웃 없이)
    try {
      const shadow = shadowHint ?? { ...DEFAULT_SHADOW };
      const contactSvg = buildSoftContactShadowSvg(CANVAS_SIZE, shadow);
      const contactBuf = await sharp(Buffer.from(contactSvg)).png().toBuffer();
      finalBuffer = await sharp(finalBuffer)
        .composite([{ input: contactBuf, blend: "multiply" }])
        .png()
        .toBuffer();
      console.log(
        `[composite] Bria 경로: soft contact shadow 적용 (lightFrom=${shadow.lightFrom})`,
      );
    } catch (error) {
      console.warn("[composite] Bria soft contact shadow 실패 — 스킵", error);
    }

    try {
      finalBuffer = Buffer.from(await unifyCompositeGrain(finalBuffer, CANVAS_SIZE));
    } catch (error) {
      console.warn("[composite] unify grain 실패 — 스킵", error);
    }

    console.log(
      "[enhanceProductImage] backdropAlreadyComposited=true — 재컷아웃 스킵, 그림자/그레인만 보정",
    );
    return { buffer: finalBuffer, cost: 0, decorBuffer, decorCost: decorCost || undefined, claudeCost: 0 };
  }

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

  // ── 사전 단계: productName이 있으면 상품 영역을 먼저 감지해서 원본 크롭 ──
  let bgRemoveInput: string = sourceImageUrl;
  let preCropCost = 0;
  if (productName) {
    try {
      const sourceRes = await fetch(sourceImageUrl);
      if (sourceRes.ok) {
        const sourceBuf = Buffer.from(await sourceRes.arrayBuffer());
        const contentType = sourceRes.headers.get("content-type");
        const mType: "image/jpeg" | "image/png" =
          contentType?.includes("png") ? "image/png" : "image/jpeg";

        const { box, cost: detectCost } = await detectProductRegion(sourceBuf, productName, mType);
        claudeCost += detectCost;
        preCropCost += detectCost;

        if (box) {
          const boxArea = (box.xMax - box.xMin) * (box.yMax - box.yMin);
          if (boxArea >= 0.90) {
            console.log(
              `[preCrop] box 면적 ${(boxArea * 100).toFixed(0)}% ≥ 90% — 크롭 스킵, 원본 그대로 배경제거`,
            );
          } else {
            const srcMeta = await sharp(sourceBuf).metadata();
            const sw = srcMeta.width ?? 1;
            const sh = srcMeta.height ?? 1;
            const pad = 0.08;
            const cropLeft = Math.max(0, Math.round((box.xMin - pad) * sw));
            const cropTop = Math.max(0, Math.round((box.yMin - pad) * sh));
            const cropRight = Math.min(sw, Math.round((box.xMax + pad) * sw));
            const cropBottom = Math.min(sh, Math.round((box.yMax + pad) * sh));
            const cropW = Math.max(1, cropRight - cropLeft);
            const cropH = Math.max(1, cropBottom - cropTop);

            console.log(
              `[preCrop] '${productName}' box: [${box.xMin.toFixed(2)},${box.yMin.toFixed(2)}]→[${box.xMax.toFixed(2)},${box.yMax.toFixed(2)}] area=${(boxArea * 100).toFixed(0)}% → crop [${cropLeft},${cropTop} ${cropW}x${cropH}]`,
            );

            const croppedBuf = await sharp(sourceBuf)
              .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
              .png()
              .toBuffer();

            bgRemoveInput = `data:image/png;base64,${croppedBuf.toString("base64")}`;
          }
        } else {
          console.log("[preCrop] 상품 영역 감지 실패 — 원본 그대로 배경제거");
        }
      }
    } catch (error) {
      console.warn("[preCrop] 상품 영역 감지 중 오류, 원본 그대로 배경제거", error);
    }
  }

  const output = await runReplicateWithRetry("851-labs/background-remover", () =>
    replicate.run(modelRef, {
      input: { image: bgRemoveInput },
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
  const finalCutoutBuffer = Buffer.from(await cutoutResponse.arrayBuffer()) as Buffer;
  const cutoutAlpha = await measureTransparentRatio(finalCutoutBuffer);
  console.log(
    `[cutout] transparentRatio=${cutoutAlpha.toFixed(3)} source=${sourceImageUrl.slice(-48)}`,
  );

  if (cutoutAlpha < 0.05) {
    console.warn(
      `[cutout] FALLBACK: transparentRatio=${cutoutAlpha.toFixed(3)} < 0.05 — AI 배경 합성 스킵, 원본 세이프크롭만 반환`,
    );

    const sourceRes = await fetch(sourceImageUrl);
    if (!sourceRes.ok) throw new Error("원본 이미지를 불러오지 못했습니다 (fallback).");
    const sourceBuf = Buffer.from(await sourceRes.arrayBuffer());
    const srcMeta = await sharp(sourceBuf).metadata();
    const sw = srcMeta.width ?? 1;
    const sh = srcMeta.height ?? 1;

    const cropBox = computeSafeCropBox(sw, sh, textRegions, 0.04);
    const croppedSource = await sharp(sourceBuf)
      .extract(cropBox)
      .resize(CANVAS_SIZE, CANVAS_SIZE, { fit: "cover" })
      .png()
      .toBuffer();

    const totalCost = cost + preCropCost;
    return { buffer: croppedSource, cost: totalCost, claudeCost };
  }

  // DEBUG_CUTOUT_DIR 설정 시 cutoutBuffer를 디스크에 저장 (P0 디버깅)
  const debugDir = process.env.DEBUG_CUTOUT_DIR;
  if (debugDir) {
    const fs = await import("fs");
    const path = await import("path");
    fs.mkdirSync(debugDir, { recursive: true });
    const stamp = Date.now();
    fs.writeFileSync(path.join(debugDir, `${stamp}-cutout.png`), finalCutoutBuffer);
    console.log(`[cutout] debug saved → ${debugDir}/${stamp}-cutout.png`);
  }

  // 라벨·로고가 잘리지 않도록 안전 여백 crop (배경 제거 후 동일 좌표계)
  const safeCutout = textRegions.length > 0
    ? await applySafeCrop(finalCutoutBuffer, textRegions)
    : finalCutoutBuffer;

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

  let backdropWithDecor: Buffer = backdropResized;
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

  let cutoutForComposite: Buffer = cutoutResized;
  try {
    const feathered = await featherCutout(cutoutResized, CANVAS_SIZE);
    cutoutForComposite = await matchCutoutWhiteBalance(feathered, backdropWithDecor);
    console.log(
      `[composite] feather + WB/luminance match, lightFrom=${shadow.lightFrom} temp=${shadow.colorTemperature}`,
    );
  } catch (error) {
    console.warn("[composite] feather/WB 실패, 컷아웃 그대로 합성", error);
  }

  let shadowBuffer: Buffer;
  try {
    shadowBuffer = await buildSilhouetteShadowBuffer(
      cutoutResized,
      CANVAS_SIZE,
      {
        left: placement.left,
        top: placement.top,
        width: targetW,
        height: targetH,
      },
      shadow,
    );
    console.log("[composite] silhouette shadow 적용");
  } catch (error) {
    console.warn("[composite] silhouette shadow 실패 — 타원 그림자로 폴백", error);
    const shadowSvg = buildProductShadowSvg(
      CANVAS_SIZE,
      {
        left: placement.left,
        top: placement.top,
        width: targetW,
        height: targetH,
      },
      shadow,
    );
    shadowBuffer = await sharp(Buffer.from(shadowSvg)).png().toBuffer();
  }

  let finalBuffer = await sharp(backdropWithDecor)
    .composite([
      { input: shadowBuffer, left: 0, top: 0 },
      { input: cutoutForComposite, left: placement.left, top: placement.top },
    ])
    .png()
    .toBuffer();

  try {
    finalBuffer = Buffer.from(await unifyCompositeGrain(finalBuffer, CANVAS_SIZE));
  } catch (error) {
    console.warn("[composite] unify grain 실패 — 스킵", error);
  }

  const totalCost = cost + decorCost + preCropCost;
  if (decorCost > 0 || preCropCost > 0) {
    console.log(
      `[cost] enhanceProductImage total=$${totalCost.toFixed(5)} (enhance=$${cost.toFixed(5)} decor=$${decorCost.toFixed(4)} preCrop=$${preCropCost.toFixed(4)})`,
    );
  }

  return { buffer: finalBuffer, cost: totalCost, decorBuffer, decorCost: decorCost || undefined, claudeCost };
}
