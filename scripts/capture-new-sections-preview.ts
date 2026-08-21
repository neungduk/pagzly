import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { freezeDetailScrollReveal } from "./capture-utils";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUTPUT_DIR = path.join(__dirname, "..", "review");

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 2,
  });

  await page.goto(`${BASE_URL}/dev/detail-preview?capture=1`, { waitUntil: "networkidle" });
  await page.locator("[data-preview-chrome]").evaluate((el) => {
    (el as HTMLElement).style.display = "none";
  });
  await freezeDetailScrollReveal(page);
  await page.waitForTimeout(500);

  const full = path.join(OUTPUT_DIR, "new-sections-beauty-preview.png");
  await page.screenshot({ path: full, fullPage: true });
  console.log(`저장됨: ${full}`);

  const stat = page.locator("section").filter({ hasText: "수치로 보는 핵심 포인트" });
  await stat.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const statPath = path.join(OUTPUT_DIR, "new-sections-stat-infographic.png");
  await stat.screenshot({ path: statPath });
  console.log(`저장됨: ${statPath}`);

  const banner = page.locator("section").filter({ hasText: "수분 레이어의 리듬" });
  await banner.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const bannerPath = path.join(OUTPUT_DIR, "new-sections-illustration-banner.png");
  await banner.screenshot({ path: bannerPath });
  console.log(`저장됨: ${bannerPath}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
