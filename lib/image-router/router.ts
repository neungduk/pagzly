import { randomUUID } from "crypto";
import { checkGenerationBudget } from "@/lib/cost/budget";
import {
  logPageGenerationCostSummary,
  summarizeGenerationCosts,
} from "@/lib/image-router/cost/page-cost-tracker";
import {
  buildBudgetScopeKey,
  consumeBudget,
  resolveBudgetLimit,
} from "@/lib/image-router/budget";
import {
  buildIdempotencyCacheKey,
  getIdempotentResult,
  setIdempotentResult,
} from "@/lib/image-router/idempotency";
import { getImageJobService, type ImageJobService } from "@/lib/image-router/jobs/job-service";
import {
  calculateImageCost,
  resolutionToMegapixels,
} from "@/lib/image-router/pricing/calculate-image-cost";
import {
  DEFAULT_PROVIDER_TIMEOUT_MS,
  getModelConfig,
} from "@/lib/image-router/pricing/config";
import {
  classifyProviderError,
  AIProviderError,
} from "@/lib/image-router/errors";
import {
  ProviderNotImplementedError,
  ProviderUnavailableError,
} from "@/lib/image-router/providers/image-provider";
import {
  createDefaultProviderRegistry,
  getProvider,
  type ProviderRegistry,
} from "@/lib/image-router/providers/registry";
import {
  resolveFailureFallbackProvider,
  resolveUnavailableFallback,
  routeTask,
} from "@/lib/image-router/routing/premium-routing";
import type {
  GenerateImageRequest,
  GenerateImageResult,
  ImageProviderId,
  ImageRouterContext,
  RouteDecision,
} from "@/lib/image-router/types";

export { routeTask } from "@/lib/image-router/routing/premium-routing";
export type { RouteTaskOptions } from "@/lib/image-router/routing/premium-routing";
export {
  GEMINI_QUALITY_THRESHOLD,
  shouldRouteToGemini,
} from "@/lib/image-router/routing/premium-routing";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export class ImageRouter {
  private readonly registry: ProviderRegistry;
  private readonly context: ImageRouterContext;
  private readonly timeoutMs: number;
  private readonly jobService: ImageJobService | null;
  private readonly trackJobs: boolean;

  constructor(options?: {
    registry?: ProviderRegistry;
    context?: ImageRouterContext;
    retryLimit?: number;
    timeoutMs?: number;
    jobService?: ImageJobService | null;
    trackJobs?: boolean;
  }) {
    this.registry = options?.registry ?? createDefaultProviderRegistry();
    this.context = options?.context ?? {};
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_PROVIDER_TIMEOUT_MS;
    this.trackJobs = options?.trackJobs ?? process.env.IMAGE_JOB_TRACKING !== "false";
    this.jobService =
      options?.jobService !== undefined
        ? options.jobService
        : this.trackJobs
          ? getImageJobService()
          : null;
  }

  private async persistJobResult(
    jobId: string | null,
    result: GenerateImageResult,
  ): Promise<void> {
    if (!jobId || !this.jobService) return;
    await this.jobService.completeJob(jobId, result);
  }

  private async logScopeCosts(
    userId: string | undefined,
    pageId: string | null | undefined,
    draftToken: string | null | undefined,
  ): Promise<void> {
    if (!userId || !this.jobService) return;
    const jobs = await this.jobService.listJobs({ userId, productId: pageId, draftToken });
    if (jobs.length === 0) return;
    const summary = summarizeGenerationCosts(jobs, { userId, productId: pageId, draftToken });
    logPageGenerationCostSummary(summary);
  }

  private async canAffordProvider(params: {
    userId?: string;
    pageId?: string | null;
    draftToken?: string | null;
    providerId: ImageProviderId;
    model: string;
    resolution: string;
    inputMp: number;
    outputMp: number;
  }): Promise<{ allowed: boolean; reason?: string; estimatedUsd: number }> {
    const estimatedUsd = calculateImageCost({
      provider: params.providerId,
      model: params.model,
      inputMegapixels: params.inputMp,
      outputMegapixels: params.outputMp,
      outputImageCount: 1,
    });

    if (!params.userId) {
      return { allowed: true, estimatedUsd };
    }

    const check = await checkGenerationBudget({
      userId: params.userId,
      pageId: params.pageId,
      draftToken: params.draftToken,
      nextProvider: params.providerId,
      nextModel: params.model,
      nextResolution: params.resolution,
      nextInputMegapixels: params.inputMp,
      nextOutputMegapixels: params.outputMp,
    });

    return {
      allowed: check.allowed,
      reason: check.reason,
      estimatedUsd,
    };
  }

  private async invokeProvider(params: {
    providerId: ImageProviderId;
    request: GenerateImageRequest;
    inputMp: number;
    outputMp: number;
    estimatedCost: number;
    route: RouteDecision;
  }): Promise<{
    providerId: ImageProviderId;
    model: string;
    outputUrls: string[];
    actualCost: number;
  }> {
    let providerId = params.providerId;
    let provider = getProvider(this.registry, providerId);

    if (!provider.isAvailable()) {
      const unavailableFallback = resolveUnavailableFallback(providerId);
      if (unavailableFallback) {
        console.warn(`[image-router] ${providerId} unavailable → ${unavailableFallback}`);
        providerId = unavailableFallback;
        provider = getProvider(this.registry, providerId);
      }
    }

    if (!provider.isAvailable()) {
      throw new ProviderUnavailableError(providerId);
    }

    console.log(
      `[image-router] generate once task=${params.request.taskType} ` +
        `provider=${providerId} model=${provider.model} route=${params.route.reason}`,
    );

    const output = await withTimeout(
      provider.generate({
        request: params.request,
        productImages: params.request.productImages,
        prompt: params.request.prompt,
        timeoutMs: this.timeoutMs,
      }),
      this.timeoutMs,
      `${provider.id}/${provider.model}`,
    );

    return {
      providerId,
      model: output.model || provider.model,
      outputUrls: output.outputUrls,
      actualCost: output.actualCost,
    };
  }

  async generateImage(request: GenerateImageRequest): Promise<GenerateImageResult> {
    const startedAt = Date.now();
    let generationId: string = randomUUID();
    let jobId: string | null = null;

    const userId = request.userId ?? this.context.userId;
    const pageId = request.pageId ?? this.context.pageId;
    const draftToken = request.draftToken ?? this.context.draftToken;

    const route = routeTask(request.taskType, {
      qualityLevel: request.qualityLevel ?? "standard",
      productImageCount: request.productImages.length,
      priorQualityScore: request.priorQualityScore,
    });

    const idempotencyCacheKey = buildIdempotencyCacheKey({
      userId,
      idempotencyKey: request.idempotencyKey,
    });
    if (idempotencyCacheKey) {
      const cached = getIdempotentResult(idempotencyCacheKey);
      if (cached) {
        console.log(`[image-router] idempotency hit ${idempotencyCacheKey}`);
        return cached;
      }
    }

    if (userId && request.idempotencyKey && this.jobService) {
      const dbCached = await this.jobService.findIdempotentResult(userId, request.idempotencyKey);
      if (dbCached) {
        console.log(`[image-router] db idempotency hit ${request.idempotencyKey}`);
        if (idempotencyCacheKey) setIdempotentResult(idempotencyCacheKey, dbCached);
        return dbCached;
      }
    }

    const budgetScope = buildBudgetScopeKey({ userId, pageId, draftToken });
    const budgetLimit = resolveBudgetLimit(this.context.budgetLimit);

    const resolution = request.resolution ?? "1024";
    const outputMp = resolutionToMegapixels(resolution);
    const inputMp =
      request.productImages.length > 0
        ? resolutionToMegapixels(resolution) * request.productImages.length
        : 0;

    const estimatedCost = calculateImageCost({
      provider: route.providerId,
      model: route.model,
      inputMegapixels: inputMp,
      outputMegapixels: outputMp,
      outputImageCount: 1,
    });

    if (userId && this.jobService) {
      try {
        const job = await this.jobService.createQueuedJob({
          userId,
          productId: pageId,
          draftToken,
          request,
          route,
          estimatedCost,
          prompt: request.prompt,
          inputImages: request.productImages.map((img) => ({
            url: img.url,
            path: img.path,
          })),
        });
        jobId = job.id;
        generationId = job.id;
        await this.jobService.markRunning(jobId);
      } catch (err) {
        console.warn("[image-router] job tracking skipped:", err);
        jobId = null;
      }
    }

    const finish = async (result: GenerateImageResult): Promise<GenerateImageResult> => {
      const finalized: GenerateImageResult = { ...result, generationId };
      if (idempotencyCacheKey) setIdempotentResult(idempotencyCacheKey, finalized);
      await this.persistJobResult(jobId, finalized);
      await this.logScopeCosts(userId, pageId, draftToken);
      return finalized;
    };

    if (!consumeBudget(budgetScope, budgetLimit)) {
      const result: GenerateImageResult = {
        generationId,
        status: "budget_exceeded",
        taskType: request.taskType,
        provider: route.providerId,
        model: route.model,
        outputUrls: [],
        estimatedCost,
        actualCost: 0,
        generationTimeMs: Date.now() - startedAt,
        retryCount: 0,
        errorMessage: `Generation budget exceeded (${budgetLimit} calls per page)`,
      };
      console.warn(`[image-router] budget exceeded scope=${budgetScope}`);
      return finish(result);
    }

    let primaryProviderId = route.providerId;
    let totalActualCost = 0;

    try {
      const primary = await this.invokeProvider({
        providerId: primaryProviderId,
        request,
        inputMp,
        outputMp,
        estimatedCost,
        route,
      });
      totalActualCost += primary.actualCost;

      const result: GenerateImageResult = {
        generationId,
        status: "succeeded",
        taskType: request.taskType,
        provider: primary.providerId,
        model: primary.model,
        outputUrls: primary.outputUrls,
        estimatedCost,
        actualCost: totalActualCost,
        generationTimeMs: Date.now() - startedAt,
        retryCount: 0,
      };

      console.log(
        `[image-router] succeeded id=${generationId} cost=$${result.actualCost.toFixed(4)} ` +
          `time=${result.generationTimeMs}ms`,
      );

      return finish(result);
    } catch (primaryErr) {
      const classified =
        primaryErr instanceof AIProviderError
          ? primaryErr
          : classifyProviderError(primaryErr, {
              provider: primaryProviderId,
              model: getProvider(this.registry, primaryProviderId).model,
            });

      console.error(
        `[image-router] primary failed id=${generationId} provider=${primaryProviderId} ` +
          `type=${classified.type}: ${classified.message}`,
      );

      const fallbackId = resolveFailureFallbackProvider(primaryProviderId);
      if (!fallbackId) {
        return finish({
          generationId,
          status: "failed",
          taskType: request.taskType,
          provider: primaryProviderId,
          model: getProvider(this.registry, primaryProviderId).model,
          outputUrls: [],
          estimatedCost,
          actualCost: totalActualCost,
          generationTimeMs: Date.now() - startedAt,
          retryCount: 0,
          errorMessage: classified.message,
          errorType: classified.type,
          retryable: classified.retryable,
          billed: classified.billed,
        });
      }

      const fallbackModel = getModelConfig(
        fallbackId,
        fallbackId === "gemini"
          ? "gemini-3-pro-image"
          : fallbackId === "kontext"
            ? "flux-kontext-pro"
            : "flux-2-pro",
      ).model;
      const fallbackProvider = getProvider(this.registry, fallbackId);

      if (!fallbackProvider.isAvailable()) {
        return finish({
          generationId,
          status: "failed",
          taskType: request.taskType,
          provider: primaryProviderId,
          model: getProvider(this.registry, primaryProviderId).model,
          outputUrls: [],
          estimatedCost,
          actualCost: totalActualCost,
          generationTimeMs: Date.now() - startedAt,
          retryCount: 0,
          errorMessage: `${classified.message} (${fallbackId} fallback unavailable)`,
          errorType: classified.type,
          retryable: false,
          billed: classified.billed,
        });
      }

      const afford = await this.canAffordProvider({
        userId,
        pageId,
        draftToken,
        providerId: fallbackId,
        model: fallbackModel,
        resolution,
        inputMp,
        outputMp,
      });

      if (!afford.allowed) {
        console.warn(
          `[image-router] ${fallbackId} fallback blocked by cost budget: ${afford.reason}`,
        );
        return finish({
          generationId,
          status: "budget_exceeded",
          taskType: request.taskType,
          provider: primaryProviderId,
          model: getProvider(this.registry, primaryProviderId).model,
          outputUrls: [],
          estimatedCost,
          actualCost: totalActualCost,
          generationTimeMs: Date.now() - startedAt,
          retryCount: 0,
          errorMessage:
            afford.reason ?? `${fallbackId} fallback would exceed page generation budget`,
          errorType: "UNKNOWN",
          retryable: false,
          billed: classified.billed,
        });
      }

      if (!consumeBudget(budgetScope, budgetLimit)) {
        return finish({
          generationId,
          status: "budget_exceeded",
          taskType: request.taskType,
          provider: primaryProviderId,
          model: getProvider(this.registry, primaryProviderId).model,
          outputUrls: [],
          estimatedCost,
          actualCost: totalActualCost,
          generationTimeMs: Date.now() - startedAt,
          retryCount: 0,
          errorMessage: `${fallbackId} fallback blocked: call budget exceeded`,
        });
      }

      try {
        console.warn(
          `[image-router] ${primaryProviderId} failed → ${fallbackId} fallback (budget ok)`,
        );

        const fallback = await this.invokeProvider({
          providerId: fallbackId,
          request,
          inputMp,
          outputMp,
          estimatedCost: afford.estimatedUsd,
          route: {
            providerId: fallbackId,
            model: fallbackModel,
            reason: `fallback from ${primaryProviderId} after failure`,
          },
        });

        totalActualCost += fallback.actualCost;

        return finish({
          generationId,
          status: "succeeded",
          taskType: request.taskType,
          provider: fallbackId,
          model: fallback.model,
          outputUrls: fallback.outputUrls,
          estimatedCost: estimatedCost + afford.estimatedUsd,
          actualCost: totalActualCost,
          generationTimeMs: Date.now() - startedAt,
          retryCount: 1,
          errorMessage: `Recovered via ${fallbackId} fallback after ${primaryProviderId} failure`,
        });
      } catch (fallbackErr) {
        const fbClassified = classifyProviderError(fallbackErr, {
          provider: fallbackId,
          model: fallbackModel,
        });
        return finish({
          generationId,
          status: "failed",
          taskType: request.taskType,
          provider: primaryProviderId,
          model: getProvider(this.registry, primaryProviderId).model,
          outputUrls: [],
          estimatedCost,
          actualCost: totalActualCost,
          generationTimeMs: Date.now() - startedAt,
          retryCount: 1,
          errorMessage: `${classified.message}; ${fallbackId} fallback failed: ${fbClassified.message}`,
          errorType: fbClassified.type,
          retryable: fbClassified.retryable,
          billed: classified.billed,
        });
      }
    }
  }
}

let defaultRouter: ImageRouter | null = null;

export function getImageRouter(context?: ImageRouterContext): ImageRouter {
  if (!context) {
    if (!defaultRouter) {
      defaultRouter = new ImageRouter();
    }
    return defaultRouter;
  }
  return new ImageRouter({ context });
}

export async function generateImage(
  request: GenerateImageRequest,
  context?: ImageRouterContext,
): Promise<GenerateImageResult> {
  const router = context ? new ImageRouter({ context }) : getImageRouter();
  return router.generateImage(request);
}
