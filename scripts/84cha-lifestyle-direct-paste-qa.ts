/**
 * 84차 — 실루엣 없이 원본+Vision 배치+직접 paste QA
 *   $env:TEST_MODE="false"; npx tsx scripts/84cha-lifestyle-direct-paste-qa.ts
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { chromium } from "playwright";
import { compositeProductOnLifestylePhoto } from "../lib/lifestyle-product-composite";
import { detectTextRegions } from "../lib/vision-utils";

const ROOT = path.join(__dirname, "..");
const SHOT_DIR = path.join(ROOT, "review", "qa-screenshots");

/** 손등/손가락 문지르기 — 쥐는 제스처 아님 (84차 신규 실패 모드 확인용) */
const LIFESTYLE_HANDS_RUB =
  "https://cdn.pixabay.com/photo/2021/12/22/03/10/self-care-6886590_1280.jpg";
/** 팔짱 — 쥐는 공간 없음 (Pexels CDN) */
const LIFESTYLE_ARMS_CROSSED =
  "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=1280";
const LIFESTYLE_FLATLAY =
  "https://cdn.pixabay.com/photo/2020/08/09/15/58/cosmetics-5475900_1280.jpg";

const SUPABASE_BASE =
  "https://sblnthhayvrfkvaksest.supabase.co/storage/v1/object/public/images/2f01ed61-ed80-465d-9c1a-712bbf01a658";

const LABELED_SERUM_BOTTLE = `${SUPABASE_BASE}/1787899786236-cefc3ece-e3fe-4173-b9e9-0c114afa90de-enhanced.png`;
const LABELED_COSMETIC_JAR = `${SUPABASE_BASE}/1788219741331-07931081-79e9-482d-a21e-e7ba8da2f28d-enhanced.png`;

/** 83차 pixel-paste 성공 경로 예상 비용 (bg + silhouette + vision) */
const COST_83CHA_PIXEL_PASTE_EST = 0.039 + 0.00047 + 0.002;

type QaCase = {
  name: string;
  lifestyleUrl: string;
  productUrl: string;
  productName: string;
  category: string;
  purpose: string;
  qaForceFallback?: boolean;
};

const CASES: QaCase[] = [
  {
    name: "84cha-labeled-serum-hands",
    lifestyleUrl: LIFESTYLE_HANDS_RUB,
    productUrl: LABELED_SERUM_BOTTLE,
    productName: "라이트 워터 히알루론 세럼",
    category: "화장품/뷰티",
    purpose: "labeled-direct-paste",
  },
  {
    name: "84cha-labeled-jar-hands",
    lifestyleUrl: LIFESTYLE_HANDS_RUB,
    productUrl: LABELED_COSMETIC_JAR,
    productName: "수분 크림",
    category: "화장품/뷰티",
    purpose: "labeled-direct-paste-2",
  },
  {
    name: "84cha-non-grip-rubbing-hands",
    lifestyleUrl: LIFESTYLE_HANDS_RUB,
    productUrl: LABELED_SERUM_BOTTLE,
    productName: "라이트 워터 히알루론 세럼",
    category: "화장품/뷰티",
    purpose: "non-grip-gesture-failure-mode",
  },
  {
    name: "84cha-arms-crossed-serum",
    lifestyleUrl: LIFESTYLE_ARMS_CROSSED,
    productUrl: LABELED_SERUM_BOTTLE,
    productName: "라이트 워터 히알루론 세럼",
    category: "화장품/뷰티",
    purpose: "no-grip-space-expect-low-or-fallback",
  },
  {
    name: "84cha-flatlay-fallback",
    lifestyleUrl: LIFESTYLE_FLATLAY,
    productUrl: LABELED_SERUM_BOTTLE,
    productName: "라이트 워터 히알루론 세럼",
    category: "화장품/뷰티",
    purpose: "no-hands-expect-fallback",
    qaForceFallback: false,
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

async function cropLabelRegion(
  buffer: Buffer,
  fileLabel: string,
): Promise<{ path: string; hasDetectedText: boolean } | null> {
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
  return { path: outPath, hasDetectedText: regions.length > 0 };
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

  let totalCost = 0;
  let pixelPasteCount = 0;
  let fallbackCount = 0;
  const results: Array<Record<string, unknown>> = [];

  const only = process.argv.find((a) => a.startsWith("--only="))?.slice("--only=".length);
  const cases = only ? CASES.filter((c) => c.name.includes(only)) : CASES;
  if (cases.length === 0) throw new Error(`--only=${only} 에 해당하는 케이스 없음`);

  for (const c of cases) {
    console.log(`\n[84cha] === ${c.name} (${c.purpose}) ===`);
    const lifestylePath = path.join(SHOT_DIR, `${c.name}-input-lifestyle.jpg`);
    const productPath = path.join(SHOT_DIR, `${c.name}-input-product.png`);
    await download(c.lifestyleUrl, lifestylePath);
    await download(c.productUrl, productPath);

    const productBuf = fs.readFileSync(productPath);
    const productLabelProbe = await cropLabelRegion(productBuf, `${c.name}-product-probe`);

    const result = await compositeProductOnLifestylePhoto({
      lifestyleImageUrl: c.lifestyleUrl,
      productImageUrl: c.productUrl,
      category: c.category,
      productName: c.productName,
      qaForceFallback: c.qaForceFallback,
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

    const outputBuf = fs.readFileSync(outPath);
    const productLabel = await cropLabelRegion(productBuf, `${c.name}-product`);
    const outputLabel = await cropLabelRegion(outputBuf, `${c.name}-output`);

    if (productLabel && outputLabel) {
      const htmlPath = path.join(SHOT_DIR, `${c.name}-label-compare.html`);
      await saveCompareHtml(
        htmlPath,
        `${c.name} — 라벨 확대`,
        "원본 상품",
        productLabel.path,
        `84차 결과 (${result.method})`,
        outputLabel.path,
        productLabel.hasDetectedText
          ? "원본 텍스트 영역 감지됨"
          : "원본 텍스트 미감지 — 라벨 비교 불확실",
      );
      await screenshotCompare(htmlPath, path.join(SHOT_DIR, `${c.name}-label-compare.png`));
    }

    const fullHtml = path.join(SHOT_DIR, `${c.name}-full-compare.html`);
    await saveCompareHtml(
      fullHtml,
      `${c.name} — 전체`,
      "원본 라이프스타일",
      lifestylePath,
      `84차 (${result.method ?? "none"})`,
      outPath,
      `confidence=${result.placementConfidence ?? "n/a"}`,
    );
    await screenshotCompare(fullHtml, path.join(SHOT_DIR, `${c.name}-full-compare.png`));

    results.push({
      name: c.name,
      purpose: c.purpose,
      composited: result.composited,
      method: result.method,
      placementConfidence: result.placementConfidence,
      cost: result.cost,
      fallbackReason: result.fallbackReason,
      productHasDetectedText: productLabelProbe?.hasDetectedText ?? false,
    });

    console.log(
      `[84cha] ${c.name}: method=${result.method} confidence=${result.placementConfidence ?? "n/a"} cost=$${result.cost.toFixed(4)}`,
    );

    await new Promise((r) => setTimeout(r, 12_000));
  }

  // 83차 vs 84차 구조 비교 (스크린샷 있으면)
  const comparePairs = [
    {
      name: "84cha-vs-83cha-serum",
      before: path.join(SHOT_DIR, "83cha-labeled-serum-hands-output.png"),
      after: path.join(SHOT_DIR, "84cha-labeled-serum-hands-output.png"),
      note: "83차(실루엣+paste) vs 84차(원본 직접 paste). 이중 객체/블러 박스 재발 여부 확인.",
    },
    {
      name: "84cha-vs-82cha-serum",
      before: path.join(SHOT_DIR, "82cha-labeled-serum-hands-output.png"),
      after: path.join(SHOT_DIR, "84cha-labeled-serum-hands-output.png"),
      note: "82차 vs 84차 — 구조 변경 후 자연스러움 비교.",
    },
  ];

  for (const pair of comparePairs) {
    if (fs.existsSync(pair.before) && fs.existsSync(pair.after)) {
      const htmlPath = path.join(SHOT_DIR, `${pair.name}.html`);
      await saveCompareHtml(
        htmlPath,
        pair.name,
        "이전 라운드",
        pair.before,
        "84차",
        pair.after,
        pair.note,
      );
      await screenshotCompare(htmlPath, path.join(SHOT_DIR, `${pair.name}.png`));
    }
  }

  const avgPixelPasteCost =
    results.filter((r) => r.method === "pixel-paste").reduce((s, r) => s + (r.cost as number), 0) /
      Math.max(1, pixelPasteCount);

  const summary = {
    pipeline: "84cha-direct-paste-no-silhouette",
    totalCost,
    pixelPasteCount,
    fallbackCount,
    avgPixelPasteCost,
    cost83chaPixelPasteEstimate: COST_83CHA_PIXEL_PASTE_EST,
    estimatedSavingsPerPixelPaste: COST_83CHA_PIXEL_PASTE_EST - avgPixelPasteCost,
    results,
  };

  const summaryPath = path.join(ROOT, "review", "84cha-composite-summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");
  console.log(`\n[84cha] total cost: $${totalCost.toFixed(4)}`);
  console.log(`[84cha] pixel-paste: ${pixelPasteCount}, fallback: ${fallbackCount}`);
  console.log(`[84cha] avg pixel-paste cost: $${avgPixelPasteCost.toFixed(4)} (83차 est ~$${COST_83CHA_PIXEL_PASTE_EST.toFixed(4)})`);
  console.log(`[84cha] summary: ${summaryPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
