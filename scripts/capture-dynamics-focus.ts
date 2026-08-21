import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const OUT = path.join(__dirname, "..", "review");

async function run(width: number, label: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto("http://localhost:3000/dev/detail-preview", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  await page.getByText("수치로 보는 핵심 포인트").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, `dynamics-${label}-stat-layered.png`) });

  await page.getByText("실제 구매자 리뷰에서 자주 나온 내용을 요약했습니다").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, `dynamics-${label}-review-layered.png`) });

  await page.evaluate(() => window.scrollTo(0, 320));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `dynamics-${label}-clip-boundary.png`) });

  console.log("ok", label);
  await browser.close();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  await run(1280, "desktop");
  await run(375, "mobile");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
