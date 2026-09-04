/**
 * 88차 — grasp 국소 재생성 QA
 *   $env:TEST_MODE="false"; npx tsx scripts/88cha-grasp-refine-qa.ts
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { computeRefineCropRect } from "../lib/lifestyle-product-composite";
import { compositeProductOnLifestylePhoto } from "../lib/lifestyle-product-composite";

const ROOT = path.join(__dirname, "..");
const SHOT_DIR = path.join(ROOT, "review", "qa-screenshots");

const LIFESTYLE_HANDS_RUB_NEGATIVE =
  "https://cdn.pixabay.com/photo/2021/12/22/03/10/self-care-6886590_1280.jpg";
const LIFESTYLE_ARMS_CROSSED =
  "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=1280";
const LIFESTYLE_TRUE_GRIP_DROPPER =
  "https://images.pexels.com/photos/6767822/pexels-photo-6767822.jpeg?auto=compress&cs=tinysrgb&w=1280";

const SUPABASE_BASE =
  "https://sblnthhayvrfkvaksest.supabase.co/storage.v1/object/public/images/2f01ed61-ed80-465d-9c1a-712bbf01a658";

const LABELED_SERUM_BOTTLE = `${SUPABASE_BASE}/1787899786236-cefc3ece-e3fe-4173-b9e9-0c114afa90de-enhanced.png`;
const LABELED_SERUM_BOTTLE_ALT = `${SUPABASE_BASE}/1788219740539-4df15ad7-7ddb-4e54-8ac3-e7c320b0ac6e-enhanced-fx-moisture.png`;

const COST_87CHA_PIXEL_PASTE_EST = 0.005;

type QaCase = {
  name: string;
  lifestyleUrl: string;
  purpose: string;
  expectMethod: "pixel-paste" | "pixel-paste+grasp-refine" | "nano-banana-fallback" | "either-paste";
  expectRefineAttempted: boolean;
};

const CASES: QaCase[] = [
  {
    name: "88cha-true-grip-dropper-serum",
    lifestyleUrl: LIFESTYLE_TRUE_GRIP_DROPPER,
    purpose: "positive-grasp-refine",
    expectMethod: "either-paste",
    expectRefineAttempted: true,
  },
  {
    name: "88cha-fail-rubbing-negative",
    lifestyleUrl: LIFESTYLE_HANDS_RUB_NEGATIVE,
    purpose: "negative-rubbing-fallback",
    expectMethod: "nano-banana-fallback",
    expectRefineAttempted: false,
  },
  {
    name: "88cha-fail-arms-crossed-serum",
    lifestyleUrl: LIFESTYLE_ARMS_CROSSED,
    purpose: "negative-no-hands-fallback",
    expectMethod: "nano-banana-fallback",
    expectRefineAttempted: false,
  },
];

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

function logCropRectUnitTests(): Array<Record<string, unknown>> {
  const examples = [
    {
      label: "union-with-padding-clamped",
      sceneW: 1000,
      sceneH: 800,
      placement: { xPct: 35, yPct: 42, wPct: 18, hPct: 35 },
      graspRegion: { xPct: 38, yPct: 50, wPct: 12, hPct: 25 },
      paddingFraction: 0.8,
    },
    {
      label: "near-edge-clamp",
      sceneW: 800,
      sceneH: 600,
      placement: { xPct: 2, yPct: 3, wPct: 15, hPct: 20 },
      graspRegion: { xPct: 5, yPct: 8, wPct: 10, hPct: 15 },
      paddingFraction: 0.6,
    },
  ];

  return examples.map((ex) => {
    const rect = computeRefineCropRect({
      sceneW: ex.sceneW,
      sceneH: ex.sceneH,
      placement: ex.placement,
      graspRegion: ex.graspRegion,
      paddingFraction: ex.paddingFraction,
    });
    const inBounds =
      rect.left >= 0 &&
      rect.top >= 0 &&
      rect.left + rect.width <= ex.sceneW &&
      rect.top + rect.height <= ex.sceneH;
    console.log(
      `[88cha-unit] ${ex.label}: crop=(${rect.left},${rect.top},${rect.width}x${rect.height}) inBounds=${inBounds}`,
    );
    return { ...ex, rect, inBounds, pass: inBounds && rect.width >= 8 && rect.height >= 8 };
  });
}

async function downloadToDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  const res = await fetch(url, { headers: { "User-Agent": "Pagzly-QA/1.0" } });
  if (!res.ok) throw new Error(`download failed ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mediaType = (res.headers.get("content-type") ?? "image/png").includes("png")
    ? "image/png"
    : "image/jpeg";
  return `data:${mediaType};base64,${buf.toString("base64")}`;
}

async function download(url: string, dest: string): Promise<void> {
  const headers = { "User-Agent": "Pagzly-QA/1.0" };
  if (url.startsWith("data:")) {
    fs.writeFileSync(dest, Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));
    return;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`download failed ${url}: ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
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
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
body{font-family:sans-serif;margin:16px;background:#111;color:#eee}
.row{display:flex;gap:16px;flex-wrap:wrap}
.col{flex:1;min-width:240px}
img{max-width:100%;border:1px solid #444;border-radius:8px}
h2{font-size:13px;font-weight:600;margin:8px 0}
.note{font-size:12px;color:#aaa;margin-bottom:12px;white-space:pre-wrap}
</style></head><body>
<h1>${title}</h1>
${note ? `<p class="note">${note}</p>` : ""}
<div class="row">
  <div class="col"><h2>${leftLabel}</h2><img src="${leftSrc.replace(/\\/g, "/")}" /></div>
  <div class="col"><h2>${rightLabel}</h2><img src="${rightSrc.replace(/\\/g, "/")}" /></div>
</div>
</body></html>`;
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
  if (!fs.existsSync(productPath)) {
    await download(LABELED_SERUM_BOTTLE, productPath).catch(() =>
      download(LABELED_SERUM_BOTTLE_ALT, productPath),
    );
  }
  const productBuf = fs.readFileSync(productPath);
  const productDataUrl = `data:image/png;base64,${productBuf.toString("base64")}`;

  const unitTests = logCropRectUnitTests();
  const only = process.argv.find((a) => a.startsWith("--only="))?.slice("--only=".length);
  const cases = only ? CASES.filter((c) => c.name.includes(only)) : CASES;

  let totalCost = 0;
  let refineSuccessCount = 0;
  let refineAttemptCount = 0;
  const results: Array<Record<string, unknown>> = [];

  for (const c of cases) {
    console.log(`\n[88cha] === ${c.name} (${c.purpose}) ===`);

    const lifestylePath = path.join(SHOT_DIR, `${c.name}-input-lifestyle.jpg`);
    await download(c.lifestyleUrl, lifestylePath);

    const result = await compositeProductOnLifestylePhoto({
      lifestyleImageUrl: c.lifestyleUrl,
      productImageUrl: productDataUrl,
      category: "화장품/뷰티",
      productName: "라이트 워터 히알루론 세럼",
      qaGraspRefineDiagnostics: true,
    });

    totalCost += result.cost;

    const diag = result.graspRefineDiagnostics;
    if (diag?.cropRect) refineAttemptCount += 1;
    if (result.method === "pixel-paste+grasp-refine") refineSuccessCount += 1;

    const outPath = path.join(SHOT_DIR, `${c.name}-output.png`);
    const beforePath = path.join(SHOT_DIR, `${c.name}-before-refine.png`);
    if (result.composited) {
      await download(result.url, outPath);
      if (result.qaPasteBeforeRefineUrl) {
        await download(result.qaPasteBeforeRefineUrl, beforePath);
      }
    } else {
      fs.copyFileSync(lifestylePath, outPath);
    }

    const prior87 = path.join(
      SHOT_DIR,
      c.name
        .replace("88cha-fail-rubbing-negative", "87cha-fail-rubbing-negative")
        .replace("88cha-fail-arms-crossed-serum", "87cha-fail-arms-crossed-serum")
        .replace("88cha-true-grip-dropper-serum", "87cha-true-grip-dropper-serum") + "-output.png",
    );
    if (fs.existsSync(prior87) && fs.existsSync(outPath)) {
      const note = diag
        ? `outsideIdentical=${diag.outsideCropIdentical} diff=${diag.outsideCropDiffPixels}/${diag.outsideCropTotalPixels} labelDelta=${diag.labelOppositeColorDelta?.toFixed(2) ?? "n/a"}`
        : "no refine diagnostics";
      const html = path.join(SHOT_DIR, `${c.name}-before-after-refine.html`);
      await saveCompareHtml(
        html,
        `${c.name} — 87차 paste vs 88차`,
        "87차 (paste only)",
        prior87,
        `88차 (${result.method})`,
        outPath,
        note,
      );
      await screenshotCompare(html, path.join(SHOT_DIR, `${c.name}-before-after-refine.png`));
    }

    if (result.qaPasteBeforeRefineUrl && fs.existsSync(beforePath) && fs.existsSync(outPath)) {
      const html = path.join(SHOT_DIR, `${c.name}-paste-vs-refined.html`);
      await saveCompareHtml(
        html,
        `${c.name} — paste vs refined (same run)`,
        "paste (pre-refine)",
        beforePath,
        `refined (${result.method})`,
        outPath,
        diag ? JSON.stringify(diag, null, 2) : "",
      );
      await screenshotCompare(html, path.join(SHOT_DIR, `${c.name}-paste-vs-refined.png`));
    }

    const fullHtml = path.join(SHOT_DIR, `${c.name}-full-compare.html`);
    await saveCompareHtml(
      fullHtml,
      `${c.name} — 전체`,
      "원본 라이프스타일",
      lifestylePath,
      `88차 (${result.method ?? "none"})`,
      outPath,
      diag ? JSON.stringify(diag, null, 2) : "",
    );
    await screenshotCompare(fullHtml, path.join(SHOT_DIR, `${c.name}-full-compare.png`));

    const metExpectation =
      c.expectMethod === "either-paste"
        ? result.method === "pixel-paste" || result.method === "pixel-paste+grasp-refine"
        : result.method === c.expectMethod;

    results.push({
      name: c.name,
      purpose: c.purpose,
      method: result.method,
      cost: result.cost,
      metExpectation,
      expectRefineAttempted: c.expectRefineAttempted,
      refineAttempted: Boolean(diag?.cropRect),
      graspRefineDiagnostics: diag,
    });

    console.log(
      `[88cha] ${c.name}: method=${result.method} cost=$${result.cost.toFixed(4)} met=${metExpectation}`,
    );

    await new Promise((r) => setTimeout(r, 12_000));
  }

  const summary = {
    pipeline: "88cha-grasp-local-refine",
    totalCost,
    cost87chaPixelPasteEst: COST_87CHA_PIXEL_PASTE_EST,
    nanoBananaRefineCostPerSuccess: 0.039,
    refineAttemptCount,
    refineSuccessCount,
    unitTests,
    results,
  };

  fs.writeFileSync(
    path.join(ROOT, "review", "88cha-composite-summary.json"),
    JSON.stringify(summary, null, 2),
    "utf8",
  );
  console.log(`\n[88cha] total cost: $${totalCost.toFixed(4)}`);
  console.log(`[88cha] refine success: ${refineSuccessCount}/${refineAttemptCount}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
