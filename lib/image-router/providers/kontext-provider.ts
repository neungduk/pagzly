import {
  ProviderUnavailableError,
  type ImageProvider,
  type ProviderGenerateInput,
  type ProviderGenerateOutput,
} from "@/lib/image-router/providers/image-provider";
import {
  generateKontextProViaReplicate,
  isKontextReplicateAvailable,
} from "@/lib/image-router/providers/kontext-replicate-client";

const KONTEXT_MODEL = "flux-kontext-pro";

/**
 * FLUX Kontext Pro — 상품 보존 편집 (배경 교체, scene edit 등).
 * Backend: Replicate (KONTEXT_API_KEY 또는 REPLICATE_API_TOKEN).
 * ImageRouter는 이 provider의 내부 구현을 알지 않는다.
 */
export class KontextProvider implements ImageProvider {
  readonly id = "kontext" as const;
  readonly model = KONTEXT_MODEL;
  readonly backend = "replicate" as const;

  isAvailable(): boolean {
    return isKontextReplicateAvailable();
  }

  async generate(input: ProviderGenerateInput): Promise<ProviderGenerateOutput> {
    if (!this.isAvailable()) {
      throw new ProviderUnavailableError(
        "kontext",
        "KONTEXT_API_KEY or REPLICATE_API_TOKEN required for KontextProvider",
      );
    }
    return generateKontextProViaReplicate(input);
  }
}

export function createKontextProvider(): KontextProvider {
  return new KontextProvider();
}
