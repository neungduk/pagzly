/**
 * STEP 4 — generation cost tracking summary.
 * 실행: npx tsx scripts/test-image-router-step4.ts
 */
import {
  ImageRouter,
  getImageJobService,
  resetAllBudgets,
  resetImageJobServiceForTests,
  summarizeGenerationCosts,
} from "@/lib/image-router";

async function main() {
  resetImageJobServiceForTests();
  resetAllBudgets();

  const jobService = getImageJobService({ useMemory: true });
  const router = new ImageRouter({
    context: { userId: "cost-user", draftToken: "draft-cost" },
    jobService,
  });

  await router.generateImage({
    taskType: "HERO_PRODUCT",
    productImages: [],
    prompt: "hero test",
    userId: "cost-user",
    draftToken: "draft-cost",
    idempotencyKey: "cost-1",
  });

  await router.generateImage({
    taskType: "LIFESTYLE",
    productImages: [],
    prompt: "lifestyle test",
    userId: "cost-user",
    draftToken: "draft-cost",
    idempotencyKey: "cost-2",
  });

  const jobs = await jobService.listJobs({ userId: "cost-user", draftToken: "draft-cost" });
  const summary = summarizeGenerationCosts(jobs, {
    userId: "cost-user",
    draftToken: "draft-cost",
  });

  if (summary.totalJobs !== 2) throw new Error(`expected 2 jobs, got ${summary.totalJobs}`);
  if (summary.estimatedCostUsd <= 0) throw new Error("estimated cost should be > 0");

  console.log("summary:", JSON.stringify(summary, null, 2));
  console.log("STEP 4 PASSED");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
