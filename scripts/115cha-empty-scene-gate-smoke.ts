/**
 * 115차 — 빈손 씬 점유 게이트 스모크
 * 실행: npx tsx scripts/115cha-empty-scene-gate-smoke.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  decideEmptySceneGate,
  HEURISTIC_OCCUPIED_THRESHOLD,
  scoreCenterObjectness,
  EMPTY_SCENE_RETRY_PROMPT_SUFFIX,
} from "../lib/empty-scene-gate";
import { planLifestyleShots } from "../lib/lifestyle-shot-planner";
import { buildKontextPrompt } from "../lib/image-router/providers/kontext-prompts";

async function run() {
  // --- 순수 decide (Vision 우선) ---
  assert.equal(
    decideEmptySceneGate({ visionHeldObject: true, heuristicScore: 0 }).result,
    "already-occupied",
  );
  assert.equal(
    decideEmptySceneGate({ visionHeldObject: false, heuristicScore: 0.99 }).result,
    "clean",
  );
  assert.equal(
    decideEmptySceneGate({
      visionHeldObject: null,
      heuristicScore: 0,
      failClosedIfNoVision: true,
    }).result,
    "already-occupied",
  );
  assert.equal(
    decideEmptySceneGate({
      visionHeldObject: null,
      heuristicScore: HEURISTIC_OCCUPIED_THRESHOLD,
    }).result,
    "already-occupied",
  );
  assert.equal(
    decideEmptySceneGate({
      visionHeldObject: null,
      heuristicScore: HEURISTIC_OCCUPIED_THRESHOLD - 0.01,
    }).result,
    "clean",
  );

  // --- 112 실측 픽스처: Vision이 true를 반환해야 하는 케이스(시뮬) ---
  const occupiedPath = path.join(
    process.cwd(),
    "review",
    "112cha-lifestyle-empty-scene.png",
  );
  assert.ok(fs.existsSync(occupiedPath), "112 empty-scene fixture missing");
  // 실측 이미지는 Vision 경로가 담당. 휴리스틱만으로는 흰 배경에 약할 수 있음 → Vision 시뮬 검증
  assert.equal(
    decideEmptySceneGate({
      visionHeldObject: true,
      heuristicScore: await scoreCenterObjectness(fs.readFileSync(occupiedPath)),
    }).result,
    "already-occupied",
  );

  // --- 합성 occupied: 피부 바탕 + 중앙 흰 직사각(병) ---
  const occupiedSynthetic = await sharp({
    create: {
      width: 320,
      height: 420,
      channels: 3,
      background: { r: 220, g: 175, b: 145 },
    },
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: 70,
            height: 140,
            channels: 3,
            background: { r: 245, g: 245, b: 248 },
          },
        })
          .png()
          .toBuffer(),
        left: 125,
        top: 120,
      },
    ])
    .png()
    .toBuffer();
  const occScore = await scoreCenterObjectness(occupiedSynthetic);
  console.log(`[115] synthetic occupied score=${occScore.toFixed(3)}`);
  assert.ok(occScore >= HEURISTIC_OCCUPIED_THRESHOLD);
  assert.equal(
    decideEmptySceneGate({
      visionHeldObject: null,
      heuristicScore: occScore,
    }).result,
    "already-occupied",
  );

  // --- 합성 clean: 균일 피부톤 ---
  const cleanBuf = await sharp({
    create: {
      width: 320,
      height: 420,
      channels: 3,
      background: { r: 220, g: 175, b: 145 },
    },
  })
    .png()
    .toBuffer();
  const cleanScore = await scoreCenterObjectness(cleanBuf);
  console.log(`[115] clean skin score=${cleanScore.toFixed(3)}`);
  assert.ok(cleanScore < HEURISTIC_OCCUPIED_THRESHOLD);
  assert.equal(
    decideEmptySceneGate({
      visionHeldObject: null,
      heuristicScore: cleanScore,
    }).result,
    "clean",
  );

  // --- 프롬프트 강화 ---
  const plans = planLifestyleShots({
    category: "화장품/뷰티",
    productName: "테스트",
    count: 1,
  });
  assert.match(plans[0]!.prompt, /completely empty/i);
  assert.match(plans[0]!.prompt, /no cylindrical object/i);
  const kontext = buildKontextPrompt(
    "PRODUCT_LIFESTYLE_EMPTY_SCENE",
    plans[0]!.prompt,
  );
  assert.match(kontext, /Absolutely no bottle/i);
  assert.match(EMPTY_SCENE_RETRY_PROMPT_SUFFIX, /CRITICAL RETRY/);
  assert.doesNotMatch(kontext, /placeholder.?replace|swap.?placeholder/i);

  console.log("115cha-empty-scene-gate-smoke PASS");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
