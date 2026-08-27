/**
 * STEP 1 — ImageRouter 단위 검증 (API 호출 없음).
 * 실행: npx tsx scripts/test-image-router-step1.ts
 */
import {
  clearIdempotencyCache,
  generateImage,
  resetAllBudgets,
  routeTask,
} from "@/lib/image-router";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ASSERT FAIL: ${message}`);
  }
}

async function main() {
  console.log("=== STEP 1: routeTask ===");

  const hero = routeTask("HERO_PRODUCT");
  assert(hero.providerId === "flux", "HERO_PRODUCT → flux");
  assert(hero.model === "flux-2-pro", "HERO_PRODUCT model");

  const bg = routeTask("BACKGROUND_REPLACEMENT");
  assert(bg.providerId === "kontext", "BACKGROUND_REPLACEMENT → kontext");

  const placement = routeTask("PRODUCT_PLACEMENT");
  assert(placement.providerId === "kontext", "PRODUCT_PLACEMENT → kontext");

  const scene = routeTask("PRODUCT_SCENE_CHANGE");
  assert(scene.providerId === "kontext", "PRODUCT_SCENE_CHANGE → kontext");

  const lifestyle = routeTask("PRODUCT_LIFESTYLE_EDIT");
  assert(lifestyle.providerId === "kontext", "PRODUCT_LIFESTYLE_EDIT → kontext");

  const premium = routeTask("LIFESTYLE", "premium");
  assert(premium.providerId === "gemini", "premium → gemini");

  console.log("routeTask: OK");

  console.log("\n=== STEP 1: generateImage (stub — expect failed) ===");
  resetAllBudgets();
  clearIdempotencyCache();

  const result = await generateImage({
    taskType: "HERO_PRODUCT",
    productImages: [{ url: "https://example.com/product.jpg" }],
    prompt: "minimal product hero shot",
    resolution: "1024",
    userId: "test-user",
    draftToken: "draft-1",
    idempotencyKey: "hero-0",
  });

  assert(result.status === "failed", "stub provider returns failed");
  assert(result.provider === "flux", "failed on flux provider");
  assert(result.errorMessage != null, "has error message");

  const cached = await generateImage({
    taskType: "HERO_PRODUCT",
    productImages: [{ url: "https://example.com/product.jpg" }],
    prompt: "minimal product hero shot",
    resolution: "1024",
    userId: "test-user",
    draftToken: "draft-1",
    idempotencyKey: "hero-0",
  });
  assert(cached.generationId === result.generationId, "idempotency returns same result");

  console.log("generateImage stub + idempotency: OK");

  console.log("\n=== STEP 1: budget ===");
  resetAllBudgets();
  clearIdempotencyCache();

  let lastStatus = "";
  for (let i = 0; i < 11; i += 1) {
    const r = await generateImage({
      taskType: "PRODUCT_ONLY",
      productImages: [],
      prompt: "test",
      userId: "budget-user",
      draftToken: "budget-draft",
      idempotencyKey: `slot-${i}`,
    });
    lastStatus = r.status;
  }
  assert(lastStatus === "budget_exceeded", "11th call hits budget");

  console.log("budget limit: OK");
  console.log("\nSTEP 1 ALL PASSED");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
