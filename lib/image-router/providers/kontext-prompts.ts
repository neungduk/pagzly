import type { ImageTaskType } from "@/lib/image-router/types";

/** Kontext Pro — 원본 상품 보존 지시 (edit task 공통, 빈손 씬 제외) */
export const KONTEXT_PRODUCT_PRESERVATION_LOCK = [
  "Preserve the product exactly as in the input image",
  "Keep product shape, packaging structure, logo, brand name, primary colors, proportions, and key details unchanged",
  "Do not alter, remove, or replace the product itself",
  "Do not add text, watermarks, or extra objects on the product",
].join(". ");

/** 111·115차 — 빈손 인물 씬 (안 1). 제품은 이후 픽셀 합성 */
export const KONTEXT_EMPTY_HAND_SCENE_LOCK = [
  "Generate a photorealistic lifestyle photograph of a person",
  "Show a natural holding gesture: fingers curled as if holding a small bottle",
  "EMPTY HAND only — the hand must be completely empty",
  "Absolutely no bottle, no cylindrical object of any kind, no dropper cap, no jar, no package, no object, no brand, no label in the hand or frame",
  "Do not invent or draw any cosmetic bottle, product silhouette, or placeholder object",
].join(". ");

const TASK_EDIT_INSTRUCTIONS: Partial<Record<ImageTaskType, string>> = {
  BACKGROUND_REPLACEMENT:
    "Replace only the background behind the product. Keep the product pixel-accurate. New background should be professional e-commerce quality.",
  PRODUCT_EDIT:
    "Apply the requested edit while keeping the product identity fully intact. Edit only what the prompt specifies.",
  PRODUCT_PLACEMENT:
    "Place the same product naturally in the described scene. Do not redesign or re-render the product.",
  PRODUCT_SCENE_CHANGE:
    "Change the surrounding scene/environment only. The product must remain identical to the input.",
  PRODUCT_LIFESTYLE_EDIT:
    "Create a lifestyle context around the unchanged product. Preserve all product packaging and branding details.",
  PRODUCT_LIFESTYLE_EMPTY_SCENE:
    "Lifestyle scene with empty holding gesture only. Product will be composited later — leave the grasp area empty.",
};

export function buildKontextPrompt(taskType: ImageTaskType, userPrompt: string): string {
  const taskInstruction =
    TASK_EDIT_INSTRUCTIONS[taskType] ??
    "Edit the image per the prompt while preserving the product exactly.";

  if (taskType === "PRODUCT_LIFESTYLE_EMPTY_SCENE") {
    return [
      KONTEXT_EMPTY_HAND_SCENE_LOCK,
      taskInstruction,
      userPrompt.trim(),
      "photorealistic, high quality, natural lifestyle photography, Korean daily-life aesthetic",
    ]
      .filter(Boolean)
      .join(". ");
  }

  return [
    KONTEXT_PRODUCT_PRESERVATION_LOCK,
    taskInstruction,
    userPrompt.trim(),
    "photorealistic, high quality, commercial product photography",
  ]
    .filter(Boolean)
    .join(". ");
}

export function kontextRequiresProductImage(taskType: ImageTaskType): boolean {
  return (
    taskType === "BACKGROUND_REPLACEMENT" ||
    taskType === "PRODUCT_EDIT" ||
    taskType === "PRODUCT_PLACEMENT" ||
    taskType === "PRODUCT_SCENE_CHANGE" ||
    taskType === "PRODUCT_LIFESTYLE_EDIT"
    // PRODUCT_LIFESTYLE_EMPTY_SCENE: 입력 제품 없음 (제품 재생성 방지)
  );
}
