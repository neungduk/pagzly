import Replicate from "replicate";
import { AIProviderError, classifyProviderError } from "@/lib/image-router/errors";
import { calculateImageCost } from "@/lib/image-router/pricing/calculate-image-cost";
import {
  buildKontextPrompt,
  kontextRequiresProductImage,
} from "@/lib/image-router/providers/kontext-prompts";
import type {
  ProviderGenerateInput,
  ProviderGenerateOutput,
} from "@/lib/image-router/providers/image-provider";

/** Replicate model ref — fal 등 다른 backend로 교체 시 env만 변경 */
export const REPLICATE_KONTEXT_PRO_REF =
  process.env.REPLICATE_KONTEXT_PRO_MODEL ?? "black-forest-labs/flux-kontext-pro";

let kontextReplicateClient: Replicate | null = null;

/** KONTEXT_API_KEY 우선, 없으면 REPLICATE_API_TOKEN */
export function resolveKontextApiToken(): string | null {
  return process.env.KONTEXT_API_KEY ?? process.env.REPLICATE_API_TOKEN ?? null;
}

export function isKontextReplicateAvailable(): boolean {
  return Boolean(resolveKontextApiToken());
}

function getKontextReplicateClient(): Replicate {
  if (!kontextReplicateClient) {
    const token = resolveKontextApiToken();
    if (!token) {
      throw classifyProviderError(
        new Error("KONTEXT_API_KEY or REPLICATE_API_TOKEN is not configured"),
        { provider: "kontext", model: "flux-kontext-pro" },
      );
    }
    kontextReplicateClient = new Replicate({ auth: token, useFileOutput: false });
  }
  return kontextReplicateClient;
}

function extractOutputUrl(output: unknown): string | null {
  const url = Array.isArray(output) ? output[0] : output;
  return typeof url === "string" && url.length > 0 ? url : null;
}

/** Provider 내부 retry 없음 — Worker가 재시도 */
export async function generateKontextProViaReplicate(
  input: ProviderGenerateInput,
): Promise<ProviderGenerateOutput> {
  const taskType = input.request.taskType;
  const sourceUrl = input.productImages[0]?.url;

  if (kontextRequiresProductImage(taskType) && !sourceUrl) {
    throw new AIProviderError({
      type: "INVALID_REQUEST",
      retryable: false,
      provider: "kontext",
      model: "flux-kontext-pro",
      message: `Kontext Pro (${taskType}) requires at least one product image (input_image)`,
      billed: false,
    });
  }

  const prompt = buildKontextPrompt(taskType, input.prompt);

  const replicateInput: Record<string, unknown> = {
    prompt,
    aspect_ratio: input.request.aspectRatio ?? "3:4",
    output_format: "png",
  };

  if (sourceUrl) {
    replicateInput.input_image = sourceUrl;
  }

  console.log(
    `[replicate-kontext] run ${REPLICATE_KONTEXT_PRO_REF} task=${taskType} ` +
      `hasImage=${Boolean(sourceUrl)} aspect=${String(replicateInput.aspect_ratio)}`,
  );

  try {
    const replicate = getKontextReplicateClient();
    const output = await replicate.run(REPLICATE_KONTEXT_PRO_REF as `${string}/${string}`, {
      input: replicateInput,
      wait: { mode: "poll", interval: 1000 },
    });

    const url = extractOutputUrl(output);
    if (!url) {
      throw new Error(`Replicate ${REPLICATE_KONTEXT_PRO_REF} returned no image URL`);
    }

    const actualCost = calculateImageCost({
      provider: "kontext",
      model: "flux-kontext-pro",
      outputImageCount: 1,
    });

    return {
      outputUrls: [url],
      actualCost,
      model: "flux-kontext-pro",
      metadata: {
        provider: "kontext",
        model: "flux-kontext-pro",
        actualCostUsd: actualCost,
        backend: "replicate",
        modelRef: REPLICATE_KONTEXT_PRO_REF,
        taskType,
        preservationLock: true,
      },
    };
  } catch (err) {
    if (err instanceof AIProviderError) throw err;
    throw classifyProviderError(err, { provider: "kontext", model: "flux-kontext-pro" });
  }
}

/** 테스트·provider reset */
export function resetKontextReplicateClientForTests(): void {
  kontextReplicateClient = null;
}
