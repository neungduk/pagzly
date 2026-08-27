import { ImageRouter } from "@/lib/image-router/router";
import type { GenerationOutputImage } from "@/lib/image-router/jobs/generation-api-types";
import {
  assertImageJobStoreConfig,
  generationOutputStoragePath,
  getImageJobStoreMode,
} from "@/lib/image-router/jobs/job-store-config";
import { getMemoryJobStore } from "@/lib/image-router/jobs/memory-job-store";
import { createWorkerJobStore } from "@/lib/image-router/jobs/supabase-job-store";
import type { ImageGenerationJobRow, ImageJobStore } from "@/lib/image-router/jobs/types";
import { resolveImageDimensions } from "@/lib/image-router/utils/dimensions";
import { isServiceRoleAvailable } from "@/lib/supabase/service-role";
import { uploadPngBuffer } from "@/lib/upload-png";
import { calculateImageCost, resolutionToMegapixels } from "@/lib/cost/calculators";
import { checkGenerationBudget } from "@/lib/cost/budget";
import { getAttemptStore } from "@/lib/cost/get-attempt-store";
import { logAiCost } from "@/lib/cost/log-ai-cost";
import type { GenerationAttemptStore } from "@/lib/cost/attempt-store";
import {
  classifyProviderError,
  workerBackoffMs,
  type AIProviderErrorType,
} from "@/lib/image-router/errors";
import type { GenerateImageResult } from "@/lib/image-router/types";
import type { ImageProvider } from "@/lib/image-router/providers/image-provider";
import type { ProviderRegistry } from "@/lib/image-router/providers/registry";

/** Worker가 담당하는 최대 추가 retry 횟수 (총 attempt = 1 + MAX_JOB_RETRIES) */
export const MAX_JOB_RETRIES = 2;

const inFlight = new Set<string>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getWorkerJobStore(): ImageJobStore {
  if (getImageJobStoreMode() === "memory") {
    return getMemoryJobStore();
  }
  assertImageJobStoreConfig({ requireWorker: true });
  return createWorkerJobStore();
}

async function persistOutputImages(
  job: ImageGenerationJobRow,
  remoteUrls: string[],
): Promise<GenerationOutputImage[]> {
  const resolution = (job.input_metadata?.resolution as string | undefined) ?? "1024";
  const aspectRatio =
    (job.input_metadata?.aspectRatio as import("@/lib/image-router/types").ImageAspectRatio) ??
    "1:1";
  const { width, height } = resolveImageDimensions({
    aspectRatio,
    resolution: resolution as "1024",
  });

  const outputs: GenerationOutputImage[] = [];

  for (let i = 0; i < remoteUrls.length; i += 1) {
    const remoteUrl = remoteUrls[i]!;
    let publicUrl = remoteUrl;
    let storagePath: string | undefined;

    if (getImageJobStoreMode() === "supabase" && isServiceRoleAvailable()) {
      try {
        const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
        const supabase = createServiceRoleClient();
        const response = await fetch(remoteUrl);
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());
          storagePath = generationOutputStoragePath(job.user_id, job.id, i);
          const uploaded = await uploadPngBuffer(supabase, storagePath, buffer);
          if ("publicUrl" in uploaded) {
            publicUrl = uploaded.publicUrl;
          }
        }
      } catch (err) {
        console.warn("[generation-worker] storage upload failed:", err);
      }
    }

    outputs.push({ url: publicUrl, width, height, storagePath });
  }

  return outputs;
}

function resolveJobMegapixels(job: ImageGenerationJobRow): {
  resolution: string;
  inputMp: number;
  outputMp: number;
} {
  const resolution = String(job.input_metadata?.resolution ?? "1024");
  const outputMp = resolutionToMegapixels(resolution);
  const inputCount = job.input_images?.length ?? 0;
  const inputMp = inputCount > 0 ? outputMp * inputCount : 0;
  return { resolution, inputMp, outputMp };
}

function resolveAttemptCost(params: {
  result?: GenerateImageResult | null;
  errorType?: AIProviderErrorType;
  billed?: boolean;
  estimatedCostUsd: number;
}): number {
  if (params.result?.status === "succeeded") {
    return params.result.actualCost > 0 ? params.result.actualCost : params.estimatedCostUsd;
  }
  // 429 등 미생성 → 0. provider가 billed 표시한 경우만 과금
  if (params.billed && params.result?.actualCost && params.result.actualCost > 0) {
    return params.result.actualCost;
  }
  if (params.errorType === "RATE_LIMIT" || params.errorType === "TIMEOUT") {
    return 0;
  }
  if (params.billed) return params.estimatedCostUsd;
  return 0;
}

function isRetryableResult(result: GenerateImageResult): boolean {
  if (result.status === "succeeded") return false;
  if (result.retryable === true) return true;
  if (result.retryable === false) return false;
  const classified = classifyProviderError(new Error(result.errorMessage ?? "failed"), {
    provider: result.provider,
    model: result.model,
  });
  return classified.retryable;
}

export type ProcessGenerationJobOptions = {
  store?: ImageJobStore;
  attemptStore?: GenerationAttemptStore;
  /** 테스트용 mock registry */
  registry?: ProviderRegistry;
  /** 테스트용: sleep 스킵 */
  skipBackoff?: boolean;
};

/**
 * QUEUED job 처리.
 * Retry는 이 Worker만 수행한다 (ImageRouter / Provider 내부 retry 없음).
 */
export async function processGenerationJob(
  jobId: string,
  storeOrOptions?: ImageJobStore | ProcessGenerationJobOptions,
  attemptStoreArg?: GenerationAttemptStore,
): Promise<ImageGenerationJobRow | null> {
  const options: ProcessGenerationJobOptions =
    storeOrOptions && "claimJob" in storeOrOptions
      ? { store: storeOrOptions, attemptStore: attemptStoreArg }
      : ((storeOrOptions as ProcessGenerationJobOptions | undefined) ?? {});

  const store = options.store ?? getWorkerJobStore();
  const attemptStore = options.attemptStore ?? getAttemptStore();

  if (inFlight.has(jobId)) {
    console.warn(`[generation-worker] skip duplicate in-flight job=${jobId}`);
    return store.getJob(jobId);
  }

  inFlight.add(jobId);
  try {
    const claimed = await store.claimJob(jobId);
    if (!claimed) {
      return store.getJob(jobId);
    }

    let job = claimed;
    let lastError = "";
    let lastErrorType: AIProviderErrorType | undefined;
    let lastRetryable = false;
    const { resolution, inputMp, outputMp } = resolveJobMegapixels(job);

    while (job.retry_count <= MAX_JOB_RETRIES) {
      const attemptNumber = job.retry_count + 1;
      const startedAt = new Date().toISOString();
      const startedMs = Date.now();

      const estimate = calculateImageCost({
        provider: job.provider,
        model: job.model,
        inputMegapixels: inputMp,
        outputMegapixels: outputMp,
        resolution,
      });

      const budget = await checkGenerationBudget({
        userId: job.user_id,
        pageId: job.product_id,
        draftToken: job.draft_token,
        maxGenerationCostUsd: null,
        nextProvider: job.provider,
        nextModel: job.model,
        nextResolution: resolution,
        nextInputMegapixels: inputMp,
        nextOutputMegapixels: outputMp,
      });

      if (!budget.allowed) {
        await attemptStore.createAttempt({
          generationId: jobId,
          attemptNumber,
          provider: job.provider,
          model: job.model,
          status: "BUDGET_SKIPPED",
          estimatedCostUsd: budget.nextEstimatedUsd,
          actualCostUsd: 0,
          inputMegapixels: inputMp,
          outputMegapixels: outputMp,
          resolution,
          startedAt,
          completedAt: new Date().toISOString(),
          errorMessage: budget.reason,
        });

        logAiCost({
          provider: job.provider,
          model: job.model,
          generationId: jobId,
          attempt: attemptNumber,
          estimatedCost: budget.nextEstimatedUsd,
          actualCost: 0,
          status: "BUDGET_SKIPPED",
          pageId: job.product_id,
          userId: job.user_id,
        });

        const totalCost = await attemptStore.sumActualCostByGeneration(jobId);
        return (
          (await store.updateJob(jobId, {
            status: "BUDGET_EXCEEDED",
            progress: 100,
            errorMessage: budget.reason,
            actualCost: totalCost,
            retryCount: job.retry_count,
            completedAt: new Date().toISOString(),
          })) ?? job
        );
      }

      const router = new ImageRouter({
        context: {
          userId: job.user_id,
          pageId: job.product_id,
          draftToken: job.draft_token,
        },
        trackJobs: false,
        jobService: null,
        registry: options.registry,
      });

      const inputImages = job.input_images ?? [];
      const result = await router.generateImage({
        taskType: job.task_type as import("@/lib/image-router/types").ImageTaskType,
        productImages: inputImages.map((img) => ({ url: img.url, path: img.path })),
        prompt: job.prompt ?? "",
        aspectRatio: job.input_metadata?.aspectRatio as
          | import("@/lib/image-router/types").ImageAspectRatio
          | undefined,
        resolution: job.input_metadata?.resolution as
          | import("@/lib/image-router/types").ImageResolution
          | undefined,
        qualityLevel: job.input_metadata?.qualityLevel as "standard" | "premium" | undefined,
        userId: job.user_id,
        pageId: job.product_id,
        draftToken: job.draft_token,
        idempotencyKey: null,
      });

      const generationTimeMs = Date.now() - startedMs;

      // 테스트 훅: 성공을 강제 실패로 바꿔 Worker retry 유도 (과금은 유지)
      const forceFailRemaining = Number(process.env.FORCE_GENERATION_FAIL_ATTEMPTS ?? 0);
      if (
        result.status === "succeeded" &&
        forceFailRemaining > 0 &&
        attemptNumber <= forceFailRemaining
      ) {
        const actualCost = resolveAttemptCost({
          result,
          billed: true,
          estimatedCostUsd: estimate.estimatedCostUsd,
        });
        await attemptStore.createAttempt({
          generationId: jobId,
          attemptNumber,
          provider: result.provider,
          model: result.model,
          status: "FAILED",
          estimatedCostUsd: estimate.estimatedCostUsd,
          actualCostUsd: actualCost,
          inputMegapixels: inputMp,
          outputMegapixels: outputMp,
          resolution,
          startedAt,
          completedAt: new Date().toISOString(),
          errorMessage: "FORCE_GENERATION_FAIL_ATTEMPTS (test)",
        });
        logAiCost({
          provider: result.provider,
          model: result.model,
          generationId: jobId,
          attempt: attemptNumber,
          estimatedCost: estimate.estimatedCostUsd,
          actualCost,
          status: "FAILED_FORCED",
          pageId: job.product_id,
          userId: job.user_id,
        });
        lastError = "FORCE_GENERATION_FAIL_ATTEMPTS timeout";
        lastRetryable = true;
        lastErrorType = "TIMEOUT";
      } else if (result.status === "succeeded" && result.outputUrls.length > 0) {
        const actualCost = resolveAttemptCost({
          result,
          billed: true,
          estimatedCostUsd: estimate.estimatedCostUsd,
        });
        await attemptStore.createAttempt({
          generationId: jobId,
          attemptNumber,
          provider: result.provider,
          model: result.model,
          status: "SUCCEEDED",
          estimatedCostUsd: estimate.estimatedCostUsd,
          actualCostUsd: actualCost,
          inputMegapixels: inputMp,
          outputMegapixels: outputMp,
          resolution,
          startedAt,
          completedAt: new Date().toISOString(),
        });
        logAiCost({
          provider: result.provider,
          model: result.model,
          generationId: jobId,
          attempt: attemptNumber,
          estimatedCost: estimate.estimatedCostUsd,
          actualCost,
          status: "SUCCEEDED",
          pageId: job.product_id,
          userId: job.user_id,
        });

        const totalCost = await attemptStore.sumActualCostByGeneration(jobId);
        const outputImages = await persistOutputImages(job, result.outputUrls);
        return (
          (await store.updateJob(jobId, {
            status: "COMPLETED",
            progress: 100,
            outputUrls: outputImages.map((o) => o.url),
            outputImages,
            actualCost: totalCost,
            generationTimeMs,
            retryCount: job.retry_count,
            outputImageCount: outputImages.length,
            errorMessage: null,
            completedAt: new Date().toISOString(),
            provider: result.provider,
            model: result.model,
          })) ?? job
        );
      } else {
        lastError = result.errorMessage ?? `Generation ${result.status}`;
        lastErrorType = result.errorType;
        lastRetryable = isRetryableResult(result);
        const actualCost = resolveAttemptCost({
          result,
          errorType: result.errorType,
          billed: result.billed,
          estimatedCostUsd: estimate.estimatedCostUsd,
        });

        await attemptStore.createAttempt({
          generationId: jobId,
          attemptNumber,
          provider: result.provider || job.provider,
          model: result.model || job.model,
          status: "FAILED",
          estimatedCostUsd: estimate.estimatedCostUsd,
          actualCostUsd: actualCost,
          inputMegapixels: inputMp,
          outputMegapixels: outputMp,
          resolution,
          startedAt,
          completedAt: new Date().toISOString(),
          errorMessage: lastError,
        });
        logAiCost({
          provider: result.provider || job.provider,
          model: result.model || job.model,
          generationId: jobId,
          attempt: attemptNumber,
          estimatedCost: estimate.estimatedCostUsd,
          actualCost,
          status: `FAILED:${result.errorType ?? "UNKNOWN"}`,
          pageId: job.product_id,
          userId: job.user_id,
        });
      }

      if (job.retry_count < MAX_JOB_RETRIES && lastRetryable) {
        const nextRetry = job.retry_count + 1;
        const backoff = workerBackoffMs(attemptNumber);
        console.warn(
          `[generation-worker] retry ${nextRetry}/${MAX_JOB_RETRIES} ` +
            `type=${lastErrorType ?? "?"} backoff=${backoff}ms job=${jobId}: ${lastError}`,
        );
        if (!options.skipBackoff) {
          await sleep(backoff);
        }
        const requeued = await store.requeueJob(jobId, nextRetry, lastError);
        if (!requeued) break;
        const reclaimed = await store.claimJob(jobId);
        if (!reclaimed) return requeued;
        job = reclaimed;
        continue;
      }

      const totalCost = await attemptStore.sumActualCostByGeneration(jobId);
      return (
        (await store.updateJob(jobId, {
          status: "FAILED",
          progress: 100,
          errorMessage: lastError,
          actualCost: totalCost,
          retryCount: job.retry_count,
          completedAt: new Date().toISOString(),
        })) ?? job
      );
    }

    return store.getJob(jobId);
  } finally {
    inFlight.delete(jobId);
  }
}

export function resetWorkerInFlightForTests(): void {
  inFlight.clear();
}

export type MockFailType = "RATE_LIMIT" | "SERVER_ERROR" | "AUTH_ERROR" | "INVALID_REQUEST";

export type MockFailThenSucceedProvider = ImageProvider & {
  getCallCount: () => number;
};

/** 테스트용 mock provider — 지정된 에러 시퀀스 후 성공 (실제 API 호출 없음) */
export function createMockFailThenSucceedProvider(params: {
  failWith: MockFailType[];
  costOnSuccess?: number;
  /** 실패 attempt를 과금으로 취급 (budget/누적 테스트용) */
  billedOnFail?: boolean;
}): MockFailThenSucceedProvider {
  let callCount = 0;
  const cost = params.costOnSuccess ?? 0.03;
  const billedOnFail = params.billedOnFail ?? false;
  return {
    id: "flux",
    model: "flux-2-pro",
    backend: "direct",
    isAvailable: () => true,
    getCallCount: () => callCount,
    async generate() {
      const idx = callCount;
      callCount += 1;
      const failType = params.failWith[idx];
      if (failType) {
        const { AIProviderError } = await import("@/lib/image-router/errors");
        const map = {
          RATE_LIMIT: {
            type: "RATE_LIMIT" as const,
            retryable: true,
            message: "429 Too Many Requests",
          },
          SERVER_ERROR: {
            type: "SERVER_ERROR" as const,
            retryable: true,
            message: "500 Internal Server Error",
          },
          AUTH_ERROR: {
            type: "AUTH_ERROR" as const,
            retryable: false,
            message: "401 Unauthorized invalid API key",
          },
          INVALID_REQUEST: {
            type: "INVALID_REQUEST" as const,
            retryable: false,
            message: "400 Bad Request invalid prompt",
          },
        }[failType];
        throw new AIProviderError({
          ...map,
          provider: "flux",
          model: "flux-2-pro",
          billed: billedOnFail && failType !== "RATE_LIMIT",
        });
      }
      return {
        outputUrls: ["https://example.com/mock-output.png"],
        actualCost: cost,
        model: "flux-2-pro",
        metadata: { provider: "flux", model: "flux-2-pro", actualCostUsd: cost },
      };
    },
  };
}

/** 항상 429 — Worker max retry 후 중단 검증용 */
export function createMockAlwaysRateLimitProvider(): MockFailThenSucceedProvider {
  return createMockFailThenSucceedProvider({
    failWith: ["RATE_LIMIT", "RATE_LIMIT", "RATE_LIMIT", "RATE_LIMIT", "RATE_LIMIT"],
  });
}

function stubUnavailableProvider(
  id: "kontext" | "gemini",
  model: string,
): ImageProvider {
  return {
    id,
    model,
    backend: "direct",
    isAvailable: () => false,
    async generate() {
      const { ProviderUnavailableError } = await import(
        "@/lib/image-router/providers/image-provider"
      );
      throw new ProviderUnavailableError(id);
    },
  };
}

/** mock flux + stub kontext/gemini registry */
export function createMockProviderRegistry(
  flux: ImageProvider,
): ProviderRegistry {
  return {
    flux,
    kontext: stubUnavailableProvider("kontext", "flux-kontext-pro"),
    gemini: stubUnavailableProvider("gemini", "gemini-3-pro-image"),
  };
}
