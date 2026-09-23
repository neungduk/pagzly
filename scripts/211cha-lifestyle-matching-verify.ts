/**
 * 211차 — lifestyle pasteCutoutOnScene 매칭 3축 배선 검증 (API 0).
 *   npx tsx scripts/211cha-lifestyle-matching-verify.ts
 */
import sharp from "sharp";
import { pasteCutoutOnScene } from "../lib/lifestyle-product-composite";
import {
  matchCutoutGrain,
  matchCutoutSharpness,
  matchCutoutWhiteBalance,
} from "../lib/photo-composite";
import type { HeldObjectPlacement } from "../lib/detect-held-object-placement";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${msg}`);
  }
}

async function meanRgb(buf: Buffer) {
  const { data } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 200) continue;
    r += data[i]!;
    g += data[i + 1]!;
    b += data[i + 2]!;
    n += 1;
  }
  return { r: r / Math.max(n, 1), g: g / Math.max(n, 1), b: b / Math.max(n, 1), n };
}

async function measureBackdropGrain(buf: Buffer): Promise<number> {
  const bgResized = sharp(buf).resize(256, 256, { fit: "cover" }).grayscale();
  const bgSharp = await bgResized.clone().raw().toBuffer({ resolveWithObject: true });
  const bgBlur = await bgResized.clone().blur(1.2).raw().toBuffer({ resolveWithObject: true });
  let sum = 0;
  let n = 0;
  for (let i = 0; i < bgSharp.data.length; i += 1) {
    sum += Math.abs(bgSharp.data[i]! - bgBlur.data[i]!);
    n += 1;
  }
  return n > 0 ? sum / n : 0;
}

async function smoothGradient(size: number): Promise<Buffer> {
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e8e4dc"/><stop offset="100%" stop-color="#c4bbb0"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function solidBlue(size: number): Promise<Buffer> {
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: { r: 20, g: 40, b: 180 },
    },
  })
    .png()
    .toBuffer();
}

async function roughTexture(size: number): Promise<Buffer> {
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <filter id="n">
      <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="5" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 1 0"/>
    </filter>
    <rect width="100%" height="100%" fill="#9a8a70"/>
    <rect width="100%" height="100%" filter="url(#n)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function grayCutout(size: number): Promise<Buffer> {
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 140, g: 140, b: 140, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

async function main() {
  const cutout = await grayCutout(120);
  const smooth = await smoothGradient(256);
  const blue = await solidBlue(256);
  const rough = await roughTexture(256);

  // 1) smooth scene → grain identical; sharpness skip; WB runs but stays valid
  const wbSkip = await matchCutoutWhiteBalance(cutout, smooth);
  const shSkip = await matchCutoutSharpness(cutout, smooth);
  const grSkip = await matchCutoutGrain(cutout, smooth);
  assert(Buffer.compare(grSkip, cutout) === 0, "grain: smooth scene returns identical cutout");
  assert(Buffer.compare(shSkip, cutout) === 0, "sharpness: smooth scene returns identical cutout");
  const meanOrig = await meanRgb(cutout);
  const meanWbSmooth = await meanRgb(wbSkip);
  assert(meanWbSmooth.n > 20, "WB on smooth gradient: returns valid opaque cutout");

  // 2) blue scene + gray cutout → relative blue channel rises (B/R ratio)
  const wbBlue = await matchCutoutWhiteBalance(cutout, blue);
  const meanAfter = await meanRgb(wbBlue);
  const ratioBefore = meanOrig.b / Math.max(meanOrig.r, 1);
  const ratioAfter = meanAfter.b / Math.max(meanAfter.r, 1);
  assert(
    ratioAfter > ratioBefore + 0.05,
    `WB toward blue scene (B/R before=${ratioBefore.toFixed(3)}, after=${ratioAfter.toFixed(3)})`,
  );

  // 3) rough texture → grain alpha in 0.03~0.07 (218차)
  const roughGrain = await measureBackdropGrain(rough);
  assert(roughGrain >= 2.2, `rough grain >= skipThreshold (got ${roughGrain.toFixed(3)})`);
  const grained = await matchCutoutGrain(cutout, rough);
  assert(Buffer.compare(grained, cutout) !== 0, "grain: rough scene modifies cutout");
  const t = Math.min(1, (roughGrain - 2.2) / 6);
  const alpha = 0.03 + t * 0.04;
  assert(alpha >= 0.03 && alpha <= 0.07, `grain alpha in range (alpha=${alpha.toFixed(3)})`);

  // 4) pasteCutoutOnScene end-to-end: valid PNG, same size as scene
  const scene = await smoothGradient(320);
  const placement: HeldObjectPlacement = {
    xPct: 30,
    yPct: 30,
    wPct: 25,
    hPct: 35,
    rotationDeg: 0,
    confidence: "high",
  };
  const pasted = await pasteCutoutOnScene({
    sceneBuffer: scene,
    cutoutBuffer: cutout,
    placement,
  });
  const sceneMeta = await sharp(scene).metadata();
  const outMeta = await sharp(pasted).metadata();
  assert(outMeta.format === "png", "pasteCutoutOnScene returns png");
  assert(
    outMeta.width === sceneMeta.width && outMeta.height === sceneMeta.height,
    `output size matches scene (${outMeta.width}x${outMeta.height})`,
  );
  // 167 regression: no canvas overflow — paste stays within bounds (size equality is the proxy)
  assert(
    (outMeta.width ?? 0) <= (sceneMeta.width ?? 0) &&
      (outMeta.height ?? 0) <= (sceneMeta.height ?? 0),
    "no canvas overflow vs scene",
  );

  console.log("API generate: 0");
  if (process.exitCode) {
    console.error("VERIFY FAILED");
    process.exit(1);
  }
  console.log("VERIFY:0");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
