/**
 * STEP 7 — Gemini 3 Pro Image premium + budget-aware fallback
 *
 * 1) FLUX mock generation
 * 2) Quality evaluation (simulated low score)
 * 3) Gemini via priorQualityScore routing OR flux-fail fallback
 * 4) Cost accumulation
 * 5) Budget blocks Gemini fallback
 *
 * Live Gemini E2E when GOOGLE_AI_API_KEY is set.
 *
 * npx tsx scripts/test-gemini-step7.ts
 */
import fs from "fs";
import path from "path";
import {
  GEMINI_QUALITY_THRESHOLD,
  ImageRouter,
  routeTask,
  shouldRouteToGemini,
} from "@/lib/image-router";
import { resetMemoryAttemptStore } from "@/lib/cost";
import { getMemoryAttemptStoreForTests } from "@/lib/cost/get-attempt-store";
import { evaluateKontextProductPreservation } from "@/lib/image-router/quality/kontext-quality-eval";
import type { ImageProvider } from "@/lib/image-router/providers/image-provider";
import type { ProviderRegistry } from "@/lib/image-router/providers/registry";
import { createGeminiProvider } from "@/lib/image-router/providers/gemini-provider";
import { resetAllBudgets } from "@/lib/image-router/budget";

function loadEnvLocal() {
  try {
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

const FLUX_COST = 0.03;
const GEMINI_COST = 0.08;

function createMockFluxProvider(params: {
  mode: "success" | "fail";
  outputUrl?: string;
}): ImageProvider {
  return {
    id: "flux",
    model: "flux-2-pro",
    backend: "replicate",
    isAvailable: () => true,
    async generate(input) {
      if (params.mode === "fail") {
        const { AIProviderError } = await import("@/lib/image-router/errors");
        throw new AIProviderError({
          type: "SERVER_ERROR",
          retryable: true,
          provider: "flux",
          model: "flux-2-pro",
          message: "500 mock flux failure",
          billed: false,
        });
      }
      const url =
        params.outputUrl ??
        input.productImages[0]?.url ??
        "https://example.com/flux-output.png";
      return {
        outputUrls: [url],
        actualCost: FLUX_COST,
        model: "flux-2-pro",
      };
    },
  };
}

function createMockGeminiProvider(outputUrl?: string): ImageProvider {
  return {
    id: "gemini",
    model: "gemini-3-pro-image",
    backend: "direct",
    isAvailable: () => true,
    async generate() {
      return {
        outputUrls: [outputUrl ?? "https://example.com/gemini-output.png"],
        actualCost: GEMINI_COST,
        model: "gemini-3-pro-image",
      };
    },
  };
}

function stubKontext(): ImageProvider {
  return {
    id: "kontext",
    model: "flux-kontext-pro",
    backend: "replicate",
    isAvailable: () => false,
    async generate() {
      throw new Error("stub");
    },
  };
}

function buildRegistry(flux: ImageProvider, gemini: ImageProvider): ProviderRegistry {
  return {
    flux,
    kontext: stubKontext(),
    gemini,
  };
}

async function main() {
  loadEnvLocal();
  process.env.IMAGE_JOB_STORE = "memory";
  resetAllBudgets();
  resetMemoryAttemptStore();

  console.log("\n=== STEP 7: routing rules ===");
  assert(routeTask("PRODUCT_ONLY").providerId === "flux", "PRODUCT_ONLY → flux");
  assert(routeTask("PRODUCT_EDIT").providerId === "kontext", "PRODUCT_EDIT → kontext");
  assert(routeTask("LIFESTYLE", "premium").providerId === "gemini", "premium → gemini");
  assert(
    routeTask("HERO_PRODUCT", { productImageCount: 1 }).providerId === "gemini",
    "HERO + product ref → gemini",
  );
  assert(
    routeTask("PRODUCT_ONLY", { priorQualityScore: 0.4 }).providerId === "gemini",
    "low priorQualityScore → gemini",
  );
  assert(
    !shouldRouteToGemini("DETAIL_PAGE_GRAPHIC", {}),
    "DETAIL_PAGE_GRAPHIC default → not gemini (32cha)",
  );
  assert(
    shouldRouteToGemini("DETAIL_PAGE_GRAPHIC", { priorQualityScore: 0.4 }),
    "DETAIL_PAGE_GRAPHIC + low priorQuality → gemini",
  );
  assert(
    shouldRouteToGemini("COMPARISON", {}),
    "COMPARISON complex → gemini",
  );
  assert(
    routeTask("DETAIL_PAGE_GRAPHIC", {}).providerId === "flux",
    "DETAIL_PAGE_GRAPHIC default → flux",
  );
  console.log("routing OK (threshold", GEMINI_QUALITY_THRESHOLD, ")");

  const tinyPng =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  console.log("\n=== STEP 7: FLUX → quality eval → Gemini escalation ===");
  const fluxMock = createMockFluxProvider({ mode: "success", outputUrl: tinyPng });
  const geminiMock = createMockGeminiProvider(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAAD0e115AAAAGElEQVQYV2NkYGD4z8DAwMgABXAGYQCCZ8VxAAAAAElFTkSuQmCC",
  );

  const router1 = new ImageRouter({
    trackJobs: false,
    registry: buildRegistry(fluxMock, geminiMock),
    context: { userId: "gemini-step7", draftToken: "q1" },
  });

  const fluxResult = await router1.generateImage({
    taskType: "PRODUCT_ONLY",
    productImages: [{ url: tinyPng }],
    prompt: "minimal studio product",
    resolution: "512",
    userId: "gemini-step7",
    draftToken: "q1",
    idempotencyKey: `step7-flux-${Date.now()}`,
  });

  assert(fluxResult.status === "succeeded", "flux mock succeeded");
  assert(fluxResult.provider === "flux", "primary flux");
  assert(fluxResult.actualCost === FLUX_COST, "flux cost");
  console.log("flux cost:", fluxResult.actualCost);

  let simulatedScore = 0.45;
  try {
    const quality = await evaluateKontextProductPreservation({
      originalSource: tinyPng,
      resultSource: fluxResult.outputUrls[0]!,
      outputDir: path.join(process.cwd(), "scripts", "test-output", "gemini-step7-quality"),
      minCenterSimilarity: 0.99,
    });
    console.log("quality center:", (quality.centerRegionSimilarity * 100).toFixed(1) + "%");
    console.log("quality overallPass:", quality.overallPass);
    if (!quality.overallPass) {
      simulatedScore = Math.min(quality.centerRegionSimilarity, 0.55);
    }
  } catch (evalErr) {
    console.warn(
      "quality eval skipped (tiny test asset):",
      evalErr instanceof Error ? evalErr.message : evalErr,
    );
    console.log("using simulated low quality score:", simulatedScore);
  }

  assert(simulatedScore < GEMINI_QUALITY_THRESHOLD, "simulated low quality");

  const router2 = new ImageRouter({
    trackJobs: false,
    registry: buildRegistry(fluxMock, geminiMock),
    context: { userId: "gemini-step7", draftToken: "q1" },
  });

  const geminiEscalation = await router2.generateImage({
    taskType: "PRODUCT_ONLY",
    productImages: [{ url: tinyPng }],
    prompt: "premium studio product, highest quality",
    resolution: "512",
    priorQualityScore: simulatedScore,
    userId: "gemini-step7",
    draftToken: "q1",
    idempotencyKey: `step7-gemini-escalation-${Date.now()}`,
  });

  assert(geminiEscalation.status === "succeeded", "gemini escalation succeeded");
  assert(geminiEscalation.provider === "gemini", "routed to gemini after low quality");
  assert(geminiEscalation.actualCost === GEMINI_COST, "gemini cost");

  const totalCost = fluxResult.actualCost + geminiEscalation.actualCost;
  console.log("accumulated cost (flux + gemini):", totalCost.toFixed(4));
  assert(totalCost === FLUX_COST + GEMINI_COST, "cost accumulation");

  console.log("\n=== STEP 7: FLUX fail → Gemini fallback ===");
  const failFlux = createMockFluxProvider({ mode: "fail" });
  const router3 = new ImageRouter({
    trackJobs: false,
    registry: buildRegistry(failFlux, geminiMock),
    context: { userId: "gemini-step7-fb", draftToken: "q2" },
  });

  const fallbackResult = await router3.generateImage({
    taskType: "PRODUCT_ONLY",
    productImages: [{ url: tinyPng }],
    prompt: "product on gradient",
    resolution: "512",
    userId: "gemini-step7-fb",
    draftToken: "q2",
    idempotencyKey: `step7-fallback-${Date.now()}`,
  });

  assert(fallbackResult.status === "succeeded", "fallback succeeded");
  assert(fallbackResult.provider === "gemini", "gemini fallback provider");
  assert(fallbackResult.retryCount === 1, "retryCount marks fallback");
  assert(fallbackResult.actualCost === GEMINI_COST, "fallback gemini cost only");
  console.log("fallback provider:", fallbackResult.provider, "cost:", fallbackResult.actualCost);

  console.log("\n=== STEP 7: budget blocks Gemini fallback ===");
  process.env.MAX_GENERATION_COST_USD = "0.05";
  resetAllBudgets();

  const attemptStore = getMemoryAttemptStoreForTests();
  await attemptStore.createAttempt({
    generationId: "seed-spent",
    attemptNumber: 1,
    provider: "flux",
    model: "flux-2-pro",
    status: "SUCCEEDED",
    estimatedCostUsd: 0.045,
    actualCostUsd: 0.045,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  });

  const { getMemoryJobStore } = await import("@/lib/image-router/jobs/memory-job-store");
  const jobStore = getMemoryJobStore();
  const seedJob = await jobStore.createJob({
    userId: "gemini-budget-user",
    draftToken: "budget-block",
    prompt: "seed",
    inputImages: [],
    route: routeTask("PRODUCT_ONLY"),
    estimatedCost: 0.045,
    request: {
      taskType: "PRODUCT_ONLY",
      productImages: [],
      prompt: "seed",
      userId: "gemini-budget-user",
      draftToken: "budget-block",
    },
  });
  await jobStore.updateJob(seedJob.id, {
    status: "COMPLETED",
    actualCost: 0.045,
    progress: 100,
  });

  const router4 = new ImageRouter({
    trackJobs: false,
    registry: buildRegistry(failFlux, geminiMock),
    context: { userId: "gemini-budget-user", draftToken: "budget-block" },
  });

  const blocked = await router4.generateImage({
    taskType: "PRODUCT_ONLY",
    productImages: [{ url: tinyPng }],
    prompt: "blocked fallback",
    resolution: "512",
    userId: "gemini-budget-user",
    draftToken: "budget-block",
    idempotencyKey: `step7-budget-${Date.now()}`,
  });

  assert(blocked.status === "budget_exceeded", "fallback blocked by budget");
  console.log("budget block:", blocked.errorMessage?.slice(0, 80));

  delete process.env.MAX_GENERATION_COST_USD;

  const geminiLive = createGeminiProvider();
  if (geminiLive.isAvailable()) {
    console.log("\n=== STEP 7: live Gemini (optional) ===");
    const liveRouter = new ImageRouter({
      trackJobs: false,
      context: { userId: "gemini-live", draftToken: "live" },
      timeoutMs: 240_000,
    });
    const live = await liveRouter.generateImage({
      taskType: "PRODUCT_ONLY",
      productImages: [{ url: tinyPng }],
      prompt: "Premium e-commerce product photo, soft studio lighting",
      qualityLevel: "premium",
      resolution: "512",
      userId: "gemini-live",
      draftToken: "live",
      idempotencyKey: `step7-live-${Date.now()}`,
    });
    console.log("live status:", live.status, "provider:", live.provider, "cost:", live.actualCost);
    if (live.status === "succeeded") {
      console.log("live output length:", live.outputUrls[0]?.slice(0, 40) + "...");
    }
  } else {
    console.log("\nSKIP live Gemini — GOOGLE_AI_API_KEY not set");
  }

  console.log("\n=== SUMMARY ===");
  console.log("Premium routing: qualityLevel / multi-ref / low quality / hero / complex");
  console.log("Fallback: flux|kontext fail → gemini (if cost budget allows)");
  console.log("Cost accumulation verified:", totalCost.toFixed(4));
  console.log("\nSTEP 7 PASSED");
}

main().catch((err) => {
  console.error("STEP 7 FAILED:", err);
  process.exit(1);
});
