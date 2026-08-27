/**
 * STEP 3 — job + status tracking (memory store).
 * 실행: npx tsx scripts/test-image-router-step3.ts
 */
import {
  ImageRouter,
  getImageJobService,
  resetAllBudgets,
  resetImageJobServiceForTests,
} from "@/lib/image-router";

async function main() {
  resetImageJobServiceForTests();
  resetAllBudgets();

  const jobService = getImageJobService({ useMemory: true });
  const router = new ImageRouter({
    context: { userId: "job-test-user", draftToken: "draft-abc" },
    jobService,
    trackJobs: true,
  });

  const result = await router.generateImage({
    taskType: "PRODUCT_ONLY",
    productImages: [],
    prompt: "test product backdrop",
    userId: "job-test-user",
    draftToken: "draft-abc",
    idempotencyKey: "job-test-1-unique",
  });

  const job = await jobService.getJobStatus(result.generationId);
  if (!job) throw new Error("job not found");
  if (!job) throw new Error("job not found");
  if (job.task_type !== "PRODUCT_ONLY") throw new Error("task_type mismatch");

  const jobs = await jobService.listJobs({
    userId: "job-test-user",
    draftToken: "draft-abc",
  });
  if (jobs.length !== 1) throw new Error(`expected 1 job, got ${jobs.length}`);

  console.log("job status:", job.status);
  console.log("STEP 3 PASSED");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
