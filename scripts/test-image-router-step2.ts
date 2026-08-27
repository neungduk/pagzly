/**
 * STEP 2 — FLUX.2 Pro provider 연결 검증.
 * FLUX_API_KEY 또는 REPLICATE_API_TOKEN 있을 때만 live call.
 * 실행: npx tsx scripts/test-image-router-step2.ts
 */
import { createFluxProvider, resetAllBudgets } from "@/lib/image-router";

async function main() {
  const provider = createFluxProvider();
  console.log("FluxProvider available:", provider.isAvailable());

  if (!provider.isAvailable()) {
    console.log("SKIP live call — no FLUX_API_KEY / REPLICATE_API_TOKEN");
    console.log("STEP 2 PASSED (availability check only)");
    return;
  }

  resetAllBudgets();

  const result = await provider.generate({
    request: {
      taskType: "PRODUCT_ONLY",
      productImages: [],
      prompt:
        "Clean minimal product photography backdrop, soft gradient, empty studio, no product, no text",
      aspectRatio: "1:1",
      resolution: "512",
    },
    productImages: [],
    prompt:
      "Clean minimal product photography backdrop, soft gradient, empty studio, no product, no text",
    timeoutMs: 180_000,
  });

  if (result.outputUrls.length === 0) {
    throw new Error("No output URLs from FluxProvider");
  }

  console.log("output:", result.outputUrls[0]?.slice(0, 120));
  console.log("cost:", result.actualCost);
  console.log("metadata:", result.metadata);
  console.log("STEP 2 PASSED (live API)");
}

main().catch((err) => {
  console.error("STEP 2 FAILED:", err);
  process.exit(1);
});
