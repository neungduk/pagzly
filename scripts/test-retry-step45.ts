/**
 * STEP 4.5 — Worker-only retry (mock provider, no live Replicate)
 *
 * 1) 429 → Worker retry
 * 2) 500 → Worker retry
 * 3) 401 → no retry
 * 4) invalid request → no retry
 * 5) retry 비용 누적 (billed fail + success)
 * 6) budget 초과 시 retry 차단
 * 7) 429가 무한 반복되지 않음 (MAX_JOB_RETRIES)
 *
 * 실행: npx tsx scripts/test-retry-step45.ts
 */
import { resetMemoryAttemptStore } from "@/lib/cost";
import { getAttemptStore } from "@/lib/cost/get-attempt-store";
import { resetAllBudgets } from "@/lib/image-router/budget";
import { createAsyncGenerationJob } from "@/lib/image-router/jobs/async-generation-service";
import {
  MAX_JOB_RETRIES,
  createMockAlwaysRateLimitProvider,
  createMockFailThenSucceedProvider,
  createMockProviderRegistry,
  processGenerationJob,
  resetWorkerInFlightForTests,
} from "@/lib/image-router/jobs/generation-worker";
import { getMemoryJobStore, resetMemoryJobStore } from "@/lib/image-router/jobs/memory-job-store";
import {
  classifyProviderError,
  workerBackoffMs,
} from "@/lib/image-router/errors";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function resetAll() {
  process.env.IMAGE_JOB_STORE = "memory";
  delete process.env.FORCE_GENERATION_FAIL_ATTEMPTS;
  delete process.env.MAX_GENERATION_COST_USD;
  resetMemoryJobStore();
  resetMemoryAttemptStore();
  resetWorkerInFlightForTests();
  resetAllBudgets();
}

async function runWithMock(params: {
  label: string;
  failWith: Array<"RATE_LIMIT" | "SERVER_ERROR" | "AUTH_ERROR" | "INVALID_REQUEST">;
  billedOnFail?: boolean;
  costOnSuccess?: number;
  maxBudgetUsd?: string;
  draftToken: string;
}) {
  const mock = createMockFailThenSucceedProvider({
    failWith: params.failWith,
    billedOnFail: params.billedOnFail,
    costOnSuccess: params.costOnSuccess ?? 0.03,
  });
  const registry = createMockProviderRegistry(mock);

  if (params.maxBudgetUsd) {
    process.env.MAX_GENERATION_COST_USD = params.maxBudgetUsd;
  }

  const created = await createAsyncGenerationJob({
    userId: "retry-step45-user",
    store: getMemoryJobStore(),
    body: {
      taskType: "PRODUCT_ONLY",
      prompt: `mock ${params.label}`,
      aspectRatio: "1:1",
      resolution: "1024",
      draftToken: params.draftToken,
      idempotencyKey: `step45-${params.label}-${Date.now()}`,
    },
  });

  const job = await processGenerationJob(created.id, {
    store: getMemoryJobStore(),
    attemptStore: getAttemptStore(),
    registry,
    skipBackoff: true,
  });

  const attempts = await getAttemptStore().listByGeneration(created.id);
  delete process.env.MAX_GENERATION_COST_USD;

  return {
    job,
    attempts,
    providerCalls: mock.getCallCount(),
    totalCost: attempts.reduce((s, a) => s + a.actualCostUsd, 0),
  };
}

async function main() {
  process.env.IMAGE_JOB_STORE = "memory";

  console.log("\n=== classify smoke ===");
  const r429 = classifyProviderError(new Error("429 Too Many Requests"), {
    provider: "flux",
    model: "flux-2-pro",
  });
  assert(r429.type === "RATE_LIMIT" && r429.retryable, "429 RATE_LIMIT retryable");
  const r401 = classifyProviderError(new Error("401 Unauthorized invalid API key"), {
    provider: "flux",
    model: "flux-2-pro",
  });
  assert(r401.type === "AUTH_ERROR" && !r401.retryable, "401 AUTH not retryable");
  assert(workerBackoffMs(1) === 2000, "backoff 1 = 2s");
  assert(workerBackoffMs(2) === 5000, "backoff 2 = 5s");
  assert(workerBackoffMs(3) === 15000, "backoff 3 = 15s");
  console.log("classify + backoff OK");

  // 1) 429 → Worker retry
  console.log("\n=== TEST 1: 429 → Worker retry ===");
  await resetAll();
  const t1 = await runWithMock({
    label: "429",
    failWith: ["RATE_LIMIT"],
    draftToken: "d-429",
  });
  console.log({
    status: t1.job?.status,
    attempts: t1.attempts.map((a) => ({
      n: a.attemptNumber,
      status: a.status,
      cost: a.actualCostUsd,
    })),
    providerCalls: t1.providerCalls,
    totalCost: t1.totalCost,
  });
  assert(t1.job?.status === "COMPLETED", "429 job COMPLETED");
  assert(t1.attempts.length === 2, "429 → 2 attempts");
  assert(t1.attempts[0]!.status === "FAILED" && t1.attempts[0]!.actualCostUsd === 0, "429 cost 0");
  assert(t1.attempts[1]!.status === "SUCCEEDED", "2nd SUCCEEDED");
  assert(t1.providerCalls === 2, "provider called twice (Worker only)");

  // 2) 500 → Worker retry
  console.log("\n=== TEST 2: 500 → Worker retry ===");
  await resetAll();
  const t2 = await runWithMock({
    label: "500",
    failWith: ["SERVER_ERROR"],
    draftToken: "d-500",
  });
  console.log({
    status: t2.job?.status,
    attempts: t2.attempts.length,
    providerCalls: t2.providerCalls,
  });
  assert(t2.job?.status === "COMPLETED", "500 job COMPLETED");
  assert(t2.attempts.length === 2, "500 → 2 attempts");
  assert(t2.providerCalls === 2, "500 provider ×2");

  // 3) 401 → no retry
  console.log("\n=== TEST 3: 401 → no retry ===");
  await resetAll();
  const t3 = await runWithMock({
    label: "401",
    failWith: ["AUTH_ERROR"],
    draftToken: "d-401",
  });
  console.log({
    status: t3.job?.status,
    attempts: t3.attempts.length,
    providerCalls: t3.providerCalls,
  });
  assert(t3.job?.status === "FAILED", "401 FAILED");
  assert(t3.attempts.length === 1, "401 no retry");
  assert(t3.providerCalls === 1, "401 single provider call");

  // 4) invalid request → no retry
  console.log("\n=== TEST 4: invalid request → no retry ===");
  await resetAll();
  const t4 = await runWithMock({
    label: "invalid",
    failWith: ["INVALID_REQUEST"],
    draftToken: "d-invalid",
  });
  console.log({
    status: t4.job?.status,
    attempts: t4.attempts.length,
    providerCalls: t4.providerCalls,
  });
  assert(t4.job?.status === "FAILED", "invalid FAILED");
  assert(t4.attempts.length === 1, "invalid no retry");
  assert(t4.providerCalls === 1, "invalid single call");

  // 5) retry 비용 누적 (billed fail + success)
  console.log("\n=== TEST 5: retry cost accumulation ===");
  await resetAll();
  const t5 = await runWithMock({
    label: "cost-accum",
    failWith: ["SERVER_ERROR"],
    billedOnFail: true,
    costOnSuccess: 0.038847,
    draftToken: "d-cost",
  });
  console.log({
    status: t5.job?.status,
    attempts: t5.attempts.map((a) => ({
      n: a.attemptNumber,
      status: a.status,
      cost: a.actualCostUsd,
    })),
    totalCost: t5.totalCost,
    jobActual: t5.job?.actual_cost,
  });
  assert(t5.job?.status === "COMPLETED", "cost accum COMPLETED");
  assert(t5.attempts.length === 2, "2 attempts");
  assert(t5.attempts[0]!.actualCostUsd > 0, "failed billed attempt > 0");
  assert(t5.attempts[1]!.actualCostUsd === 0.038847, "success cost from provider");
  assert(
    Math.abs((t5.job?.actual_cost ?? 0) - t5.totalCost) < 0.0001,
    "job actual == sum attempts",
  );
  assert(t5.totalCost > t5.attempts[1]!.actualCostUsd, "total > single success");

  // 6) budget 초과 시 retry 차단
  console.log("\n=== TEST 6: budget blocks retry ===");
  await resetAll();
  // 첫 attempt 과금 후 다음 estimate가 예산 초과 → BUDGET_EXCEEDED (provider 1회만)
  const t6 = await runWithMock({
    label: "budget",
    failWith: ["SERVER_ERROR", "SERVER_ERROR", "SERVER_ERROR"],
    billedOnFail: true,
    maxBudgetUsd: "0.08",
    draftToken: "d-budget",
  });
  console.log({
    status: t6.job?.status,
    attempts: t6.attempts.map((a) => ({
      n: a.attemptNumber,
      status: a.status,
      cost: a.actualCostUsd,
    })),
    providerCalls: t6.providerCalls,
  });
  assert(
    t6.job?.status === "BUDGET_EXCEEDED" || t6.attempts.some((a) => a.status === "BUDGET_SKIPPED"),
    "budget exceeded / skipped",
  );
  assert(t6.providerCalls === 1, "budget: only 1 provider call before block");
  assert(
    t6.attempts.some((a) => a.status === "BUDGET_SKIPPED"),
    "BUDGET_SKIPPED attempt recorded",
  );

  // 7) 429 무한 반복 없음
  console.log("\n=== TEST 7: 429 not infinite ===");
  await resetAll();
  const always = createMockAlwaysRateLimitProvider();
  const registry7 = createMockProviderRegistry(always);
  const created7 = await createAsyncGenerationJob({
    userId: "retry-step45-user",
    store: getMemoryJobStore(),
    body: {
      taskType: "PRODUCT_ONLY",
      prompt: "always 429",
      resolution: "1024",
      draftToken: "d-infinite",
      idempotencyKey: `step45-infinite-${Date.now()}`,
    },
  });
  const job7 = await processGenerationJob(created7.id, {
    store: getMemoryJobStore(),
    attemptStore: getAttemptStore(),
    registry: registry7,
    skipBackoff: true,
  });
  const attempts7 = await getAttemptStore().listByGeneration(created7.id);
  const expectedAttempts = MAX_JOB_RETRIES + 1;
  console.log({
    status: job7?.status,
    attempts: attempts7.length,
    providerCalls: always.getCallCount(),
    maxJobRetries: MAX_JOB_RETRIES,
  });
  assert(job7?.status === "FAILED", "exhausted → FAILED");
  assert(attempts7.length === expectedAttempts, `exactly ${expectedAttempts} attempts`);
  assert(always.getCallCount() === expectedAttempts, `provider calls == ${expectedAttempts}`);
  assert(attempts7.every((a) => a.actualCostUsd === 0), "all 429 costs 0");

  console.log("\n=== SUMMARY ===");
  console.log("Retry layer: Generation Worker only");
  console.log("ImageRouter / Provider: single call, no internal retry");
  console.log("Backoff:", [workerBackoffMs(1), workerBackoffMs(2), workerBackoffMs(3)], "ms");
  console.log("MAX_JOB_RETRIES:", MAX_JOB_RETRIES, `(max attempts ${expectedAttempts})`);
  console.log("\nSTEP 4.5 PASSED");
}

main().catch((err) => {
  console.error("STEP 4.5 FAILED:", err);
  process.exit(1);
});
