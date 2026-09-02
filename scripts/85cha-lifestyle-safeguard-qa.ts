/**
 * 85차 — Vision confidence 보정 + 얼굴/목 배치 하드 세이프가드 QA
 *   $env:TEST_MODE="false"; npx tsx scripts/85cha-lifestyle-safeguard-qa.ts
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import {
  overlapsExclusionZone,
  expandRegionWithPadding,
} from "../lib/detect-held-object-placement";
import { compositeProductOnLifestylePhoto } from "../lib/lifestyle-product-composite";

const ROOT = path.join(__dirname, "..");
const SHOT_DIR = path.join(ROOT, "review", "qa-screenshots");

const LIFESTYLE_HANDS_RUB =
  "https://cdn.pixabay.com/photo/2021/12/22/03/10/self-care-6886590_1280.jpg";
const LIFESTYLE_ARMS_CROSSED =
  "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=1280";

const SUPABASE_BASE =
  "https://sblnthhayvrfkvaksest.supabase.co/storage/v1/object/public/images/2f01ed61-ed80-465d-9c1a-712bbf01a658";

const LABELED_SERUM_BOTTLE = `${SUPABASE_BASE}/1787899786236-cefc3ece-e3fe-4173-b9e9-0c114afa90de-enhanced.png`;
const LABELED_COSMETIC_JAR = `${SUPABASE_BASE}/1788219741331-07931081-79e9-482d-a21e-e7ba8da2f28d-enhanced.png`;

type QaCase = {
  name: string;
  lifestyleUrl: string;
  productUrl: string;
  productName: string;
  category: string;
  purpose: string;
  expectMethod: "pixel-paste" | "nano-banana-fallback" | "either";
};

const CASES: QaCase[] = [
  {
    name: "85cha-fail-arms-crossed-serum",
    lifestyleUrl: LIFESTYLE_ARMS_CROSSED,
    productUrl: LABELED_SERUM_BOTTLE,
    productName: "라이트 워터 히알루론 세럼",
    category: "화장품/뷰티",
    purpose: "84cha-failure-must-fallback",
    expectMethod: "nano-banana-fallback",
  },
  {
    name: "85cha-fail-non-grip-rubbing",
    lifestyleUrl: LIFESTYLE_HANDS_RUB,
    productUrl: LABELED_SERUM_BOTTLE,
    productName: "라이트 워터 히알루론 세럼",
    category: "화장품/뷰티",
    purpose: "84cha-failure-must-fallback",
    expectMethod: "nano-banana-fallback",
  },
  {
    name: "85cha-regression-labeled-serum-hands",
    lifestyleUrl: LIFESTYLE_HANDS_RUB,
    productUrl: LABELED_SERUM_BOTTLE,
    productName: "라이트 워터 히알루론 세럼",
    category: "화장품/뷰티",
    purpose: "84cha-success-regression",
    expectMethod: "either",
  },
  {
    name: "85cha-regression-labeled-jar-hands",
    lifestyleUrl: LIFESTYLE_HANDS_RUB,
    productUrl: LABELED_COSMETIC_JAR,
    productName: "수분 크림",
    category: "화장품/뷰티",
    purpose: "84cha-success-regression",
    expectMethod: "either",
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

function logOverlapUnitTests(): Array<Record<string, unknown>> {
  const faceRegion = { xPct: 30, yPct: 5, wPct: 40, hPct: 35 };
  const expanded = expandRegionWithPadding(faceRegion, 0.25);

  const examples = [
    {
      label: "chin-placement-overlaps-face",
      placement: { xPct: 42, yPct: 45, wPct: 12, hPct: 28 },
      faceRegion,
      expected: true,
    },
    {
      label: "hand-lower-frame-no-overlap",
      placement: { xPct: 45, yPct: 55, wPct: 12, hPct: 28 },
      faceRegion,
      expected: false,
    },
    {
      label: "edge-touching-padded-zone",
      placement: { xPct: 20, yPct: 36, wPct: 10, hPct: 20 },
      faceRegion,
      expected: true,
    },
  ];

  const results = examples.map((ex) => {
    const actual = overlapsExclusionZone(ex.placement, ex.faceRegion, 0.25);
    console.log(
      `[85cha-unit] ${ex.label}: overlaps=${actual} (expected=${ex.expected}) ` +
        `placement=(${ex.placement.xPct},${ex.placement.yPct},${ex.placement.wPct}x${ex.placement.hPct}) ` +
        `face=(${ex.faceRegion.xPct},${ex.faceRegion.yPct},${ex.faceRegion.wPct}x${ex.faceRegion.hPct}) ` +
        `expanded=(${expanded.xPct.toFixed(1)},${expanded.yPct.toFixed(1)},${expanded.wPct.toFixed(1)}x${expanded.hPct.toFixed(1)})`,
    );
    return { ...ex, actual, pass: actual === ex.expected };
  });

  return results;
}

async function download(url: string, dest: string): Promise<void> {
  const headers = { "User-Agent": "Pagzly-QA/1.0 (lifestyle-composite-qa)" };
  if (url.startsWith("data:")) {
    const b64 = url.slice(url.indexOf(",") + 1);
    fs.writeFileSync(dest, Buffer.from(b64, "base64"));
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
.note{font-size:12px;color:#aaa;margin-bottom:12px}
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

  const unitTests = logOverlapUnitTests();
  const only = process.argv.find((a) => a.startsWith("--only="))?.slice("--only=".length);
  const cases = only ? CASES.filter((c) => c.name.includes(only)) : CASES;

  let totalCost = 0;
  let fallbackCount = 0;
  let pixelPasteCount = 0;
  const results: Array<Record<string, unknown>> = [];

  for (const c of cases) {
    console.log(`\n[85cha] === ${c.name} (${c.purpose}) ===`);
    const lifestylePath = path.join(SHOT_DIR, `${c.name}-input-lifestyle.jpg`);
    const productPath = path.join(SHOT_DIR, `${c.name}-input-product.png`);
    await download(c.lifestyleUrl, lifestylePath);
    await download(c.productUrl, productPath);

    const result = await compositeProductOnLifestylePhoto({
      lifestyleImageUrl: c.lifestyleUrl,
      productImageUrl: c.productUrl,
      category: c.category,
      productName: c.productName,
    });

    totalCost += result.cost;
    if (result.method === "pixel-paste") pixelPasteCount += 1;
    if (result.method === "nano-banana-fallback") fallbackCount += 1;

    const outPath = path.join(SHOT_DIR, `${c.name}-output.png`);
    if (result.composited) {
      await download(result.url, outPath);
    } else {
      fs.copyFileSync(lifestylePath, outPath);
    }

    const prior84 = path.join(
      SHOT_DIR,
      c.name
        .replace("85cha-fail-arms-crossed", "84cha-arms-crossed")
        .replace("85cha-fail-non-grip-rubbing", "84cha-non-grip-rubbing-hands")
        .replace("85cha-regression-labeled-serum", "84cha-labeled-serum")
        .replace("85cha-regression-labeled-jar", "84cha-labeled-jar") + "-output.png",
    );
    const prior84Exists = fs.existsSync(prior84);
    const compareHtml = path.join(SHOT_DIR, `${c.name}-vs-84cha.html`);
    if (prior84Exists) {
      await saveCompareHtml(
        compareHtml,
        `${c.name} — 84차 vs 85차`,
        "84차 (pixel-paste 오판)",
        prior84,
        `85차 (${result.method})`,
        outPath,
        `expect=${c.expectMethod}`,
      );
      await screenshotCompare(compareHtml, path.join(SHOT_DIR, `${c.name}-vs-84cha.png`));
    }

    const fullHtml = path.join(SHOT_DIR, `${c.name}-full-compare.html`);
    await saveCompareHtml(
      fullHtml,
      `${c.name} — 전체`,
      "원본 라이프스타일",
      lifestylePath,
      `85차 (${result.method ?? "none"})`,
      outPath,
      `confidence=${result.placementConfidence ?? "n/a"}`,
    );
    await screenshotCompare(fullHtml, path.join(SHOT_DIR, `${c.name}-full-compare.png`));

    const metExpectation =
      c.expectMethod === "either"
        ? result.composited
        : result.method === c.expectMethod;

    results.push({
      name: c.name,
      purpose: c.purpose,
      expectMethod: c.expectMethod,
      method: result.method,
      composited: result.composited,
      placementConfidence: result.placementConfidence,
      cost: result.cost,
      fallbackReason: result.fallbackReason,
      metExpectation,
      prior84Compare: prior84Exists,
    });

    console.log(
      `[85cha] ${c.name}: method=${result.method} metExpectation=${metExpectation} cost=$${result.cost.toFixed(4)}`,
    );

    await new Promise((r) => setTimeout(r, 12_000));
  }

  const summary = {
    pipeline: "85cha-safeguard-confidence-face-block",
    totalCost,
    pixelPasteCount,
    fallbackCount,
    unitTests,
    results,
  };

  const summaryPath = path.join(ROOT, "review", "85cha-composite-summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");
  console.log(`\n[85cha] total cost: $${totalCost.toFixed(4)}`);
  console.log(`[85cha] pixel-paste: ${pixelPasteCount}, fallback: ${fallbackCount}`);
  console.log(`[85cha] summary: ${summaryPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
