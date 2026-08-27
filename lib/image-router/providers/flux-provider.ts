import {
  ProviderUnavailableError,
  type ImageProvider,
  type ProviderGenerateInput,
  type ProviderGenerateOutput,
} from "@/lib/image-router/providers/image-provider";
import {
  generateFlux2ProViaBfl,
  isBflFluxAvailable,
} from "@/lib/image-router/providers/bfl-flux-client";
import {
  generateFlux2ProViaReplicate,
  isReplicateFluxAvailable,
} from "@/lib/image-router/providers/flux-replicate-client";

const FLUX_2_PRO_MODEL = "flux-2-pro";

/**
 * FLUX.2 Pro provider.
 * 1) BFL direct API (FLUX_API_KEY / BFL_API_KEY)
 * 2) Replicate fallback (REPLICATE_API_TOKEN)
 */
export class FluxProvider implements ImageProvider {
  readonly id = "flux" as const;
  readonly model = FLUX_2_PRO_MODEL;
  readonly backend = "direct" as const;

  isAvailable(): boolean {
    return isBflFluxAvailable() || isReplicateFluxAvailable();
  }

  async generate(input: ProviderGenerateInput): Promise<ProviderGenerateOutput> {
    if (isBflFluxAvailable()) {
      try {
        return await generateFlux2ProViaBfl(input);
      } catch (err) {
        console.warn("[flux-provider] BFL direct failed, trying Replicate fallback:", err);
        if (isReplicateFluxAvailable()) {
          return generateFlux2ProViaReplicate(input);
        }
        throw err;
      }
    }

    if (isReplicateFluxAvailable()) {
      return generateFlux2ProViaReplicate(input);
    }

    throw new ProviderUnavailableError(
      "flux",
      "FLUX_API_KEY or REPLICATE_API_TOKEN required for FluxProvider",
    );
  }
}

export function createFluxProvider(): FluxProvider {
  return new FluxProvider();
}
