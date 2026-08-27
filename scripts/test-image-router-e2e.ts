/**
 * STEP 6 — E2E: 실제 상품 이미지 1장 + ImageRouter (FLUX.2 Pro).
 *
 * 사용법:
 *   FLUX_API_KEY=... IMAGE_JOB_STORE=memory npx tsx scripts/test-image-router-e2e.ts [image-path-or-url]
 *
 * image 인자 없으면 scripts/test-assets 내 첫 jpg/png 탐색.
 */
import fs from "fs";
import path from "path";
import {
  ImageRouter,
  getImageJobService,
  resetAllBudgets,
  resetImageJobServiceForTests,
  summarizeGenerationCosts,
} from "@/lib/image-router";
import { createFluxProvider } from "@/lib/image-router/providers/flux-provider";

function findLocalTestImage(): string | null {
  const root = path.join(process.cwd(), "scripts", "test-assets");
  if (!fs.existsSync(root)) return null;

  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/\.(jpg|jpeg|png|webp)$/i.test(entry.name)) return full;
    }
  }
  return null;
}

async function resolveProductImageUrl(arg?: string): Promise<string> {
  if (arg?.startsWith("http://") || arg?.startsWith("https://")) return arg;
  const local = arg ?? findLocalTestImage();
  if (!local || !fs.existsSync(local)) {
    throw new Error(
      "테스트 이미지 없음 — URL 또는 scripts/test-assets/*.jpg 경로를 인자로 전달하세요.",
    );
  }
  const buf = fs.readFileSync(local);
  const ext = path.extname(local).slice(1).toLowerCase() || "jpeg";
  const mime = ext === "png" ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function main() {
  const imageArg = process.argv[2];
  const provider = createFluxProvider();

  if (!provider.isAvailable()) {
    console.log("SKIP E2E — FLUX_API_KEY / REPLICATE_API_TOKEN 없음");
    console.log("STEP 6 SKIPPED (no API key)");
    process.exit(0);
  }

  process.env.IMAGE_JOB_STORE = "memory";
  resetImageJobServiceForTests();
  resetAllBudgets();

  const productUrl = await resolveProductImageUrl(imageArg);
  const isHttpUrl = productUrl.startsWith("http");
  console.log("product image:", imageArg ?? "(auto-discovered local file)", isHttpUrl ? "(remote)" : "(local/data)");

  const jobService = getImageJobService({ useMemory: true });
  const router = new ImageRouter({
    context: { userId: "e2e-user", draftToken: "e2e-draft" },
    jobService,
  });

  const result = await router.generateImage({
    taskType: isHttpUrl ? "HERO_PRODUCT" : "PRODUCT_ONLY",
    productImages: isHttpUrl ? [{ url: productUrl }] : [],
    prompt: isHttpUrl
      ? "Professional e-commerce hero product photo, clean minimal studio background, soft lighting, preserve product packaging exactly, no text"
      : "Clean minimal product photography studio backdrop, soft gradient, empty center, no product, no text",
    aspectRatio: "1:1",
    resolution: "768",
    userId: "e2e-user",
    draftToken: "e2e-draft",
    idempotencyKey: "e2e-hero-1",
  });

  console.log("status:", result.status);
  console.log("provider:", result.provider, result.model);
  console.log("cost:", result.actualCost);
  console.log("output:", result.outputUrls[0]?.slice(0, 120));

  if (result.status !== "succeeded" || result.outputUrls.length === 0) {
    throw new Error(result.errorMessage ?? "E2E generation failed");
  }

  const job = await jobService.getJobStatus(result.generationId);
  if (!job || job.status !== "COMPLETED") {
    throw new Error("job tracking mismatch after E2E");
  }

  const summary = summarizeGenerationCosts(
    await jobService.listJobs({ userId: "e2e-user", draftToken: "e2e-draft" }),
    { userId: "e2e-user", draftToken: "e2e-draft" },
  );
  console.log("cost summary actual=$", summary.actualCostUsd);

  console.log("STEP 6 PASSED (E2E)");
}

main().catch((err) => {
  console.error("STEP 6 FAILED:", err);
  process.exit(1);
});
