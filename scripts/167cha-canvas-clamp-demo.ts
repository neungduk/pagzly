/**
 * 167차 — paste 클램프 시각 데모 (API 생성 없음).
 * 가장자리+45도 배치를 씬에 붙여 출력 PNG 저장.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { pasteCutoutOnScene } from "../lib/lifestyle-product-composite";
import { applyPhysicalScaleToPlacement } from "../lib/lifestyle-physical-scale";
import type { HeldObjectPlacement } from "../lib/detect-held-object-placement";

async function solid(w: number, h: number, color: { r: number; g: number; b: number; alpha: number }) {
  return sharp({ create: { width: w, height: h, channels: 4, background: color } }).png().toBuffer();
}

async function main() {
  const outDir = path.join(__dirname, "..", "review", "qa-screenshots");
  fs.mkdirSync(outDir, { recursive: true });

  const scene = await solid(640, 800, { r: 232, g: 228, b: 220, alpha: 1 });
  // 세로형 제품 컷아웃 (반투명 아님)
  const cutout = await solid(180, 300, { r: 60, g: 100, b: 160, alpha: 1 });

  const base: HeldObjectPlacement = {
    xPct: 70,
    yPct: 5,
    wPct: 18,
    hPct: 18,
    rotationDeg: 45,
    confidence: "high",
  };
  const scaled =
    applyPhysicalScaleToPlacement({
      placement: base,
      handRegions: [{ xPct: 12, yPct: 42, wPct: 20, hPct: 14 }],
      productHeightCm: 37,
      sceneWidthPx: 640,
      sceneHeightPx: 800,
      cutoutAspectWH: 0.55,
    }) ?? base;

  const pasted = await pasteCutoutOnScene({
    sceneBuffer: scene,
    cutoutBuffer: cutout,
    placement: { ...scaled, rotationDeg: 45 },
  });

  const out = path.join(outDir, "167cha-canvas-clamp-demo.png");
  await sharp(pasted)
    .composite([
      {
        input: Buffer.from(
          `<svg width="640" height="48"><rect width="640" height="48" fill="#111"/><text x="16" y="30" fill="#fff" font-size="16" font-family="sans-serif">167 canvas clamp: scale+rotate45 — no sharp overflow</text></svg>`,
        ),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toFile(out);

  console.log("wrote", out, "placement", scaled);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
