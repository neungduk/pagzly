import { randomUUID } from "crypto";
import type { PageGenerationJob, PageGenerationStatus } from "@/lib/page-pipeline/types";
import { progressForStatus } from "@/lib/page-pipeline/types";

const jobs = new Map<string, PageGenerationJob>();

export function createPageGenerationJob(budgetUsd: number): PageGenerationJob {
  const now = new Date().toISOString();
  const job: PageGenerationJob = {
    id: randomUUID(),
    status: "QUEUED",
    progress: 0,
    createdAt: now,
    updatedAt: now,
    warnings: [],
    spentUsd: 0,
    budgetUsd,
  };
  jobs.set(job.id, job);
  return job;
}

export function getPageGenerationJob(id: string): PageGenerationJob | null {
  return jobs.get(id) ?? null;
}

export function updatePageGenerationJob(
  id: string,
  patch: Partial<PageGenerationJob> & { status?: PageGenerationStatus },
): PageGenerationJob {
  const current = jobs.get(id);
  if (!current) throw new Error(`PageGenerationJob not found: ${id}`);

  const status = patch.status ?? current.status;
  const progress =
    patch.progress ??
    progressForStatus(status, current.progress);

  const next: PageGenerationJob = {
    ...current,
    ...patch,
    status,
    progress,
    updatedAt: new Date().toISOString(),
    warnings: patch.warnings ?? current.warnings,
  };
  jobs.set(id, next);
  return next;
}

export function addJobWarning(id: string, warning: string): PageGenerationJob {
  const current = getPageGenerationJob(id);
  if (!current) throw new Error(`PageGenerationJob not found: ${id}`);
  return updatePageGenerationJob(id, {
    warnings: [...current.warnings, warning],
  });
}

export function addJobSpend(id: string, usd: number): PageGenerationJob {
  const current = getPageGenerationJob(id);
  if (!current) throw new Error(`PageGenerationJob not found: ${id}`);
  const spentUsd =
    Math.round((current.spentUsd + usd) * 1_000_000) / 1_000_000;
  return updatePageGenerationJob(id, { spentUsd });
}

export class BudgetExceededError extends Error {
  readonly spentUsd: number;
  readonly budgetUsd: number;
  constructor(spentUsd: number, budgetUsd: number, detail?: string) {
    super(
      detail ??
        `Page generation budget exceeded: spent $${spentUsd.toFixed(4)} > $${budgetUsd.toFixed(2)}`,
    );
    this.name = "BudgetExceededError";
    this.spentUsd = spentUsd;
    this.budgetUsd = budgetUsd;
  }
}

/** Abort if current spend already at/over budget. */
export function assertBudgetAllows(job: PageGenerationJob, nextEstimatedUsd = 0): void {
  const projected =
    Math.round((job.spentUsd + nextEstimatedUsd) * 1_000_000) / 1_000_000;
  if (projected > job.budgetUsd) {
    throw new BudgetExceededError(
      job.spentUsd,
      job.budgetUsd,
      `Budget exceeded: spent $${job.spentUsd.toFixed(4)} + next ~$${nextEstimatedUsd.toFixed(4)} > $${job.budgetUsd.toFixed(2)}`,
    );
  }
}
