import { randomUUID } from "crypto";
import {
  progressForStatus,
  type GenerationInputImage,
  type GenerationOutputImage,
} from "@/lib/image-router/jobs/generation-api-types";
import type {
  CreateImageJobInput,
  ImageGenerationJobRow,
  ImageJobStore,
  UpdateImageJobInput,
} from "@/lib/image-router/jobs/types";

/** 테스트·로컬 — Supabase 없이 job 추적 */
export class MemoryImageJobStore implements ImageJobStore {
  private readonly jobs = new Map<string, ImageGenerationJobRow>();

  async createJob(input: CreateImageJobInput): Promise<ImageGenerationJobRow> {
    const now = new Date().toISOString();
    const row: ImageGenerationJobRow = {
      id: randomUUID(),
      user_id: input.userId,
      product_id: input.productId ?? null,
      draft_token: input.draftToken ?? input.request.draftToken ?? null,
      task_type: input.request.taskType,
      provider: input.route.providerId,
      model: input.route.model,
      idempotency_key: input.request.idempotencyKey ?? null,
      prompt: input.prompt,
      input_images: input.inputImages,
      output_images: null,
      input_image_count: input.inputImages.length,
      output_image_count: 0,
      estimated_cost: input.estimatedCost,
      actual_cost: null,
      generation_time_ms: null,
      status: "QUEUED",
      progress: 0,
      error_message: null,
      input_metadata: {
        aspectRatio: input.request.aspectRatio,
        resolution: input.request.resolution,
        qualityLevel: input.request.qualityLevel,
      },
      output_urls: null,
      retry_count: 0,
      started_at: null,
      completed_at: null,
      created_at: now,
      updated_at: now,
    };
    this.jobs.set(row.id, row);
    return row;
  }

  async updateJob(jobId: string, patch: UpdateImageJobInput): Promise<ImageGenerationJobRow | null> {
    const existing = this.jobs.get(jobId);
    if (!existing) return null;
    const status = patch.status ?? existing.status;
    const updated: ImageGenerationJobRow = {
      ...existing,
      status,
      progress: patch.progress ?? (patch.status ? progressForStatus(patch.status) : existing.progress),
      output_urls: patch.outputUrls ?? existing.output_urls,
      output_images: patch.outputImages ?? existing.output_images,
      actual_cost: patch.actualCost ?? existing.actual_cost,
      estimated_cost: patch.estimatedCost ?? existing.estimated_cost,
      generation_time_ms: patch.generationTimeMs ?? existing.generation_time_ms,
      error_message: patch.errorMessage !== undefined ? patch.errorMessage : existing.error_message,
      retry_count: patch.retryCount ?? existing.retry_count,
      output_image_count: patch.outputImageCount ?? existing.output_image_count,
      started_at: patch.startedAt !== undefined ? patch.startedAt : existing.started_at,
      completed_at: patch.completedAt !== undefined ? patch.completedAt : existing.completed_at,
      provider: patch.provider ?? existing.provider,
      model: patch.model ?? existing.model,
      updated_at: new Date().toISOString(),
    };
    this.jobs.set(jobId, updated);
    return updated;
  }

  async getJob(jobId: string): Promise<ImageGenerationJobRow | null> {
    return this.jobs.get(jobId) ?? null;
  }

  async findByIdempotency(
    userId: string,
    idempotencyKey: string,
  ): Promise<ImageGenerationJobRow | null> {
    for (const row of this.jobs.values()) {
      if (row.user_id === userId && row.idempotency_key === idempotencyKey) {
        return row;
      }
    }
    return null;
  }

  async listByScope(params: {
    userId: string;
    productId?: string | null;
    draftToken?: string | null;
  }): Promise<ImageGenerationJobRow[]> {
    return [...this.jobs.values()].filter((row) => {
      if (row.user_id !== params.userId) return false;
      if (params.productId && row.product_id === params.productId) return true;
      if (params.draftToken && row.draft_token === params.draftToken) return true;
      return !params.productId && !params.draftToken;
    });
  }

  async claimJob(jobId: string): Promise<ImageGenerationJobRow | null> {
    const existing = this.jobs.get(jobId);
    if (!existing || existing.status !== "QUEUED") return null;
    const now = new Date().toISOString();
    return this.updateJob(jobId, {
      status: "PROCESSING",
      progress: 50,
      startedAt: now,
    });
  }

  async requeueJob(
    jobId: string,
    retryCount: number,
    errorMessage: string,
  ): Promise<ImageGenerationJobRow | null> {
    return this.updateJob(jobId, {
      status: "QUEUED",
      progress: 0,
      retryCount,
      errorMessage,
      startedAt: null,
      completedAt: null,
    });
  }

  clear(): void {
    this.jobs.clear();
  }

  /** cost query / tests */
  listAll(): ImageGenerationJobRow[] {
    return [...this.jobs.values()];
  }
}

let defaultMemoryStore: MemoryImageJobStore | null = null;

export function getMemoryJobStore(): MemoryImageJobStore {
  if (!defaultMemoryStore) {
    defaultMemoryStore = new MemoryImageJobStore();
  }
  return defaultMemoryStore;
}

export function resetMemoryJobStore(): void {
  defaultMemoryStore?.clear();
}
