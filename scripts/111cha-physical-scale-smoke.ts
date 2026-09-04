/**
 * 111차 — 물리 스케일 순수함수 + 프롬프트 dry-run
 * 실행: npx tsx scripts/111cha-physical-scale-smoke.ts
 */
import assert from "node:assert/strict";
import {
  ADULT_HAND_WIDTH_CM,
  applyPhysicalScaleToPlacement,
  computeProductHeightPx,
  isProductHeightSensible,
  parseProductHeightCm,
} from "../lib/lifestyle-physical-scale";
import { planLifestyleShots } from "../lib/lifestyle-shot-planner";
import { buildKontextPrompt } from "../lib/image-router/providers/kontext-prompts";

function run() {
  // 손 400px / 제품 9cm → 높이 = 9 * (400/8.5)
  assert.equal(ADULT_HAND_WIDTH_CM, 8.5);
  const expected = 9 * (400 / 8.5);
  const h = computeProductHeightPx({ handWidthPx: 400, productHeightCm: 9 });
  assert.ok(h != null);
  assert.ok(Math.abs(h! - expected) < 0.01);

  assert.equal(parseProductHeightCm("35mL, 높이 약 9cm"), 9);
  assert.equal(parseProductHeightCm("높이 12cm"), 12);
  assert.equal(parseProductHeightCm("65mm"), 6.5);
  assert.equal(parseProductHeightCm("35mL only"), null);
  assert.equal(parseProductHeightCm(null), null);

  assert.equal(isProductHeightSensible(400, 500), true); // 80%
  assert.equal(isProductHeightSensible(401, 500), false); // >80%
  assert.equal(isProductHeightSensible(5, 500), false); // too small

  const placement = applyPhysicalScaleToPlacement({
    placement: {
      xPct: 40,
      yPct: 40,
      wPct: 30,
      hPct: 40,
      rotationDeg: 0,
      confidence: "high",
    },
    handRegions: [{ xPct: 35, yPct: 50, wPct: 20, hPct: 15 }],
    productHeightCm: 9,
    sceneWidthPx: 1000,
    sceneHeightPx: 1500,
    cutoutAspectWH: 0.45,
  });
  assert.ok(placement);
  // hand width = 0.2 * 1000 = 200px → productH = 9*(200/8.5) ≈ 211.76
  const expectHPct = (9 * (200 / 8.5) / 1500) * 100;
  assert.ok(Math.abs(placement!.hPct - expectHPct) < 0.5);

  // 상식 초과 → null
  const tooBig = applyPhysicalScaleToPlacement({
    placement: {
      xPct: 10,
      yPct: 10,
      wPct: 20,
      hPct: 20,
      rotationDeg: 0,
      confidence: "high",
    },
    handRegions: [{ xPct: 0, yPct: 0, wPct: 90, hPct: 40 }],
    productHeightCm: 40,
    sceneWidthPx: 500,
    sceneHeightPx: 500,
  });
  assert.equal(tooBig, null);

  // 안 1 프롬프트
  const plans = planLifestyleShots({
    category: "화장품/뷰티",
    productName: "미스트",
    productSizeHint: "35mL, 높이 약 9cm",
    count: 1,
  });
  assert.equal(plans[0]?.taskType, "PRODUCT_LIFESTYLE_EMPTY_SCENE");
  const k = buildKontextPrompt(plans[0]!.taskType, plans[0]!.prompt);
  assert.match(k, /empty hand|EMPTY HAND|no product/i);
  assert.doesNotMatch(k, /Preserve the product exactly/);

  // ensemble 플래그 off (93차 결론 유지)
  assert.notEqual(process.env.LIFESTYLE_GRASP_ENSEMBLE_ENABLED, "true");

  console.log("111cha-physical-scale-smoke PASS");
}

run();
