/**
 * AI 비용 추적 — 중앙 타입.
 * Image / Text(Claude·DeepSeek) / Video(미구현) 공통 골격.
 */

export type CostCurrency = "USD";

export type CostCategory = "image" | "text" | "video";

export type ImageCostEstimateInput = {
  provider: string;
  model: string;
  inputMegapixels?: number;
  outputMegapixels?: number;
  resolution?: string | number;
  outputImageCount?: number;
};

export type ImageCostEstimate = {
  estimatedCostUsd: number;
  currency: CostCurrency;
  /** pricing key used, for logs */
  pricingKey?: string;
};

export type ImageCostRecordInput = {
  generationId: string;
  pageId?: string | null;
  userId: string;
  draftToken?: string | null;
  provider: string;
  model: string;
  inputImageCount: number;
  inputMegapixels: number;
  outputMegapixels: number;
  resolution: string;
  generationCount: number;
  retryCount: number;
  estimatedCostUsd: number;
  actualCostUsd: number;
  currency?: CostCurrency;
  attemptNumber?: number;
};

export type PageGenerationCostResult = {
  pageId: string;
  imageCostUsd: number;
  textCostUsd: number;
  totalAiCostUsd: number;
  imageCount: number;
  retryCount: number;
  generationJobCount: number;
};

export type UserGenerationCostResult = {
  userId: string;
  startDate: string;
  endDate: string;
  totalPages: number;
  totalImages: number;
  totalRetries: number;
  totalAiCostUsd: number;
  imageCostUsd: number;
  textCostUsd: number;
};

export type DailyGenerationCostResult = {
  date: string;
  pages: number;
  images: number;
  retries: number;
  imageCostUsd: number;
  textCostUsd: number;
  totalAiCostUsd: number;
};

export type GenerationAttemptRecord = {
  id: string;
  generationId: string;
  attemptNumber: number;
  provider: string;
  model: string;
  status: "SUCCEEDED" | "FAILED" | "BUDGET_SKIPPED";
  estimatedCostUsd: number;
  actualCostUsd: number;
  inputMegapixels: number | null;
  outputMegapixels: number | null;
  resolution: string | null;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
};
