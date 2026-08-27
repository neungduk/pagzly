/**
 * ImageRouter 하위 호환 — 단가 소스는 lib/cost/pricing-config.
 */
import type { ImageProviderId } from "@/lib/image-router/types";
import {
  DEFAULT_MAX_GENERATION_COST_USD,
  PRICING_CONFIG,
  resolveImagePricing,
  type ImageModelPricing,
} from "@/lib/cost/pricing-config";

export type ImageModelConfig = ImageModelPricing;

export const IMAGE_PRICING_CONFIG = PRICING_CONFIG;

/** 페이지당 generation API call 횟수 상한 (라우터 budget) */
export const DEFAULT_PAGE_GENERATION_BUDGET = 10;

/** @deprecated ImageRouter는 더 이상 내부 retry하지 않음. Worker MAX_JOB_RETRIES 사용. */
export const DEFAULT_ROUTER_RETRY_LIMIT = 2;

export const DEFAULT_PROVIDER_TIMEOUT_MS = 120_000;

export { DEFAULT_MAX_GENERATION_COST_USD };

export function getModelConfig(providerId: ImageProviderId, model: string): ImageModelConfig {
  const resolved = resolveImagePricing(providerId, model);
  if (resolved) return resolved.pricing;
  return { providerId, model, flatPerImageUsd: 0.05 };
}
