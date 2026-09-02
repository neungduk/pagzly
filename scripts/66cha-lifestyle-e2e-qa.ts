/**
 * 66차 — 라이프스타일 합성 E2E (유료 1회)
 *   npx tsx scripts/66cha-lifestyle-e2e-qa.ts
 *
 * dev :3000, scripts/auth-state.json, REPLICATE_API_TOKEN, PEXELS_API_KEY(선택)
 */

import { chromium, type Page } from "playwright";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { freezeDetailScrollReveal } from "./capture-utils";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const SHOT_DIR = path.join(ROOT, "review", "qa-screenshots");
const ASSET_DIR = path.join(__dirname, "test-assets", "_66cha-lifestyle-e2e");
const PIXABAY_DIR = path.join(__dirname, "test-assets", "_pixabay-cosmetics-run");
const NEED = 7;

const LIFESTYLE_FIXTURE =
  path.join(PIXABAY_DIR, "pixabay-6886590.jpg");

const PRODUCT = {
  category: "화장품/뷰티",
  productName: "66차 라이프스타일 합성 세럼",
  brandName: "루미에르 랩",
  price: "32900",
  targetCustomer: "20~30대 여성",
  keyFeatures: "산뜻한 수분감, 가벼운 제형, 데일리 케어",
  ingredients: "히알루론산, 판테놀, 글리세린",
  certifications: "더마 테스트 완료",
  wholesaleUrl: "원본: Lifestyle Composite Serum 30ml / 워터리 세럼",
};

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

async function ensureProductImages(apiKey: string | null): Promise<string[]> {
  fs.mkdirSync(ASSET_DIR, { recursive: true });
  const cached = fs
    .readdirSync(ASSET_DIR)
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .map((f) => path.join(ASSET_DIR, f));
  if (cached.length >= NEED) return cached.slice(0, NEED);

  if (apiKey) {
    const queries = [
      "skincare serum bottle product",
      "moisturizer cream jar beauty",
      "cosmetic dropper bottle",
    ];
    const seen = new Set<string>();
    for (const query of queries) {
      if (seen.size >= NEED) break;
      const url = new URL("https://api.pexels.com/v1/search");
      url.searchParams.set("query", query);
      url.searchParams.set("per_page", "8");
      url.searchParams.set("orientation", "portrait");
      const res = await fetch(url.toString(), { headers: { Authorization: apiKey } });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        photos: { id: number; src: { large2x: string; large: string } }[];
      };
      for (const photo of data.photos) {
        if (seen.size >= NEED) break;
        const imgRes = await fetch(photo.src.large2x || photo.src.large);
        if (!imgRes.ok) continue;
        const buf = Buffer.from(await imgRes.arrayBuffer());
        const jpegBuf = await sharp(buf).jpeg({ quality: 90 }).toBuffer();
        const file = path.join(ASSET_DIR, `pexels-${photo.id}.jpeg`);
        fs.writeFileSync(file, jpegBuf);
        seen.add(file);
      }
    }
    if (seen.size >= NEED) return [...seen].slice(0, NEED);
  }

  const pixabay = fs
    .readdirSync(PIXABAY_DIR)
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .map((f) => path.join(PIXABAY_DIR, f));
  if (pixabay.length < NEED) {
    throw new Error(`상품 사진 ${pixabay.length}장 — 최소 ${NEED}장 필요`);
  }
  return pixabay.slice(0, NEED);
}

async function fillIfExists(page: Page, selector: string, value: string) {
  const loc = page.locator(selector).first();
  if ((await loc.count()) === 0) return;
  const tag = await loc.evaluate((el) => el.tagName.toLowerCase());
  if (tag === "select") {
    const opts = await loc.locator("option").allTextContents();
    const match = opts.find((o) => value.split(/[\s·,]/).some((p) => p && o.includes(p)));
    if (match) await loc.selectOption({ label: match });
    else if (opts.length > 1) await loc.selectOption({ index: 1 });
  } else {
    await loc.fill(value);
  }
}

async function runE2E(page: Page, productImages: string[], lifestyleImage: string) {
  const compositeCalls: { status: number; composited?: boolean; cost?: number }[] = [];

  page.on("response", async (res) => {
    if (!res.url().includes("/api/lifestyle-composite")) return;
    try {
      const json = (await res.json()) as {
        composited?: boolean;
        cost?: number;
      };
      compositeCalls.push({ status: res.status(), composited: json.composited, cost: json.cost });
    } catch {
      compositeCalls.push({ status: res.status() });
    }
  });

  await page.goto(`${BASE_URL}/create/detail`, { waitUntil: "networkidle" });
  await page.waitForSelector("select", { timeout: 60_000 });
  await page.locator("select").first().selectOption({ label: PRODUCT.category });
  await page.setInputFiles('input[type="file"][accept*="image/jpeg"]', productImages);
  await page.setInputFiles("#lifestyleImage", lifestyleImage);
  await page.fill("#productName", PRODUCT.productName);
  await page.fill("#brandName", PRODUCT.brandName);
  await page.fill("#price", PRODUCT.price);
  await fillIfExists(page, "#targetCustomer", PRODUCT.targetCustomer);
  await page.fill("#keyFeatures", PRODUCT.keyFeatures);
  await page.fill("#ingredients", PRODUCT.ingredients);
  await page.fill("#certifications", PRODUCT.certifications);
  await page.fill("#wholesaleUrl", PRODUCT.wholesaleUrl);

  const beforePath = path.join(SHOT_DIR, "66cha-e2e-form-with-lifestyle.png");
  await page.screenshot({ path: beforePath, fullPage: false });
  console.log(`[66cha] form: ${beforePath}`);

  await page.click('button[type="submit"]');
  console.log("[66cha] draft 생성 대기…");
  await page.waitForURL(/\/create\/draft/, { timeout: 480_000 });
  await page.waitForTimeout(1500);

  await page.getByRole("button", { name: /승인하고 최종 생성/ }).click();

  const picker = page.locator('[data-testid="backdrop-picker"]');
  try {
    await picker.waitFor({ state: "visible", timeout: 420_000 });
    const c0 = page.locator('[data-testid="backdrop-candidate-0"]');
    if (await c0.count()) await c0.click();
    await page.locator('[data-testid="backdrop-confirm"]').click();
    console.log("[66cha] 배경 후보 확정");
  } catch {
    console.log("[66cha] 배경 피커 없음 — 계속");
  }

  await page.waitForURL(/\/create\/result/, { timeout: 480_000 });
  await page.waitForTimeout(3000);

  console.log(`[66cha] lifestyle-composite API calls: ${JSON.stringify(compositeCalls)}`);
  if (compositeCalls.length === 0) {
    throw new Error("/api/lifestyle-composite 호출 없음 — 파이프라인 배선 실패");
  }
  if (!compositeCalls.some((c) => c.status === 200 && c.composited)) {
    throw new Error("lifestyle-composite 합성 성공 응답 없음");
  }

  const compositeImgs = page.locator(
    '[data-testid="detail-preview"] img[src*="lifestyle-composite"]',
  );
  const compositeCount = await compositeImgs.count();
  console.log(`[66cha] detail-preview lifestyle-composite img count: ${compositeCount}`);

  const scenario = page
    .getByRole("heading", { name: /데일리|루틴|사용|시나리오|고객/i })
    .first();
  if (await scenario.count()) {
    await scenario.scrollIntoViewIfNeeded({ timeout: 15_000 }).catch(() => undefined);
    await page.waitForTimeout(500);
  }

  const fullPath = path.join(SHOT_DIR, "66cha-e2e-result-full.png");
  const preview = page.locator('[data-testid="detail-preview"]');
  await preview.waitFor({ state: "visible", timeout: 30_000 });
  const expand = page.locator('[data-testid="detail-preview-expand"]');
  if (await expand.isVisible().catch(() => false)) {
    await expand.click();
    await page.waitForTimeout(600);
  }
  await freezeDetailScrollReveal(page);
  await page.screenshot({ path: fullPath, fullPage: true });
  console.log(`[66cha] result: ${fullPath} (${fs.statSync(fullPath).size.toLocaleString()} bytes)`);

  if (compositeCount < 1) {
    const allSrc = await page
      .locator('[data-testid="detail-preview"] img[src^="http"]')
      .evaluateAll((els) => els.map((el) => (el as HTMLImageElement).src));
    const compositeInAny = allSrc.some((s) => s.includes("lifestyle-composite"));
    if (!compositeInAny) {
      throw new Error("최종 페이지에 lifestyle-composite 이미지 미노출");
    }
  }

  const summary = {
    compositeCalls,
    compositeImgCount: compositeCount,
    totalCost: compositeCalls.reduce((sum, c) => sum + (c.cost ?? 0), 0),
  };
  const summaryPath = path.join(ROOT, "review", "66cha-e2e-summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`[66cha] summary: ${summaryPath}`);
}

async function main() {
  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    throw new Error("scripts/auth-state.json 필요");
  }
  if (!fs.existsSync(LIFESTYLE_FIXTURE)) {
    throw new Error(`라이프스타일 fixture 없음: ${LIFESTYLE_FIXTURE}`);
  }

  const env = loadEnvLocal();
  for (const [k, v] of Object.entries(env)) {
    if (!process.env[k]) process.env[k] = v;
  }

  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const productImages = await ensureProductImages(process.env.PEXELS_API_KEY ?? null);
  console.log(`[66cha] product images: ${productImages.length}장`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1280, height: 900 },
  });

  await runE2E(page, productImages, LIFESTYLE_FIXTURE);
  await browser.close();
  console.log("[66cha] E2E 완료");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
