/**
 * Image quality pass + low-score regenerate.
 * Eval failure → keep image + warning (never hard-fail the page job).
 */

import fs from "fs";
import path from "path";
import { ImageRouter } from "@/lib/image-router/router";
import { evaluateKontextProductPreservation } from "@/lib/image-router/quality/kontext-quality-eval";
import type { ExecuteImagePlanItemResult } from "@/lib/image-router/orchestrator/execute-image-plan";
import {
  toRouterAspectRatio,
  toRouterQualityLevel,
  toRouterTaskType,
} from "@/lib/image-router/orchestrator/validate-image-plan";
import type { ImageRouterContext } from "@/lib/image-router/types";

const LOW_QUALITY_THRESHOLD = 0.65;

export type QualityPassItem = {
  entry: ExecuteImagePlanItemResult;
  qualityScore: number | null;
  regenerated: boolean;
  warning?: string;
  regenerateCostUsd: number;
};

export type QualityPassResult = {
  items: QualityPassItem[];
  totalRetryCount: number;
  regenerateCostUsd: number;
  warnings: string[];
};

function toDataUrl(source: string): string {
  if (source.startsWith("data:") || source.startsWith("http")) return source;
  if (!fs.existsSync(source)) return source;
  const buf = fs.readFileSync(source);
  const lower = source.toLowerCase();
  const mime = lower.endsWith(".png")
    ? "image/png"
    : lower.endsWith(".webp")
      ? "image/webp"
      : "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function scoreAgainstProduct(
  productImage: string,
  generatedUrl: string,
  scratchDir: string,
): Promise<{ score: number } | { error: string }> {
  try {
    fs.mkdirSync(scratchDir, { recursive: true });
    const report = await evaluateKontextProductPreservation({
      originalSource: productImage,
      resultSource: generatedUrl,
      outputDir: scratchDir,
      minCenterSimilarity: LOW_QUALITY_THRESHOLD,
    });
    return { score: report.centerRegionSimilarity };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Evaluate succeeded images; regenerate once when score < threshold.
 * Uses priorQualityScore so router can escalate to Gemini.
 */
export async function runImageQualityPass(params: {
  items: ExecuteImagePlanItemResult[];
  productImageUrls: string[];
  scratchDir: string;
  context?: ImageRouterContext;
  /** Called before each regenerate — throw to stop (budget) */
  beforeRegenerate?: (estimatedUsd: number) => void;
}): Promise<QualityPassResult> {
  const productRef = params.productImageUrls[0];
  const warnings: string[] = [];
  const out: QualityPassItem[] = [];
  let totalRetryCount = 0;
  let regenerateCostUsd = 0;

  const router = new ImageRouter({
    context: params.context,
    trackJobs: false,
    timeoutMs: 180_000,
  });

  for (let i = 0; i < params.items.length; i += 1) {
    const entry = params.items[i]!;
    if (entry.result.status !== "succeeded" || !entry.result.outputUrls[0]) {
      out.push({
        entry,
        qualityScore: null,
        regenerated: false,
        warning: entry.result.errorMessage ?? "image generation failed",
        regenerateCostUsd: 0,
      });
      if (entry.result.errorMessage) {
        warnings.push(`image[${i}] failed: ${entry.result.errorMessage}`);
      }
      continue;
    }

    if (!productRef) {
      out.push({
        entry,
        qualityScore: null,
        regenerated: false,
        warning: "no product ref for quality eval — keeping image",
        regenerateCostUsd: 0,
      });
      warnings.push(`image[${i}] quality eval skipped (no product ref)`);
      continue;
    }

    const scratch = path.join(params.scratchDir, `q-${i}`);
    const scored = await scoreAgainstProduct(
      productRef,
      entry.result.outputUrls[0],
      scratch,
    );

    if ("error" in scored) {
      warnings.push(`image[${i}] quality eval failed — keeping image: ${scored.error}`);
      out.push({
        entry,
        qualityScore: null,
        regenerated: false,
        warning: scored.error,
        regenerateCostUsd: 0,
      });
      continue;
    }

    let current = entry;
    let score = scored.score;
    let regenerated = false;
    let regenCost = 0;

    if (score < LOW_QUALITY_THRESHOLD) {
      try {
        params.beforeRegenerate?.(0.04);
        const regen = await router.generateImage({
          taskType: toRouterTaskType(entry.item.taskType),
          productImages: params.productImageUrls.map((url) => ({
            url: toDataUrl(url),
          })),
          prompt: `${entry.item.purpose}\n\n${entry.item.prompt}\n\nPreserve product identity accurately.`,
          aspectRatio: toRouterAspectRatio(entry.item.aspectRatio),
          qualityLevel: toRouterQualityLevel("PREMIUM"),
          resolution: "768",
          priorQualityScore: score,
          userId: params.context?.userId,
          pageId: params.context?.pageId,
          draftToken: params.context?.draftToken,
          idempotencyKey: `page-pipeline-regen-${params.context?.draftToken ?? "x"}-${entry.item.order}-${Date.now()}`,
        });

        totalRetryCount += 1 + (regen.retryCount ?? 0);
        regenCost = regen.actualCost;
        regenerateCostUsd += regenCost;

        if (regen.status === "succeeded" && regen.outputUrls[0]) {
          current = { item: entry.item, result: regen };
          regenerated = true;
          const rescore = await scoreAgainstProduct(
            productRef,
            regen.outputUrls[0],
            path.join(scratch, "regen"),
          );
          if ("score" in rescore) score = rescore.score;
        } else {
          warnings.push(
            `image[${i}] regenerate failed — keeping original: ${regen.errorMessage ?? regen.status}`,
          );
        }
      } catch (err) {
        warnings.push(
          `image[${i}] regenerate aborted — keeping original: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    out.push({
      entry: current,
      qualityScore: score,
      regenerated,
      regenerateCostUsd: regenCost,
    });
  }

  return {
    items: out,
    totalRetryCount,
    regenerateCostUsd: Math.round(regenerateCostUsd * 1_000_000) / 1_000_000,
    warnings,
  };
}
