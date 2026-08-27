/**
 * ImageRouter 하위 호환 래퍼 — 실제 단가는 lib/cost/pricing-config.
 */
export {
  calculateImageCostUsd as calculateImageCost,
  resolutionToMegapixels,
} from "@/lib/cost/calculators";
export type { ImageCostEstimateInput as CalculateImageCostInput } from "@/lib/cost/types";
