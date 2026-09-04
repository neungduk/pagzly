import Replicate from "replicate";
import sharp from "sharp";
import {
  detectHandPlacementForProduct,
  evaluateHandPlacementReliability,
  findMatchingGraspRegion,
  getBestGraspOverlapFraction,
  isGraspRegionPlausible,
  mergeGraspRegionsUnion,
  overlapsGraspRegion,
  pickRepresentativeGraspRegion,
  type HandPlacementDetection,
  type HeldObjectPlacement,
  type HeldObjectRegion,
} from "@/lib/detect-held-object-placement";
import { buildProductShadowSvg } from "@/lib/photo-composite";
import {
  applyPhysicalScaleToPlacement,
} from "@/lib/lifestyle-physical-scale";
import { DEFAULT_SHADOW, type ShadowAnalysis } from "@/lib/vision-utils";

const NANO_BANANA_REF = "google/nano-banana" as const;
const REPLICATE_COST_USD = { nanoBanana: 0.039, backgroundRemover: 0.00047 } as const;
const DEFAULT_GRASP_OVERLAP_FRACTION = 0.4;
const REFINE_CROP_PADDING_FRACTION = 0.8;
const REFINE_CROP_MAX_SCENE_FRACTION = 0.45;
const REFINE_ASPECT_TOLERANCE = 0.05;
const GRASP_VISION_MAX_ATTEMPTS = 3;
const REFINE_FEATHER_FRACTION = 0.08;
/** 92차 — true grip +33%p 이득 vs rubbing 33% 오탐 회귀. 기본 off. 다시 켜려면 env로만. */
const LIFESTYLE_GRASP_ENSEMBLE_ENABLED = process.env.LIFESTYLE_GRASP_ENSEMBLE_ENABLED === "true";

export { GRASP_VISION_MAX_ATTEMPTS, REFINE_FEATHER_FRACTION };

export type CropRectPx = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type GraspRefineDiagnostics = {
  cropRect: CropRectPx;
  refineApplied: boolean;
  refineSkipReason?: string;
  outsideCropIdentical: boolean;
  outsideCropDiffPixels: number;
  outsideCropTotalPixels: number;
  featherBlendMaxError?: number;
  labelOppositeColorDelta?: number;
};

export type HandPlacementAttemptLog = {
  attempt: number;
  reliable: boolean;
  rejectReason?: string;
  graspOverlapFraction: number;
};

type GraspRetryAttemptRecord = {
  result: HandPlacementDetection;
  graspOverlapFraction: number;
  representativeGrasp: HeldObjectRegion | null;
};

/** 91차 — 3회 grasp reject 후 합집합 bbox로 마지막 판정 (추가 Vision 없음) */
function tryGraspEnsembleFromAttempts(
  attempts: GraspRetryAttemptRecord[],
  maxGraspAreaFractionOfHand = 0.6,
): { mergedGraspRegion: HeldObjectRegion; ensembleGraspOverlap: number } | null {
  if (attempts.length === 0) return null;

  const best = attempts.reduce((a, b) =>
    a.graspOverlapFraction >= b.graspOverlapFraction ? a : b,
  );
  if (!best.result.placement) return null;

  const representativeGrasps = attempts
    .map((a) => a.representativeGrasp)
    .filter((g): g is HeldObjectRegion => g !== null);
  const merged = mergeGraspRegionsUnion(representativeGrasps);
  if (!merged) return null;

  const last = attempts[attempts.length - 1].result;
  const plausible = last.handRegions.some((h) =>
    isGraspRegionPlausible(merged, h, maxGraspAreaFractionOfHand),
  );
  if (!plausible) return null;

  const ensembleGraspOverlap = getBestGraspOverlapFraction(best.result.placement, [merged]);
  if (!overlapsGraspRegion(best.result.placement, [merged], DEFAULT_GRASP_OVERLAP_FRACTION)) {
    return null;
  }

  const reliability = evaluateHandPlacementReliability({
    placement: best.result.placement,
    handsVisible: last.handsVisible,
    handRegions: last.handRegions,
    graspRegions: [merged],
    faceRegion: last.faceRegion,
    minGraspOverlapFraction: DEFAULT_GRASP_OVERLAP_FRACTION,
    maxGraspAreaFractionOfHand,
  });

  if (!reliability.reliable) return null;

  return { mergedGraspRegion: merged, ensembleGraspOverlap };
}

type ModelRef = `${string}/${string}:${string}`;

function getReplicateClient(): Replicate {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN이 설정되지 않았습니다.");
  return new Replicate({ auth: token, useFileOutput: false });
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

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

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
      console.warn(`[${label}] throttle — ${waitMs}ms 후 재시도 (${attempt + 1}/${maxAttempts - 1})`);
      await sleep(waitMs);
    }
  }
  throw lastError;
}

function extractFluxImageUrl(output: unknown): string | null {
  const url = Array.isArray(output) ? output[0] : output;
  return typeof url === "string" && url.length > 0 ? url : null;
}

function sniffImageMediaType(buffer: Buffer): "image/jpeg" | "image/png" {
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "image/png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  return "image/jpeg";
}

async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; mediaType: "image/jpeg" | "image/png" }> {
  if (url.startsWith("data:")) {
    const b64 = url.slice(url.indexOf(",") + 1);
    const buffer = Buffer.from(b64, "base64");
    // data URL 헤더보다 magic bytes 우선 (Gemini JPEG를 png로 잘못 표기하는 경우)
    return { buffer, mediaType: sniffImageMediaType(buffer) };
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`이미지 다운로드 실패: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("png") || contentType.includes("jpeg") || contentType.includes("jpg")) {
    const fromHeader = contentType.includes("png") ? "image/png" : "image/jpeg";
    const sniffed = sniffImageMediaType(buffer);
    return { buffer, mediaType: sniffed !== fromHeader ? sniffed : fromHeader };
  }
  return { buffer, mediaType: sniffImageMediaType(buffer) };
}

function bufferToDataUrl(buffer: Buffer): string {
  const mediaType = sniffImageMediaType(buffer);
  return `data:${mediaType};base64,${buffer.toString("base64")}`;
}

function pctRegionToPx(
  region: HeldObjectRegion,
  sceneW: number,
  sceneH: number,
): CropRectPx {
  return {
    left: Math.round(sceneW * (region.xPct / 100)),
    top: Math.round(sceneH * (region.yPct / 100)),
    width: Math.max(1, Math.round(sceneW * (region.wPct / 100))),
    height: Math.max(1, Math.round(sceneH * (region.hPct / 100))),
  };
}

function unionRects(a: CropRectPx, b: CropRectPx): CropRectPx {
  const left = Math.min(a.left, b.left);
  const top = Math.min(a.top, b.top);
  const right = Math.max(a.left + a.width, b.left + b.width);
  const bottom = Math.max(a.top + a.height, b.top + b.height);
  return { left, top, width: right - left, height: bottom - top };
}

/** 88차 — placement∪graspRegion 합집합 + padding 크롭 rect (px, clamp) */
export function computeRefineCropRect(params: {
  sceneW: number;
  sceneH: number;
  placement: HeldObjectRegion;
  graspRegion: HeldObjectRegion;
  paddingFraction?: number;
}): CropRectPx {
  const { sceneW, sceneH, placement, graspRegion, paddingFraction = REFINE_CROP_PADDING_FRACTION } =
    params;

  const union = unionRects(
    pctRegionToPx(placement, sceneW, sceneH),
    pctRegionToPx(graspRegion, sceneW, sceneH),
  );
  const longerSide = Math.max(union.width, union.height);
  const pad = Math.round(longerSide * paddingFraction);

  let left = union.left - pad;
  let top = union.top - pad;
  let width = union.width + 2 * pad;
  let height = union.height + 2 * pad;

  left = Math.max(0, left);
  top = Math.max(0, top);
  width = Math.min(width, sceneW - left);
  height = Math.min(height, sceneH - top);
  width = Math.max(8, width);
  height = Math.max(8, height);

  const maxW = Math.round(sceneW * REFINE_CROP_MAX_SCENE_FRACTION);
  const maxH = Math.round(sceneH * REFINE_CROP_MAX_SCENE_FRACTION);
  if (width > maxW || height > maxH) {
    const cx = left + width / 2;
    const cy = top + height / 2;
    width = Math.min(width, maxW);
    height = Math.min(height, maxH);
    left = Math.round(Math.min(Math.max(0, cx - width / 2), sceneW - width));
    top = Math.round(Math.min(Math.max(0, cy - height / 2), sceneH - height));
  }

  return { left, top, width, height };
}

/** 페더링 밴드를 제외한 크롭 내부 코어 rect */
export function computeCropCoreRect(
  crop: CropRectPx,
  featherFraction = REFINE_FEATHER_FRACTION,
): CropRectPx {
  const insetX = Math.max(1, Math.round(crop.width * featherFraction));
  const insetY = Math.max(1, Math.round(crop.height * featherFraction));
  const width = Math.max(1, crop.width - 2 * insetX);
  const height = Math.max(1, crop.height - 2 * insetY);
  if (width >= crop.width || height >= crop.height) {
    return { ...crop };
  }
  return {
    left: crop.left + insetX,
    top: crop.top + insetY,
    width,
    height,
  };
}

function featherAlphaAt(x: number, y: number, w: number, h: number, featherPx: number): number {
  const distEdge = Math.min(x, y, w - 1 - x, h - 1 - y);
  if (distEdge >= featherPx) return 255;
  if (featherPx <= 0) return 255;
  return Math.round(255 * (distEdge / featherPx));
}

async function applyFeatherAlphaToCrop(cropBuffer: Buffer, featherFraction: number): Promise<Buffer> {
  const { data, info } = await sharp(cropBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const channels = info.channels;
  const featherPx = Math.max(2, Math.round(Math.min(w, h) * featherFraction));

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const idx = (y * w + x) * channels;
      const edgeAlpha = featherAlphaAt(x, y, w, h, featherPx);
      data[idx + 3] = Math.round((data[idx + 3] * edgeAlpha) / 255);
    }
  }

  return sharp(data, { raw: { width: w, height: h, channels } }).png().toBuffer();
}

/** 크롭 rect 밖 픽셀이 before/after에서 동일한지 검증 (페더링과 무관) */
export async function verifyPixelsOutsideCropUnchanged(
  before: Buffer,
  after: Buffer,
  crop: CropRectPx,
): Promise<{ identical: boolean; diffPixels: number; totalOutside: number }> {
  const meta = await sharp(before).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w === 0 || h === 0) return { identical: true, diffPixels: 0, totalOutside: 0 };

  const beforeRaw = await sharp(before).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const afterRaw = await sharp(after).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const channels = beforeRaw.info.channels;
  const stride = w * channels;

  const cropLeft = crop.left;
  const cropTop = crop.top;
  const cropRight = crop.left + crop.width;
  const cropBottom = crop.top + crop.height;

  let diffPixels = 0;
  let totalOutside = 0;

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const inCrop = x >= cropLeft && x < cropRight && y >= cropTop && y < cropBottom;
      if (inCrop) continue;
      totalOutside += 1;
      const idx = y * stride + x * channels;
      for (let c = 0; c < Math.min(channels, 3); c += 1) {
        if (beforeRaw.data[idx + c] !== afterRaw.data[idx + c]) {
          diffPixels += 1;
          break;
        }
      }
    }
  }

  return { identical: diffPixels === 0, diffPixels, totalOutside };
}

/** 페더링 밴드에서 result ≈ lerp(before, refined, alpha) 검증 */
export async function verifyFeatherBlendRegion(
  before: Buffer,
  after: Buffer,
  refinedCrop: Buffer,
  crop: CropRectPx,
  featherFraction = REFINE_FEATHER_FRACTION,
): Promise<{ maxChannelError: number; samplesChecked: number }> {
  const meta = await sharp(before).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w === 0 || h === 0) return { maxChannelError: 0, samplesChecked: 0 };

  const beforeRaw = await sharp(before).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const afterRaw = await sharp(after).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const refinedRaw = await sharp(refinedCrop).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const channels = beforeRaw.info.channels;
  const stride = w * channels;
  const cropW = crop.width;
  const cropH = crop.height;
  const featherPx = Math.max(2, Math.round(Math.min(cropW, cropH) * featherFraction));

  let maxChannelError = 0;
  let samplesChecked = 0;

  for (let cy = 0; cy < cropH; cy += 1) {
    for (let cx = 0; cx < cropW; cx += 1) {
      const edgeAlpha = featherAlphaAt(cx, cy, cropW, cropH, featherPx);
      if (edgeAlpha >= 255) continue;

      const x = crop.left + cx;
      const y = crop.top + cy;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;

      samplesChecked += 1;
      const idx = (y * w + x) * channels;
      const ridx = (cy * cropW + cx) * channels;
      const t = edgeAlpha / 255;

      for (let c = 0; c < 3; c += 1) {
        const expected = Math.round(beforeRaw.data[idx + c] * (1 - t) + refinedRaw.data[ridx + c] * t);
        const err = Math.abs(afterRaw.data[idx + c] - expected);
        if (err > maxChannelError) maxChannelError = err;
      }
    }
  }

  return { maxChannelError, samplesChecked };
}

/** 89차 — not-overlapping-grasp-region일 때만 Vision 재호출 (최대 3회) */
export async function detectHandPlacementWithGraspRetry(
  lifestyle: { buffer: Buffer; mediaType: "image/jpeg" | "image/png" },
  cutout: { buffer: Buffer; mediaType: "image/jpeg" | "image/png" },
): Promise<
  HandPlacementDetection & {
    visionAttempts: number;
    attemptLogs: HandPlacementAttemptLog[];
    viaEnsemble?: boolean;
    ensembleGraspOverlap?: number;
    mergedGraspRegion?: HeldObjectRegion | null;
  }
> {
  const attemptLogs: HandPlacementAttemptLog[] = [];
  const attemptRecords: GraspRetryAttemptRecord[] = [];
  let totalCost = 0;

  console.log(`[hand-placement-retry] ensembleEnabled=${LIFESTYLE_GRASP_ENSEMBLE_ENABLED}`);

  for (let attempt = 1; attempt <= GRASP_VISION_MAX_ATTEMPTS; attempt += 1) {
    const result = await detectHandPlacementForProduct(lifestyle, cutout);
    totalCost += result.cost;

    const graspOverlapFraction = result.placement
      ? getBestGraspOverlapFraction(result.placement, result.graspRegions)
      : 0;
    const representativeGrasp = pickRepresentativeGraspRegion(result.placement, result.graspRegions);

    attemptRecords.push({ result, graspOverlapFraction, representativeGrasp });
    attemptLogs.push({
      attempt,
      reliable: result.reliable,
      rejectReason: result.rejectReason,
      graspOverlapFraction,
    });

    console.log(
      `[hand-placement-retry] attempt=${attempt}/${GRASP_VISION_MAX_ATTEMPTS} ` +
        `reliable=${result.reliable} reject=${result.rejectReason ?? "none"} ` +
        `graspOverlap=${graspOverlapFraction.toFixed(3)}`,
    );

    if (result.reliable) {
      return {
        ...result,
        cost: totalCost,
        visionAttempts: attempt,
        attemptLogs,
        viaEnsemble: false,
      };
    }

    if (result.rejectReason !== "not-overlapping-grasp-region") {
      return {
        ...result,
        cost: totalCost,
        visionAttempts: attempt,
        attemptLogs,
        viaEnsemble: false,
      };
    }
  }

  const allGraspReject =
    attemptRecords.length === GRASP_VISION_MAX_ATTEMPTS &&
    attemptRecords.every((a) => a.result.rejectReason === "not-overlapping-grasp-region");

  if (allGraspReject && LIFESTYLE_GRASP_ENSEMBLE_ENABLED) {
    const ensemble = tryGraspEnsembleFromAttempts(attemptRecords);
    if (ensemble) {
      const best = attemptRecords.reduce((a, b) =>
        a.graspOverlapFraction >= b.graspOverlapFraction ? a : b,
      );
      const last = attemptRecords[attemptRecords.length - 1].result;
      console.log(
        `[hand-placement-retry] ensemble viaEnsemble=true ` +
          `rawBestOverlap=${best.graspOverlapFraction.toFixed(3)} ` +
          `ensembleOverlap=${ensemble.ensembleGraspOverlap.toFixed(3)} ` +
          `merged=${JSON.stringify(ensemble.mergedGraspRegion)}`,
      );
      return {
        ...last,
        placement: best.result.placement,
        graspRegions: [ensemble.mergedGraspRegion],
        reliable: true,
        rejectReason: undefined,
        cost: totalCost,
        visionAttempts: GRASP_VISION_MAX_ATTEMPTS,
        attemptLogs,
        viaEnsemble: true,
        ensembleGraspOverlap: ensemble.ensembleGraspOverlap,
        mergedGraspRegion: ensemble.mergedGraspRegion,
      };
    }

    const representativeGrasps = attemptRecords
      .map((a) => a.representativeGrasp)
      .filter((g): g is HeldObjectRegion => g !== null);
    const mergedPreview = mergeGraspRegionsUnion(representativeGrasps);
    const best = attemptRecords.reduce((a, b) =>
      a.graspOverlapFraction >= b.graspOverlapFraction ? a : b,
    );
    const ensembleOverlap =
      best.result.placement && mergedPreview
        ? getBestGraspOverlapFraction(best.result.placement, [mergedPreview])
        : 0;
    console.log(
      `[hand-placement-retry] ensemble failed ` +
        `rawBestOverlap=${best.graspOverlapFraction.toFixed(3)} ` +
        `ensembleOverlap=${ensembleOverlap.toFixed(3)} ` +
        `merged=${mergedPreview ? JSON.stringify(mergedPreview) : "null"}`,
    );
  }

  const fallback = attemptRecords[attemptRecords.length - 1]?.result ?? {
    placement: null,
    handsVisible: false,
    gripSpaceVisible: false,
    faceRegion: null,
    handRegions: [],
    graspRegions: [],
    reliable: false,
    cost: totalCost,
  };

  return {
    ...fallback,
    cost: totalCost,
    visionAttempts: GRASP_VISION_MAX_ATTEMPTS,
    attemptLogs,
    viaEnsemble: false,
    mergedGraspRegion: null,
  };
}

/** grasp 반대쪽(라벨 가능) 좁은 영역 평균 RGB 유클리드 델타 */
export async function measureLabelOppositeColorDelta(
  before: Buffer,
  after: Buffer,
  placement: HeldObjectRegion,
  graspRegion: HeldObjectRegion,
  sceneW: number,
  sceneH: number,
): Promise<number> {
  const placementPx = pctRegionToPx(placement, sceneW, sceneH);
  const graspPx = pctRegionToPx(graspRegion, sceneW, sceneH);
  const graspCx = graspPx.left + graspPx.width / 2;
  const graspCy = graspPx.top + graspPx.height / 2;
  const placeCx = placementPx.left + placementPx.width / 2;
  const placeCy = placementPx.top + placementPx.height / 2;

  const dx = placeCx - graspCx;
  const dy = placeCy - graspCy;
  const len = Math.hypot(dx, dy) || 1;
  const sampleW = Math.max(4, Math.round(placementPx.width * 0.35));
  const sampleH = Math.max(4, Math.round(placementPx.height * 0.35));
  const sampleLeft = Math.round(
    Math.min(Math.max(0, placeCx + (dx / len) * (placementPx.width * 0.25) - sampleW / 2), sceneW - sampleW),
  );
  const sampleTop = Math.round(
    Math.min(Math.max(0, placeCy + (dy / len) * (placementPx.height * 0.25) - sampleH / 2), sceneH - sampleH),
  );

  const sampleBefore = await sharp(before)
    .extract({ left: sampleLeft, top: sampleTop, width: sampleW, height: sampleH })
    .stats();
  const sampleAfter = await sharp(after)
    .extract({ left: sampleLeft, top: sampleTop, width: sampleW, height: sampleH })
    .stats();

  const b = sampleBefore.channels.slice(0, 3).map((c) => c.mean);
  const a = sampleAfter.channels.slice(0, 3).map((c) => c.mean);
  return Math.sqrt(b.reduce((sum, v, i) => sum + (v - (a[i] ?? 0)) ** 2, 0));
}

let backgroundRemoverVersionRef: ModelRef | null = null;

async function getBackgroundRemoverRef(): Promise<ModelRef> {
  if (backgroundRemoverVersionRef) return backgroundRemoverVersionRef;
  const replicate = getReplicateClient();
  const model = await replicate.models.get("851-labs", "background-remover");
  const versionId = model.latest_version?.id;
  if (!versionId) throw new Error("background-remover 버전을 찾을 수 없습니다.");
  backgroundRemoverVersionRef = `851-labs/background-remover:${versionId}`;
  return backgroundRemoverVersionRef;
}

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

function buildFallbackPrompt(category: string): string {
  return [
    "Edit the lifestyle photo so the person naturally holds or uses the exact product",
    "shown in the second reference cutout image.",
    "Just match the reference cutout's actual appearance — do not imagine, rename, or redesign the product.",
    "Do NOT redraw, redesign, or alter the product's packaging, label text, logo,",
    "or brand colors in any way — preserve the exact appearance of the reference",
    "product image pixel-for-pixel where visible. Only change the surrounding hand/pose/scene.",
    "If the reference product surface has no clearly visible text, logo, or brand mark,",
    "keep the held object's surface plain and text-free — do NOT invent, generate, or add",
    "any new brand name, logo, or text that is not visibly present in the reference image.",
    "Prefer hands and forearms visible — avoid extreme face close-up.",
    "Match original scene lighting and shadows. realistic ecommerce lifestyle composition.",
    "no distorted fingers, no extra limbs, no text, no watermark",
    `category: ${category}`,
  ].join(" ");
}

function buildGraspRefinePrompt(category: string): string {
  return [
    "The product object already exists in this image exactly as shown.",
    "Do NOT change the product's design, label, logo, colors, or text in any way.",
    "Only adjust the fingers and hand so they naturally wrap around the existing product.",
    "Do not add new objects, limbs, or body parts. No distorted fingers.",
    "Keep lighting and shadows consistent with the original crop.",
    "no text, no watermark",
    `category: ${category}`,
  ].join(" ");
}

async function runNanoBanana(params: {
  prompt: string;
  imageUrls: string[];
  label: string;
}): Promise<string | null> {
  const replicate = getReplicateClient();
  console.log(`[lifestyle-composite] CALL nano-banana (${params.label})`);
  const output = await runReplicateWithRetry(`lifestyle-composite-${params.label}`, () =>
    withTimeout(
      replicate.run(NANO_BANANA_REF, {
        input: {
          prompt: params.prompt,
          image_input: params.imageUrls,
          aspect_ratio: "match_input_image",
          output_format: "png",
        },
        wait: { mode: "poll", interval: 1000 },
      }),
      120000,
      `nano-banana-${params.label}`,
    ),
  );
  return extractFluxImageUrl(output);
}

function buildSceneShadowSvg(
  sceneW: number,
  sceneH: number,
  placement: { left: number; top: number; width: number; height: number },
  shadow: ShadowAnalysis,
): string {
  const canvasSize = Math.max(sceneW, sceneH);
  return buildProductShadowSvg(canvasSize, placement, shadow).replace(
    `width="${canvasSize}" height="${canvasSize}"`,
    `width="${sceneW}" height="${sceneH}"`,
  );
}

async function pasteCutoutOnScene(params: {
  sceneBuffer: Buffer;
  cutoutBuffer: Buffer;
  placement: HeldObjectPlacement;
}): Promise<Buffer> {
  const { sceneBuffer, cutoutBuffer, placement } = params;
  const sceneMeta = await sharp(sceneBuffer).metadata();
  const sceneW = sceneMeta.width ?? 1;
  const sceneH = sceneMeta.height ?? 1;

  const targetW = Math.max(8, Math.round(sceneW * (placement.wPct / 100)));
  const targetH = Math.max(8, Math.round(sceneH * (placement.hPct / 100)));
  const left = Math.round(sceneW * (placement.xPct / 100));
  const top = Math.round(sceneH * (placement.yPct / 100));

  const cutoutPrepared = await sharp(cutoutBuffer)
    .resize(targetW, targetH, { fit: "inside", withoutEnlargement: false })
    .rotate(placement.rotationDeg, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const cutMeta = await sharp(cutoutPrepared).metadata();
  const cutW = cutMeta.width ?? targetW;
  const cutH = cutMeta.height ?? targetH;

  const pasteLeft = left + Math.round((targetW - cutW) / 2);
  const pasteTop = top + Math.round((targetH - cutH) / 2);

  const shadow = { ...DEFAULT_SHADOW };
  const shadowSvg = buildSceneShadowSvg(
    sceneW,
    sceneH,
    { left: pasteLeft, top: pasteTop, width: cutW, height: cutH },
    shadow,
  );
  const shadowBuf = await sharp(Buffer.from(shadowSvg)).png().toBuffer();

  const withShadow = await sharp(sceneBuffer)
    .composite([{ input: shadowBuf, left: 0, top: 0, blend: "multiply" }])
    .png()
    .toBuffer();

  return sharp(withShadow)
    .composite([{ input: cutoutPrepared, left: pasteLeft, top: pasteTop }])
    .png()
    .toBuffer();
}

/** 88~89차 — paste 완료 합성에서 grasp 지점 크롭만 nano-banana 국소 재생성 */
export async function refineGraspAreaLocally(params: {
  compositeBuffer: Buffer;
  cropRect: CropRectPx;
  category: string;
  /** QA — 88차 hard-edge vs 89차 feather 비교 */
  useFeather?: boolean;
  featherFraction?: number;
}): Promise<{ buffer: Buffer; refined: boolean; cost: number; skipReason?: string; featheredCrop?: Buffer }> {
  const {
    compositeBuffer,
    cropRect,
    category,
    useFeather = true,
    featherFraction = REFINE_FEATHER_FRACTION,
  } = params;
  const cropW = cropRect.width;
  const cropH = cropRect.height;

  try {
    const cropBuffer = await sharp(compositeBuffer)
      .extract({ left: cropRect.left, top: cropRect.top, width: cropW, height: cropH })
      .png()
      .toBuffer();

    const cropUrl = bufferToDataUrl(cropBuffer);
    const refinedUrl = await runNanoBanana({
      prompt: buildGraspRefinePrompt(category),
      imageUrls: [cropUrl],
      label: "grasp-refine-crop",
    });

    if (!refinedUrl) {
      return { buffer: compositeBuffer, refined: false, cost: REPLICATE_COST_USD.nanoBanana, skipReason: "no-output-url" };
    }

    const refinedImage = await fetchImageBuffer(refinedUrl);
    const refinedMeta = await sharp(refinedImage.buffer).metadata();
    const outW = refinedMeta.width ?? 0;
    const outH = refinedMeta.height ?? 0;
    if (outW === 0 || outH === 0) {
      return { buffer: compositeBuffer, refined: false, cost: REPLICATE_COST_USD.nanoBanana, skipReason: "invalid-dimensions" };
    }

    const cropAspect = cropW / cropH;
    const outAspect = outW / outH;
    const aspectDiff = Math.abs(outAspect - cropAspect) / cropAspect;
    if (aspectDiff > REFINE_ASPECT_TOLERANCE) {
      console.warn(
        `[grasp-refine] aspect mismatch crop=${cropAspect.toFixed(3)} out=${outAspect.toFixed(3)} diff=${(aspectDiff * 100).toFixed(1)}%`,
      );
      return {
        buffer: compositeBuffer,
        refined: false,
        cost: REPLICATE_COST_USD.nanoBanana,
        skipReason: `aspect-mismatch-${(aspectDiff * 100).toFixed(1)}pct`,
      };
    }

    const resizedCrop = await sharp(refinedImage.buffer)
      .resize(cropW, cropH, { fit: "fill" })
      .png()
      .toBuffer();

    const cropToPaste = useFeather
      ? await applyFeatherAlphaToCrop(resizedCrop, featherFraction)
      : resizedCrop;

    const refinedComposite = await sharp(compositeBuffer)
      .composite([{ input: cropToPaste, left: cropRect.left, top: cropRect.top }])
      .png()
      .toBuffer();

    console.log(
      `[grasp-refine] success crop=(${cropRect.left},${cropRect.top},${cropW}x${cropH}) feather=${useFeather}`,
    );
    return {
      buffer: refinedComposite,
      refined: true,
      cost: REPLICATE_COST_USD.nanoBanana,
      featheredCrop: cropToPaste,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`[grasp-refine] skipped, reason=${reason}`);
    return { buffer: compositeBuffer, refined: false, cost: 0, skipReason: reason };
  }
}

export type LifestyleCompositeResult = {
  url: string;
  cost: number;
  composited: boolean;
  fallbackReason?: string;
  method?: "pixel-paste" | "pixel-paste+grasp-refine" | "nano-banana-fallback" | "none";
  placementConfidence?: "high" | "low";
  graspRefineDiagnostics?: GraspRefineDiagnostics;
  /** QA — refine 전 paste 버퍼 data URL */
  qaPasteBeforeRefineUrl?: string;
};

/** 84~88차 — Vision 배치 + paste + (grasp 매칭 시) 국소 재생성 */
export async function compositeProductOnLifestylePhoto(params: {
  lifestyleImageUrl: string;
  productImageUrl: string;
  category: string;
  productName: string;
  qaForceFallback?: boolean;
  /** QA — refine 전/후 픽셀 검증 데이터 수집 */
  qaGraspRefineDiagnostics?: boolean;
  /**
   * 111차 — 실측 높이(cm). 있으면 손 폭 기준 물리 스케일로 placement 크기 덮어씀.
   * 파싱·스케일 실패 시 requirePixelPaste면 폐기.
   */
  productHeightCm?: number | null;
  /** true면 검출 실패 시 nano-banana 폴백 없이 원본 유지(composited:false) */
  requirePixelPaste?: boolean;
}): Promise<LifestyleCompositeResult> {
  const {
    lifestyleImageUrl,
    productImageUrl,
    category,
    qaForceFallback,
    qaGraspRefineDiagnostics,
    productHeightCm,
    requirePixelPaste,
  } = params;

  let cost = 0;
  try {
    const cutout = await removeProductBackground(productImageUrl);
    cost += cutout.cost;

    if (!qaForceFallback) {
      try {
        const lifestyle = await fetchImageBuffer(lifestyleImageUrl);
        const cutoutImage = await fetchImageBuffer(cutout.cutoutUrl);

        const detection = await detectHandPlacementWithGraspRetry(lifestyle, cutoutImage);
        cost += detection.cost;

        if (detection.reliable && detection.placement) {
          let placement: HeldObjectPlacement = detection.placement;

          if (productHeightCm != null && productHeightCm > 0) {
            const sceneMeta = await sharp(lifestyle.buffer).metadata();
            const sceneW = sceneMeta.width ?? 1;
            const sceneH = sceneMeta.height ?? 1;
            const cutMeta = await sharp(cutoutImage.buffer).metadata();
            const cutW = cutMeta.width ?? 1;
            const cutH = cutMeta.height ?? 1;
            const scaled = applyPhysicalScaleToPlacement({
              placement,
              handRegions: detection.handRegions,
              productHeightCm,
              sceneWidthPx: sceneW,
              sceneHeightPx: sceneH,
              cutoutAspectWH: cutW / Math.max(cutH, 1),
            });
            if (!scaled) {
              console.warn(
                "[lifestyle-composite] physical scale rejected — drop pixel paste",
              );
              if (requirePixelPaste) {
                return {
                  url: lifestyleImageUrl,
                  cost,
                  composited: false,
                  fallbackReason: "physical-scale-rejected",
                  method: "none",
                };
              }
            } else {
              placement = scaled;
            }
          }

          try {
            const pasted = await pasteCutoutOnScene({
              sceneBuffer: lifestyle.buffer,
              cutoutBuffer: cutoutImage.buffer,
              placement,
            });

            const matchedGrasp = findMatchingGraspRegion(
              placement,
              detection.graspRegions,
              DEFAULT_GRASP_OVERLAP_FRACTION,
            );

            let finalBuffer = pasted;
            let method: LifestyleCompositeResult["method"] = "pixel-paste";
            let graspRefineDiagnostics: GraspRefineDiagnostics | undefined;

            if (matchedGrasp) {
              const sceneMeta = await sharp(pasted).metadata();
              const sceneW = sceneMeta.width ?? 1;
              const sceneH = sceneMeta.height ?? 1;
              const cropRect = computeRefineCropRect({
                sceneW,
                sceneH,
                placement,
                graspRegion: matchedGrasp,
              });

              const refine = await refineGraspAreaLocally({
                compositeBuffer: pasted,
                cropRect,
                category,
              });
              cost += refine.cost;

              if (refine.refined) {
                finalBuffer = refine.buffer;
                method = "pixel-paste+grasp-refine";
              }

              if (qaGraspRefineDiagnostics) {
                const outside = await verifyPixelsOutsideCropUnchanged(pasted, finalBuffer, cropRect);
                const labelDelta = await measureLabelOppositeColorDelta(
                  pasted,
                  finalBuffer,
                  placement,
                  matchedGrasp,
                  sceneW,
                  sceneH,
                );
                let featherBlendMaxError: number | undefined;
                if (refine.refined && refine.featheredCrop) {
                  const blend = await verifyFeatherBlendRegion(
                    pasted,
                    finalBuffer,
                    refine.featheredCrop,
                    cropRect,
                  );
                  featherBlendMaxError = blend.maxChannelError;
                }
                graspRefineDiagnostics = {
                  cropRect,
                  refineApplied: refine.refined,
                  refineSkipReason: refine.skipReason,
                  outsideCropIdentical: outside.identical,
                  outsideCropDiffPixels: outside.diffPixels,
                  outsideCropTotalPixels: outside.totalOutside,
                  featherBlendMaxError,
                  labelOppositeColorDelta: labelDelta,
                };
                console.log(
                  `[grasp-refine-qa] outsideIdentical=${outside.identical} diff=${outside.diffPixels}/${outside.totalOutside} ` +
                    `featherBlendMaxErr=${featherBlendMaxError ?? "n/a"} labelDelta=${labelDelta.toFixed(2)}`,
                );
              }
            }

            console.log(`[lifestyle-composite] stage=direct-paste success method=${method}`);
            console.log(`[cost] lifestyle-composite (${method}): $${cost.toFixed(4)}`);

            return {
              url: bufferToDataUrl(finalBuffer),
              cost,
              composited: true,
              method,
              placementConfidence: detection.placement.confidence,
              graspRefineDiagnostics,
              qaPasteBeforeRefineUrl: qaGraspRefineDiagnostics ? bufferToDataUrl(pasted) : undefined,
            };
          } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            console.warn(`[lifestyle-composite] stage=direct-paste failed, reason=${reason}`);
          }
        } else {
          const reason = detection.rejectReason
            ? `safeguard-${detection.rejectReason}`
            : detection.placement
              ? `vision-unreliable confidence=${detection.placement.confidence}`
              : "vision-no-placement";
          console.warn(`[lifestyle-composite] stage=direct-paste skipped, reason=${reason}`);
          if (requirePixelPaste) {
            return {
              url: lifestyleImageUrl,
              cost,
              composited: false,
              fallbackReason: reason,
              method: "none",
            };
          }
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(`[lifestyle-composite] stage=direct-paste prep failed, reason=${reason}`);
        if (requirePixelPaste) {
          return {
            url: lifestyleImageUrl,
            cost,
            composited: false,
            fallbackReason: reason,
            method: "none",
          };
        }
      }
    }

    if (requirePixelPaste) {
      return {
        url: lifestyleImageUrl,
        cost,
        composited: false,
        fallbackReason: "require-pixel-paste-no-fallback",
        method: "none",
      };
    }

    try {
      const fallbackUrl = await runNanoBanana({
        prompt: buildFallbackPrompt(category),
        imageUrls: [lifestyleImageUrl, cutout.cutoutUrl],
        label: "fallback-full",
      });
      cost += REPLICATE_COST_USD.nanoBanana;

      if (!fallbackUrl) {
        return {
          url: lifestyleImageUrl,
          cost,
          composited: false,
          fallbackReason: "nano-banana-fallback 결과 URL 없음",
          method: "none",
        };
      }

      console.log("[lifestyle-composite] stage=nano-banana-fallback success");
      console.log(`[cost] lifestyle-composite (fallback): $${cost.toFixed(4)}`);
      return {
        url: fallbackUrl,
        cost,
        composited: true,
        method: "nano-banana-fallback",
        placementConfidence: "low",
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(`[lifestyle-composite] stage=nano-banana-fallback failed, reason=${reason}`);
      return {
        url: lifestyleImageUrl,
        cost,
        composited: false,
        fallbackReason: reason,
        method: "none",
      };
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn("[lifestyle-composite] 실패 — 원본 라이프스타일 유지:", reason);
    return { url: lifestyleImageUrl, cost, composited: false, fallbackReason: reason, method: "none" };
  }
}
