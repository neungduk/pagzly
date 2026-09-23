/**
 * 234차 — 실루엣 그림자 canvasWidth/Height 일반화 + lifestyle 배선 검증 (API 0).
 *   npx tsx scripts/234cha-silhouette-shadow-verify.ts
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import {
  buildProductShadowSvg,
  buildSilhouetteShadowBuffer,
} from "../lib/photo-composite";
import { pasteCutoutOnScene } from "../lib/lifestyle-product-composite";
import { DEFAULT_SHADOW } from "../lib/vision-utils";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "234cha-silhouette-shadow");

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log("OK", msg);
}

async function countOpaque(buf: Buffer): Promise<number> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  let n = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i]! > 0) n += 1;
  }
  void info;
  return n;
}

async function makeCutout(): Promise<Buffer> {
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280">
      <rect width="100%" height="100%" fill="transparent"/>
      <path d="M40 40 H160 V200 Q100 260 40 200 Z" fill="#C4A574"/>
    </svg>`,
  );
  return sharp(svg).png().ensureAlpha().toBuffer();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  for (const f of [
    "lib/photo-composite.ts",
    "lib/photo-enhance.ts",
    "lib/lifestyle-product-composite.ts",
  ]) {
    execSync(
      `npx esbuild "${f}" --bundle=false --format=esm --outfile=NUL`,
      { cwd: ROOT, stdio: "pipe", shell: true },
    );
    console.log("OK esbuild", f);
  }

  // Call sites: definition + hero + lifestyle (+ maybe scripts)
  const grep = execSync(
    `rg -n "buildSilhouetteShadowBuffer\\(" lib scripts --glob "!**/node_modules/**"`,
    { cwd: ROOT, encoding: "utf8", shell: true },
  );
  console.log(grep);
  const lines = grep.trim().split(/\r?\n/).filter(Boolean);
  assert(
    lines.some((l) => l.includes("photo-composite.ts") && l.includes("export async function")),
    "definition in photo-composite",
  );
  assert(lines.some((l) => l.includes("photo-enhance.ts")), "hero call site");
  assert(lines.some((l) => l.includes("lifestyle-product-composite.ts")), "lifestyle call site");

  const cutout = await makeCutout();
  const placement = { left: 400, top: 300, width: 200, height: 280 };

  console.log("=== square canvas regression ===");
  const sq = await buildSilhouetteShadowBuffer(cutout, 1200, 1200, placement, DEFAULT_SHADOW);
  const sqMeta = await sharp(sq).metadata();
  assert(sqMeta.width === 1200 && sqMeta.height === 1200, "square 1200x1200");
  fs.writeFileSync(path.join(OUT, "hero-square-shadow.png"), sq);
  const sqOpaque = await countOpaque(sq);
  console.log("square opaque pixels", sqOpaque);
  assert(sqOpaque > 1000, "square shadow not empty");

  console.log("=== rect lifestyle canvas ===");
  const rect = await buildSilhouetteShadowBuffer(
    cutout,
    1600,
    900,
    { left: 600, top: 200, width: 200, height: 280 },
    DEFAULT_SHADOW,
  );
  const rectMeta = await sharp(rect).metadata();
  assert(rectMeta.width === 1600 && rectMeta.height === 900, "rect 1600x900");
  const rectOpaque = await countOpaque(rect);
  console.log("rect opaque pixels", rectOpaque);
  assert(rectOpaque > 1000, "rect shadow not empty");
  fs.writeFileSync(path.join(OUT, "lifestyle-rect-shadow.png"), rect);

  console.log("=== extreme aspect + edge ===");
  const extreme = await buildSilhouetteShadowBuffer(
    cutout,
    2400,
    600,
    { left: 2100, top: 100, width: 200, height: 280 },
    DEFAULT_SHADOW,
  );
  const exMeta = await sharp(extreme).metadata();
  assert(exMeta.width === 2400 && exMeta.height === 600, "extreme 2400x600 no throw");
  fs.writeFileSync(path.join(OUT, "extreme-shadow.png"), extreme);

  // Ellipse fallback still works (product svg square API)
  const ellipse = buildProductShadowSvg(1200, placement, DEFAULT_SHADOW);
  assert(ellipse.includes("<ellipse"), "ellipse fallback svg intact");

  console.log("=== pasteCutoutOnScene uses silhouette ===");
  const scene = await sharp({
    create: {
      width: 800,
      height: 500,
      channels: 3,
      background: { r: 210, g: 200, b: 185 },
    },
  })
    .png()
    .toBuffer();
  // before: ellipse-only would be smooth oval; silhouette follows bottle path
  const pasted = await pasteCutoutOnScene({
    sceneBuffer: scene,
    cutoutBuffer: cutout,
    placement: {
      xPct: 35,
      yPct: 20,
      wPct: 30,
      hPct: 55,
      rotationDeg: 0,
    },
  });
  fs.writeFileSync(path.join(OUT, "lifestyle-paste-with-silhouette.png"), pasted);
  const pastedMeta = await sharp(pasted).metadata();
  assert(pastedMeta.width === 800 && pastedMeta.height === 500, "paste keeps scene size");

  // Visual: shadow-only layer for eye check silhouette vs ellipse
  const silOnly = await buildSilhouetteShadowBuffer(
    cutout,
    800,
    500,
    { left: 280, top: 100, width: 200, height: 280 },
    DEFAULT_SHADOW,
  );
  const ellSvg = buildProductShadowSvg(800, { left: 280, top: 100, width: 200, height: 280 }, DEFAULT_SHADOW)
    .replace('width="800"', 'width="800"')
    .replace(/width="\d+"/, 'width="800"')
    .replace(/height="\d+"/, 'height="500"');
  // buildProductShadowSvg is square-only — build scene-like compare via silhouette vs multiply preview
  fs.writeFileSync(path.join(OUT, "compare-silhouette-layer.png"), silOnly);
  void ellSvg;

  console.log("API generate: 0");
  console.log("ALL PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
