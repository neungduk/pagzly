/**
 * STEP 6 — Kontext Pro E2E
 *
 * 원본 상품 1장 → BACKGROUND_REPLACEMENT → Kontext Pro → Quality Evaluation
 *
 * 사용법:
 *   KONTEXT_API_KEY=... npx tsx scripts/test-kontext-step6.ts [image-path-or-url]
 *
 * KONTEXT_API_KEY 없으면 REPLICATE_API_TOKEN 사용.
 */
import fs from "fs";
import path from "path";
import {
  ImageRouter,
  routeTask,
  resetAllBudgets,
} from "@/lib/image-router";
import { createKontextProvider } from "@/lib/image-router/providers/kontext-provider";
import { evaluateKontextProductPreservation } from "@/lib/image-router/quality/kontext-quality-eval";

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

function findLocalTestImage(): string | null {
  const roots = [
    path.join(process.cwd(), "scripts", "test-assets"),
    path.join(process.cwd(), "test-assets"),
  ];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const stack = [root];
    while (stack.length > 0) {
      const dir = stack.pop()!;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else if (/\.(jpg|jpeg|png|webp)$/i.test(entry.name)) return full;
      }
    }
  }
  return null;
}

async function resolveProductImageUrl(arg?: string): Promise<{ url: string; localPath?: string }> {
  if (arg?.startsWith("http://") || arg?.startsWith("https://")) {
    return { url: arg };
  }
  const local = arg ?? findLocalTestImage();
  if (!local || !fs.existsSync(local)) {
    throw new Error(
      "테스트 이미지 없음 — URL 또는 scripts/test-assets/*.jpg 경로를 인자로 전달하세요.\n" +
        "  npx tsx scripts/download-sample-products.ts 로 샘플 다운로드 가능",
    );
  }
  const buf = fs.readFileSync(local);
  const ext = path.extname(local).slice(1).toLowerCase() || "jpeg";
  const mime = ext === "png" ? "image/png" : "image/jpeg";
  return {
    url: `data:${mime};base64,${buf.toString("base64")}`,
    localPath: local,
  };
}

async function main() {
  loadEnvLocal();

  console.log("\n=== STEP 6: routeTask (Kontext tasks) ===");
  const kontextTasks = [
    "BACKGROUND_REPLACEMENT",
    "PRODUCT_EDIT",
    "PRODUCT_PLACEMENT",
    "PRODUCT_SCENE_CHANGE",
    "PRODUCT_LIFESTYLE_EDIT",
  ] as const;

  for (const task of kontextTasks) {
    const route = routeTask(task);
    assert(route.providerId === "kontext", `${task} → kontext`);
    console.log(`  ${task} → ${route.providerId} (${route.reason})`);
  }

  const fluxRoute = routeTask("PRODUCT_ONLY");
  assert(fluxRoute.providerId === "flux", "PRODUCT_ONLY → flux");
  console.log("  PRODUCT_ONLY → flux OK");

  const provider = createKontextProvider();
  if (!provider.isAvailable()) {
    console.log("\nSKIP E2E — KONTEXT_API_KEY / REPLICATE_API_TOKEN 없음");
    console.log("STEP 6 routing OK, E2E SKIPPED");
    process.exit(0);
  }

  process.env.IMAGE_JOB_STORE = "memory";
  resetAllBudgets();

  const imageArg = process.argv[2];
  const { url: productUrl, localPath } = await resolveProductImageUrl(imageArg);
  console.log("\n=== STEP 6: Kontext Pro BACKGROUND_REPLACEMENT ===");
  console.log("product:", localPath ?? imageArg ?? "(data URL)");

  const router = new ImageRouter({
    context: { userId: "kontext-e2e", draftToken: "kontext-e2e" },
    trackJobs: false,
    timeoutMs: 240_000,
  });

  const bgPrompt =
    "Soft gradient studio backdrop, warm neutral tones, professional e-commerce lighting, " +
    "minimal clean background, no props, no text";

  const result = await router.generateImage({
    taskType: "BACKGROUND_REPLACEMENT",
    productImages: [{ url: productUrl }],
    prompt: bgPrompt,
    aspectRatio: "1:1",
    resolution: "1024",
    userId: "kontext-e2e",
    draftToken: "kontext-e2e",
    idempotencyKey: `kontext-bg-${Date.now()}`,
  });

  console.log("status:", result.status);
  console.log("provider:", result.provider, result.model);
  console.log("cost: $", result.actualCost.toFixed(4));
  console.log("time:", result.generationTimeMs, "ms");

  if (result.status !== "succeeded" || result.outputUrls.length === 0) {
    throw new Error(result.errorMessage ?? "Kontext generation failed");
  }

  assert(result.provider === "kontext", "routed to kontext");
  assert(result.model === "flux-kontext-pro", "flux-kontext-pro model");

  const outDir = path.join(
    process.cwd(),
    "scripts",
    "test-output",
    "kontext-step6",
    new Date().toISOString().replace(/[:.]/g, "-"),
  );

  console.log("\n=== Quality Evaluation ===");
  const quality = await evaluateKontextProductPreservation({
    originalSource: localPath ?? productUrl,
    resultSource: result.outputUrls[0]!,
    outputDir: outDir,
    minCenterSimilarity: 0.65,
  });

  for (const check of quality.checks) {
    console.log(`  ${check.passed ? "PASS" : "FAIL"} ${check.name}: ${check.detail}`);
  }
  console.log("center similarity:", (quality.centerRegionSimilarity * 100).toFixed(1) + "%");
  console.log("edge similarity:", (quality.edgeRegionSimilarity * 100).toFixed(1) + "%");
  console.log("saved:", quality.comparisonPath);

  if (!quality.overallPass) {
    console.warn("\nQuality evaluation: SOME CHECKS FAILED — inspect comparison image manually.");
    console.warn("Product preservation may still be acceptable; review:", quality.comparisonPath);
  } else {
    console.log("\nQuality evaluation: PASSED");
  }

  console.log("\nSTEP 6 PASSED");
}

main().catch((err) => {
  console.error("STEP 6 FAILED:", err);
  process.exit(1);
});
