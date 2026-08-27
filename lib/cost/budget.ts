/**
 * Page-level generation cost budget.
 * retry가 budget을 우회해 무한히 돌지 않도록 매 attempt 전에 검사한다.
 */

import { calculateImageCost } from "@/lib/cost/calculators";
import { resolveMaxGenerationCostUsd } from "@/lib/cost/pricing-config";
import { getPageSpentCostUsd } from "@/lib/cost/queries";

export type BudgetCheckInput = {
  userId: string;
  pageId?: string | null;
  draftToken?: string | null;
  /** job-level override */
  maxGenerationCostUsd?: number | null;
  nextProvider: string;
  nextModel: string;
  nextResolution?: string;
  nextInputMegapixels?: number;
  nextOutputMegapixels?: number;
};

export type BudgetCheckResult = {
  allowed: boolean;
  spentUsd: number;
  nextEstimatedUsd: number;
  budgetUsd: number;
  projectedUsd: number;
  reason?: string;
};

export async function checkGenerationBudget(
  input: BudgetCheckInput,
): Promise<BudgetCheckResult> {
  const budgetUsd = resolveMaxGenerationCostUsd(
    input.maxGenerationCostUsd ?? undefined,
  );
  const spentUsd = await getPageSpentCostUsd({
    userId: input.userId,
    pageId: input.pageId,
    draftToken: input.draftToken,
  });

  const estimate = calculateImageCost({
    provider: input.nextProvider,
    model: input.nextModel,
    resolution: input.nextResolution,
    inputMegapixels: input.nextInputMegapixels,
    outputMegapixels: input.nextOutputMegapixels,
  });

  const projectedUsd =
    Math.round((spentUsd + estimate.estimatedCostUsd) * 1_000_000) / 1_000_000;

  if (projectedUsd > budgetUsd) {
    return {
      allowed: false,
      spentUsd,
      nextEstimatedUsd: estimate.estimatedCostUsd,
      budgetUsd,
      projectedUsd,
      reason: `Generation budget exceeded: spent $${spentUsd.toFixed(4)} + next $${estimate.estimatedCostUsd.toFixed(4)} = $${projectedUsd.toFixed(4)} > $${budgetUsd.toFixed(2)}`,
    };
  }

  return {
    allowed: true,
    spentUsd,
    nextEstimatedUsd: estimate.estimatedCostUsd,
    budgetUsd,
    projectedUsd,
  };
}
