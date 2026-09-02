/**
 * 59차 — annotated 주석형 콜아웃 mock 무료 캡처
 *   npx tsx scripts/capture-59cha-annotated.ts
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

  await page.goto(`${BASE_URL}/dev/detail-preview?capture=59-electronics`, {
    waitUntil: "networkidle",
  });
  await page.locator("text=듀얼 드라이버 구조").first().waitFor({ state: "visible", timeout: 15000 });
  await freezeDetailScrollReveal(page);
  await page.waitForTimeout(500);

  const fullPath = path.join(SHOT_DIR, "59cha-annotated-full.png");
  await page.screenshot({ path: fullPath, fullPage: true });
  console.log(`[59cha] ${fullPath} (${bytes(fullPath).toLocaleString()} bytes)`);

  const featureHeading = page.getByRole("heading", { name: "듀얼 드라이버 구조" }).first();
  await featureHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const section = featureHeading.locator("xpath=ancestor::section[1]");
  const cropPath = path.join(SHOT_DIR, "59cha-annotated-crop.png");
  await section.screenshot({ path: cropPath });
  console.log(`[59cha] ${cropPath} (${bytes(cropPath).toLocaleString()} bytes)`);

  const labelCount = await page.locator("text=ANC 드라이버").count();
  const svgLines = await page.locator("section svg line").count();
  console.log(`[59cha] annotation labels: ${labelCount}, svg leader lines: ${svgLines}`);

  await browser.close();

  console.log(`\n[59cha] API 호출: ${apiHits.length}건`);
  if (apiHits.length > 0) {
    for (const u of apiHits) console.log(`  - ${u}`);
    process.exit(1);
  }
  if (labelCount < 1 || svgLines < 1) {
    console.error("[59cha] annotated overlay 미확인");
    process.exit(1);
  }
  console.log("[59cha] annotated overlay 렌더 ✓");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
