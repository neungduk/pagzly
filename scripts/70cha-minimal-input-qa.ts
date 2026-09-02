/**
 * 70차 작업 C — 사진+제목+가격만으로 실제 생성 1회
 *
 *   npx tsx scripts/grant-qa-credits.ts 100000 qa_topup_70cha
 *   npx tsx scripts/70cha-minimal-input-qa.ts
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
const ASSET_DIR = path.join(__dirname, "test-assets", "_70cha-minimal");
const NEED = 8;

type PexelsPhoto = { id: number; src: { large2x: string; large: string } };

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

async function crawlPexels(apiKey: string): Promise<string[]> {
  fs.mkdirSync(ASSET_DIR, { recursive: true });
  const queries = [
    "moisturizer cream jar white background",
    "skincare cream jar product minimal",
    "face cream texture macro",
  ];
  const seen = new Set<number>();
  const files: string[] = [];
  for (const query of queries) {
    if (files.length >= NEED) break;
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "8");
    const res = await fetch(url.toString(), { headers: { Authorization: apiKey } });
    if (!res.ok) throw new Error(`Pexels ${res.status}`);
    const data = (await res.json()) as { photos: PexelsPhoto[] };
    for (const photo of data.photos) {
      if (files.length >= NEED) break;
      if (seen.has(photo.id)) continue;
      seen.add(photo.id);
      const imgRes = await fetch(photo.src.large2x || photo.src.large);
      if (!imgRes.ok) continue;
      const buf = await sharp(Buffer.from(await imgRes.arrayBuffer())).jpeg({ quality: 92 }).toBuffer();
      const file = path.join(ASSET_DIR, `pexels-${photo.id}.jpeg`);
      fs.writeFileSync(file, buf);
      files.push(file);
    }
  }
  if (files.length < 7) throw new Error(`사진 ${files.length}장 — 최소 7장 필요`);
  return files.slice(0, NEED);
}

async function runMinimalGeneration(page: Page, images: string[]) {
  console.log("\n========== 70차 minimal input ==========");
  await page.goto(`${BASE_URL}/create/detail`, { waitUntil: "networkidle" });
  await page.waitForSelector("select", { timeout: 60_000 });
  await page.locator("select").first().selectOption({ label: "화장품/뷰티" });
  await page.setInputFiles('input[type="file"][accept*="image/jpeg"]', images);
  await page.fill("#productName", "시카 리페어 수딩 크림");
  await page.fill("#price", "32900");
  // keyFeatures, targetCustomer, ingredients, certifications, brand — 비움

  const kf = await page.inputValue("#keyFeatures");
  const ing = await page.inputValue("#ingredients");
  if (kf.trim() || ing.trim()) {
    throw new Error("선택 필드가 미리 채워져 있음");
  }

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
}

async function captureFull(page: Page, outPath: string) {
  const preview = page.locator('[data-testid="detail-preview"]');
  await preview.waitFor({ state: "visible", timeout: 30_000 });
  const expand = page.locator('[data-testid="detail-preview-expand"]');
  if (await expand.isVisible().catch(() => false)) {
    await expand.click();
    await page.waitForTimeout(600);
  }
  await freezeDetailScrollReveal(page);
  await page.waitForTimeout(400);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`  full: ${outPath} (${fs.statSync(outPath).size.toLocaleString()} bytes)`);
}

async function main() {
  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    throw new Error("scripts/auth-state.json 필요");
  }
  const env = loadEnvLocal();
  const pexelsKey = process.env.PEXELS_API_KEY ?? env.PEXELS_API_KEY;
  if (!pexelsKey) throw new Error("PEXELS_API_KEY 필요");

  const images = await crawlPexels(pexelsKey);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 2,
  });

  await runMinimalGeneration(page, images);
  const outPath = path.join(SHOT_DIR, "70cha-minimal-input-final.png");
  await captureFull(page, outPath);

  const headings = await page
    .locator('[data-testid="detail-preview"] h2, [data-testid="detail-preview"] h3')
    .allTextContents();
  console.log(`[70cha-C] headings sample: ${headings.slice(0, 6).join(" | ")}`);

  const summaryPath = path.join(ROOT, "review", "70cha-qa-summary.json");
  fs.writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        minimalInput: {
          productName: "시카 리페어 수딩 크림",
          category: "화장품/뷰티",
          price: 32900,
          optionalFieldsEmpty: true,
          imageCount: images.length,
          fullPath: "review/qa-screenshots/70cha-minimal-input-final.png",
        },
      },
      null,
      2,
    ),
  );

  await browser.close();
  console.log("[70cha-C] 완료");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
