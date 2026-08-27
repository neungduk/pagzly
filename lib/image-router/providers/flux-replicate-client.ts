import Replicate from "replicate";
import { classifyProviderError } from "@/lib/image-router/errors";
import { calculateImageCost } from "@/lib/image-router/pricing/calculate-image-cost";
import { resolveImageDimensions } from "@/lib/image-router/utils/dimensions";
import type {
  ProviderGenerateInput,
  ProviderGenerateOutput,
} from "@/lib/image-router/providers/image-provider";

/** Replicate fallback — 내부 retry 없음. Worker가 재시도. */
const REPLICATE_FLUX_2_PRO_REF =
  process.env.REPLICATE_FLUX_2_PRO_MODEL ?? "black-forest-labs/flux-2-pro";

let replicateClient: Replicate | null = null;

function getReplicateClient(): Replicate {
  if (!replicateClient) {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      throw classifyProviderError(new Error("REPLICATE_API_TOKEN is not configured"), {
        provider: "flux",
        model: "flux-2-pro",
      });
    }
    replicateClient = new Replicate({ auth: token, useFileOutput: false });
  }
  return replicateClient;
}

function extractOutputUrl(output: unknown): string | null {
  const url = Array.isArray(output) ? output[0] : output;
  return typeof url === "string" && url.length > 0 ? url : null;
}

export function isReplicateFluxAvailable(): boolean {
  return Boolean(process.env.REPLICATE_API_TOKEN);
}

export async function generateFlux2ProViaReplicate(
  input: ProviderGenerateInput,
): Promise<ProviderGenerateOutput> {
  const { width, height, megapixels } = resolveImageDimensions({
    aspectRatio: input.request.aspectRatio,
    resolution: input.request.resolution,
  });

  const replicateInput: Record<string, unknown> = {
    prompt: input.prompt,
    width,
    height,
  };

  const sourceUrl = input.productImages[0]?.url;
  if (sourceUrl) {
    replicateInput.input_image = sourceUrl;
    replicateInput.image = sourceUrl;
  }

  console.log(`[replicate-flux] run ${REPLICATE_FLUX_2_PRO_REF} ${width}x${height}`);

  try {
    const replicate = getReplicateClient();
    const output = await replicate.run(REPLICATE_FLUX_2_PRO_REF as `${string}/${string}`, {
      input: replicateInput,
      wait: { mode: "poll", interval: 1000 },
    });

    const url = extractOutputUrl(output);
    if (!url) {
      throw new Error(`Replicate ${REPLICATE_FLUX_2_PRO_REF} returned no image URL`);
    }

    const actualCost = calculateImageCost({
      provider: "flux",
      model: "flux-2-pro",
      inputMegapixels: sourceUrl ? megapixels : 0,
      outputMegapixels: megapixels,
      outputImageCount: 1,
    });

    return {
      outputUrls: [url],
      actualCost,
      model: "flux-2-pro",
      metadata: {
        provider: "flux",
        model: "flux-2-pro",
        inputMegapixels: sourceUrl ? megapixels : 0,
        outputMegapixels: megapixels,
        resolution: `${width}`,
        actualCostUsd: actualCost,
        backend: "replicate",
        modelRef: REPLICATE_FLUX_2_PRO_REF,
        width,
        height,
      },
    };
  } catch (err) {
    throw classifyProviderError(err, { provider: "flux", model: "flux-2-pro" });
  }
}
