/**
 * 105cha — planLifestyleShots dry-run (111차: 빈손 씬 프롬프트)
 *
 *   npx tsx scripts/105cha-lifestyle-prompt-smoke.ts
 */
import { planLifestyleShots } from "../lib/lifestyle-shot-planner";
import { buildKontextPrompt } from "../lib/image-router/providers/kontext-prompts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const plans = planLifestyleShots({
  category: "화장품/뷰티",
  productName: "드림글로우 카멜리아 에센스 미스트",
  brandName: "glowiest",
  targetCustomer: "20~30대 여성",
  keyFeatures: "2중 레이어, 미세분사, 35mL",
  productSizeHint: "35mL, 높이 약 9cm",
  count: 2,
  dryRun: true,
});

assert(plans.length === 2, `expected 2 plans, got ${plans.length}`);
for (const p of plans) {
  assert(p.taskType === "PRODUCT_LIFESTYLE_EMPTY_SCENE", `expected empty scene task: ${p.label}`);
  assert(/empty hand|no product/i.test(p.prompt), `missing empty-hand directive: ${p.label}`);
  assert(!/Preserve the product|branding must stay identical/i.test(p.prompt), `legacy product draw: ${p.label}`);
  assert(p.aspectRatio === "3:4" || p.aspectRatio === "2:3", `bad aspect ${p.aspectRatio}`);

  const kontext = buildKontextPrompt(p.taskType, p.prompt);
  assert(/EMPTY HAND|empty hand|no product/i.test(kontext), `kontext missing empty-hand: ${p.label}`);
  assert(!/Preserve the product exactly/i.test(kontext), `kontext still has product lock: ${p.label}`);
}

const replicateInputShape = plans.map((p) => ({
  prompt: p.prompt.slice(0, 120) + "…",
  aspect_ratio: p.aspectRatio,
  taskType: p.taskType,
}));
console.log("\nreplicateInput (dry-run shape):");
console.log(JSON.stringify(replicateInputShape, null, 2));

const withoutHint = planLifestyleShots({
  category: "화장품/뷰티",
  productName: "미스트",
  count: 1,
});
assert(withoutHint[0]?.taskType === "PRODUCT_LIFESTYLE_EMPTY_SCENE", "default empty scene");

console.log("105cha-lifestyle-prompt-smoke PASS");
