/**
 * 57차 A — 식품·전자제품 배경 템플릿 실제 생성 1회씩
 *   npx tsx scripts/57cha-backdrop-qa.ts
 *
 * 51cha-final-qa.ts 기반, 출력만 57cha-backdrop-*.png
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
const ASSET_ROOT = path.join(__dirname, "test-assets", "_51cha-final");
const NEED = 8;

type PexelsPhoto = {
  id: number;
  src: { large2x: string; large: string };
};

type CategoryFixture = {
  slug: string;
  label: string;
  queries: string[];
  productName: string;
  brandName: string;
  price: string;
  targetCustomer: string;
  keyFeatures: string;
  ingredients: string;
  certifications: string;
  wholesaleUrl: string;
};

const TARGETS: CategoryFixture[] = [
  {
    slug: "food",
    label: "식품/건강기능식품",
    queries: [
      "udon noodles bowl food photography",
      "japanese noodle dish steam",
      "comfort food bowl natural light",
      "homemade soup bowl top view",
    ],
    productName: "들기름 메밀 우동 세트",
    brandName: "한그릇 키친",
    price: "8900",
    targetCustomer: "5분 안에 따뜻한 한 끼가 필요한 1~2인 가구",
    keyFeatures:
      "RENEWAL: 면 밀도 15% 증량, 기존 대비 국물 농도 업, 5분 조리, 1인분 420kcal, 냉동 보관 6개월",
    ingredients: "메밀면, 들기름, 간장 베이스, 건더기 스프, 고명 혼합",
    certifications: "HACCP 인증, 식품첨가물 무첨가",
    wholesaleUrl:
      "원본: Buckwheat Udon Set 2 servings / 조리: 끓는 물 5분 / 포인트: 쫄깃 메밀면, 진한 들기름 향",
  },
  {
    slug: "electronics",
    label: "전자제품",
    queries: [
      "wireless earbuds isolated white background product",
      "bluetooth earbuds charging case studio",
      "noise cancelling headphones product photography",
      "true wireless earbuds flat lay",
    ],
    productName: "AURA ONE Pro 오픈형 ANC 이어버드",
    brandName: "NORA AUDIO",
    price: "189000",
    targetCustomer: "출퇴근·운동 중 주변음을 유지하고 싶은 20~40대",
    keyFeatures:
      "하이브리드 ANC 42dB, 오픈형 이어훅, LDAC·AAC, 배터리 9h+케이스 27h, IPX5, 멀티포인트 2기기",
    ingredients: "12mm 다이내믹 드라이버, BT 5.3, USB-C, 편당 5.8g",
    certifications: "KC 인증, 블루투스 SIG, RoHS, 1년 무상 A/S",
    wholesaleUrl:
      "원본: AURA ONE Pro / 구성: 이어버드·케이스·이어팁 S/M/L·USB-C / 포인트: 오픈형+ANC 전환",
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

async function crawlPexels(apiKey: string, queries: string[], assetDir: string): Promise<string[]> {
  fs.mkdirSync(assetDir, { recursive: true });
  const seen = new Set<number>();
  const files: string[] = [];

  for (const query of queries) {
    if (files.length >= NEED) break;
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "8");
    url.searchParams.set("orientation", "portrait");
    const res = await fetch(url.toString(), { headers: { Authorization: apiKey } });
    if (!res.ok) throw new Error(`Pexels search failed: ${res.status}`);
    const data = (await res.json()) as { photos: PexelsPhoto[] };
    for (const photo of data.photos) {
      if (files.length >= NEED) break;
      if (seen.has(photo.id)) continue;
      seen.add(photo.id);
      const imgRes = await fetch(photo.src.large2x || photo.src.large);
      if (!imgRes.ok) continue;
      const buf = Buffer.from(await imgRes.arrayBuffer());
      const jpegBuf = await sharp(buf).jpeg({ quality: 92 }).toBuffer();
      const file = path.join(assetDir, `pexels-${photo.id}.jpeg`);
      fs.writeFileSync(file, jpegBuf);
      files.push(file);
    }
  }
  if (files.length < 7) {
    throw new Error(`Pexels 사진 ${files.length}장 — 최소 7장 필요`);
  }
  return files.slice(0, NEED);
}

async function fillIfExists(page: Page, selector: string, value: string) {
  const loc = page.locator(selector).first();
  if ((await loc.count()) === 0) return;
  if (!(await loc.isVisible().catch(() => false))) return;
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

async function runCategory(page: Page, fixture: CategoryFixture, images: string[]) {
  console.log(`\n========== 57cha backdrop ${fixture.label} ==========`);

  await page.goto(`${BASE_URL}/create/detail`, { waitUntil: "networkidle" });
  await page.waitForSelector("select", { timeout: 60_000 });
  await page.locator("select").first().selectOption({ label: fixture.label });
  await page.setInputFiles('input[type="file"][accept*="image/jpeg"]', images);
  await page.fill("#productName", fixture.productName);
  await fillIfExists(page, "#brandName", fixture.brandName);
  await page.fill("#price", fixture.price);
  await fillIfExists(page, "#targetCustomer", fixture.targetCustomer);
  await fillIfExists(page, "#keyFeatures", fixture.keyFeatures);
  await fillIfExists(page, "#ingredients", fixture.ingredients);
  await fillIfExists(page, "#certifications", fixture.certifications);
  await fillIfExists(page, "#wholesaleUrl", fixture.wholesaleUrl);

  await page.click('button[type="submit"]');
  console.log("  draft 생성 대기…");
  await page.waitForURL(/\/create\/draft/, { timeout: 480_000 });
  await page.waitForTimeout(1200);

  await page.getByRole("button", { name: /승인하고 최종 생성/ }).click();

  const picker = page.locator('[data-testid="backdrop-picker"]');
  try {
    await picker.waitFor({ state: "visible", timeout: 420_000 });
    const c0 = page.locator('[data-testid="backdrop-candidate-0"]');
    if (await c0.count()) await c0.click();
    await page.locator('[data-testid="backdrop-confirm"]').click();
    console.log("  배경 후보 확정");
  } catch {
    console.log("  배경 피커 없음 — 계속");
  }

  await page.waitForURL(/\/create\/result/, { timeout: 480_000 });
  await page.waitForTimeout(2500);

  const preview = page.locator('[data-testid="detail-preview"]');
  await preview.waitFor({ state: "visible", timeout: 30_000 });

  const expand = page.locator('[data-testid="detail-preview-expand"]');
  if (await expand.isVisible().catch(() => false)) {
    await expand.click();
    await page.waitForTimeout(600);
  }

  await freezeDetailScrollReveal(page);
  await page.waitForTimeout(400);

  const fullPath = path.join(SHOT_DIR, `57cha-backdrop-${fixture.slug}.png`);
  await page.screenshot({ path: fullPath, fullPage: true });
  const fullBytes = fs.statSync(fullPath).size;
  if (fullBytes < 50_000) {
    throw new Error(`${fixture.slug}: screenshot too small (${fullBytes} bytes)`);
  }
  console.log(`  full: ${fullPath} (${fullBytes.toLocaleString()} bytes)`);

  const hero = page.locator("section").first();
  const heroPath = path.join(SHOT_DIR, `57cha-backdrop-${fixture.slug}-hero.png`);
  await hero.screenshot({ path: heroPath });
  console.log(`  hero: ${heroPath} (${fs.statSync(heroPath).size.toLocaleString()} bytes)`);
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const env = loadEnvLocal();
  for (const [k, v] of Object.entries(env)) {
    if (!process.env[k]) process.env[k] = v;
  }

  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    throw new Error("scripts/auth-state.json 없음");
  }
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) throw new Error("PEXELS_API_KEY 필요");

  const apiCalls: { url: string; status: number }[] = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120_000);

  page.on("response", (response) => {
    const u = response.url();
    if (u.includes("/api/generate") || u.includes("/api/enhance")) {
      apiCalls.push({ url: u, status: response.status() });
      console.log(`  [api ${response.status()}] ${u}`);
    }
  });

  for (const fixture of TARGETS) {
    const slugFilter = process.env.SLUG_FILTER;
    if (slugFilter && fixture.slug !== slugFilter) continue;
    const assetDir = path.join(ASSET_ROOT, fixture.slug);
    console.log(`[images] ${fixture.slug} Pexels…`);
    const images = await crawlPexels(apiKey, fixture.queries, assetDir);
    await runCategory(page, fixture, images);
  }

  await browser.close();

  console.log(`\n[57cha-a] API 호출 ${apiCalls.length}건 (의도된 /api/generate)`);
  for (const c of apiCalls) console.log(`  ${c.status} ${c.url}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
