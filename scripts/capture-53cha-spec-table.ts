/**
 * 53차 — spec_table 썸네일 무료 캡처 (dev 미리보기, API 없음)
 *   npx tsx scripts/capture-53cha-spec-table.ts
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = path.join(ROOT, "review", "qa-screenshots", "53cha-spec-table-preview.png");

async function main() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  await page.goto(`${BASE_URL}/dev/detail-preview`, { waitUntil: "networkidle" });

  const specHeading = page.getByRole("heading", { name: "제품 정보" });
  await specHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  const section = specHeading.locator("xpath=ancestor::section[1]");
  await section.screenshot({ path: OUT });
  const bytes = fs.statSync(OUT).size;
  console.log(`[53cha-spec] ${OUT} (${bytes.toLocaleString()} bytes)`);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
