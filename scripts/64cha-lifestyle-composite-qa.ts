/**
 * 64차 — 라이프스타일+제품 합성 QA (유료, 최대 2회)
 *   npx tsx scripts/64cha-lifestyle-composite-qa.ts
 */

import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { compositeProductOnLifestylePhoto } from "../lib/lifestyle-product-composite";

const ROOT = path.join(__dirname, "..");
const SHOT_DIR = path.join(ROOT, "review", "qa-screenshots");

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

const PRODUCT_URL =
  "https://sblnthhayvrfkvaksest.supabase.co/storage/v1/object/public/images/2f01ed61-ed80-465d-9c1a-712bbf01a658/1788219740539-4df15ad7-7ddb-4e54-8ac3-e7c320b0ac6e-enhanced-fx-moisture.png";

const LIFESTYLE_CASES = [
  {
    name: "64cha-composite-hands",
    lifestyleUrl: "https://cdn.pixabay.com/photo/2021/12/22/03/10/self-care-6886590_1280.jpg",
    label: "self-care hands",
  },
  {
    name: "64cha-composite-cosmetics",
    lifestyleUrl: "https://cdn.pixabay.com/photo/2020/08/09/15/58/cosmetics-5475900_1280.jpg",
    label: "cosmetics flatlay",
  },
] as const;

function bytes(file: string): number {
  return fs.statSync(file).size;
}

async function download(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf;
}

async function saveCompareHtml(
  outPath: string,
  title: string,
  leftLabel: string,
  leftSrc: string,
  rightLabel: string,
  rightSrc: string,
) {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
body{font-family:sans-serif;margin:16px;background:#111;color:#eee}
.row{display:flex;gap:16px;flex-wrap:wrap}
.col{flex:1;min-width:280px}
img{max-width:100%;border:1px solid #444;border-radius:8px}
h2{font-size:14px;font-weight:600;margin:8px 0}
</style></head><body>
<h1>${title}</h1>
<div class="row">
  <div class="col"><h2>${leftLabel}</h2><img src="${leftSrc}" /></div>
  <div class="col"><h2>${rightLabel}</h2><img src="${rightSrc}" /></div>
</div>
</body></html>`;
  fs.writeFileSync(outPath, html, "utf8");
}

async function screenshotCompare(htmlPath: string, pngPath: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: pngPath, fullPage: true });
  await browser.close();
}

async function main() {
  const env = loadEnvLocal();
  for (const [k, v] of Object.entries(env)) {
    if (!process.env[k]) process.env[k] = v;
  }

  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN 필요 (유료 합성 QA)");
  }

  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const productPath = path.join(SHOT_DIR, "64cha-input-product.png");
  await download(PRODUCT_URL, productPath);
  console.log(`[64cha] product input: ${productPath} (${bytes(productPath).toLocaleString()} bytes)`);

  let totalCost = 0;
  const results: Array<{
    name: string;
    composited: boolean;
    cost: number;
    fallbackReason?: string;
  }> = [];

  for (const c of LIFESTYLE_CASES) {
    const lifestylePath = path.join(SHOT_DIR, `${c.name}-input-lifestyle.jpg`);
    await download(c.lifestyleUrl, lifestylePath);
    console.log(`[64cha] lifestyle input (${c.label}): ${lifestylePath}`);

    const result = await compositeProductOnLifestylePhoto({
      lifestyleImageUrl: c.lifestyleUrl,
      productImageUrl: PRODUCT_URL,
      category: "화장품/뷰티",
      productName: "글로우밤 수분 크림",
    });

    totalCost += result.cost;
    results.push({
      name: c.name,
      composited: result.composited,
      cost: result.cost,
      fallbackReason: result.fallbackReason,
    });

    const outPath = path.join(SHOT_DIR, `${c.name}-output.png`);
    if (result.composited) {
      await download(result.url, outPath);
    } else {
      fs.copyFileSync(lifestylePath, outPath);
    }
    console.log(
      `[64cha] ${c.name}: composited=${result.composited} cost=$${result.cost.toFixed(4)}` +
        (result.fallbackReason ? ` fallback=${result.fallbackReason}` : ""),
    );
    console.log(`[64cha] output: ${outPath} (${bytes(outPath).toLocaleString()} bytes)`);

    const htmlPath = path.join(SHOT_DIR, `${c.name}-compare.html`);
    await saveCompareHtml(
      htmlPath,
      `${c.name} — input vs output`,
      `입력 라이프스타일 (${c.label})`,
      lifestylePath,
      result.composited ? "nano-banana 합성 결과" : "폴백(원본 유지)",
      outPath,
    );
    const comparePng = path.join(SHOT_DIR, `${c.name}-compare.png`);
    await screenshotCompare(htmlPath, comparePng);
    console.log(`[64cha] compare: ${comparePng} (${bytes(comparePng).toLocaleString()} bytes)`);

    await new Promise((resolve) => setTimeout(resolve, 12_000));
  }

  const summaryPath = path.join(ROOT, "review", "64cha-composite-summary.json");
  fs.writeFileSync(
    summaryPath,
    JSON.stringify({ totalCost, results, productUrl: PRODUCT_URL }, null, 2),
    "utf8",
  );
  console.log(`[64cha] total cost: $${totalCost.toFixed(4)}`);
  console.log(`[64cha] summary: ${summaryPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
