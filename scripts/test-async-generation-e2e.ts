/**
 * STEP 3 E2E — 비동기 generation job + FLUX.2 Pro 실생성.
 *
 * IMAGE_JOB_STORE=memory 로 DB 없이 worker 직접 실행.
 * FLUX_API_KEY 또는 REPLICATE_API_TOKEN 필요.
 *
 * 실행:
 *   npx tsx scripts/test-async-generation-e2e.ts
 *   npx tsx scripts/test-async-generation-e2e.ts https://public-product-image.jpg
 */
import {
  createAsyncGenerationJob,
  pollGenerationUntilDone,
  runGenerationJobSync,
} from "@/lib/image-router/jobs/async-generation-service";
import { resetWorkerInFlightForTests } from "@/lib/image-router/jobs/generation-worker";
import { getMemoryJobStore, resetMemoryJobStore } from "@/lib/image-router/jobs/memory-job-store";
import { createFluxProvider } from "@/lib/image-router/providers/flux-provider";
import { resetAllBudgets } from "@/lib/image-router/budget";
import { resetImageJobServiceForTests } from "@/lib/image-router/jobs/job-service";

process.env.IMAGE_JOB_STORE = "memory";

async function main() {
  const provider = createFluxProvider();
  if (!provider.isAvailable()) {
    console.log("SKIP — FLUX_API_KEY / REPLICATE_API_TOKEN 없음");
    process.exit(0);
  }

  resetMemoryJobStore();
  resetImageJobServiceForTests();
  resetWorkerInFlightForTests();
  resetAllBudgets();

  const store = getMemoryJobStore();
  const userId = "e2e-async-user";
  const imageArg = process.argv[2];
  const inputImages =
    imageArg?.startsWith("http")
      ? [{ url: imageArg }]
      : [];

  const created = await createAsyncGenerationJob({
    userId,
    store,
    body: {
      taskType: inputImages.length > 0 ? "HERO_PRODUCT" : "PRODUCT_ONLY",
      prompt:
        inputImages.length > 0
          ? "Professional e-commerce hero product photo, clean studio background, preserve product packaging, no text"
          : "Clean minimal product photography studio backdrop, soft gradient, empty center, no product, no text",
      inputImages,
      aspectRatio: "1:1",
      resolution: "768",
      idempotencyKey: `e2e-async-${Date.now()}`,
      draftToken: "e2e-draft",
    },
  });

  console.log("created:", created);

  await runGenerationJobSync(created.id, store);

  const finalStatus = await pollGenerationUntilDone({
    jobId: created.id,
    userId,
    store,
    timeoutMs: 180_000,
    intervalMs: 500,
  });

  if (!finalStatus) throw new Error("poll timeout");

  console.log("\n=== E2E RESULT ===");
  console.log("id:", finalStatus.id);
  console.log("status:", finalStatus.status);
  console.log("progress:", finalStatus.progress);
  console.log("outputs:", JSON.stringify(finalStatus.outputs, null, 2));
  console.log("error:", finalStatus.error);
  console.log("actualCost:", finalStatus.actualCost);
  console.log("generationTimeMs:", finalStatus.generationTimeMs);
  console.log("retryCount:", finalStatus.retryCount);

  if (finalStatus.status !== "COMPLETED" || finalStatus.outputs.length === 0) {
    throw new Error(finalStatus.error ?? "E2E failed");
  }

  console.log("\nSTEP 3 E2E PASSED");
}

main().catch((err) => {
  console.error("STEP 3 E2E FAILED:", err);
  process.exit(1);
});
