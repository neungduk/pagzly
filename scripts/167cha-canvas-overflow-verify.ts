/**
 * 167차 — pasteCutoutOnScene / applyPhysicalScaleToPlacement 캔버스 초과 회귀.
 * /api/generate 없이 sharp만 사용 (무료).
 */
import sharp from "sharp";
import { applyPhysicalScaleToPlacement } from "../lib/lifestyle-physical-scale";
import { pasteCutoutOnScene } from "../lib/lifestyle-product-composite";
import type { HeldObjectPlacement } from "../lib/detect-held-object-placement";
import { isHeldObjectPlacementReasonable } from "../lib/detect-held-object-placement";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("OK:", msg);
  }
}

async function makeOpaquePng(w: number, h: number, rgba: [number, number, number, number]) {
  return sharp({
    create: { width: w, height: h, channels: 4, background: { r: rgba[0], g: rgba[1], b: rgba[2], alpha: rgba[3] } },
  })
    .png()
    .toBuffer();
}

async function main() {
  // --- 원인 1: 물리 스케일 확대 → 상단이 프레임 밖 (클램프 전엔 yPct 음수) ---
  const edgePlacement: HeldObjectPlacement = {
    xPct: 70,
    yPct: 5,
    wPct: 20,
    hPct: 20,
    rotationDeg: 0,
    confidence: "high",
  };
  // hand 20% of 800=160px → 37cm 제품 ≈ 700px ≈ 프레임 70% (MAX 80% 이내)
  const scaled = applyPhysicalScaleToPlacement({
    placement: edgePlacement,
    handRegions: [{ xPct: 10, yPct: 40, wPct: 20, hPct: 15 }],
    productHeightCm: 37,
    sceneWidthPx: 800,
    sceneHeightPx: 1000,
    cutoutAspectWH: 0.55,
  });
  assert(scaled != null, "physical scale returns clamped placement (not null)");
  if (scaled) {
    assert(scaled.yPct >= 0, `scaled.yPct clamped >=0 got ${scaled.yPct}`);
    assert(scaled.xPct >= 0, `scaled.xPct clamped >=0 got ${scaled.xPct}`);
    assert(scaled.xPct + scaled.wPct <= 100.01, `scaled right edge <=100 got ${scaled.xPct + scaled.wPct}`);
    assert(scaled.yPct + scaled.hPct <= 100.01, `scaled bottom edge <=100 got ${scaled.yPct + scaled.hPct}`);
    assert(isHeldObjectPlacementReasonable(scaled), "scaled placement passes isHeldObjectPlacementReasonable");
  }

  // 중심이 가장자리인 채 초대형 스케일 → 클램프 또는 null
  const corner: HeldObjectPlacement = {
    xPct: 85,
    yPct: 80,
    wPct: 12,
    hPct: 15,
    rotationDeg: 0,
    confidence: "high",
  };
  const scaledCorner = applyPhysicalScaleToPlacement({
    placement: corner,
    handRegions: [{ xPct: 5, yPct: 50, wPct: 40, hPct: 25 }],
    productHeightCm: 40,
    sceneWidthPx: 600,
    sceneHeightPx: 800,
    cutoutAspectWH: 0.6,
  });
  if (scaledCorner) {
    assert(scaledCorner.xPct >= 0, `corner clamp xPct>=0 got ${scaledCorner.xPct}`);
    assert(scaledCorner.yPct >= 0, `corner clamp yPct>=0 got ${scaledCorner.yPct}`);
    assert(scaledCorner.xPct + scaledCorner.wPct <= 100.01, "corner right within frame");
    assert(scaledCorner.yPct + scaledCorner.hPct <= 100.01, "corner bottom within frame");
  } else {
    console.log("OK: extreme physical scale correctly rejected (null)");
  }

  // --- 원인 2: rotationDeg=±45 ---
  const scene = await makeOpaquePng(640, 800, [240, 240, 240, 1]);
  const cutout = await makeOpaquePng(200, 320, [40, 120, 200, 1]);
  const rotatedPlacement: HeldObjectPlacement = {
    xPct: 55,
    yPct: 50,
    wPct: 40,
    hPct: 55,
    rotationDeg: 45,
    confidence: "high",
  };
  const pastedRot = await pasteCutoutOnScene({
    sceneBuffer: scene,
    cutoutBuffer: cutout,
    placement: rotatedPlacement,
  });
  const rotMeta = await sharp(pastedRot).metadata();
  assert(rotMeta.width === 640 && rotMeta.height === 800, "45deg paste keeps scene size");

  // --- 원인 1+2 합: 가장자리 + 큰 박스 + 45도 ---
  const comboPlacement: HeldObjectPlacement = {
    xPct: 60,
    yPct: 55,
    wPct: 25,
    hPct: 30,
    rotationDeg: 45,
    confidence: "high",
  };
  const comboScaled =
    applyPhysicalScaleToPlacement({
      placement: comboPlacement,
      handRegions: [{ xPct: 8, yPct: 45, wPct: 38, hPct: 22 }],
      productHeightCm: 32,
      sceneWidthPx: 640,
      sceneHeightPx: 800,
      cutoutAspectWH: 0.5,
    }) ?? comboPlacement;
  assert(
    comboScaled.xPct >= -2 && comboScaled.yPct >= -2,
    "combo scaled stays near-frame",
  );
  const pastedCombo = await pasteCutoutOnScene({
    sceneBuffer: scene,
    cutoutBuffer: cutout,
    placement: { ...comboScaled, rotationDeg: 45 },
  });
  const comboMeta = await sharp(pastedCombo).metadata();
  assert(comboMeta.width === 640 && comboMeta.height === 800, "combo paste keeps scene size");

  // 음수 좌표 placement도 sharp 예외 없이 클램프
  const overflowPlacement: HeldObjectPlacement = {
    xPct: -10,
    yPct: -15,
    wPct: 70,
    hPct: 70,
    rotationDeg: -45,
    confidence: "high",
  };
  const pastedOverflow = await pasteCutoutOnScene({
    sceneBuffer: scene,
    cutoutBuffer: cutout,
    placement: overflowPlacement,
  });
  const overflowMeta = await sharp(pastedOverflow).metadata();
  assert(
    overflowMeta.width === 640 && overflowMeta.height === 800,
    "negative placement paste clamps without throw",
  );

  if (process.exitCode && process.exitCode !== 0) {
    console.error("\n167차 canvas-overflow verification FAILED");
  } else {
    console.log("\n167차 canvas-overflow verification PASSED");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
