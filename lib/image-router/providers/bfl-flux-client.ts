import { calculateImageCost } from "@/lib/image-router/pricing/calculate-image-cost";
import { classifyProviderError } from "@/lib/image-router/errors";
import { resolveImageDimensions } from "@/lib/image-router/utils/dimensions";
import type { ProviderGenerateInput, ProviderGenerateOutput } from "@/lib/image-router/providers/image-provider";

const DEFAULT_BFL_BASE = "https://api.bfl.ai";
const DEFAULT_ENDPOINT = "/v1/flux-2-pro-preview";

type BflSubmitResponse = {
  id?: string;
  polling_url?: string;
  error?: string;
  detail?: string;
};

type BflPollResponse = {
  status?: string;
  result?: {
    sample?: string;
    [key: string]: unknown;
  };
  cost?: number;
  error?: string;
  details?: unknown;
};

function resolveApiKey(): string | null {
  return process.env.FLUX_API_KEY ?? process.env.BFL_API_KEY ?? null;
}

function resolveBaseUrl(): string {
  return process.env.FLUX_API_BASE_URL ?? DEFAULT_BFL_BASE;
}

function resolveEndpointPath(): string {
  return process.env.FLUX_2_PRO_ENDPOINT ?? DEFAULT_ENDPOINT;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractImageUrl(data: BflPollResponse): string | null {
  const sample = data.result?.sample;
  if (typeof sample === "string" && sample.length > 0) return sample;

  const result = data.result;
  if (result && typeof result === "object") {
    for (const value of Object.values(result)) {
      if (typeof value === "string" && /^https?:\/\//.test(value)) {
        return value;
      }
    }
  }
  return null;
}

export function isBflFluxAvailable(): boolean {
  return Boolean(resolveApiKey());
}

/**
 * Black Forest Labs direct API — FLUX.2 Pro (async submit + poll).
 * @see https://docs.bfl.ml/quick_start/generating_images
 */
export async function generateFlux2ProViaBfl(
  input: ProviderGenerateInput,
): Promise<ProviderGenerateOutput> {
  try {
    return await generateFlux2ProViaBflInner(input);
  } catch (err) {
    throw classifyProviderError(err, { provider: "flux", model: "flux-2-pro" });
  }
}

async function generateFlux2ProViaBflInner(
  input: ProviderGenerateInput,
): Promise<ProviderGenerateOutput> {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error("FLUX_API_KEY (or BFL_API_KEY) is not configured");
  }

  const { width, height, megapixels } = resolveImageDimensions({
    aspectRatio: input.request.aspectRatio,
    resolution: input.request.resolution,
  });

  const body: Record<string, unknown> = {
    prompt: input.prompt,
    width,
    height,
  };

  const sourceUrl = input.productImages[0]?.url;
  if (sourceUrl) {
    body.input_image = sourceUrl;
  }

  const submitUrl = `${resolveBaseUrl()}${resolveEndpointPath()}`;
  console.log(`[bfl-flux] POST ${submitUrl} ${width}x${height}`);

  const submitRes = await fetch(submitUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      "x-key": apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(input.timeoutMs),
  });

  const submitJson = (await submitRes.json()) as BflSubmitResponse;
  if (!submitRes.ok) {
    throw new Error(
      `BFL submit failed (${submitRes.status}): ${submitJson.error ?? submitJson.detail ?? JSON.stringify(submitJson)}`,
    );
  }

  const pollingUrl = submitJson.polling_url;
  if (!pollingUrl) {
    throw new Error("BFL response missing polling_url");
  }

  const pollStarted = Date.now();
  const pollIntervalMs = 1500;

  while (Date.now() - pollStarted < input.timeoutMs) {
    await sleep(pollIntervalMs);

    const pollRes = await fetch(pollingUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-key": apiKey,
      },
      signal: AbortSignal.timeout(30_000),
    });

    const pollJson = (await pollRes.json()) as BflPollResponse;
    if (!pollRes.ok) {
      throw new Error(
        `BFL poll failed (${pollRes.status}): ${pollJson.error ?? JSON.stringify(pollJson)}`,
      );
    }

    const status = pollJson.status ?? "";
    if (status === "Ready") {
      const imageUrl = extractImageUrl(pollJson);
      if (!imageUrl) {
        throw new Error("BFL Ready but no image URL in result");
      }

      let actualCost = calculateImageCost({
        provider: "flux",
        model: "flux-2-pro",
        inputMegapixels: sourceUrl ? megapixels : 0,
        outputMegapixels: megapixels,
        outputImageCount: 1,
      });

      if (typeof pollJson.cost === "number" && pollJson.cost > 0) {
        // BFL cost is in credits (1 credit = $0.01)
        actualCost = pollJson.cost / 100;
      }

      console.log(`[bfl-flux] Ready cost=$${actualCost.toFixed(4)} url=${imageUrl.slice(0, 80)}…`);

      return {
        outputUrls: [imageUrl],
        actualCost,
        model: "flux-2-pro",
        metadata: {
          provider: "flux",
          model: "flux-2-pro",
          inputMegapixels: sourceUrl ? megapixels : 0,
          outputMegapixels: megapixels,
          resolution: `${width}`,
          actualCostUsd: actualCost,
          backend: "bfl-direct",
          requestId: submitJson.id,
          width,
          height,
          bflCostCredits: pollJson.cost,
          usage: { bflCostCredits: pollJson.cost },
        },
      };
    }

    if (status === "Error" || status === "Failed" || status === "Request Moderated") {
      throw new Error(
        `BFL generation ${status}: ${JSON.stringify(pollJson.details ?? pollJson.error ?? pollJson)}`,
      );
    }
  }

  throw new Error(`BFL polling timeout (${input.timeoutMs}ms)`);
}
