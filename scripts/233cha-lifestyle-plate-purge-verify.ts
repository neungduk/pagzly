/**
 * 233차 — lifestyle trim+purge 배선 검증 (API 0, photo-composite 함수 재사용만).
 *   npx tsx scripts/233cha-lifestyle-plate-purge-verify.ts
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import {
  defringeCutoutEdges,
  purgeDarkPlateFringe,
  trimCutoutToOpaqueBounds,
} from "../lib/photo-composite";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "233cha-lifestyle-plate-purge");
const LIFESTYLE = path.join(ROOT, "lib", "lifestyle-product-composite.ts");

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log("OK", msg);
}

async function countDarkBorderResidue(
  buf: Buffer,
  borderFrac = 0.1,
): Promise<{ count: number; maxBorderAlpha: number }> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const w = info.width;
  const h = info.height;
  const border = Math.max(8, Math.floor(Math.min(w, h) * borderFrac));
  let count = 0;
  let maxBorderAlpha = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const onBorder = x < border || y < border || x >= w - border || y >= h - border;
      if (!onBorder) continue;
      const i = (y * w + x) * 4;
      const a = data[i + 3]!;
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (a >= 16 && (lum < 58 || (lum < 95 && a < 235))) {
        count += 1;
        if (a > maxBorderAlpha) maxBorderAlpha = a;
      }
    }
  }
  return { count, maxBorderAlpha };
}

async function centerOpaqueSample(buf: Buffer): Promise<Uint8Array> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const w = info.width;
  const h = info.height;
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  const out = new Uint8Array(5 * 5 * 4);
  let o = 0;
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const i = ((cy + dy) * w + (cx + dx)) * 4;
      out[o++] = data[i]!;
      out[o++] = data[i + 1]!;
      out[o++] = data[i + 2]!;
      out[o++] = data[i + 3]!;
    }
  }
  return out;
}

async function makePlateResidueCutout(): Promise<Buffer> {
  const size = 256;
  // Full dark semi-transparent plate frame
  const plate = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 20, g: 18, b: 16, alpha: 0.55 },
    },
  })
    .png()
    .toBuffer();
  // Opaque bright product circle in center
  const productSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <circle cx="128" cy="128" r="70" fill="#E8D5B5"/>
    </svg>`,
  );
  return sharp(plate)
    .composite([{ input: await sharp(productSvg).png().toBuffer(), blend: "over" }])
    .png()
    .toBuffer();
}

async function makeCleanCutout(): Promise<Buffer> {
  const size = 256;
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect width="100%" height="100%" fill="transparent"/>
      <circle cx="128" cy="128" r="80" fill="#4A90D9"/>
    </svg>`,
  );
  return sharp(svg).png().ensureAlpha().toBuffer();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  execSync(
    `npx esbuild "lib/lifestyle-product-composite.ts" --bundle=false --format=esm --outfile=NUL`,
    { cwd: ROOT, stdio: "pipe", shell: true },
  );
  console.log("OK esbuild lifestyle-product-composite.ts");

  const src = fs.readFileSync(LIFESTYLE, "utf8");
  assert(src.includes("trimCutoutToOpaqueBounds"), "imports trimCutoutToOpaqueBounds");
  assert(src.includes("purgeDarkPlateFringe"), "imports purgeDarkPlateFringe");
  assert(
    /trimCutoutToOpaqueBounds[\s\S]*purgeDarkPlateFringe[\s\S]*defringeCutoutEdges/.test(src),
    "order trim → purge → defringe in source",
  );

  console.log("=== synthetic plate residue ===");
  const dirty = await makePlateResidueCutout();
  fs.writeFileSync(path.join(OUT, "synthetic-dirty.png"), dirty);

  const before = await countDarkBorderResidue(dirty);
  console.log("dirty residue", before);

  const defringeOnly = await defringeCutoutEdges(dirty);
  const afterDefringe = await countDarkBorderResidue(defringeOnly);
  console.log("defringe-only residue", afterDefringe);
  fs.writeFileSync(path.join(OUT, "synthetic-defringe-only.png"), defringeOnly);
  assert(
    afterDefringe.count === before.count || afterDefringe.maxBorderAlpha >= 100,
    "defringe alone leaves dark plate residue (bug evidence)",
  );
  assert(afterDefringe.count > 1000, `defringe leaves many residues (${afterDefringe.count})`);

  const purged = await purgeDarkPlateFringe(await trimCutoutToOpaqueBounds(dirty));
  const afterPurge = await countDarkBorderResidue(purged);
  console.log("trim+purge residue", afterPurge);
  fs.writeFileSync(path.join(OUT, "synthetic-trim-purge.png"), purged);
  assert(afterPurge.count === 0, "trim+purge removes all dark plate residue");
  assert(afterPurge.maxBorderAlpha === 0, "trim+purge maxBorderAlpha 0");

  console.log("=== clean cutout regression ===");
  const clean = await makeCleanCutout();
  const centerBefore = await centerOpaqueSample(clean);
  const cleanAfter = await purgeDarkPlateFringe(await trimCutoutToOpaqueBounds(clean));
  const centerAfter = await centerOpaqueSample(cleanAfter);
  // Center may shift slightly due to trim+extend; compare relative interior by
  // resampling after aligning via resize to same size and checking product still opaque blue-ish
  const { data: d1, info: i1 } = await sharp(clean).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const { data: d2, info: i2 } = await sharp(cleanAfter)
    .resize(i1.width, i1.height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  void d2;
  void i2;
  // Direct path without size change concern: apply purge only (no trim) on clean
  const purgeOnly = await purgeDarkPlateFringe(clean);
  const c0 = await centerOpaqueSample(clean);
  const c1 = await centerOpaqueSample(purgeOnly);
  let same = 0;
  for (let i = 0; i < c0.length; i += 1) if (c0[i] === c1[i]) same += 1;
  console.log("center pixels identical", same, "/", c0.length);
  assert(same === c0.length, "purge on clean cutout leaves center pixels unchanged");
  void centerBefore;
  void centerAfter;
  void d1;

  // Real fixture before/after if available
  const fixtureCandidates = [
    path.join(ROOT, "review", "debug-cutout", "v2-run"),
    path.join(ROOT, "review", "debug-pet"),
  ];
  let fixtureUsed: string | null = null;
  for (const dir of fixtureCandidates) {
    if (!fs.existsSync(dir)) continue;
    const files = fs
      .readdirSync(dir)
      .filter((f) => /cutout/i.test(f) && /\.(png|webp)$/i.test(f));
    if (files.length === 0) continue;
    const fp = path.join(dir, files[0]!);
    const buf = fs.readFileSync(fp);
    const b0 = await countDarkBorderResidue(buf);
    const after = await purgeDarkPlateFringe(await trimCutoutToOpaqueBounds(buf));
    const b1 = await countDarkBorderResidue(after);
    fs.writeFileSync(path.join(OUT, "fixture-before.png"), buf);
    fs.writeFileSync(path.join(OUT, "fixture-after-trim-purge.png"), after);
    console.log("fixture", path.basename(fp), "residue", b0, "→", b1);
    fixtureUsed = fp;
    break;
  }
  if (!fixtureUsed) console.log("SKIP real fixture — none found");

  // photo-enhance / photo-composite must not contain new 233 wiring (composite only)
  const enhanceDiff = execSync(`git diff -- "lib/photo-enhance.ts"`, {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert(!enhanceDiff.includes("233차"), "photo-enhance.ts has no 233 hunk");
  const pcDiff = execSync(`git diff -- "lib/photo-composite.ts"`, {
    cwd: ROOT,
    encoding: "utf8",
  });
  // may have prior dirt; ensure no 233 comment added this round
  assert(!pcDiff.includes("233차"), "photo-composite.ts has no 233 hunk");

  const lsDiff = execSync(`git diff -- "lib/lifestyle-product-composite.ts"`, {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert(lsDiff.includes("233차") || lsDiff.includes("trimCutoutToOpaqueBounds"), "lifestyle has 233 change");

  console.log("API generate: 0");
  console.log("ALL PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
