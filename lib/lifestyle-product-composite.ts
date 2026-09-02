import Replicate from "replicate";

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

export type LifestyleCompositeResult = {
  url: string;
  cost: number;
  composited: boolean;
  fallbackReason?: string;
};

/** 64차 — 사용자 라이프스타일 사진 + 상품 컷아웃 합성. 실패 시 원본 유지. */
export async function compositeProductOnLifestylePhoto(params: {
  lifestyleImageUrl: string;
  productImageUrl: string;
  category: string;
  productName: string;
}): Promise<LifestyleCompositeResult> {
  const { lifestyleImageUrl, productImageUrl, category, productName } = params;

  let cost = 0;
  try {
    const cutout = await removeProductBackground(productImageUrl);
    cost += cutout.cost;

    const replicate = getReplicateClient();
    const prompt = [
      `Edit the lifestyle photo so the person naturally holds or uses the ${productName} product from the reference cutout.`,
      "Prefer hands and forearms visible — avoid extreme face close-up.",
      "Match original scene lighting and shadows. realistic ecommerce lifestyle composition.",
      "no distorted fingers, no extra limbs, no text, no watermark",
      `category: ${category}`,
    ].join(" ");

    console.log("[lifestyle-composite] CALL nano-banana");
    const output = await runReplicateWithRetry("lifestyle-composite", () =>
      withTimeout(
        replicate.run(NANO_BANANA_REF, {
          input: {
            prompt,
            image_input: [lifestyleImageUrl, cutout.cutoutUrl],
            aspect_ratio: "match_input_image",
            output_format: "png",
          },
          wait: { mode: "poll", interval: 1000 },
        }),
        120000,
        "nano-banana-lifestyle-composite",
      ),
    );

    const url = extractFluxImageUrl(output);
    if (!url) {
      return {
        url: lifestyleImageUrl,
        cost,
        composited: false,
        fallbackReason: "nano-banana 결과 URL 없음",
      };
    }

    cost += REPLICATE_COST_USD.nanoBanana;
    console.log(`[cost] lifestyle-composite: $${cost.toFixed(4)}`);
    return { url, cost, composited: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn("[lifestyle-composite] 실패 — 원본 라이프스타일 유지:", reason);
    return { url: lifestyleImageUrl, cost, composited: false, fallbackReason: reason };
  }
}
