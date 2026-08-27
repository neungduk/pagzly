import {
  getMemoryJobStore,
} from "@/lib/image-router/jobs/memory-job-store";
import {
  createUserJobStore,
} from "@/lib/image-router/jobs/supabase-job-store";
import {
  jobRowToGenerateResult,
  type CreateImageJobInput,
  type ImageGenerationJobRow,
  type ImageJobStore,
  type UpdateImageJobInput,
} from "@/lib/image-router/jobs/types";
import type { GenerateImageResult } from "@/lib/image-router/types";

export type ImageJobServiceOptions = {
  store?: ImageJobStore;
  useMemory?: boolean;
};

export class ImageJobService {
  private readonly store: ImageJobStore;

  constructor(options?: ImageJobServiceOptions) {
    if (options?.store) {
      this.store = options.store;
    } else if (options?.useMemory || process.env.IMAGE_JOB_STORE === "memory") {
      this.store = getMemoryJobStore();
    } else {
      this.store = createUserJobStore();
    }
  }

  async createQueuedJob(input: CreateImageJobInput): Promise<ImageGenerationJobRow> {
    return this.store.createJob(input);
  }

  async markRunning(jobId: string): Promise<void> {
    await this.store.updateJob(jobId, { status: "PROCESSING", progress: 50 });
  }

  async completeJob(
    jobId: string,
    result: GenerateImageResult,
  ): Promise<ImageGenerationJobRow | null> {
    const statusMap = {
      succeeded: "COMPLETED" as const,
      failed: "FAILED" as const,
      queued: "QUEUED" as const,
      running: "PROCESSING" as const,
      budget_exceeded: "BUDGET_EXCEEDED" as const,
    };
    return this.store.updateJob(jobId, {
      status: statusMap[result.status] ?? "FAILED",
      outputUrls: result.outputUrls,
      actualCost: result.actualCost,
      generationTimeMs: result.generationTimeMs,
      errorMessage: result.errorMessage ?? null,
      retryCount: result.retryCount,
      outputImageCount: result.outputUrls.length,
      completedAt: new Date().toISOString(),
    });
  }

  async getJobStatus(jobId: string): Promise<ImageGenerationJobRow | null> {
    return this.store.getJob(jobId);
  }

  async findIdempotentResult(
    userId: string,
    idempotencyKey: string,
  ): Promise<GenerateImageResult | null> {
    const row = await this.store.findByIdempotency(userId, idempotencyKey);
    if (!row) return null;
    return jobRowToGenerateResult(row) as GenerateImageResult;
  }

  async listJobs(params: {
    userId: string;
    productId?: string | null;
    draftToken?: string | null;
  }): Promise<ImageGenerationJobRow[]> {
    return this.store.listByScope(params);
  }
}

let defaultService: ImageJobService | null = null;

export function getImageJobService(options?: ImageJobServiceOptions): ImageJobService {
  if (options) {
    return new ImageJobService(options);
  }
  if (!defaultService) {
    defaultService = new ImageJobService();
  }
  return defaultService;
}

export function resetImageJobServiceForTests(): void {
  defaultService = null;
  getMemoryJobStore().clear();
}

export type { CreateImageJobInput, ImageGenerationJobRow, UpdateImageJobInput };
