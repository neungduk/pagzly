/**
 * 235차 — lifestyle pasteCutoutOnScene featherCutout 배선 검증 (API 0).
 *   npx tsx scripts/235cha-lifestyle-feather-verify.ts
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { featherCutout } from "../lib/photo-composite";
import { pasteCutoutOnScene } from "../lib/lifestyle-product-composite";
import type { HeldObjectPlacement } from "../lib/detect-held-object-placement";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "235cha-lifestyle-feather");
const LIFESTYLE = path.join(ROOT, "lib", "lifestyle-product-composite.ts");

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log("OK", msg);
}

async function countSemiTransparent(buf: Buffer): Promise<number> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  let n = 0;
  for (let i = 0; i < info.width * info.height; i += 1) {
    const a = data[i * 4 + 3]!;
    if (a > 0 && a < 255) n += 1;
  }
  return n;
}

/** Hard-edge rectangle cutout (no AA) — binary alpha. */
async function makeHardEdgeCutout(w = 300, h = 400): Promise<Buffer> {
  const { data, info } = await sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  const x0 = 40;
  const y0 = 40;
  const x1 = w - 40;
  const y1 = h - 40;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * w + x) * 4;
      out[i] = 196;
      out[i + 1] = 160;
      out[i + 2] = 110;
      out[i + 3] = 255;
    }
  }
  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function makeScene(w: number, h: number): Promise<Buffer> {
  return sharp({
    create: {
      width: w,
      height: h,
      channels: 3,
      background: { r: 200, g: 190, b: 175 },
    },
  })
    .png()
    .toBuffer();
}

function placement(): HeldObjectPlacement {
  return {
    xPct: 30,
    yPct: 15,
    wPct: 35,
    hPct: 60,
    rotationDeg: 0,
    confidence: "high",
  };
}

async function edgeCrop(buf: Buffer, outPath: string): Promise<void> {
  const meta = await sharp(buf).metadata();
  const w = meta.width ?? 1;
  const h = meta.height ?? 1;
  // crop around product-ish center-left edge
  const left = Math.max(0, Math.floor(w * 0.28));
  const top = Math.max(0, Math.floor(h * 0.2));
  const cw = Math.min(220, w - left);
  const ch = Math.min(220, h - top);
  await sharp(buf)
    .extract({ left, top, width: cw, height: ch })
    .resize(440, 440, { kernel: "nearest" })
    .png()
    .toFile(outPath);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  execSync(
    `npx esbuild "lib/lifestyle-product-composite.ts" --bundle=false --format=esm --outfile=NUL`,
    { cwd: ROOT, stdio: "pipe", shell: true },
  );
  console.log("OK esbuild lifestyle-product-composite.ts");

  const grep = execSync(`rg -n "featherCutout" lib`, {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
  });
  console.log(grep);
  assert(grep.includes("photo-composite.ts"), "definition in photo-composite");
  assert(
    (grep.match(/lifestyle-product-composite\.ts/g) || []).length >= 2,
    "lifestyle import + call",
  );

  const src = fs.readFileSync(LIFESTYLE, "utf8");
  assert(
    /featherCutout[\s\S]*matchCutoutWhiteBalance[\s\S]*matchCutoutSharpness[\s\S]*matchCutoutGrain/.test(
      src,
    ),
    "order feather → WB → sharpness → grain",
  );
  assert(
    !execSync(`git diff -- "lib/photo-composite.ts" "lib/photo-enhance.ts"`, {
      cwd: ROOT,
      encoding: "utf8",
    }).includes("235차"),
    "photo-composite / photo-enhance have no 235 hunk",
  );

  console.log("=== featherCutout alone ===");
  const hard = await makeHardEdgeCutout();
  fs.writeFileSync(path.join(OUT, "hard-edge-cutout.png"), hard);
  const before = await countSemiTransparent(hard);
  console.log("semi before", before);
  assert(before === 0, "hard edge has 0 semi-transparent pixels");

  const feathered = await featherCutout(hard, Math.max(1600, 900));
  const after = await countSemiTransparent(feathered);
  console.log("semi after feather", after);
  fs.writeFileSync(path.join(OUT, "feathered-cutout.png"), feathered);
  assert(after > 1000, `feather creates semi pixels (got ${after})`);
  const metaH = await sharp(hard).metadata();
  const metaF = await sharp(feathered).metadata();
  assert(
    metaH.width === metaF.width && metaH.height === metaF.height,
    "feather preserves cutout dimensions",
  );

  const extreme = await featherCutout(hard, Math.max(2400, 600));
  assert(
    (await sharp(extreme).metadata()).width === metaH.width,
    "extreme canvasSize feather ok",
  );

  console.log("=== pasteCutoutOnScene square + wide ===");
  for (const [name, w, h] of [
    ["square", 1200, 1200],
    ["wide", 2000, 500],
  ] as const) {
    const scene = await makeScene(w, h);
    const pasted = await pasteCutoutOnScene({
      sceneBuffer: scene,
      cutoutBuffer: hard,
      placement: placement(),
    });
    const m = await sharp(pasted).metadata();
    assert(m.width === w && m.height === h, `${name} paste keeps ${w}x${h}`);
    fs.writeFileSync(path.join(OUT, `paste-${name}.png`), pasted);
    await edgeCrop(pasted, path.join(OUT, `paste-${name}-edge-closeup.png`));
  }

  // before/after closeup: paste without feather vs with — simulate by
  // comparing hard cutout edge (binary) vs feathered cutout edge
  await edgeCrop(hard, path.join(OUT, "edge-before-feather-closeup.png"));
  await edgeCrop(feathered, path.join(OUT, "edge-after-feather-closeup.png"));

  // WB/sharpness/grain still run (no throw) — already exercised via pasteCutoutOnScene
  console.log("OK WB/sharpness/grain path runs after feather (via paste)");

  console.log("API generate: 0");
  console.log("ALL PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
