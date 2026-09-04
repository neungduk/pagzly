import { getModelConfig } from "@/lib/image-router/pricing/config";
import type { ImageQualityLevel, ImageTaskType, RouteDecision } from "@/lib/image-router/types";

/** 이하이면 Gemini premium / quality escalation */
export const GEMINI_QUALITY_THRESHOLD = 0.65;

const KONTEXT_TASKS = new Set<ImageTaskType>([
  "BACKGROUND_REPLACEMENT",
  "PRODUCT_EDIT",
  "PRODUCT_PLACEMENT",
  "PRODUCT_SCENE_CHANGE",
  "PRODUCT_LIFESTYLE_EDIT",
  "PRODUCT_LIFESTYLE_EMPTY_SCENE",
]);

const FLUX_TASKS = new Set<ImageTaskType>([
  "HERO_PRODUCT",
  "PRODUCT_ONLY",
  "LIFESTYLE",
  "PRODUCT_USAGE",
  "FEATURE_HIGHLIGHT",
  "PROBLEM_SOLUTION",
  "COMPARISON",
  "DETAIL_PAGE_GRAPHIC",
]);

/**
 * 복잡한 구성 — Gemini premium 후보.
 * DETAIL_PAGE_GRAPHIC은 제외(32차): section-backdrop 등이 무조건 Gemini로
 * 새지 않도록. Gemini는 premium / priorQualityScore 저하 시에만.
 */
const COMPLEX_COMPOSITION_TASKS = new Set<ImageTaskType>([
  "COMPARISON",
  "FEATURE_HIGHLIGHT",
]);

export type RouteTaskOptions = {
  qualityLevel?: ImageQualityLevel;
  productImageCount?: number;
  /** 0~1 — 이전 attempt 품질. 낮으면 Gemini */
  priorQualityScore?: number;
};

export function shouldRouteToGemini(
  taskType: ImageTaskType,
  options: RouteTaskOptions = {},
): boolean {
  const qualityLevel = options.qualityLevel ?? "standard";
  const productImageCount = options.productImageCount ?? 0;

  if (qualityLevel === "premium") return true;

  if (
    options.priorQualityScore != null &&
    options.priorQualityScore < GEMINI_QUALITY_THRESHOLD
  ) {
    return true;
  }

  // DETAIL_PAGE_GRAPHIC: 품질 신호(premium / low prior score)만으로 Gemini.
  // 무조건 complex 라우팅하지 않음 → 기본 Flux (section-backdrop 비용 보호).
  if (taskType === "DETAIL_PAGE_GRAPHIC") return false;

  if (productImageCount >= 2) return true;

  if (taskType === "HERO_PRODUCT" && productImageCount >= 1) return true;

  if (COMPLEX_COMPOSITION_TASKS.has(taskType)) return true;

  return false;
}

/**
 * taskType + quality signals → provider/model.
 * premium / complex / multi-ref / low quality / hero preservation → Gemini.
 * edit tasks → Kontext. default → Flux.
 */
export function routeTask(
  taskType: ImageTaskType,
  qualityLevelOrOptions: ImageQualityLevel | RouteTaskOptions = "standard",
): RouteDecision {
  const options: RouteTaskOptions =
    typeof qualityLevelOrOptions === "string"
      ? { qualityLevel: qualityLevelOrOptions }
      : qualityLevelOrOptions;

  if (shouldRouteToGemini(taskType, options)) {
    const model = getModelConfig("gemini", "gemini-3-pro-image").model;
    let reason = "qualityLevel=premium";
    if (options.qualityLevel !== "premium") {
      if (options.priorQualityScore != null && options.priorQualityScore < GEMINI_QUALITY_THRESHOLD) {
        reason = `priorQualityScore=${options.priorQualityScore.toFixed(2)} below threshold`;
      } else if ((options.productImageCount ?? 0) >= 2) {
        reason = "multiple product reference images";
      } else if (taskType === "HERO_PRODUCT" && (options.productImageCount ?? 0) >= 1) {
        reason = "hero product preservation";
      } else if (COMPLEX_COMPOSITION_TASKS.has(taskType)) {
        reason = `complex composition taskType=${taskType}`;
      }
    }
    return { providerId: "gemini", model, reason };
  }

  if (KONTEXT_TASKS.has(taskType)) {
    const model = getModelConfig("kontext", "flux-kontext-pro").model;
    return {
      providerId: "kontext",
      model,
      reason: `taskType=${taskType} requires product-preserving edit`,
    };
  }

  if (FLUX_TASKS.has(taskType)) {
    const model = getModelConfig("flux", "flux-2-pro").model;
    return {
      providerId: "flux",
      model,
      reason: `taskType=${taskType} default generation`,
    };
  }

  const model = getModelConfig("flux", "flux-2-pro").model;
  return {
    providerId: "flux",
    model,
    reason: "fallback to flux",
  };
}

export function resolveFailureFallbackProvider(
  primary: import("@/lib/image-router/types").ImageProviderId,
): import("@/lib/image-router/types").ImageProviderId | null {
  if (primary === "flux" || primary === "kontext") return "gemini";
  if (primary === "gemini") return "flux";
  return null;
}

/** provider 미연결 시 availability fallback (Gemini 없으면 Flux) */
export function resolveUnavailableFallback(
  primary: import("@/lib/image-router/types").ImageProviderId,
): import("@/lib/image-router/types").ImageProviderId | null {
  if (primary === "gemini") return "flux";
  if (primary === "kontext") return "flux";
  return null;
}
