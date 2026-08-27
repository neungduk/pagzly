import type { ImageProvider } from "@/lib/image-router/providers/image-provider";
import type { ImageProviderId } from "@/lib/image-router/types";
import { createFluxProvider } from "@/lib/image-router/providers/flux-provider";
import { createKontextProvider } from "@/lib/image-router/providers/kontext-provider";
import { createGeminiProvider } from "@/lib/image-router/providers/gemini-provider";

export type ProviderRegistry = Record<ImageProviderId, ImageProvider>;

export function createDefaultProviderRegistry(): ProviderRegistry {
  return {
    flux: createFluxProvider(),
    kontext: createKontextProvider(),
    gemini: createGeminiProvider(),
  };
}

export function getProvider(
  registry: ProviderRegistry,
  providerId: ImageProviderId,
): ImageProvider {
  return registry[providerId];
}
