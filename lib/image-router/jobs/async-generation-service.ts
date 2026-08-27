import { after } from "next/server";
import { routeTask } from "@/lib/image-router/router";
import {
  calculateImageCost,
  resolutionToMegapixels,
} from "@/lib/image-router/pricing/calculate-image-cost";
import type {
  CreateGenerationRequest,
  CreateGenerationResponse,
  GenerationStatusResponse,
} from "@/lib/image-router/jobs/generation-api-types";
import { progressForStatus, toApiStatus } from "@/lib/image-router/jobs/generation-api-types";
import { processGenerationJob } from "@/lib/image-router/jobs/generation-worker";
import {
  assertImageJobStoreConfig,
  getImageJobStoreMode,
  ImageJobStoreConfigError,
} from "@/lib/image-router/jobs/job-store-config";
import { getMemoryJobStore } from "@/lib/image-router/jobs/memory-job-store";
import {
  createUserJobStore,
  createWorkerJobStore,
} from "@/lib/image-router/jobs/supabase-job-store";
import type { ImageGenerationJobRow, ImageJobStore } from "@/lib/image-router/jobs/types";
import { jobRowToStatusResponse } from "@/lib/image-router/jobs/types";
import { isServiceRoleAvailable } from "@/lib/supabase/service-role";

export {
  assertImageJobStoreConfig,
  getImageJobStoreMode,
  ImageJobStoreConfigError,
} from "@/lib/image-router/jobs/job-store-config";

export function getApiJobStore(forWorker = false): ImageJobStore {
  if (getImageJobStoreMode() === "memory") {
    return getMemoryJobStore();
  }

  if (forWorker) {
    assertImageJobStoreConfig({ requireWorker: true });
    return createWorkerJobStore();
  }

  return createUserJobStore();
}

function isReusableIdempotentJob(row: ImageGenerationJobRow): boolean {
  const status = toApiStatus(String(row.status));
  return status !== "FAILED" && status !== "CANCELLED";
}

export async function createAsyncGenerationJob(params: {
  userId: string;
  body: CreateGenerationRequest;
  store?: ImageJobStore;
}): Promise<CreateGenerationResponse> {
  const store = params.store ?? getApiJobStore(false);
  const inputImages = params.body.inputImages ?? [];

  if (params.body.idempotencyKey) {
    const existing = await store.findByIdempotency(params.userId, params.body.idempotencyKey);
    if (existing && isReusableIdempotentJob(existing)) {
      return {
        id: existing.id,
        status: toApiStatus(existing.status),
        progress: existing.progress ?? progressForStatus(toApiStatus(existing.status)),
        duplicate: true,
      };
    }
  }

  const qualityLevel = params.body.qualityLevel ?? "standard";
  const route = routeTask(params.body.taskType, {
    qualityLevel,
    productImageCount: inputImages.length,
  });
  const resolution = params.body.resolution ?? "1024";
  const outputMp = resolutionToMegapixels(resolution);
  const inputMp = inputImages.length > 0 ? outputMp * inputImages.length : 0;
  const estimatedCost = calculateImageCost({
    provider: route.providerId,
    model: route.model,
    inputMegapixels: inputMp,
    outputMegapixels: outputMp,
    outputImageCount: 1,
  });

  const row = await store.createJob({
    userId: params.userId,
    productId: params.body.pageId ?? null,
    draftToken: params.body.draftToken ?? null,
    prompt: params.body.prompt,
    inputImages,
    route,
    estimatedCost,
    request: {
      taskType: params.body.taskType,
      productImages: inputImages.map((img) => ({ url: img.url, path: img.path })),
      prompt: params.body.prompt,
      aspectRatio: params.body.aspectRatio,
      resolution: params.body.resolution,
      qualityLevel: params.body.qualityLevel,
      userId: params.userId,
      pageId: params.body.pageId,
      draftToken: params.body.draftToken,
      idempotencyKey: params.body.idempotencyKey,
    },
  });

  return {
    id: row.id,
    status: "QUEUED",
    progress: 0,
  };
}

/** HTTP 응답 후 background에서 job 처리 (Next.js after) */
export function dispatchGenerationJob(jobId: string): void {
  after(async () => {
    try {
      if (getImageJobStoreMode() === "supabase") {
        assertImageJobStoreConfig({ requireWorker: true });
      }
      await processGenerationJob(jobId, getApiJobStore(true));
    } catch (err) {
      console.error(`[async-generation] worker failed job=${jobId}:`, err);
      if (getImageJobStoreMode() === "supabase") {
        try {
          const store = createWorkerJobStore();
          await store.updateJob(jobId, {
            status: "FAILED",
            progress: 100,
            errorMessage:
              err instanceof Error ? err.message : "Worker failed to start",
            completedAt: new Date().toISOString(),
          });
        } catch (updateErr) {
          console.error("[async-generation] failed to mark job FAILED:", updateErr);
        }
      }
    }
  });
}

/** 테스트·스크립트 — after 없이 직접 await */
export async function runGenerationJobSync(
  jobId: string,
  store?: ImageJobStore,
): Promise<ImageGenerationJobRow | null> {
  return processGenerationJob(jobId, store ?? getApiJobStore(true));
}

export async function getGenerationStatus(params: {
  jobId: string;
  userId: string;
  store?: ImageJobStore;
}): Promise<GenerationStatusResponse | null> {
  const store = params.store ?? getApiJobStore(false);
  const row = await store.getJob(params.jobId);
  if (!row || row.user_id !== params.userId) return null;
  return jobRowToStatusResponse(row);
}

export async function pollGenerationUntilDone(params: {
  jobId: string;
  userId: string;
  store?: ImageJobStore;
  timeoutMs?: number;
  intervalMs?: number;
}): Promise<GenerationStatusResponse | null> {
  const timeoutMs = params.timeoutMs ?? 180_000;
  const intervalMs = params.intervalMs ?? 1500;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const status = await getGenerationStatus({
      jobId: params.jobId,
      userId: params.userId,
      store: params.store,
    });
    if (!status) return null;
    if (
      status.status === "COMPLETED" ||
      status.status === "FAILED" ||
      status.status === "BUDGET_EXCEEDED" ||
      status.status === "CANCELLED"
    ) {
      return status;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  return getGenerationStatus(params);
}
