import type { ImageTaskType } from "@/lib/image-router/types";

const PRESERVATION = [
  "Preserve product shape, packaging, logo, brand name, primary colors, proportions, and key details exactly when a product image is provided",
  "Commercial e-commerce quality, photorealistic, no watermarks unless on original product",
].join(". ");

export function buildGeminiImagePrompt(taskType: ImageTaskType, userPrompt: string): string {
  const taskHints: Partial<Record<ImageTaskType, string>> = {
    HERO_PRODUCT: "Create a premium hero product image. Keep the product identical to the reference.",
    PRODUCT_ONLY: "Studio product shot with clean composition.",
    BACKGROUND_REPLACEMENT: "Replace background only; product unchanged.",
    PRODUCT_EDIT: "Apply edit while preserving product identity.",
    DETAIL_PAGE_GRAPHIC: "Complex detail-page graphic with clear layout and readable composition.",
    COMPARISON: "Comparison layout with consistent product representation.",
  };

  return [
    PRESERVATION,
    taskHints[taskType] ?? "Generate a high-quality product image.",
    userPrompt.trim(),
  ]
    .filter(Boolean)
    .join(". ");
}
