/**
 * 82차 — 라이프스타일 합성 QA (폴백 브랜드 방지 + 라벨 픽스처 + 중앙 정렬)
 *   $env:TEST_MODE="false"; npx tsx scripts/82cha-lifestyle-composite-qa.ts
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { chromium } from "playwright";
import { compositeProductOnLifestylePhoto } from "../lib/lifestyle-product-composite";
import { detectTextRegions } from "../lib/vision-utils";

const ROOT = path.join(__dirname, "..");
const SHOT_DIR = path.join(ROOT, "review", "qa-screenshots");

const LIFESTYLE_HANDS =
  "https://cdn.pixabay.com/photo/2021/12/22/03/10/self-care-6886590_1280.jpg";
const LIFESTYLE_FLATLAY =
  "https://cdn.pixabay.com/photo/2020/08/09/15/58/cosmetics-5475900_1280.jpg";

const SUPABASE_BASE =
  "https://sblnthhayvrfkvaksest.supabase.co/storage/v1/object/public/images/2f01ed61-ed80-465d-9c1a-712bbf01a658";

/** 라벨/로고가 뚜렷한 제품 — Pagzly 테스트 계정 업로드 (GET 200 확인) */
const LABELED_SERUM_BOTTLE = `${SUPABASE_BASE}/1787899786236-cefc3ece-e3fe-4173-b9e9-0c114afa90de-enhanced.png`;
const LABELED_COSMETIC_JAR = `${SUPABASE_BASE}/1788219741331-07931081-79e9-482d-a21e-e7ba8da2f28d-enhanced.png`;

const UNLABELED_TEXTURE =
  "https://sblnthhayvrfkvaksest.supabase.co/storage/v1/object/public/images/2f01ed61-ed80-465d-9c1a-712bbf01a658/1788219740539-4df15ad7-7ddb-4e54-8ac3-e7c320b0ac6e-enhanced-fx-moisture.png";

type QaCase = {
  name: string;
  lifestyleUrl: string;
  productUrl: string;
  productName: string;
  category: string;
  purpose: "labeled-pixel-paste" | "labeled-pixel-paste-2" | "unlabeled-fallback";
  qaForceFallback?: boolean;
};

const CASES: QaCase[] = [
  {
    name: "82cha-labeled-serum-hands",
    lifestyleUrl: LIFESTYLE_HANDS,
    productUrl: LABELED_SERUM_BOTTLE,
    productName: "라이트 워터 히알루론 세럼",
    category: "화장품/뷰티",
    purpose: "labeled-pixel-paste",
  },
  {
    name: "82cha-labeled-jar-hands",
    lifestyleUrl: LIFESTYLE_HANDS,
    productUrl: LABELED_COSMETIC_JAR,
    productName: "수분 크림",
    category: "화장품/뷰티",
    purpose: "labeled-pixel-paste-2",
  },
  {
    name: "82cha-unlabeled-fallback-flatlay",
    lifestyleUrl: LIFESTYLE_FLATLAY,
    productUrl: UNLABELED_TEXTURE,
    productName: "글로우밤 수분 크림",
    category: "화장품/뷰티",
    purpose: "unlabeled-fallback",
    qaForceFallback: true,
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

function bytes(file: string): number {
  return fs.statSync(file).size;
}

async function verifyUrl(url: string, label: string): Promise<{ ok: boolean; status: number; reason?: string }> {
  const headers = { "User-Agent": "Pagzly-QA/1.0 (lifestyle-composite-qa)" };
  try {
    const res = await fetch(url, { method: "GET", headers });
    if (res.ok) return { ok: true, status: res.status };
    return { ok: false, status: res.status, reason: `${label} URL unreachable (${res.status})` };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      reason: `${label} URL error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
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
  fileLabel: string,
): Promise<{ buffer: Buffer; path: string; hasDetectedText: boolean } | null> {
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
      left: Math.round(w * 0.2),
      top: Math.round(h * 0.1),
      width: Math.round(w * 0.6),
      height: Math.round(h * 0.5),
    };
  }

  if (crop.width < 8 || crop.height < 8) return null;
  const outPath = path.join(SHOT_DIR, `${fileLabel}-label-crop.png`);
  const cropped = await sharp(buffer).extract(crop).png().toBuffer();
  fs.writeFileSync(outPath, cropped);
  return { buffer: cropped, path: outPath, hasDetectedText: regions.length > 0 };
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
    throw new Error("ANTHROPIC_API_KEY 필요 — Vision 배치 감지 필수");
  }

  fs.mkdirSync(SHOT_DIR, { recursive: true });

  let totalCost = 0;
  const results: Array<Record<string, unknown>> = [];
  const skipped: Array<Record<string, unknown>> = [];

  for (const c of CASES) {
    const productCheck = await verifyUrl(c.productUrl, "product");
    const lifestyleCheck = await verifyUrl(c.lifestyleUrl, "lifestyle");
    if (!productCheck.ok || !lifestyleCheck.ok) {
      const reason = productCheck.reason ?? lifestyleCheck.reason ?? "URL 검증 실패";
      console.error(`[82cha] SKIP ${c.name}: ${reason}`);
      skipped.push({ name: c.name, status: "skipped", reason, purpose: c.purpose });
      continue;
    }

    console.log(`\n[82cha] === ${c.name} (${c.purpose}) ===`);
    const productPath = path.join(SHOT_DIR, `${c.name}-input-product.jpg`);
    const lifestylePath = path.join(SHOT_DIR, `${c.name}-input-lifestyle.jpg`);

    try {
      await download(c.productUrl, productPath);
      await download(c.lifestyleUrl, lifestylePath);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error(`[82cha] SKIP ${c.name}: download failed — ${reason}`);
      skipped.push({ name: c.name, status: "skipped", reason, purpose: c.purpose });
      continue;
    }

    const productBuf = fs.readFileSync(productPath);
    const productLabelProbe = await cropLabelRegion(productBuf, `${c.name}-product-probe`);
    if (c.purpose.startsWith("labeled") && !productLabelProbe?.hasDetectedText) {
      console.warn(`[82cha] WARNING ${c.name}: 원본 상품에서 텍스트/라벨 영역 미감지 — 결과 해석 주의`);
    }

    const result = await compositeProductOnLifestylePhoto({
      lifestyleImageUrl: c.lifestyleUrl,
      productImageUrl: c.productUrl,
      category: c.category,
      productName: c.productName,
      qaForceFallback: c.qaForceFallback,
    });

    totalCost += result.cost;
    const outPath = path.join(SHOT_DIR, `${c.name}-output.png`);
    if (result.composited) {
      await download(result.url, outPath);
    } else {
      fs.copyFileSync(lifestylePath, outPath);
    }

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
        `합성 결과 (${result.method ?? "unknown"})`,
        outputLabel.path,
        productLabel.hasDetectedText
          ? "원본에서 Vision 텍스트 영역 감지됨"
          : "원본 텍스트 미감지 — 중앙 크롭 폴백",
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
      result.composited ? `합성 (${result.method})` : "폴백(원본)",
      outPath,
    );
    const fullComparePng = path.join(SHOT_DIR, `${c.name}-full-compare.png`);
    await screenshotCompare(fullCompareHtml, fullComparePng);

    results.push({
      name: c.name,
      purpose: c.purpose,
      status: "executed",
      composited: result.composited,
      method: result.method,
      placementConfidence: result.placementConfidence,
      cost: result.cost,
      fallbackReason: result.fallbackReason,
      productHasDetectedText: productLabelProbe?.hasDetectedText ?? false,
      labelComparePng,
      fullComparePng,
      outputBytes: bytes(outPath),
    });

    console.log(
      `[82cha] ${c.name}: composited=${result.composited} method=${result.method ?? "none"} ` +
        `confidence=${result.placementConfidence ?? "n/a"} cost=$${result.cost.toFixed(4)}`,
    );

    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }

  // 중앙 정렬 전/후 — 81차 hands 출력 vs 82cha labeled-tube (같은 lifestyle)
  const beforePath = path.join(SHOT_DIR, "81cha-cosmetics-hands-output.png");
  const afterPath = path.join(SHOT_DIR, "82cha-labeled-serum-hands-output.png");
  if (fs.existsSync(beforePath) && fs.existsSync(afterPath)) {
    const htmlPath = path.join(SHOT_DIR, "82cha-center-align-before-after.html");
    await saveCompareHtml(
      htmlPath,
      "82cha — 붙여넣기 중앙 정렬 전/후",
      "81차 (좌상단 앵커, 무지 텍스처)",
      beforePath,
      "82차 (중앙 정렬, 라벨 세럼)",
      afterPath,
      "동일 lifestyle(hands). 81차는 fit:inside + 좌상단 paste, 82차는 bbox 중앙 paste.",
    );
    const pngPath = path.join(SHOT_DIR, "82cha-center-align-before-after.png");
    await screenshotCompare(htmlPath, pngPath);
    results.push({
      name: "82cha-center-align-before-after",
      purpose: "center-align-comparison",
      status: "executed",
      fullComparePng: pngPath,
      cost: 0,
    });
  } else {
    skipped.push({
      name: "82cha-center-align-before-after",
      status: "skipped",
      reason: `missing ${!fs.existsSync(beforePath) ? "81cha output" : "82cha labeled-tube output"}`,
      purpose: "center-align-comparison",
    });
  }

  const summaryPath = path.join(ROOT, "review", "82cha-composite-summary.json");
  fs.writeFileSync(
    summaryPath,
    JSON.stringify({ totalCost, results, skipped, pipeline: "82cha-fallback-align-fix" }, null, 2),
    "utf8",
  );
  console.log(`\n[82cha] total cost: $${totalCost.toFixed(4)}`);
  console.log(`[82cha] executed: ${results.length}, skipped: ${skipped.length}`);
  console.log(`[82cha] summary: ${summaryPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
