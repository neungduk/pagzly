import { getAttemptStore } from "@/lib/cost/get-attempt-store";
import type {
  DailyGenerationCostResult,
  PageGenerationCostResult,
  UserGenerationCostResult,
} from "@/lib/cost/types";
import { getMemoryJobStore } from "@/lib/image-router/jobs/memory-job-store";
import { getImageJobStoreMode } from "@/lib/image-router/jobs/job-store-config";
import { createWorkerJobStore } from "@/lib/image-router/jobs/supabase-job-store";
import type { ImageGenerationJobRow, ImageJobStore } from "@/lib/image-router/jobs/types";
import { isServiceRoleAvailable } from "@/lib/supabase/service-role";

function roundUsd(v: number): number {
  return Math.round(v * 1_000_000) / 1_000_000;
}

function getQueryJobStore(): ImageJobStore {
  if (getImageJobStoreMode() === "memory") return getMemoryJobStore();
  if (isServiceRoleAvailable()) return createWorkerJobStore();
  return getMemoryJobStore();
}

async function listJobsByProductId(pageId: string): Promise<ImageGenerationJobRow[]> {
  if (getImageJobStoreMode() === "memory") {
    return getMemoryJobStore().listAll().filter((j) => j.product_id === pageId);
  }

  if (!isServiceRoleAvailable()) return [];
  const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("image_generation_jobs")
    .select("id")
    .eq("product_id", pageId);

  if (error || !data) return [];
  const worker = createWorkerJobStore();
  const rows: ImageGenerationJobRow[] = [];
  for (const raw of data) {
    const job = await worker.getJob(String((raw as { id: string }).id));
    if (job) rows.push(job);
  }
  return rows;
}

async function accumulateJobCosts(jobs: ImageGenerationJobRow[]): Promise<{
  imageCostUsd: number;
  imageCount: number;
  retryCount: number;
  pageIds: Set<string>;
}> {
  const attemptStore = getAttemptStore();
  let imageCostUsd = 0;
  let imageCount = 0;
  let retryCount = 0;
  const pageIds = new Set<string>();

  for (const job of jobs) {
    if (job.product_id) pageIds.add(job.product_id);
    else if (job.draft_token) pageIds.add(`draft:${job.draft_token}`);

    const attempts = await attemptStore.listByGeneration(job.id);
    if (attempts.length > 0) {
      imageCostUsd += attempts.reduce((s, a) => s + a.actualCostUsd, 0);
      imageCount += attempts.filter((a) => a.status === "SUCCEEDED").length;
      retryCount += Math.max(0, attempts.length - 1);
    } else {
      imageCostUsd += Number(job.actual_cost ?? 0);
      if (job.status === "COMPLETED") imageCount += 1;
      retryCount += job.retry_count;
    }
  }

  return {
    imageCostUsd: roundUsd(imageCostUsd),
    imageCount,
    retryCount,
    pageIds,
  };
}

export async function getPageGenerationCost(
  pageId: string,
): Promise<PageGenerationCostResult> {
  const jobs = await listJobsByProductId(pageId);
  const { imageCostUsd, imageCount, retryCount } = await accumulateJobCosts(jobs);
  const textCostUsd = 0;
  return {
    pageId,
    imageCostUsd,
    textCostUsd,
    totalAiCostUsd: roundUsd(imageCostUsd + textCostUsd),
    imageCount,
    retryCount,
    generationJobCount: jobs.length,
  };
}

/** draft 단계 — product_id 없이 draft_token으로 합산 */
export async function getDraftGenerationCost(
  userId: string,
  draftToken: string,
): Promise<PageGenerationCostResult> {
  const store = getQueryJobStore();
  const jobs = await store.listByScope({ userId, draftToken });
  const { imageCostUsd, imageCount, retryCount } = await accumulateJobCosts(jobs);
  const textCostUsd = 0;
  return {
    pageId: `draft:${draftToken}`,
    imageCostUsd,
    textCostUsd,
    totalAiCostUsd: roundUsd(imageCostUsd + textCostUsd),
    imageCount,
    retryCount,
    generationJobCount: jobs.length,
  };
}

export async function getUserGenerationCost(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<UserGenerationCostResult> {
  const store = getQueryJobStore();
  const jobs = (await store.listByScope({ userId })).filter((j) => {
    return j.created_at >= startDate && j.created_at <= endDate;
  });

  const { imageCostUsd, imageCount, retryCount, pageIds } = await accumulateJobCosts(jobs);
  const textCostUsd = 0;
  return {
    userId,
    startDate,
    endDate,
    totalPages: pageIds.size || (jobs.length > 0 ? 1 : 0),
    totalImages: imageCount,
    totalRetries: retryCount,
    imageCostUsd,
    textCostUsd,
    totalAiCostUsd: roundUsd(imageCostUsd + textCostUsd),
  };
}

export async function getDailyGenerationCost(
  date: string,
): Promise<DailyGenerationCostResult> {
  const dayStart = date.includes("T") ? date.slice(0, 10) : date;
  const start = `${dayStart}T00:00:00.000Z`;
  const end = `${dayStart}T23:59:59.999Z`;

  let jobs: ImageGenerationJobRow[] = [];

  if (getImageJobStoreMode() === "memory") {
    jobs = getMemoryJobStore()
      .listAll()
      .filter((j) => j.created_at >= start && j.created_at <= end);
  } else if (isServiceRoleAvailable()) {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from("image_generation_jobs")
      .select("id")
      .gte("created_at", start)
      .lte("created_at", end);
    const worker = createWorkerJobStore();
    for (const raw of data ?? []) {
      const job = await worker.getJob(String((raw as { id: string }).id));
      if (job) jobs.push(job);
    }
  }

  const { imageCostUsd, imageCount, retryCount, pageIds } = await accumulateJobCosts(jobs);
  const textCostUsd = 0;
  return {
    date: dayStart,
    pages: pageIds.size || (jobs.length > 0 ? 1 : 0),
    images: imageCount,
    retries: retryCount,
    imageCostUsd,
    textCostUsd,
    totalAiCostUsd: roundUsd(imageCostUsd + textCostUsd),
  };
}

/** budget 체크용 — 현재 페이지/draft에 이미 쓴 금액 */
export async function getPageSpentCostUsd(params: {
  pageId?: string | null;
  draftToken?: string | null;
  userId: string;
}): Promise<number> {
  const store = getQueryJobStore();
  const jobs = await store.listByScope({
    userId: params.userId,
    productId: params.pageId,
    draftToken: params.draftToken,
  });
  const { imageCostUsd } = await accumulateJobCosts(jobs);
  return imageCostUsd;
}
