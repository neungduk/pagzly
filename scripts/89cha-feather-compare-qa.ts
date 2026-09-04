/**
 * 89차 — 페더링 전/후 비교 + labelDelta 누적
 *   $env:TEST_MODE="false"; npx tsx scripts/89cha-feather-compare-qa.ts
 */
import fs from "fs";
import path from "path";
import Replicate from "replicate";
import { chromium } from "playwright";
import sharp from "sharp";
import {
  detectHandPlacementForProduct,
  findMatchingGraspRegion,
} from "../lib/detect-held-object-placement";
import {
  computeRefineCropRect,
  refineGraspAreaLocally,
  verifyPixelsOutsideCropUnchanged,
  verifyFeatherBlendRegion,
  measureLabelOppositeColorDelta,
} from "../lib/lifestyle-product-composite";

const ROOT = path.join(__dirname, "..");
const SHOT_DIR = path.join(ROOT, "review", "qa-screenshots");

const LIFESTYLE_TRUE_GRIP =
  "https://images.pexels.com/photos/6767822/pexels-photo-6767822.jpeg?auto=compress&cs=tinysrgb&w=1280";
const LIFESTYLE_RUBBING =
  "https://cdn.pixabay.com/photo/2021/12/22/03/10/self-care-6886590_1280.jpg";

function loadEnvLocal(): Record<string, string> {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function loadCutoutBuffer(): Promise<Buffer> {
  const productPath = path.join(SHOT_DIR, "88cha-input-product.png");
  if (!fs.existsSync(productPath)) {
    throw new Error("88cha-input-product.png 없음");
  }
  const productDataUrl = `data:image/png;base64,${fs.readFileSync(productPath).toString("base64")}`;
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN!, useFileOutput: false });
  const model = await replicate.models.get("851-labs", "background-remover");
  const versionId = model.latest_version?.id;
  if (!versionId) throw new Error("background-remover version missing");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const out = await replicate.run(`851-labs/background-remover:${versionId}`, {
        input: { image: productDataUrl },
      });
      return fetchBuffer(String(Array.isArray(out) ? out[0] : out));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (!/429|throttled|rate limit/i.test(msg) || attempt >= 4) throw error;
      await new Promise((r) => setTimeout(r, 12_000));
    }
  }
  throw new Error("removeBg failed");
}

async function pasteCutout(
  sceneBuffer: Buffer,
  cutoutBuffer: Buffer,
  placement: { xPct: number; yPct: number; wPct: number; hPct: number; rotationDeg: number },
): Promise<Buffer> {
  const sceneMeta = await sharp(sceneBuffer).metadata();
  const sceneW = sceneMeta.width ?? 1;
  const sceneH = sceneMeta.height ?? 1;
  const targetW = Math.max(8, Math.round(sceneW * (placement.wPct / 100)));
  const targetH = Math.max(8, Math.round(sceneH * (placement.hPct / 100)));
  const left = Math.round(sceneW * (placement.xPct / 100));
  const top = Math.round(sceneH * (placement.yPct / 100));
  const cutoutPrepared = await sharp(cutoutBuffer)
    .resize(targetW, targetH, { fit: "inside", withoutEnlargement: false })
    .rotate(placement.rotationDeg, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const cutMeta = await sharp(cutoutPrepared).metadata();
  const cutW = cutMeta.width ?? targetW;
  const cutH = cutMeta.height ?? targetH;
  const pasteLeft = left + Math.round((targetW - cutW) / 2);
  const pasteTop = top + Math.round((targetH - cutH) / 2);
  return sharp(sceneBuffer)
    .composite([{ input: cutoutPrepared, left: pasteLeft, top: pasteTop }])
    .png()
    .toBuffer();
}

async function saveCompareHtml(
  outPath: string,
  title: string,
  leftLabel: string,
  leftSrc: string,
  rightLabel: string,
  rightSrc: string,
  note?: string,
) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:sans-serif;margin:16px;background:#111;color:#eee}.row{display:flex;gap:16px;flex-wrap:wrap}.col{flex:1;min-width:240px}img{max-width:100%;border:1px solid #444;border-radius:8px}h2{font-size:13px;margin:8px 0}.note{font-size:12px;color:#aaa;white-space:pre-wrap}</style></head><body>
<h1>${title}</h1>${note ? `<p class="note">${note}</p>` : ""}
<div class="row"><div class="col"><h2>${leftLabel}</h2><img src="${leftSrc.replace(/\\/g, "/")}"/></div>
<div class="col"><h2>${rightLabel}</h2><img src="${rightSrc.replace(/\\/g, "/")}"/></div></div></body></html>`;
  fs.writeFileSync(outPath, html, "utf8");
}

async function screenshotCompare(htmlPath: string, pngPath: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "load" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: pngPath, fullPage: true });
  await browser.close();
}

type ProbeResult = {
  name: string;
  refined: boolean;
  skipReason?: string;
  labelDelta?: number;
  outsideDiff?: string;
  featherBlendMaxError?: number;
  cost: number;
};

async function runRefineProbe(
  name: string,
  lifestyleUrl: string,
  cutoutBuf: Buffer,
  useFeather: boolean,
): Promise<ProbeResult | null> {
  const lifestyleBuf = await fetchBuffer(lifestyleUrl);

  const detection = await detectHandPlacementForProduct(
    { buffer: lifestyleBuf, mediaType: "image/jpeg" },
    { buffer: cutoutBuf, mediaType: "image/png" },
  );

  let cost = detection.cost + 0.00047;

  if (!detection.placement) return null;

  const pasted = await pasteCutout(lifestyleBuf, cutoutBuf, detection.placement);
  const matchedGrasp =
    findMatchingGraspRegion(detection.placement, detection.graspRegions, 0.4) ??
    findMatchingGraspRegion(detection.placement, detection.graspRegions, 0.15) ??
    detection.graspRegions[0];

  if (!matchedGrasp) return null;

  const sceneMeta = await sharp(pasted).metadata();
  const sceneW = sceneMeta.width ?? 1;
  const sceneH = sceneMeta.height ?? 1;
  const cropRect = computeRefineCropRect({
    sceneW,
    sceneH,
    placement: detection.placement,
    graspRegion: matchedGrasp,
  });

  const refine = await refineGraspAreaLocally({
    compositeBuffer: pasted,
    cropRect,
    category: "화장품/뷰티",
    useFeather,
  });
  cost += refine.cost;

  const finalBuffer = refine.refined ? refine.buffer : pasted;
  const outside = await verifyPixelsOutsideCropUnchanged(pasted, finalBuffer, cropRect);
  const labelDelta = await measureLabelOppositeColorDelta(
    pasted,
    finalBuffer,
    detection.placement,
    matchedGrasp,
    sceneW,
    sceneH,
  );

  let featherBlendMaxError: number | undefined;
  if (refine.refined && refine.featheredCrop && useFeather) {
    const blend = await verifyFeatherBlendRegion(
      pasted,
      finalBuffer,
      refine.featheredCrop,
      cropRect,
    );
    featherBlendMaxError = blend.maxChannelError;
  }

  const suffix = useFeather ? "feather" : "hard-edge";
  const outPath = path.join(SHOT_DIR, `89cha-${name}-${suffix}.png`);
  fs.writeFileSync(outPath, finalBuffer);

  return {
    name,
    refined: refine.refined,
    skipReason: refine.skipReason,
    labelDelta,
    outsideDiff: `${outside.diffPixels}/${outside.totalOutside}`,
    featherBlendMaxError,
    cost,
  };
}

async function main() {
  const env = loadEnvLocal();
  for (const [k, v] of Object.entries(env)) {
    if (!process.env[k]) process.env[k] = v;
  }
  if (!process.env.REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN 필요");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY 필요");

  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const cutoutBuf = await loadCutoutBuffer();
  let totalCost = 0.00047;
  const labelDeltas: ProbeResult[] = [];

  console.log("[89cha-feather] true grip — hard-edge vs feather");
  const hard = await runRefineProbe("true-grip", LIFESTYLE_TRUE_GRIP, cutoutBuf, false);
  await new Promise((r) => setTimeout(r, 15_000));
  const feather = await runRefineProbe("true-grip", LIFESTYLE_TRUE_GRIP, cutoutBuf, true);

  if (hard) {
    totalCost += hard.cost;
    labelDeltas.push(hard);
  }
  if (feather) {
    totalCost += feather.cost;
    labelDeltas.push(feather);
  }

  if (hard?.refined && feather?.refined) {
    const html = path.join(SHOT_DIR, "89cha-feather-vs-hard-edge.html");
    await saveCompareHtml(
      html,
      "89cha — 88차 hard-edge vs 89차 feather",
      "88차 hard-edge",
      path.join(SHOT_DIR, "89cha-true-grip-hard-edge.png"),
      "89차 feather (8%)",
      path.join(SHOT_DIR, "89cha-true-grip-feather.png"),
      JSON.stringify({ hard, feather }, null, 2),
    );
    await screenshotCompare(html, path.join(SHOT_DIR, "89cha-feather-vs-hard-edge.png"));
  }

  console.log("[89cha-feather] rubbing — labelDelta only (refine probe if grasp available)");
  await new Promise((r) => setTimeout(r, 15_000));
  const rubFeather = await runRefineProbe("rubbing", LIFESTYLE_RUBBING, cutoutBuf, true);
  if (rubFeather) {
    totalCost += rubFeather.cost;
    labelDeltas.push(rubFeather);
  }

  fs.writeFileSync(
    path.join(ROOT, "review", "89cha-feather-summary.json"),
    JSON.stringify({ totalCost, labelDeltas }, null, 2),
    "utf8",
  );
  console.log(`[89cha-feather] total cost: $${totalCost.toFixed(4)}`);
  console.log(JSON.stringify(labelDeltas, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
