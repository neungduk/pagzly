/**
 * 172차 — session.json에서 tradeoff/chart/review 구간 export HTML 캡처
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "172cha-live-fashion");
const session = JSON.parse(fs.readFileSync(path.join(OUT, "session.json"), "utf8")) as {
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

async function main() {
  const sections = session.generated?.sections ?? [];
  const html = buildDetailPageHtml({
    productName: session.generated?.productName || session.productName || "tee",
    brandName: session.generated?.brandName || session.brandName,
    keyFeatures: session.keyFeatures,
    ingredients: session.ingredients,
    certifications: session.certifications,
    category: "의류/패션",
    sections,
    imageUrls: session.generated?.imageUrls?.length
      ? session.generated.imageUrls
      : ["data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect fill="#ddd" width="100%" height="100%"/></svg>')],
    theme: getCategoryTheme("의류/패션"),
  });
  const htmlPath = path.join(OUT, "export-full.html");
  fs.writeFileSync(htmlPath, html, "utf8");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 780, height: 1100 } });
  await page.goto(`file://${htmlPath.replace(/\\/g, "/")}`);
  await page.evaluate(() => {
    const seo = document.querySelector(".pagzly-seo-text");
    if (seo instanceof HTMLElement) seo.style.display = "none";
  });

  for (const [sel, name] of [
    ['[data-testid="tradeoff-card"], section:has-text("이런 분께 추천")', "03-tradeoff"],
    ["section:has-text('일반 제품')", "03-chart"],
    ['[data-testid="review-highlight"], section:has-text("실제 구매")', "03-review"],
  ] as const) {
    // Playwright file:// may not support :has-text in CSS — use evaluate scroll
    await page.evaluate((needle) => {
      const el = Array.from(document.querySelectorAll("section,div")).find((n) =>
        (n.textContent || "").includes(needle),
      );
      el?.scrollIntoView({ block: "center" });
    }, name.includes("tradeoff") ? "이런 분께 추천" : name.includes("chart") ? "일반 제품" : "실제 구매");
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  }

  // dedicated tradeoff testid if present
  const to = page.locator('[data-testid="tradeoff-card"]');
  if (await to.count()) {
    await to.first().screenshot({ path: path.join(OUT, "03-tradeoff-card.png") });
  }
  const rh = page.locator('[data-testid="review-highlight"]');
  if (await rh.count()) {
    await rh.first().screenshot({ path: path.join(OUT, "03-review-highlight.png") });
  }

  await browser.close();
  console.log("[172] section captures written");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
