/** 상세페이지 이미지 생성 작업 분류 */
export const IMAGE_TASK_TYPES = [
  "HERO_PRODUCT",
  "PRODUCT_ONLY",
  "LIFESTYLE",
  "PRODUCT_USAGE",
  "FEATURE_HIGHLIGHT",
  "PROBLEM_SOLUTION",
  "COMPARISON",
  "BACKGROUND_REPLACEMENT",
  "PRODUCT_EDIT",
  "PRODUCT_PLACEMENT",
  "PRODUCT_SCENE_CHANGE",
  "PRODUCT_LIFESTYLE_EDIT",
  "DETAIL_PAGE_GRAPHIC",
] as const;

export type ImageTaskType = (typeof IMAGE_TASK_TYPES)[number];

export type ImageQualityLevel = "standard" | "premium";

export type ImageAspectRatio =
  | "1:1"
  | "4:3"
  | "3:4"
  | "16:9"
  | "9:16"
  | "3:2"
  | "2:3";

export type ImageResolution = "512" | "768" | "1024" | "1200" | "1536";

export type ImageProviderId = "flux" | "kontext" | "gemini";

export type ImageGenerationStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "budget_exceeded";

export type ProductImageInput = {
  url: string;
  path?: string;
};

export type GenerateImageRequest = {
  taskType: ImageTaskType;
  productImages: ProductImageInput[];
  prompt: string;
  aspectRatio?: ImageAspectRatio;
  resolution?: ImageResolution;
  qualityLevel?: ImageQualityLevel;
  /** 0~1 — 이전 attempt 품질. 낮으면 Gemini premium 경로 */
  priorQualityScore?: number;
  /** retry·budget·로그 상관용 — STEP 3에서 DB와 연결 */
  userId?: string;
  pageId?: string | null;
  draftToken?: string | null;
  idempotencyKey?: string | null;
};

export type GenerateImageResult = {
  generationId: string;
  status: ImageGenerationStatus;
  taskType: ImageTaskType;
  provider: ImageProviderId;
  model: string;
  outputUrls: string[];
  estimatedCost: number;
  actualCost: number;
  generationTimeMs: number;
  retryCount: number;
  errorMessage?: string;
  /** Worker retry 판단용 — ImageRouter는 재시도하지 않음 */
  errorType?: import("@/lib/image-router/errors").AIProviderErrorType;
  retryable?: boolean;
  /** 실패한 attempt가 과금됐을 가능성 */
  billed?: boolean;
};

export type ImageRouterContext = {
  userId?: string;
  pageId?: string | null;
  draftToken?: string | null;
  /** 기본 10 — retry 포함 총 provider 호출 횟수 */
  budgetLimit?: number;
};

export type RouteDecision = {
  providerId: ImageProviderId;
  model: string;
  reason: string;
};
