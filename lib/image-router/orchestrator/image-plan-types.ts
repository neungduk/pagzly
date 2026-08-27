/**
 * Claude imagePlan — STEP 8 orchestrator types.
 * taskType은 이 enum만 허용 (ImageRouter IMAGE_TASK_TYPES의 계획용 부분집합).
 */

export const IMAGE_PLAN_TASK_TYPES = [
  "HERO_PRODUCT",
  "PRODUCT_ONLY",
  "LIFESTYLE",
  "PRODUCT_USAGE",
  "FEATURE_HIGHLIGHT",
  "PROBLEM_SOLUTION",
  "COMPARISON",
  "BACKGROUND_REPLACEMENT",
  "PRODUCT_EDIT",
  "DETAIL_PAGE_GRAPHIC",
] as const;

export type ImagePlanTaskType = (typeof IMAGE_PLAN_TASK_TYPES)[number];

export const IMAGE_PLAN_QUALITY_LEVELS = ["STANDARD", "PREMIUM"] as const;
export type ImagePlanQualityLevel = (typeof IMAGE_PLAN_QUALITY_LEVELS)[number];

/** Claude가 쓸 수 있는 비율 — Router ImageAspectRatio로 normalize */
export const IMAGE_PLAN_ASPECT_RATIOS = [
  "1:1",
  "4:3",
  "3:4",
  "4:5",
  "16:9",
  "9:16",
  "3:2",
  "2:3",
] as const;

export type ImagePlanAspectRatio = (typeof IMAGE_PLAN_ASPECT_RATIOS)[number];

export type ImagePlanItem = {
  order: number;
  taskType: ImagePlanTaskType;
  purpose: string;
  prompt: string;
  qualityLevel: ImagePlanQualityLevel;
  aspectRatio: ImagePlanAspectRatio;
};

export type ImagePlan = {
  imagePlan: ImagePlanItem[];
};

export type ImagePlanProductInput = {
  productName: string;
  category: string;
  description?: string | null;
  brandName?: string | null;
  keyFeatures?: string | null;
  ingredients?: string | null;
  targetCustomer?: string | null;
  price?: number | null;
  /** local path, http(s) URL, or data URL */
  productImageUrls: string[];
};

export const IMAGE_PLAN_MIN_ITEMS = 5;
export const IMAGE_PLAN_MAX_ITEMS = 10;
export const IMAGE_PLAN_DEFAULT_TARGET = "6~8";
