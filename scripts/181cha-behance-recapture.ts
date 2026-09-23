/**
 * 181차 — Behance 레퍼런스 재캡처 (headless + project module 스크롤).
 *   npx tsx scripts/181cha-behance-recapture.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "qa-screenshots");

const REFS = [
  {
    key: "electronics",
    url: "https://www.behance.net/gallery/247616149/Shark-Air-Purifier-Product-Design",
  },
  {
    key: "food",
    url: "https://www.behance.net/gallery/245412913/Wellness-Supplement-Product-Page-UI-Design",
  },
  {
    key: "pet",
    url: "https://www.behance.net/gallery/242350037/Pawcare-Shopify-Store-Website-Design",
  },
  {
    key: "living",
    url: "https://www.behance.net/gallery/118641203/Icon3-Air-Purifier-Landing-Page-Web-UI-Design",
  },
  {
    // living furniture alternative if air purifier used for electronics overlap
    key: "living-furniture",
    url: "https://www.behance.net/search/projects?search=furniture%20ecommerce%20product%20detail",
  },
] as const;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  for (const ref of REFS) {
    console.log(`[181] ${ref.key}`);
    await page.goto(ref.url, { waitUntil: "networkidle", timeout: 120_000 }).catch(async () => {
      await page.goto(ref.url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    });
    await page.waitForTimeout(4000);
    await page.keyboard.press("Escape").catch(() => undefined);
    // scroll into project images
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(1500);
    const file = path.join(OUT, `181cha-behance-${ref.key}.png`);
    await page.screenshot({ path: file, fullPage: false });
    const st = fs.statSync(file);
    console.log(`[181] ${ref.key} bytes=${st.size}`);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
