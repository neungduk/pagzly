/**
 * 58차 — 6카테고리 baseNeutral 무료 풀페이지 캡처 (API 호출 없음)
 *   npx tsx scripts/capture-58cha-preview.ts
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { freezeDetailScrollReveal } from "./capture-utils";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const SHOT_DIR = path.join(ROOT, "review", "qa-screenshots");

const CAPTURES = [
  { capture: "58-fashion", slug: "fashion", waitFor: "FASHION" },
  { capture: "58-cosmetics", slug: "cosmetics", waitFor: "AURA LAB" },
  { capture: "58-food", slug: "food", waitFor: "한그릇 키친" },
  { capture: "58-electronics", slug: "electronics", waitFor: "NORA AUDIO" },
  { capture: "58-living", slug: "living", waitFor: "PLAIN HOME" },
  { capture: "58-pet", slug: "pet", waitFor: "PAW FRIEND" },
] as const;

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

  for (const { capture, slug, waitFor } of CAPTURES) {
    await page.goto(`${BASE_URL}/dev/detail-preview?capture=${capture}`, {
      waitUntil: "networkidle",
    });
    await page.locator(`text=${waitFor}`).first().waitFor({ state: "visible", timeout: 15000 });
    await freezeDetailScrollReveal(page);
    await page.waitForTimeout(500);

    const fullPath = path.join(SHOT_DIR, `58cha-preview-${slug}.png`);
    await page.screenshot({ path: fullPath, fullPage: true });
    console.log(`[58cha] ${fullPath} (${bytes(fullPath).toLocaleString()} bytes)`);

    const specHeading = page.getByRole("heading", { name: /제품 정보|사이즈 안내/ }).first();
    if (await specHeading.count()) {
      await specHeading.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      const section = specHeading.locator("xpath=ancestor::section[1]");
      const specPath = path.join(SHOT_DIR, `58cha-spec-section-${slug}.png`);
      await section.screenshot({ path: specPath });
      console.log(`[58cha] ${specPath} (${bytes(specPath).toLocaleString()} bytes)`);
    }
  }

  await browser.close();

  console.log(`\n[58cha] API 호출: ${apiHits.length}건`);
  if (apiHits.length > 0) {
    for (const u of apiHits) console.log(`  - ${u}`);
    process.exit(1);
  }
  console.log("[58cha] /api/generate, /api/enhance 호출 없음 ✓");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
