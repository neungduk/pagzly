/**
 * 60차 — compact image_text square/circle 교차 렌더 무료 캡처
 *   npx tsx scripts/capture-60cha-preview.ts
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { freezeDetailScrollReveal } from "./capture-utils";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const SHOT_DIR = path.join(ROOT, "review", "qa-screenshots");

const FORBIDDEN_API = ["/api/generate", "/api/enhance"];

function bytes(file: string): number {
  return fs.statSync(file).size;
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const apiHits: string[] = [];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 2,
  });

  page.on("response", (res) => {
    const url = res.url();
    for (const forbidden of FORBIDDEN_API) {
      if (url.includes(forbidden)) apiHits.push(url);
    }
  });

  await page.goto(`${BASE_URL}/dev/detail-preview?capture=60-compact-shapes`, {
    waitUntil: "networkidle",
  });
  await page.locator("text=무향 케어").first().waitFor({ state: "visible", timeout: 15000 });
  await freezeDetailScrollReveal(page);
  await page.waitForTimeout(500);

  const fullPath = path.join(SHOT_DIR, "60cha-compact-shapes-full.png");
  await page.screenshot({ path: fullPath, fullPage: true });
  console.log(`[60cha] ${fullPath} (${bytes(fullPath).toLocaleString()} bytes)`);

  const compactHeading = page.getByRole("heading", { name: "무향 케어" }).first();
  await compactHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const section = compactHeading.locator("xpath=ancestor::section[1]");
  const cropPath = path.join(SHOT_DIR, "60cha-compact-shapes-crop.png");
  await section.screenshot({ path: cropPath });
  console.log(`[60cha] ${cropPath} (${bytes(cropPath).toLocaleString()} bytes)`);

  const circleCount = await page.locator("img.rounded-full").count();
  const squareCount = await page.locator("section img.rounded-xl").count();
  console.log(`[60cha] rounded-full thumbnails: ${circleCount}, rounded-xl in sections: ${squareCount}`);

  await browser.close();

  console.log(`\n[60cha] API 호출: ${apiHits.length}건`);
  if (apiHits.length > 0) {
    for (const u of apiHits) console.log(`  - ${u}`);
    process.exit(1);
  }
  if (circleCount < 1 || squareCount < 1) {
    console.error("[60cha] square/circle 혼합 미확인");
    process.exit(1);
  }
  console.log("[60cha] square/circle 혼합 렌더 ✓");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
