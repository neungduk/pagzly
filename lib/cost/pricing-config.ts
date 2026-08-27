/**
 * AI 모델 단가 단일 소스.
 * 가격 변경 시 이 파일만 수정한다. API/worker에 숫자를 하드코딩하지 않는다.
 */

import type { ImageProviderId } from "@/lib/image-router/types";

export type ImageModelPricing = {
  providerId: ImageProviderId;
  model: string;
  /** flat per successful image (USD) — T2I 기본 */
  flatPerImageUsd?: number;
  inputPerMegapixelUsd?: number;
  outputPerMegapixelUsd?: number;
};

/**
 * Keys: `${providerId}.${model}` and short aliases (e.g. `flux-2-pro`).
 * Prefer provider.model for lookups.
 */
export const PRICING_CONFIG: Record<string, ImageModelPricing> = {
  "flux.flux-2-pro": {
    providerId: "flux",
    model: "flux-2-pro",
    /** BFL FLUX.2 [pro]: ~$0.03 / 1MP T2I; +MP billed separately when known */
    flatPerImageUsd: 0.03,
    inputPerMegapixelUsd: 0.015,
    outputPerMegapixelUsd: 0.015,
  },
  "flux-2-pro": {
    providerId: "flux",
    model: "flux-2-pro",
    flatPerImageUsd: 0.03,
    inputPerMegapixelUsd: 0.015,
    outputPerMegapixelUsd: 0.015,
  },
  "fal-ai/flux-2-pro": {
    providerId: "flux",
    model: "flux-2-pro",
    flatPerImageUsd: 0.03,
    inputPerMegapixelUsd: 0.015,
    outputPerMegapixelUsd: 0.015,
  },
  "flux.flux-schnell": {
    providerId: "flux",
    model: "flux-schnell",
    flatPerImageUsd: 0.003,
  },
  "kontext.flux-kontext-pro": {
    providerId: "kontext",
    model: "flux-kontext-pro",
    flatPerImageUsd: 0.04,
  },
  "gemini.gemini-3-pro-image": {
    providerId: "gemini",
    model: "gemini-3-pro-image",
    flatPerImageUsd: 0.08,
    inputPerMegapixelUsd: 0.02,
    outputPerMegapixelUsd: 0.04,
  },
};

/** 페이지당 이미지 생성 비용 상한 (USD). env MAX_GENERATION_COST_USD 로 덮어쓸 수 있음 */
export const DEFAULT_MAX_GENERATION_COST_USD = 0.5;

export function resolveMaxGenerationCostUsd(explicit?: number): number {
  if (explicit != null && explicit > 0) return explicit;
  const env = Number(process.env.MAX_GENERATION_COST_USD);
  if (Number.isFinite(env) && env > 0) return env;
  return DEFAULT_MAX_GENERATION_COST_USD;
}

export function resolveImagePricing(
  provider: string,
  model: string,
): { pricing: ImageModelPricing; pricingKey: string } | null {
  const candidates = [
    `${provider}.${model}`,
    model,
    `fal-ai/${model}`,
    provider,
  ];
  for (const key of candidates) {
    const found = PRICING_CONFIG[key];
    if (found) return { pricing: found, pricingKey: key };
  }
  return null;
}

/** @deprecated — use PRICING_CONFIG via resolveImagePricing; kept for ImageRouter compat */
export const IMAGE_PRICING_CONFIG = PRICING_CONFIG;
