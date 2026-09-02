import Replicate from "replicate";
import sharp from "sharp";
import {
  detectHandPlacementForProduct,
  type HeldObjectPlacement,
} from "@/lib/detect-held-object-placement";
import { buildProductShadowSvg } from "@/lib/photo-composite";
import { DEFAULT_SHADOW, type ShadowAnalysis } from "@/lib/vision-utils";

const NANO_BANANA_REF = "google/nano-banana" as const;
const REPLICATE_COST_USD = { nanoBanana: 0.039, backgroundRemover: 0.00047 } as const;

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

async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; mediaType: "image/jpeg" | "image/png" }> {
  if (url.startsWith("data:")) {
    const header = url.slice(0, url.indexOf(","));
    const b64 = url.slice(url.indexOf(",") + 1);
    const mediaType = header.includes("png") ? "image/png" : "image/jpeg";
    return { buffer: Buffer.from(b64, "base64"), mediaType };
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`이미지 다운로드 실패: ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const mediaType = contentType.includes("png") ? "image/png" : "image/jpeg";
  return { buffer: Buffer.from(await response.arrayBuffer()), mediaType };
}

function bufferToDataUrl(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString("base64")}`;
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
  const output = await runReplicateWithRetry("851-labs/background-remover", () =>
    replicate.run(modelRef, { input: { image: productImageUrl } }),
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

async function runNanoBanana(params: {
  prompt: string;
  lifestyleImageUrl: string;
  cutoutUrl: string;
  label: string;
}): Promise<string | null> {
  const replicate = getReplicateClient();
  console.log(`[lifestyle-composite] CALL nano-banana (${params.label})`);
  const output = await runReplicateWithRetry(`lifestyle-composite-${params.label}`, () =>
    withTimeout(
      replicate.run(NANO_BANANA_REF, {
        input: {
          prompt: params.prompt,
          image_input: [params.lifestyleImageUrl, params.cutoutUrl],
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

/** 84차 — 원본 라이프스타일 위에 실제 컷아웃 직접 합성 (마스킹 없음) */
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

export type LifestyleCompositeResult = {
  url: string;
  cost: number;
  composited: boolean;
  fallbackReason?: string;
  /** pixel-paste = 84차 직접 paste, nano-banana-fallback = 64/68/82차 폴백 */
  method?: "pixel-paste" | "nano-banana-fallback" | "none";
  placementConfidence?: "high" | "low";
};

/** 84차 — 원본 라이프스타일 Vision 배치 + 컷아웃 직접 paste. 실패 시 nano-banana 폴백. */
export async function compositeProductOnLifestylePhoto(params: {
  lifestyleImageUrl: string;
  productImageUrl: string;
  category: string;
  productName: string;
  /** QA 전용 — nano-banana 폴백만 실행 */
  qaForceFallback?: boolean;
}): Promise<LifestyleCompositeResult> {
  const { lifestyleImageUrl, productImageUrl, category, qaForceFallback } = params;

  let cost = 0;
  try {
    const cutout = await removeProductBackground(productImageUrl);
    cost += cutout.cost;

    if (!qaForceFallback) {
      try {
        const lifestyle = await fetchImageBuffer(lifestyleImageUrl);
        const cutoutImage = await fetchImageBuffer(cutout.cutoutUrl);

        const detection = await detectHandPlacementForProduct(lifestyle, cutoutImage);
        cost += detection.cost;

        if (detection.reliable && detection.placement) {
          try {
            const pasted = await pasteCutoutOnScene({
              sceneBuffer: lifestyle.buffer,
              cutoutBuffer: cutoutImage.buffer,
              placement: detection.placement,
            });
            console.log(
              `[lifestyle-composite] stage=direct-paste success confidence=${detection.placement.confidence}`,
            );
            console.log(`[cost] lifestyle-composite (direct-paste): $${cost.toFixed(4)}`);
            return {
              url: bufferToDataUrl(pasted),
              cost,
              composited: true,
              method: "pixel-paste",
              placementConfidence: detection.placement.confidence,
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
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(`[lifestyle-composite] stage=direct-paste prep failed, reason=${reason}`);
      }
    }

    try {
      const fallbackUrl = await runNanoBanana({
        prompt: buildFallbackPrompt(category),
        lifestyleImageUrl,
        cutoutUrl: cutout.cutoutUrl,
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
