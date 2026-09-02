/**
 * 81차 — 라이프스타일 픽셀 합성 QA (유료, 2~3케이스)
 *   npx tsx scripts/81cha-lifestyle-pixel-paste-qa.ts
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { chromium } from "playwright";
import { compositeProductOnLifestylePhoto } from "../lib/lifestyle-product-composite";
import { detectTextRegions } from "../lib/vision-utils";

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

const CASES = [
  {
    name: "81cha-cosmetics-hands",
    lifestyleUrl: "https://cdn.pixabay.com/photo/2021/12/22/03/10/self-care-6886590_1280.jpg",
    productUrl:
      "https://sblnthhayvrfkvaksest.supabase.co/storage/v1/object/public/images/2f01ed61-ed80-465d-9c1a-712bbf01a658/1788219740539-4df15ad7-7ddb-4e54-8ac3-e7c320b0ac6e-enhanced-fx-moisture.png",
    productName: "글로우밤 수분 크림",
    category: "화장품/뷰티",
  },
  {
    name: "81cha-cosmetics-flatlay",
    lifestyleUrl: "https://cdn.pixabay.com/photo/2020/08/09/15/58/cosmetics-5475900_1280.jpg",
    productUrl:
      "https://sblnthhayvrfkvaksest.supabase.co/storage/v1/object/public/images/2f01ed61-ed80-465d-9c1a-712bbf01a658/1788219740539-4df15ad7-7ddb-4e54-8ac3-e7c320b0ac6e-enhanced-fx-moisture.png",
    productName: "글로우밤 수분 크림",
    category: "화장품/뷰티",
  },
] as const;

function bytes(file: string): number {
  return fs.statSync(file).size;
}

async function download(url: string, dest: string): Promise<Buffer> {
  if (url.startsWith("data:")) {
    const b64 = url.slice(url.indexOf(",") + 1);
    const buf = Buffer.from(b64, "base64");
    fs.writeFileSync(dest, buf);
    return buf;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf;
}

async function cropLabelRegion(
  buffer: Buffer,
  label: string,
): Promise<{ buffer: Buffer; path: string } | null> {
  const { regions } = await detectTextRegions(buffer, "image/png");
  const meta = await sharp(buffer).metadata();
  const w = meta.width ?? 1;
  const h = meta.height ?? 1;

  let crop: { left: number; top: number; width: number; height: number };
  if (regions.length > 0) {
    const r = regions[0]!;
    const pad = 0.04;
    crop = {
      left: Math.max(0, Math.round((r.xMin - pad) * w)),
      top: Math.max(0, Math.round((r.yMin - pad) * h)),
      width: Math.min(w, Math.round((r.xMax - r.xMin + pad * 2) * w)),
      height: Math.min(h, Math.round((r.yMax - r.yMin + pad * 2) * h)),
    };
  } else {
    crop = {
      left: Math.round(w * 0.25),
      top: Math.round(h * 0.15),
      width: Math.round(w * 0.5),
      height: Math.round(h * 0.45),
    };
  }

  if (crop.width < 8 || crop.height < 8) return null;
  const outPath = path.join(SHOT_DIR, `${label}-label-crop.png`);
  const cropped = await sharp(buffer).extract(crop).png().toBuffer();
  fs.writeFileSync(outPath, cropped);
  return { buffer: cropped, path: outPath };
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
.col{flex:1;min-width:240px}
img{max-width:100%;border:1px solid #444;border-radius:8px}
h2{font-size:13px;font-weight:600;margin:8px 0}
.note{font-size:12px;color:#aaa;margin-bottom:12px}
</style></head><body>
<h1>${title}</h1>
<div class="row">
  <div class="col"><h2>${leftLabel}</h2><img src="${leftSrc.replace(/\\/g, "/")}" /></div>
  <div class="col"><h2>${rightLabel}</h2><img src="${rightSrc.replace(/\\/g, "/")}" /></div>
</div>
</body></html>`;
  fs.writeFileSync(outPath, html, "utf8");
}

async function screenshotCompare(htmlPath: string, pngPath: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
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

  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN 필요 (유료 합성 QA)");
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[81cha] ANTHROPIC_API_KEY 없음 — Vision 배치 감지 스킵될 수 있음");
  }

  fs.mkdirSync(SHOT_DIR, { recursive: true });

  let totalCost = 0;
  const results: Array<Record<string, unknown>> = [];
  const skipped: Array<Record<string, unknown>> = [];

  for (const c of CASES) {
    console.log(`\n[81cha] === ${c.name} ===`);
    const productPath = path.join(SHOT_DIR, `${c.name}-input-product.png`);
    const lifestylePath = path.join(SHOT_DIR, `${c.name}-input-lifestyle.jpg`);

    try {
      await download(c.productUrl, productPath);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(`[81cha] skip ${c.name} — product download failed`, err);
      skipped.push({ name: c.name, status: "skipped", reason });
      continue;
    }
    await download(c.lifestyleUrl, lifestylePath);

    const result = await compositeProductOnLifestylePhoto({
      lifestyleImageUrl: c.lifestyleUrl,
      productImageUrl: c.productUrl,
      category: c.category,
      productName: c.productName,
    });

    totalCost += result.cost;
    const outPath = path.join(SHOT_DIR, `${c.name}-output.png`);
    if (result.composited) {
      await download(result.url, outPath);
    } else {
      fs.copyFileSync(lifestylePath, outPath);
    }

    const productBuf = fs.readFileSync(productPath);
    const outputBuf = fs.readFileSync(outPath);
    const productLabel = await cropLabelRegion(productBuf, `${c.name}-product`);
    const outputLabel = await cropLabelRegion(outputBuf, `${c.name}-output`);

    let labelComparePng: string | null = null;
    if (productLabel && outputLabel) {
      const htmlPath = path.join(SHOT_DIR, `${c.name}-label-compare.html`);
      await saveCompareHtml(
        htmlPath,
        `${c.name} — 라벨 확대 비교`,
        "원본 상품 라벨",
        productLabel.path,
        result.composited ? `합성 결과 (${result.method ?? "unknown"})` : "폴백(원본)",
        outputLabel.path,
      );
      labelComparePng = path.join(SHOT_DIR, `${c.name}-label-compare.png`);
      await screenshotCompare(htmlPath, labelComparePng);
    }

    const fullCompareHtml = path.join(SHOT_DIR, `${c.name}-full-compare.html`);
    await saveCompareHtml(
      fullCompareHtml,
      `${c.name} — 전체 비교`,
      "입력 라이프스타일",
      lifestylePath,
      result.composited ? `합성 (${result.method})` : "폴백",
      outPath,
    );
    const fullComparePng = path.join(SHOT_DIR, `${c.name}-full-compare.png`);
    await screenshotCompare(fullCompareHtml, fullComparePng);

    results.push({
      name: c.name,
      composited: result.composited,
      method: result.method,
      placementConfidence: result.placementConfidence,
      cost: result.cost,
      fallbackReason: result.fallbackReason,
      labelComparePng,
      fullComparePng,
      outputBytes: bytes(outPath),
    });

    console.log(
      `[81cha] ${c.name}: composited=${result.composited} method=${result.method ?? "none"} ` +
        `confidence=${result.placementConfidence ?? "n/a"} cost=$${result.cost.toFixed(4)}`,
    );

    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }

  const summaryPath = path.join(ROOT, "review", "81cha-composite-summary.json");
  fs.writeFileSync(
    summaryPath,
    JSON.stringify({ totalCost, results, skipped, pipeline: "81cha-pixel-paste" }, null, 2),
    "utf8",
  );
  console.log(`\n[81cha] total cost: $${totalCost.toFixed(4)}`);
  console.log(`[81cha] summary: ${summaryPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
