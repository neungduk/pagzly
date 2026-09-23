/** 183차 — COMPARE 섹션만 재캡처 (before=182 HTML, after=현재 export). API 0. */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "183cha-export");
const SHOT = path.join(ROOT, "review", "qa-screenshots");
const CATS = [
  { key: "beauty", category: "화장품/뷰티" },
  { key: "fashion", category: "의류/패션" },
  { key: "living", category: "생활용품" },
  { key: "pet", category: "반려동물" },
] as const;

async function shot(page: import("playwright").Page, htmlPath: string, outName: string) {
  await page.goto(`file://${htmlPath.replace(/\\/g, "/")}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(400);
  const loc = page.locator("text=COMPARE").first();
  if ((await loc.count()) === 0) {
    console.warn("no COMPARE", outName);
    return;
  }
  await loc.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const box = await loc.boundingBox();
  if (!box) return;
  // COMPARE 라벨 기준 위 40 ~ 아래 520 크롭
  await page.screenshot({
    path: path.join(SHOT, outName),
    clip: {
      x: 0,
      y: Math.max(0, box.y - 40),
      width: 430,
      height: 560,
    },
  });
  console.log("wrote", outName);
}

async function main() {
  const browser = await chromium
    .launch({ headless: true, channel: "chrome" })
    .catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });

  for (const c of CATS) {
    await shot(page, path.join(OUT, `before-${c.key}.html`), `183cha-before-${c.key}-chart.png`);

    const session = JSON.parse(
      fs.readFileSync(path.join(ROOT, "review", "181cha-live", c.key, "session.json"), "utf8"),
    ) as {
      productName?: string;
      brandName?: string;
      keyFeatures?: string;
      ingredients?: string;
      certifications?: string;
      generated?: {
        productName?: string;
        brandName?: string;
        sections?: DetailSection[];
        imageUrls?: string[];
      };
    };
    const html = buildDetailPageHtml({
      productName: session.generated?.productName || session.productName || c.key,
      brandName: session.generated?.brandName || session.brandName,
      keyFeatures: session.keyFeatures,
      ingredients: session.ingredients,
      certifications: session.certifications,
      category: c.category,
      sections: session.generated?.sections ?? [],
      imageUrls: session.generated?.imageUrls ?? [],
      theme: getCategoryTheme(c.category),
    });
    const afterPath = path.join(OUT, `after-${c.key}.html`);
    fs.writeFileSync(afterPath, html, "utf8");
    await shot(page, afterPath, `183cha-after-${c.key}-chart.png`);

    // hero 재캡처 (헤드라인 포함)
    await page.goto(`file://${afterPath.replace(/\\/g, "/")}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: path.join(SHOT, `183cha-after-${c.key}-hero.png`),
      clip: { x: 0, y: 0, width: 430, height: 720 },
    });
    await page.goto(`file://${path.join(OUT, `before-${c.key}.html`).replace(/\\/g, "/")}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: path.join(SHOT, `183cha-before-${c.key}-hero.png`),
      clip: { x: 0, y: 0, width: 430, height: 720 },
    });
  }

  await browser.close();
  console.log("[183] chart/hero recapture done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
