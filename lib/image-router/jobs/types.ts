import type {
  GenerationInputImage,
  GenerationJobStatus,
  GenerationOutputImage,
} from "@/lib/image-router/jobs/generation-api-types";
import { progressForStatus } from "@/lib/image-router/jobs/generation-api-types";
import type { GenerateImageRequest } from "@/lib/image-router/types";

export type ImageGenerationJobRow = {
  id: string;
  user_id: string;
  /** pageId */
  product_id: string | null;
  draft_token: string | null;
  task_type: string;
  provider: string;
  model: string;
  idempotency_key: string | null;
  prompt: string | null;
  input_images: GenerationInputImage[] | null;
  output_images: GenerationOutputImage[] | null;
  input_image_count: number;
  output_image_count: number;
  estimated_cost: number;
  actual_cost: number | null;
  generation_time_ms: number | null;
  status: GenerationJobStatus;
  progress: number;
  error_message: string | null;
  input_metadata: Record<string, unknown> | null;
  output_urls: string[] | null;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateImageJobInput = {
  userId: string;
  productId?: string | null;
  draftToken?: string | null;
  request: GenerateImageRequest;
  route: { providerId: string; model: string };
  estimatedCost: number;
  prompt: string;
  inputImages: GenerationInputImage[];
};

export type UpdateImageJobInput = {
  status?: GenerationJobStatus;
  progress?: number;
  outputUrls?: string[];
  outputImages?: GenerationOutputImage[];
  actualCost?: number;
  estimatedCost?: number;
  generationTimeMs?: number;
  errorMessage?: string | null;
  retryCount?: number;
  outputImageCount?: number;
  startedAt?: string | null;
  completedAt?: string | null;
  provider?: string;
  model?: string;
};

export interface ImageJobStore {
  createJob(input: CreateImageJobInput): Promise<ImageGenerationJobRow>;
  updateJob(jobId: string, patch: UpdateImageJobInput): Promise<ImageGenerationJobRow | null>;
  getJob(jobId: string): Promise<ImageGenerationJobRow | null>;
  findByIdempotency(userId: string, idempotencyKey: string): Promise<ImageGenerationJobRow | null>;
  listByScope(params: {
    userId: string;
    productId?: string | null;
    draftToken?: string | null;
  }): Promise<ImageGenerationJobRow[]>;
  /** QUEUED → PROCESSING 원자적 claim. 이미 처리 중이면 null */
  claimJob(jobId: string): Promise<ImageGenerationJobRow | null>;
  requeueJob(jobId: string, retryCount: number, errorMessage: string): Promise<ImageGenerationJobRow | null>;
}

export function jobRowToStatusResponse(row: ImageGenerationJobRow) {
  return {
    id: row.id,
    status: row.status,
    progress: row.progress ?? progressForStatus(row.status),
    outputs: row.output_images ?? [],
    error: row.error_message,
    retryCount: row.retry_count,
    estimatedCost: Number(row.estimated_cost),
    actualCost: row.actual_cost != null ? Number(row.actual_cost) : undefined,
    generationTimeMs: row.generation_time_ms,
  };
}

/** @deprecated sync router 호환 — async API는 jobRowToStatusResponse 사용 */
export function jobRowToGenerateResult(row: ImageGenerationJobRow) {
  const statusMap: Record<string, string> = {
    COMPLETED: "succeeded",
    FAILED: "failed",
    QUEUED: "queued",
    PROCESSING: "running",
    BUDGET_EXCEEDED: "budget_exceeded",
    CANCELLED: "failed",
  };
  return {
    generationId: row.id,
    status: (statusMap[row.status] ?? "failed") as "succeeded" | "failed" | "queued" | "running" | "budget_exceeded",
    taskType: row.task_type,
    provider: row.provider,
    model: row.model,
    outputUrls: row.output_urls ?? row.output_images?.map((o) => o.url) ?? [],
    estimatedCost: Number(row.estimated_cost),
    actualCost: Number(row.actual_cost ?? 0),
    generationTimeMs: row.generation_time_ms ?? 0,
    retryCount: row.retry_count,
    errorMessage: row.error_message ?? undefined,
  };
}
