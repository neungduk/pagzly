/**
 * 57차 B — 크기비교 다이어그램 무료 캡처 (API 호출 없음)
 *   npx tsx scripts/capture-57cha-size-compare.ts
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { freezeDetailScrollReveal } from "./capture-utils";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const SHOT_DIR = path.join(__dirname, "..", "review", "qa-screenshots");

const FORBIDDEN_API = ["/api/generate", "/api/enhance"];

function bytes(file: string): number {
  return fs.statSync(file).size;
}

async function captureVariant(
  page: import("playwright").Page,
  capture: string,
  slug: string,
  apiHits: string[],
) {
  await page.goto(`${BASE_URL}/dev/detail-preview?capture=${capture}`, {
    waitUntil: "networkidle",
  });
  await page.locator('svg[aria-label="크기 비교 다이어그램"]').waitFor({
    state: "visible",
    timeout: 15000,
  });
  await freezeDetailScrollReveal(page);
  await page.waitForTimeout(400);

  const diagram = page.locator('svg[aria-label="크기 비교 다이어그램"]');
  await diagram.scrollIntoViewIfNeeded();
  const diagramPath = path.join(SHOT_DIR, `57cha-size-compare-${slug}.png`);
  await diagram.screenshot({ path: diagramPath });
  console.log(`[57cha-b] ${diagramPath} (${bytes(diagramPath).toLocaleString()} bytes)`);

  const specHeading = page.getByRole("heading", { name: "제품 정보" });
  await specHeading.scrollIntoViewIfNeeded();
  const section = specHeading.locator("xpath=ancestor::section[1]");
  const sectionPath = path.join(SHOT_DIR, `57cha-spec-with-compare-${slug}.png`);
  await section.screenshot({ path: sectionPath });
  console.log(`[57cha-b] ${sectionPath} (${bytes(sectionPath).toLocaleString()} bytes)`);
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

  await captureVariant(page, "57-food", "food", apiHits);
  await captureVariant(page, "57-electronics", "electronics", apiHits);

  await browser.close();

  console.log(`\n[57cha-b] API 호출: ${apiHits.length}건`);
  if (apiHits.length > 0) {
    for (const u of apiHits) console.log(`  - ${u}`);
    process.exit(1);
  }
  console.log("[57cha-b] /api/generate, /api/enhance 호출 없음 ✓");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
