/**
 * 191차 — lazy-load 검증 (API 0). living 세션 export → img loading 속성 집계.
 *   npx tsx scripts/191cha-lazy-verify.ts
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "191cha-export");

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const session = JSON.parse(
    fs.readFileSync(path.join(ROOT, "review", "181cha-live", "living", "session.json"), "utf8"),
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
  const sections = session.generated?.sections ?? [];
  const imageUrls = session.generated?.imageUrls?.length
    ? session.generated.imageUrls
    : [
        "data:image/svg+xml," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect fill="#ddd" width="100%" height="100%"/></svg>`,
          ),
      ];
  const html = buildDetailPageHtml({
    productName: session.generated?.productName || session.productName || "living",
    brandName: session.generated?.brandName || session.brandName,
    keyFeatures: session.keyFeatures,
    ingredients: session.ingredients,
    certifications: session.certifications,
    category: "생활용품",
    sections,
    imageUrls,
    theme: getCategoryTheme("생활용품"),
  });
  const htmlPath = path.join(OUT, "living.html");
  fs.writeFileSync(htmlPath, html, "utf8");

  const browser = await chromium
    .launch({ headless: true, channel: "chrome" })
    .catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  await page.goto(`file://${htmlPath.replace(/\\/g, "/")}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  const stats = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")];
    const lazy = imgs.filter((i) => i.getAttribute("loading") === "lazy").length;
    const eager = imgs.filter((i) => i.getAttribute("loading") === "eager").length;
    const high = imgs.filter((i) => i.getAttribute("fetchpriority") === "high").length;
    const none = imgs.filter((i) => !i.hasAttribute("loading")).length;
    const hero = document.querySelector("section.hero img");
    return {
      total: imgs.length,
      lazy,
      eager,
      high,
      none,
      heroLoading: hero?.getAttribute("loading"),
      heroFetch: hero?.getAttribute("fetchpriority"),
    };
  });
  await browser.close();
  console.log(JSON.stringify(stats, null, 2));
  fs.writeFileSync(path.join(OUT, "lazy-stats.json"), JSON.stringify(stats, null, 2), "utf8");
  if (stats.lazy < 1) process.exitCode = 1;
  if (stats.heroFetch !== "high" && stats.heroLoading === "lazy") process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
