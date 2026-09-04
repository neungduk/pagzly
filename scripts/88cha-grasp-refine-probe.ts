/**
 * 88차 — grasp refine 기계적 검증 probe
 * production safeguard는 우회하지만, Vision placement + paste는 실제 호출.
 * grasp 매칭만 0.15 완화(또는 첫 graspRegion) — QA 관찰용.
 *   $env:TEST_MODE="false"; npx tsx scripts/88cha-grasp-refine-probe.ts
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
  measureLabelOppositeColorDelta,
} from "../lib/lifestyle-product-composite";

const ROOT = path.join(__dirname, "..");
const SHOT_DIR = path.join(ROOT, "review", "qa-screenshots");

const LIFESTYLE_TRUE_GRIP_DROPPER =
  "https://images.pexels.com/photos/6767822/pexels-photo-6767822.jpeg?auto=compress&cs=tinysrgb&w=1280";

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

async function removeBg(productDataUrl: string): Promise<Buffer> {
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN!, useFileOutput: false });
  const model = await replicate.models.get("851-labs", "background-remover");
  const versionId = model.latest_version?.id;
  if (!versionId) throw new Error("background-remover version missing");
  const out = await replicate.run(`851-labs/background-remover:${versionId}`, {
    input: { image: productDataUrl },
  });
  const url = Array.isArray(out) ? out[0] : out;
  return fetchBuffer(String(url));
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

async function main() {
  const env = loadEnvLocal();
  for (const [k, v] of Object.entries(env)) {
    if (!process.env[k]) process.env[k] = v;
  }
  if (!process.env.REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN 필요");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY 필요");

  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const productPath = path.join(SHOT_DIR, "88cha-input-product.png");
  if (!fs.existsSync(productPath)) throw new Error("88cha-input-product.png 없음");
  const productDataUrl = `data:image/png;base64,${fs.readFileSync(productPath).toString("base64")}`;

  const [lifestyleBuf, cutoutBuf] = await Promise.all([
    fetchBuffer(LIFESTYLE_TRUE_GRIP_DROPPER),
    removeBg(productDataUrl),
  ]);

  const detection = await detectHandPlacementForProduct(
    { buffer: lifestyleBuf, mediaType: "image/jpeg" },
    { buffer: cutoutBuf, mediaType: "image/png" },
  );

  if (!detection.placement) throw new Error("probe: vision placement 없음");

  const pasted = await pasteCutout(lifestyleBuf, cutoutBuf, detection.placement);
  const sceneMeta = await sharp(pasted).metadata();
  const sceneW = sceneMeta.width ?? 1;
  const sceneH = sceneMeta.height ?? 1;

  const matchedGrasp =
    findMatchingGraspRegion(detection.placement, detection.graspRegions, 0.4) ??
    findMatchingGraspRegion(detection.placement, detection.graspRegions, 0.15) ??
    detection.graspRegions[0] ??
    null;

  if (!matchedGrasp) throw new Error("probe: grasp region 없음");

  const cropRect = computeRefineCropRect({
    sceneW,
    sceneH,
    placement: detection.placement,
    graspRegion: matchedGrasp,
  });

  console.log(`[88cha-probe] crop=(${cropRect.left},${cropRect.top},${cropRect.width}x${cropRect.height})`);

  const refine = await refineGraspAreaLocally({
    compositeBuffer: pasted,
    cropRect,
    category: "화장품/뷰티",
  });

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

  console.log(
    `[88cha-probe] refined=${refine.refined} skip=${refine.skipReason ?? "none"} outsideIdentical=${outside.identical} diff=${outside.diffPixels}/${outside.totalOutside} labelDelta=${labelDelta.toFixed(2)}`,
  );

  const beforePath = path.join(SHOT_DIR, "88cha-probe-paste-before-refine.png");
  const afterPath = path.join(SHOT_DIR, "88cha-probe-after-refine.png");
  fs.writeFileSync(beforePath, pasted);
  fs.writeFileSync(afterPath, finalBuffer);

  const html = path.join(SHOT_DIR, "88cha-probe-paste-vs-refined.html");
  await saveCompareHtml(
    html,
    "88cha-probe — paste vs refined (QA probe)",
    "paste (87차 equivalent)",
    beforePath,
    refine.refined ? "refined (88차)" : `unchanged (${refine.skipReason})`,
    afterPath,
    JSON.stringify({ cropRect, outside, labelDelta, refineApplied: refine.refined, skipReason: refine.skipReason }, null, 2),
  );
  await screenshotCompare(html, path.join(SHOT_DIR, "88cha-probe-paste-vs-refined.png"));

  fs.writeFileSync(
    path.join(ROOT, "review", "88cha-probe-summary.json"),
    JSON.stringify(
      {
        pipeline: "88cha-grasp-refine-probe",
        note: "QA-only probe: production reliability gate bypassed; grasp match relaxed to 0.15 or first graspRegion",
        productionRejectReason: detection.rejectReason,
        refined: refine.refined,
        refineSkipReason: refine.skipReason,
        refineCost: refine.cost,
        outsideCropIdentical: outside.identical,
        outsideCropDiffPixels: outside.diffPixels,
        outsideCropTotalPixels: outside.totalOutside,
        labelOppositeColorDelta: labelDelta,
        cropRect,
      },
      null,
      2,
    ),
    "utf8",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
