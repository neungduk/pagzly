export type {
  GenerateImageRequest,
  GenerateImageResult,
  ImageAspectRatio,
  ImageGenerationStatus,
  ImageProviderId,
  ImageQualityLevel,
  ImageResolution,
  ImageRouterContext,
  ImageTaskType,
  ProductImageInput,
  RouteDecision,
} from "@/lib/image-router/types";
export { IMAGE_TASK_TYPES } from "@/lib/image-router/types";

export {
  calculateImageCost,
  resolutionToMegapixels,
} from "@/lib/image-router/pricing/calculate-image-cost";
export {
  DEFAULT_PAGE_GENERATION_BUDGET,
  DEFAULT_PROVIDER_TIMEOUT_MS,
  DEFAULT_ROUTER_RETRY_LIMIT,
  IMAGE_PRICING_CONFIG,
  getModelConfig,
} from "@/lib/image-router/pricing/config";

export type {
  ImageProvider,
  ImageProviderBackend,
  ProviderGenerateInput,
  ProviderGenerateOutput,
} from "@/lib/image-router/providers/image-provider";
export {
  ProviderNotImplementedError,
  ProviderUnavailableError,
} from "@/lib/image-router/providers/image-provider";

export { FluxProvider, createFluxProvider } from "@/lib/image-router/providers/flux-provider";
export { KontextProvider, createKontextProvider } from "@/lib/image-router/providers/kontext-provider";
export {
  buildKontextPrompt,
  kontextRequiresProductImage,
  KONTEXT_PRODUCT_PRESERVATION_LOCK,
} from "@/lib/image-router/providers/kontext-prompts";
export {
  generateKontextProViaReplicate,
  isKontextReplicateAvailable,
  resolveKontextApiToken,
  REPLICATE_KONTEXT_PRO_REF,
} from "@/lib/image-router/providers/kontext-replicate-client";
export { evaluateKontextProductPreservation } from "@/lib/image-router/quality/kontext-quality-eval";
export type {
  KontextQualityCheck,
  KontextQualityReport,
} from "@/lib/image-router/quality/kontext-quality-eval";
export { GeminiProvider, createGeminiProvider } from "@/lib/image-router/providers/gemini-provider";
export {
  generateGemini3ProImage,
  isGeminiGoogleAvailable,
  GEMINI_IMAGE_MODEL,
} from "@/lib/image-router/providers/gemini-google-client";
export { buildGeminiImagePrompt } from "@/lib/image-router/providers/gemini-prompts";
export {
  GEMINI_QUALITY_THRESHOLD,
  shouldRouteToGemini,
} from "@/lib/image-router/routing/premium-routing";
export type { RouteTaskOptions } from "@/lib/image-router/routing/premium-routing";
export {
  createDefaultProviderRegistry,
  getProvider,
  type ProviderRegistry,
} from "@/lib/image-router/providers/registry";

export {
  buildBudgetScopeKey,
  consumeBudget,
  getBudgetUsage,
  resetAllBudgets,
  resetBudget,
  resolveBudgetLimit,
} from "@/lib/image-router/budget";

export {
  buildIdempotencyCacheKey,
  clearIdempotencyCache,
  getIdempotentResult,
  setIdempotentResult,
} from "@/lib/image-router/idempotency";

export {
  ImageRouter,
  generateImage,
  getImageRouter,
  routeTask,
} from "@/lib/image-router/router";

export {
  planImagesWithClaude,
  executeImagePlan,
  validateImagePlan,
  IMAGE_PLAN_TASK_TYPES,
  IMAGE_PLAN_JSON_SCHEMA,
  ImagePlanValidationError,
} from "@/lib/image-router/orchestrator";
export type {
  ImagePlan,
  ImagePlanItem,
  ImagePlanProductInput,
  ClaudeImagePlanResult,
  ExecuteImagePlanResult,
} from "@/lib/image-router/orchestrator";

export { isImageRouterEnabled, tryGenerateImageViaRouter } from "@/lib/image-router/pipeline-bridge";
export type { RouterGenerateContext } from "@/lib/image-router/pipeline-bridge";

export {
  getImageJobService,
  ImageJobService,
  resetImageJobServiceForTests,
} from "@/lib/image-router/jobs/job-service";
export type {
  CreateImageJobInput,
  ImageGenerationJobRow,
} from "@/lib/image-router/jobs/job-service";

export {
  createAsyncGenerationJob,
  dispatchGenerationJob,
  getGenerationStatus,
  pollGenerationUntilDone,
  runGenerationJobSync,
} from "@/lib/image-router/jobs/async-generation-service";
export {
  assertImageJobStoreConfig,
  GENERATION_STORAGE_BUCKET,
  generationOutputStoragePath,
  getImageJobStoreMode,
  ImageJobStoreConfigError,
} from "@/lib/image-router/jobs/job-store-config";
export {
  MAX_JOB_RETRIES,
  createMockAlwaysRateLimitProvider,
  createMockFailThenSucceedProvider,
  createMockProviderRegistry,
  processGenerationJob,
  resetWorkerInFlightForTests,
} from "@/lib/image-router/jobs/generation-worker";

export {
  AIProviderError,
  WORKER_RETRY_BACKOFF_MS,
  classifyProviderError,
  workerBackoffMs,
} from "@/lib/image-router/errors";
export type { AIProviderErrorType } from "@/lib/image-router/errors";
export type {
  CreateGenerationRequest,
  CreateGenerationResponse,
  GenerationJobStatus,
  GenerationOutputImage,
  GenerationStatusResponse,
} from "@/lib/image-router/jobs/generation-api-types";
export { jobRowToStatusResponse } from "@/lib/image-router/jobs/types";
export { jobRowToGenerateResult } from "@/lib/image-router/jobs/types";

export {
  logPageGenerationCostSummary,
  summarizeGenerationCosts,
} from "@/lib/image-router/cost/page-cost-tracker";
export type { PageGenerationCostSummary } from "@/lib/image-router/cost/page-cost-tracker";

export { resolveImageDimensions } from "@/lib/image-router/utils/dimensions";
