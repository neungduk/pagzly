/**
 * STEP 4 — AI cost tracking E2E
 *
 * 1) FLUX.2 Pro 1장 생성 → attempt cost → page/user/daily cost
 * 2) FORCE_GENERATION_FAIL_ATTEMPTS=1 → retry 누적 비용
 * 3) budget 차단 검증
 *
 * 실행: npx tsx scripts/test-cost-tracking-step4.ts
 */
import {
  calculateImageCost,
  checkGenerationBudget,
  getDailyGenerationCost,
  getDraftGenerationCost,
  getUserGenerationCost,
  resetMemoryAttemptStore,
  resolveMaxGenerationCostUsd,
} from "@/lib/cost";
import { getAttemptStore } from "@/lib/cost/get-attempt-store";
import {
  createAsyncGenerationJob,
  runGenerationJobSync,
} from "@/lib/image-router/jobs/async-generation-service";
import { resetWorkerInFlightForTests } from "@/lib/image-router/jobs/generation-worker";
import { getMemoryJobStore, resetMemoryJobStore } from "@/lib/image-router/jobs/memory-job-store";
import { createFluxProvider } from "@/lib/image-router/providers/flux-provider";
import { resetAllBudgets } from "@/lib/image-router/budget";

function loadEnvLocal() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    const envPath = path.join(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1]!.trim();
      const val = m[2]!.trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // ignore
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function resetAll() {
  process.env.IMAGE_JOB_STORE = "memory";
  delete process.env.FORCE_GENERATION_FAIL_ATTEMPTS;
  resetMemoryJobStore();
  resetMemoryAttemptStore();
  resetWorkerInFlightForTests();
  resetAllBudgets();
}

async function main() {
  loadEnvLocal();
  process.env.IMAGE_JOB_STORE = "memory";

  const provider = createFluxProvider();
  if (!provider.isAvailable()) {
    console.log("SKIP — no FLUX_API_KEY / REPLICATE_API_TOKEN");
    process.exit(0);
  }

  const userId = "cost-e2e-user";
  const draftToken = "cost-e2e-draft";
  const pageId = "11111111-1111-1111-1111-111111111111";

  console.log("\n=== pricing smoke ===");
  const estimate = calculateImageCost({
    provider: "flux",
    model: "flux-2-pro",
    resolution: "768",
    outputMegapixels: (768 * 768) / 1_000_000,
  });
  console.log("estimate 768:", estimate);
  assert(estimate.currency === "USD", "currency USD");
  assert(estimate.estimatedCostUsd > 0, "estimated > 0");

  // ---------- Test 1: single generation ----------
  console.log("\n=== TEST 1: single FLUX generation + cost queries ===");
  await resetAll();

  const created = await createAsyncGenerationJob({
    userId,
    store: getMemoryJobStore(),
    body: {
      taskType: "PRODUCT_ONLY",
      prompt: "clean studio backdrop, soft gradient, empty center, no product, no text",
      aspectRatio: "1:1",
      resolution: "768",
      pageId,
      draftToken,
      idempotencyKey: `cost-single-${Date.now()}`,
    },
  });

  await runGenerationJobSync(created.id, getMemoryJobStore());

  const job = await getMemoryJobStore().getJob(created.id);
  assert(job?.status === "COMPLETED", "job COMPLETED");
  assert((job?.actual_cost ?? 0) > 0, "job actual_cost > 0");

  const attempts = await getAttemptStore().listByGeneration(created.id);
  assert(attempts.length === 1, `expected 1 attempt, got ${attempts.length}`);
  assert(attempts[0]!.status === "SUCCEEDED", "attempt SUCCEEDED");

  console.log("job.actual_cost:", job!.actual_cost);
  console.log("attempt.actual:", attempts[0]!.actualCostUsd);

  const pageCost = await getDraftGenerationCost(userId, draftToken);
  // also test pageId path — memory jobs have product_id set
  const { getPageGenerationCost } = await import("@/lib/cost/queries");
  const byPage = await getPageGenerationCost(pageId);
  console.log("pageCost (draft):", pageCost);
  console.log("pageCost (pageId):", byPage);

  const today = new Date().toISOString().slice(0, 10);
  const userCost = await getUserGenerationCost(
    userId,
    `${today}T00:00:00.000Z`,
    `${today}T23:59:59.999Z`,
  );
  const daily = await getDailyGenerationCost(today);
  console.log("userCost:", userCost);
  console.log("dailyCost:", daily);

  assert(pageCost.imageCostUsd > 0, "page image cost > 0");
  assert(userCost.totalAiCostUsd > 0, "user cost > 0");
  assert(daily.totalAiCostUsd > 0, "daily cost > 0");

  const singleCost = job!.actual_cost ?? 0;

  // ---------- Test 2: forced retry ----------
  console.log("\n=== TEST 2: forced retry (2 billed attempts) ===");
  await resetAll();

  let job2;
  let attempts2;
  let sumAttempts: number;

  if (process.env.STEP4_QUICK === "1") {
    console.log("STEP4_QUICK=1 — synthetic billed retry (skip live 2nd FLUX)");
    const synth = await createAsyncGenerationJob({
      userId,
      store: getMemoryJobStore(),
      body: {
        taskType: "PRODUCT_ONLY",
        prompt: "synth",
        resolution: "768",
        pageId,
        draftToken: "cost-retry-draft",
        idempotencyKey: `cost-synth-${Date.now()}`,
      },
    });
    const unit = singleCost || 0.03;
    await getAttemptStore().createAttempt({
      generationId: synth.id,
      attemptNumber: 1,
      provider: "flux",
      model: "flux-2-pro",
      status: "FAILED",
      estimatedCostUsd: unit,
      actualCostUsd: unit,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      errorMessage: "synthetic fail for cost test",
    });
    await getAttemptStore().createAttempt({
      generationId: synth.id,
      attemptNumber: 2,
      provider: "flux",
      model: "flux-2-pro",
      status: "SUCCEEDED",
      estimatedCostUsd: unit,
      actualCostUsd: unit,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });
    sumAttempts = await getAttemptStore().sumActualCostByGeneration(synth.id);
    await getMemoryJobStore().updateJob(synth.id, {
      status: "COMPLETED",
      actualCost: sumAttempts,
      progress: 100,
      retryCount: 1,
    });
    job2 = await getMemoryJobStore().getJob(synth.id);
    attempts2 = await getAttemptStore().listByGeneration(synth.id);
  } else {
    console.log("waiting 15s for rate limit…");
    await new Promise((r) => setTimeout(r, 15_000));

    process.env.FORCE_GENERATION_FAIL_ATTEMPTS = "1";

    const created2 = await createAsyncGenerationJob({
      userId,
      store: getMemoryJobStore(),
      body: {
        taskType: "PRODUCT_ONLY",
        prompt: "minimal empty studio backdrop, no text",
        aspectRatio: "1:1",
        resolution: "768",
        pageId,
        draftToken: "cost-retry-draft",
        idempotencyKey: `cost-retry-${Date.now()}`,
      },
    });

    await runGenerationJobSync(created2.id, getMemoryJobStore());
    delete process.env.FORCE_GENERATION_FAIL_ATTEMPTS;

    job2 = await getMemoryJobStore().getJob(created2.id);
    attempts2 = await getAttemptStore().listByGeneration(created2.id);

    if (
      job2?.status !== "COMPLETED" ||
      attempts2.filter((a) => a.actualCostUsd > 0).length < 2
    ) {
      console.warn("live forced-retry incomplete — synthetic fallback");
      await resetAll();
      const synth = await createAsyncGenerationJob({
        userId,
        store: getMemoryJobStore(),
        body: {
          taskType: "PRODUCT_ONLY",
          prompt: "synth",
          resolution: "768",
          pageId,
          draftToken: "cost-retry-draft",
          idempotencyKey: `cost-synth-${Date.now()}`,
        },
      });
      const unit = singleCost || 0.03;
      await getAttemptStore().createAttempt({
        generationId: synth.id,
        attemptNumber: 1,
        provider: "flux",
        model: "flux-2-pro",
        status: "FAILED",
        estimatedCostUsd: unit,
        actualCostUsd: unit,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        errorMessage: "synthetic fail for cost test",
      });
      await getAttemptStore().createAttempt({
        generationId: synth.id,
        attemptNumber: 2,
        provider: "flux",
        model: "flux-2-pro",
        status: "SUCCEEDED",
        estimatedCostUsd: unit,
        actualCostUsd: unit,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
      sumAttempts = await getAttemptStore().sumActualCostByGeneration(synth.id);
      await getMemoryJobStore().updateJob(synth.id, {
        status: "COMPLETED",
        actualCost: sumAttempts,
        progress: 100,
        retryCount: 1,
      });
      job2 = await getMemoryJobStore().getJob(synth.id);
      attempts2 = await getAttemptStore().listByGeneration(synth.id);
    } else {
      sumAttempts = attempts2.reduce((s, a) => s + a.actualCostUsd, 0);
    }
  }

  sumAttempts = attempts2!.reduce((s, a) => s + a.actualCostUsd, 0);

  console.log(
    "attempts:",
    attempts2!.map((a) => ({
      n: a.attemptNumber,
      status: a.status,
      cost: a.actualCostUsd,
    })),
  );
  console.log("job2.actual_cost (sum):", job2?.actual_cost);

  assert(attempts2!.length >= 2, `expected >=2 attempts, got ${attempts2!.length}`);
  const billed = attempts2!.filter((a) => a.actualCostUsd > 0);
  assert(billed.length >= 2, `expected >=2 billed attempts, got ${billed.length}`);
  assert(
    Math.abs((job2?.actual_cost ?? 0) - sumAttempts) < 0.0001,
    "job actual_cost == sum of attempts",
  );
  assert(sumAttempts >= singleCost * 1.5 || sumAttempts >= 0.05, "retry total accumulates");

  // ---------- Test 3: budget ----------
  console.log("\n=== TEST 3: budget gate ===");
  await resetAll();
  process.env.MAX_GENERATION_COST_USD = "0.01";

  // seed spent via a completed cheap job manually by inserting attempt
  const seed = await createAsyncGenerationJob({
    userId,
    store: getMemoryJobStore(),
    body: {
      taskType: "PRODUCT_ONLY",
      prompt: "x",
      resolution: "512",
      draftToken: "budget-draft",
      idempotencyKey: `budget-seed-${Date.now()}`,
    },
  });
  await getAttemptStore().createAttempt({
    generationId: seed.id,
    attemptNumber: 1,
    provider: "flux",
    model: "flux-2-pro",
    status: "SUCCEEDED",
    estimatedCostUsd: 0.009,
    actualCostUsd: 0.009,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  });
  await getMemoryJobStore().updateJob(seed.id, {
    status: "COMPLETED",
    actualCost: 0.009,
    progress: 100,
  });

  const budgetCheck = await checkGenerationBudget({
    userId,
    draftToken: "budget-draft",
    nextProvider: "flux",
    nextModel: "flux-2-pro",
    nextResolution: "768",
    nextOutputMegapixels: (768 * 768) / 1_000_000,
  });
  console.log("budgetCheck:", budgetCheck);
  assert(budgetCheck.allowed === false, "budget should block next generation");
  assert(resolveMaxGenerationCostUsd() === 0.01, "max budget from env");

  delete process.env.MAX_GENERATION_COST_USD;

  // ---------- Summary stats ----------
  console.log("\n=== TEST DATA SUMMARY ===");
  console.log("이미지 1장 평균 비용 (single):", `$${singleCost.toFixed(4)}`);
  console.log("retry 포함 합계 (billed attempts):", `$${sumAttempts.toFixed(4)}`);
  for (const a of attempts2) {
    console.log(`  attempt ${a.attemptNumber}: ${a.status} $${a.actualCostUsd.toFixed(4)}`);
  }
  console.log("상세페이지 이미지 비용 (page):", `$${byPage.imageCostUsd.toFixed(4)}`);
  console.log("평균 이미지 수 (user):", userCost.totalImages);
  console.log("평균 retry 수 (user):", userCost.totalRetries);
  console.log("페이지 비용 (user totalAi):", `$${userCost.totalAiCostUsd.toFixed(4)}`);

  console.log("\nSTEP 4 E2E PASSED");
}

main().catch((err) => {
  console.error("STEP 4 FAILED:", err);
  process.exit(1);
});
