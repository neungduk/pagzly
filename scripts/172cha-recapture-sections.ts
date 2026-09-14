import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const OUT = path.join(__dirname, "..", "review", "172cha-live-fashion");

async function main() {
  const htmlPath = path.join(OUT, "export-full.html");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 780, height: 1200 } });
  await page.goto(`file://${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.querySelector(".pagzly-seo-text")?.remove());
  // Wait for remote images to settle layout
  await page.waitForTimeout(2500);

  const review = page.locator("#pagzly-review");
  await review.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "03-review-highlight.png") });

  // Element-only crop of review section
  await review.screenshot({ path: path.join(OUT, "03-review-highlight-el.png") });

  // Chart + tradeoff dual (from earlier good capture pattern): scroll via locator text
  const chartHeading = page.getByText("일반 제품과 비교", { exact: true }).first();
  await chartHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "03-comparison-chart.png") });

  const tradeHeading = page.getByText("이런 분께 추천", { exact: true }).first();
  await tradeHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "03-tradeoff-card.png") });

  const box = await review.boundingBox();
  console.log(
    JSON.stringify({
      reviewBox: box,
      reviewCount: await review.count(),
      chartVisible: await chartHeading.isVisible(),
      tradeVisible: await tradeHeading.isVisible(),
    }),
  );
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
