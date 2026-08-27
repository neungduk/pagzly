import type { ImageGenerationJobRow } from "@/lib/image-router/jobs/types";

export type PageGenerationCostSummary = {
  userId: string;
  productId: string | null;
  draftToken: string | null;
  totalJobs: number;
  succeededJobs: number;
  failedJobs: number;
  budgetExceededJobs: number;
  estimatedCostUsd: number;
  actualCostUsd: number;
  byProvider: Record<string, { count: number; actualCostUsd: number }>;
  byTaskType: Record<string, { count: number; actualCostUsd: number }>;
};

export function summarizeGenerationCosts(
  jobs: ImageGenerationJobRow[],
  scope: { userId: string; productId?: string | null; draftToken?: string | null },
): PageGenerationCostSummary {
  const summary: PageGenerationCostSummary = {
    userId: scope.userId,
    productId: scope.productId ?? null,
    draftToken: scope.draftToken ?? null,
    totalJobs: jobs.length,
    succeededJobs: 0,
    failedJobs: 0,
    budgetExceededJobs: 0,
    estimatedCostUsd: 0,
    actualCostUsd: 0,
    byProvider: {},
    byTaskType: {},
  };

  for (const job of jobs) {
    summary.estimatedCostUsd += Number(job.estimated_cost);
    summary.actualCostUsd += Number(job.actual_cost ?? 0);

    if (job.status === "COMPLETED") summary.succeededJobs += 1;
    else if (job.status === "BUDGET_EXCEEDED") summary.budgetExceededJobs += 1;
    else if (job.status === "FAILED") summary.failedJobs += 1;

    const providerBucket = summary.byProvider[job.provider] ?? { count: 0, actualCostUsd: 0 };
    providerBucket.count += 1;
    providerBucket.actualCostUsd += Number(job.actual_cost ?? 0);
    summary.byProvider[job.provider] = providerBucket;

    const taskBucket = summary.byTaskType[job.task_type] ?? { count: 0, actualCostUsd: 0 };
    taskBucket.count += 1;
    taskBucket.actualCostUsd += Number(job.actual_cost ?? 0);
    summary.byTaskType[job.task_type] = taskBucket;
  }

  summary.estimatedCostUsd = roundUsd(summary.estimatedCostUsd);
  summary.actualCostUsd = roundUsd(summary.actualCostUsd);

  return summary;
}

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function logPageGenerationCostSummary(summary: PageGenerationCostSummary): void {
  console.log(
    `[image-cost] scope user=${summary.userId} product=${summary.productId ?? "-"} ` +
      `draft=${summary.draftToken ?? "-"} jobs=${summary.totalJobs} ` +
      `actual=$${summary.actualCostUsd.toFixed(4)} estimated=$${summary.estimatedCostUsd.toFixed(4)}`,
  );
}
