import Replicate from "replicate";
import type { CategoryTheme } from "@/lib/category-theme";
import { describeColorTone } from "@/lib/color-extract";
import { isTestMode } from "@/lib/test-mode";

const FLUX_SCHNELL_REF = "black-forest-labs/flux-schnell" as const;
const NANO_BANANA_REF = "google/nano-banana" as const;

const COST_USD = {
  fluxSchnell: 0.003,
  nanoBanana: 0.039,
} as const;

let replicateClient: Replicate | null = null;

function getReplicateClient(): Replicate {
  if (!replicateClient) {
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error("REPLICATE_API_TOKEN이 설정되지 않았습니다.");
    }
    replicateClient = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
      useFileOutput: false,
    });
  }
  return replicateClient;
}

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

function extractImageUrl(output: unknown): string | null {
  if (typeof output === "string" && output.startsWith("http")) return output;
  if (Array.isArray(output) && typeof output[0] === "string") return output[0];
  if (output && typeof output === "object" && "url" in output) {
    const url = (output as { url?: unknown }).url;
    if (typeof url === "string") return url;
  }
  return null;
}

function buildCanvasAiPrompt(
  prompt: string,
  category: string,
  theme?: Pick<CategoryTheme, "accent" | "accentSoft" | "deepAccent" | "baseNeutral">,
): string {
  const tone = theme ? describeColorTone(theme.accent) : "";
  return [
    prompt.trim(),
    `category: ${category}`,
    tone ? `color mood: soft ${tone} accents` : "",
    "professional ecommerce product detail page photography",
    "no text, no letters, no watermark, no logo, no packaging mockup frame",
    "high quality, clean composition",
  ]
    .filter(Boolean)
    .join(", ");
}

export async function generateCanvasAiImage(params: {
  prompt: string;
  refImageUrl?: string;
  category: string;
  productName: string;
  theme?: Pick<CategoryTheme, "accent" | "accentSoft" | "deepAccent" | "baseNeutral">;
}): Promise<{ buffer: Buffer; cost: number }> {
  const enrichedPrompt = buildCanvasAiPrompt(params.prompt, params.category, params.theme);
  const replicate = getReplicateClient();
  const useRef = Boolean(params.refImageUrl?.trim()) && !isTestMode();

  if (useRef && params.refImageUrl) {
    console.log(`[canvas-ai-image] nano-banana ref — "${params.productName}"`);
    const output = await withTimeout(
      replicate.run(NANO_BANANA_REF, {
        input: {
          prompt: enrichedPrompt,
          image_input: [params.refImageUrl],
          aspect_ratio: "1:1",
          output_format: "png",
        },
        wait: { mode: "poll", interval: 1000 },
      }),
      120000,
      "canvas-ai-image nano-banana",
    );
    const url = extractImageUrl(output);
    if (!url) throw new Error("AI 이미지 생성 결과 URL을 받지 못했습니다.");
    const response = await fetch(url);
    if (!response.ok) throw new Error("AI 이미지를 불러오지 못했습니다.");
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      cost: COST_USD.nanoBanana,
    };
  }

  console.log(`[canvas-ai-image] flux-schnell — "${params.productName}" (TEST_MODE=${isTestMode()})`);
  const output = await withTimeout(
    replicate.run(FLUX_SCHNELL_REF, {
      input: {
        prompt: enrichedPrompt,
        num_outputs: 1,
        aspect_ratio: "4:3",
        output_format: "png",
        output_quality: 90,
      },
      wait: { mode: "poll", interval: 1000 },
    }),
    60000,
    "canvas-ai-image flux-schnell",
  );
  const url = extractImageUrl(output);
  if (!url) throw new Error("AI 이미지 생성 결과 URL을 받지 못했습니다.");
  const response = await fetch(url);
  if (!response.ok) throw new Error("AI 이미지를 불러오지 못했습니다.");
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    cost: COST_USD.fluxSchnell,
  };
}
