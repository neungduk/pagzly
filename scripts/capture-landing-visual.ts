import { chromium } from "playwright";
import path from "path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(__dirname, "..", "review");

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);

  await page.screenshot({
    path: path.join(OUT_DIR, "landing-visual-hero.png"),
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });

  await page.screenshot({
    path: path.join(OUT_DIR, "landing-visual-full.png"),
    fullPage: true,
  });

  await page.locator("#showcase").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(OUT_DIR, "landing-visual-showcase.png"),
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });

  await page.locator("#features").scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(OUT_DIR, "landing-visual-features.png"),
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });

  await browser.close();
  console.log("Saved landing screenshots to review/landing-visual-*.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
