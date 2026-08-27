import {
  resolveImagePricing,
  type ImageModelPricing,
} from "@/lib/cost/pricing-config";
import type {
  CostCurrency,
  ImageCostEstimate,
  ImageCostEstimateInput,
} from "@/lib/cost/types";

function megapixelsFromSidePx(sidePx: number): number {
  return (sidePx * sidePx) / 1_000_000;
}

export function resolutionToMegapixels(resolution: string | number | undefined): number {
  if (resolution == null) return 1;
  const side =
    typeof resolution === "number" ? resolution : Number.parseInt(String(resolution), 10);
  if (!Number.isFinite(side) || side <= 0) return 1;
  return megapixelsFromSidePx(side);
}

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function computeFromPricing(
  pricing: ImageModelPricing,
  input: ImageCostEstimateInput,
): number {
  const outputCount = Math.max(1, input.outputImageCount ?? 1);
  let cost = 0;

  if (pricing.flatPerImageUsd != null) {
    cost += pricing.flatPerImageUsd * outputCount;
  }

  const inputMp = input.inputMegapixels;
  const outputMp =
    input.outputMegapixels ??
    (input.resolution != null ? resolutionToMegapixels(input.resolution) : undefined);

  if (pricing.inputPerMegapixelUsd != null && inputMp != null && inputMp > 0) {
    // I2I: input image billed; for T2I with product refs count inputMp
    cost += pricing.inputPerMegapixelUsd * inputMp;
  }

  if (pricing.outputPerMegapixelUsd != null && outputMp != null) {
    cost += pricing.outputPerMegapixelUsd * outputMp * outputCount;
  }

  // flat-only models (schnell): already covered
  if (
    pricing.flatPerImageUsd == null &&
    pricing.outputPerMegapixelUsd == null &&
    pricing.inputPerMegapixelUsd == null
  ) {
    cost = 0.05 * outputCount;
  }

  return roundUsd(cost);
}

/**
 * 중앙 이미지 비용 추정.
 * 반환: { estimatedCostUsd, currency: "USD" }
 */
export function calculateImageCost(input: ImageCostEstimateInput): ImageCostEstimate {
  const resolved = resolveImagePricing(input.provider, input.model);
  if (!resolved) {
    const fallback = roundUsd(0.05 * Math.max(1, input.outputImageCount ?? 1));
    return { estimatedCostUsd: fallback, currency: "USD" as CostCurrency };
  }

  return {
    estimatedCostUsd: computeFromPricing(resolved.pricing, input),
    currency: "USD",
    pricingKey: resolved.pricingKey,
  };
}

/** ImageRouter 하위 호환 — number만 필요할 때 */
export function calculateImageCostUsd(input: ImageCostEstimateInput): number {
  return calculateImageCost(input).estimatedCostUsd;
}

export interface CostCalculator {
  readonly category: "image" | "text" | "video";
}

export class ImageCostCalculator implements CostCalculator {
  readonly category = "image" as const;

  estimate(input: ImageCostEstimateInput): ImageCostEstimate {
    return calculateImageCost(input);
  }
}

/** Claude / DeepSeek 연결용 stub — STEP 후속 */
export class TextCostCalculator implements CostCalculator {
  readonly category = "text" as const;

  estimate(_input: {
    provider: string;
    model: string;
    inputTokens?: number;
    outputTokens?: number;
  }): ImageCostEstimate {
    return { estimatedCostUsd: 0, currency: "USD" };
  }
}

/** 미구현 */
export class VideoCostCalculator implements CostCalculator {
  readonly category = "video" as const;

  estimate(): ImageCostEstimate {
    return { estimatedCostUsd: 0, currency: "USD" };
  }
}

export const imageCostCalculator = new ImageCostCalculator();
export const textCostCalculator = new TextCostCalculator();
