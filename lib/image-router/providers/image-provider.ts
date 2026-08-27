import type {
  GenerateImageRequest,
  ImageProviderId,
  ProductImageInput,
} from "@/lib/image-router/types";

export type ProviderGenerateInput = {
  request: GenerateImageRequest;
  productImages: ProductImageInput[];
  prompt: string;
  timeoutMs: number;
};

/** Provider가 반환하는 사용량/비용 metadata (optional — backward compatible) */
export type ProviderUsageMetadata = {
  provider?: string;
  model?: string;
  inputMegapixels?: number;
  outputMegapixels?: number;
  resolution?: string;
  /** Provider가 실제 청구액을 주면 actualCostUsd에 사용 */
  actualCostUsd?: number;
  usage?: Record<string, unknown>;
};

export type ProviderGenerateOutput = {
  outputUrls: string[];
  actualCost: number;
  model: string;
  metadata?: ProviderUsageMetadata & Record<string, unknown>;
};

/** Provider backend — Replicate / fal.ai / direct API 교체 지점 */
export type ImageProviderBackend = "replicate" | "direct" | "fal";

export interface ImageProvider {
  readonly id: ImageProviderId;
  readonly model: string;
  readonly backend: ImageProviderBackend;
  isAvailable(): boolean;
  generate(input: ProviderGenerateInput): Promise<ProviderGenerateOutput>;
}

export class ProviderNotImplementedError extends Error {
  readonly providerId: ImageProviderId;

  constructor(providerId: ImageProviderId, message?: string) {
    super(message ?? `${providerId} provider is not connected yet.`);
    this.name = "ProviderNotImplementedError";
    this.providerId = providerId;
  }
}

export class ProviderUnavailableError extends Error {
  readonly providerId: ImageProviderId;

  constructor(providerId: ImageProviderId, message?: string) {
    super(message ?? `${providerId} provider is unavailable (missing API key).`);
    this.name = "ProviderUnavailableError";
    this.providerId = providerId;
  }
}
