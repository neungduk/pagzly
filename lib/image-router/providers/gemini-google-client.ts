import { AIProviderError, classifyProviderError } from "@/lib/image-router/errors";
import { calculateImageCost } from "@/lib/image-router/pricing/calculate-image-cost";
import { buildGeminiImagePrompt } from "@/lib/image-router/providers/gemini-prompts";
import type {
  ProviderGenerateInput,
  ProviderGenerateOutput,
} from "@/lib/image-router/providers/image-provider";
import type { ImageAspectRatio, ImageResolution } from "@/lib/image-router/types";

export const GEMINI_IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL ?? "gemini-3-pro-image";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

function mapAspectRatio(ratio: ImageAspectRatio | undefined): string {
  const map: Record<ImageAspectRatio, string> = {
    "1:1": "1:1",
    "4:3": "4:3",
    "3:4": "3:4",
    "16:9": "16:9",
    "9:16": "9:16",
    "3:2": "3:2",
    "2:3": "2:3",
  };
  return map[ratio ?? "1:1"] ?? "1:1";
}

function mapImageSize(resolution: ImageResolution | undefined): "1K" | "2K" {
  const side = Number.parseInt(String(resolution ?? "1024"), 10);
  return side >= 1200 ? "2K" : "1K";
}

async function loadImageAsInlinePart(
  url: string,
): Promise<{ inline_data: { mime_type: string; data: string } }> {
  if (url.startsWith("data:")) {
    const match = url.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error("Invalid data URL for Gemini input");
    return {
      inline_data: {
        mime_type: match[1]!,
        data: match[2]!,
      },
    };
  }

  // local filesystem path (Windows / POSIX)
  const looksLocal =
    /^[A-Za-z]:[\\/]/.test(url) || url.startsWith("\\\\") || url.startsWith("/") || url.startsWith("./");
  if (looksLocal && !url.startsWith("http://") && !url.startsWith("https://")) {
    const fs = await import("fs");
    if (!fs.existsSync(url)) throw new Error(`Local image not found: ${url}`);
    const buffer = fs.readFileSync(url);
    const lower = url.toLowerCase();
    const mime =
      lower.endsWith(".png")
        ? "image/png"
        : lower.endsWith(".webp")
          ? "image/webp"
          : lower.endsWith(".gif")
            ? "image/gif"
            : "image/jpeg";
    return {
      inline_data: {
        mime_type: mime,
        data: buffer.toString("base64"),
      },
    };
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch product image for Gemini: ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  return {
    inline_data: {
      mime_type: contentType.split(";")[0]!.trim(),
      data: buffer.toString("base64"),
    },
  };
}

function extractImageFromResponse(json: unknown): string | null {
  const root = json as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { mimeType?: string; data?: string };
          inline_data?: { mime_type?: string; data?: string };
        }>;
      };
    }>;
  };

  for (const candidate of root.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      const inline = part.inlineData ?? part.inline_data;
      if (inline?.data) {
        const mime = (part.inlineData?.mimeType ?? part.inline_data?.mime_type) || "image/png";
        return `data:${mime};base64,${inline.data}`;
      }
    }
  }
  return null;
}

export function isGeminiGoogleAvailable(): boolean {
  return Boolean(process.env.GOOGLE_AI_API_KEY);
}

/** Provider 내부 retry 없음 — Worker / Router fallback이 재시도 */
export async function generateGemini3ProImage(
  input: ProviderGenerateInput,
): Promise<ProviderGenerateOutput> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw classifyProviderError(new Error("GOOGLE_AI_API_KEY is not configured"), {
      provider: "gemini",
      model: "gemini-3-pro-image",
    });
  }

  const taskType = input.request.taskType;
  const prompt = buildGeminiImagePrompt(taskType, input.prompt);

  const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];

  for (const img of input.productImages.slice(0, 4)) {
    try {
      parts.push(await loadImageAsInlinePart(img.url));
    } catch (err) {
      console.warn("[gemini] skip input image:", err);
    }
  }
  parts.push({ text: prompt });

  const url = `${GEMINI_API_BASE}/models/${GEMINI_IMAGE_MODEL}:generateContent`;

  console.log(
    `[gemini-image] model=${GEMINI_IMAGE_MODEL} task=${taskType} refs=${input.productImages.length}`,
  );

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: {
            aspectRatio: mapAspectRatio(input.request.aspectRatio),
            imageSize: mapImageSize(input.request.resolution),
          },
        },
      }),
    });

    const json = (await response.json()) as { error?: { message?: string } };

    if (!response.ok) {
      const msg = json.error?.message ?? `Gemini API ${response.status}`;
      throw classifyProviderError(new Error(msg), {
        provider: "gemini",
        model: "gemini-3-pro-image",
      });
    }

    const imageDataUrl = extractImageFromResponse(json);
    if (!imageDataUrl) {
      throw new AIProviderError({
        type: "INVALID_REQUEST",
        retryable: false,
        provider: "gemini",
        model: "gemini-3-pro-image",
        message: "Gemini returned no image in response",
        billed: false,
      });
    }

    const resolution = input.request.resolution ?? "1024";
    const side = Number.parseInt(String(resolution), 10);
    const mp = (side * side) / 1_000_000;

    const actualCost = calculateImageCost({
      provider: "gemini",
      model: "gemini-3-pro-image",
      inputMegapixels: input.productImages.length > 0 ? mp * input.productImages.length : 0,
      outputMegapixels: mp,
      outputImageCount: 1,
    });

    return {
      outputUrls: [imageDataUrl],
      actualCost,
      model: "gemini-3-pro-image",
      metadata: {
        provider: "gemini",
        model: "gemini-3-pro-image",
        actualCostUsd: actualCost,
        backend: "google-ai",
        modelRef: GEMINI_IMAGE_MODEL,
        taskType,
      },
    };
  } catch (err) {
    if (err instanceof AIProviderError) throw err;
    throw classifyProviderError(err, { provider: "gemini", model: "gemini-3-pro-image" });
  }
}
