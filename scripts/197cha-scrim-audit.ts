/**
 * 197차 — 사진 독립 품질 감사: editorial bleed 6cat + illustration_banner 6cat (API 0).
 *   npx tsx scripts/197cha-scrim-audit.ts
 *
 * living/pet illustration_banner는 display-budget demote 대상이라,
 * 테마만 유지한 채 budget 비활성 카테고리 라벨로 단독 렌더해 실사한다.
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "197cha-export");
const SHOT = path.join(ROOT, "review", "qa-screenshots");

const CATS: Record<
  string,
  { category: string; editorialSlots: string[]; bannerIdx: number }
> = {
  beauty: {
    category: "화장품/뷰티",
    editorialSlots: ["customer_scenario"],
    bannerIdx: 10,
  },
  electronics: {
    category: "전자제품",
    editorialSlots: ["usage_scenario", "install_scenario"],
    bannerIdx: 19,
  },
  living: {
    category: "생활용품",
    editorialSlots: ["usage_scenario", "usage_scenario_extra"],
    bannerIdx: 11,
  },
  pet: {
    category: "반려동물",
    editorialSlots: ["usage_scenario", "usage_scenario_extra"],
    bannerIdx: 11,
  },
  food: {
    category: "식품/건강기능식품",
    editorialSlots: ["serving_suggestion"],
    bannerIdx: 11,
  },
  fashion: {
    category: "의류/패션",
    editorialSlots: ["coordination", "seasonal_styling"],
    bannerIdx: 19,
  },
};

function loadSession(key: string) {
  const sessionPath = path.join(ROOT, "review", "181cha-live", key, "session.json");
  return JSON.parse(fs.readFileSync(sessionPath, "utf8")) as {
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
}

function placeholderUrls() {
  return [
    "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect fill="#888" width="100%" height="100%"/></svg>`,
      ),
  ];
}

async function waitEditorialImages(page: import("playwright").Page, selector: string) {
  const loc = page.locator(selector);
  const count = await loc.count();
  for (let i = 0; i < count; i++) {
    const el = loc.nth(i);
    await el.scrollIntoViewIfNeeded();
    await el.evaluate(async (sec) => {
      const img = sec.querySelector("img") as HTMLImageElement | null;
      if (!img) return;
      img.loading = "eager";
      if (!img.complete || img.naturalWidth === 0) {
        const src = img.getAttribute("src");
        if (src) img.src = src;
        await new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(() => resolve(), 12000);
          }
        });
      }
    });
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SHOT, { recursive: true });

  const browser = await chromium
    .launch({ headless: true, channel: "chrome" })
    .catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 430, height: 1200 } });

  console.log("=== Track A: editorial bleed ===");
  for (const [key, cfg] of Object.entries(CATS)) {
    const session = loadSession(key);
    const sections = session.generated?.sections ?? [];
    const imageUrls = session.generated?.imageUrls?.length
      ? session.generated.imageUrls
      : placeholderUrls();
    const html = buildDetailPageHtml({
      productName: session.generated?.productName || session.productName || key,
      brandName: session.generated?.brandName || session.brandName,
      keyFeatures: session.keyFeatures,
      ingredients: session.ingredients,
      certifications: session.certifications,
      category: cfg.category,
      sections,
      imageUrls,
      theme: getCategoryTheme(cfg.category),
    });
    const htmlPath = path.join(OUT, `editorial-${key}.html`);
    fs.writeFileSync(htmlPath, html, "utf8");

    const hasNeutral = html.includes("rgba(27,27,24");
    const editorialCount = (html.match(/pagzly-editorial/g) || []).length;
    console.log(key, "neutral", hasNeutral, "editorial_blocks", editorialCount);

    await page.goto(`file://${htmlPath.replace(/\\/g, "/")}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(400);
    await waitEditorialImages(page, "section.pagzly-editorial");

    const editorials = page.locator("section.pagzly-editorial");
    const n = await editorials.count();
    for (let i = 0; i < n; i++) {
      const el = editorials.nth(i);
      await el.scrollIntoViewIfNeeded();
      const heading = ((await el.locator("h2").first().textContent()) || `i${i}`)
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 20);
      const slot = cfg.editorialSlots[i] ?? heading;
      const shotPath = path.join(SHOT, `197cha-editorial-${key}-${slot}.png`);
      await el.screenshot({ path: shotPath });
      console.log("  shot", shotPath);
    }
  }

  console.log("=== Track B: illustration_banner ===");
  for (const [key, cfg] of Object.entries(CATS)) {
    const session = loadSession(key);
    const sections = session.generated?.sections ?? [];
    const banner = sections[cfg.bannerIdx];
    if (!banner || banner.type !== "illustration_banner") {
      console.warn(key, "banner missing at", cfg.bannerIdx, banner?.type);
      continue;
    }
    const imageUrls = session.generated?.imageUrls?.length
      ? session.generated.imageUrls
      : placeholderUrls();
    // living/pet: display-budget demotes illustration_banner — use non-low category label for budget only
    const budgetCategory =
      cfg.category === "생활용품" || cfg.category === "반려동물"
        ? "화장품/뷰티"
        : cfg.category;
    const html = buildDetailPageHtml({
      productName: session.generated?.productName || session.productName || key,
      brandName: session.generated?.brandName || session.brandName,
      keyFeatures: session.keyFeatures,
      ingredients: session.ingredients,
      certifications: session.certifications,
      category: budgetCategory,
      sections: [banner],
      imageUrls,
      theme: getCategoryTheme(cfg.category),
    });
    const htmlPath = path.join(OUT, `banner-${key}.html`);
    fs.writeFileSync(htmlPath, html, "utf8");

    await page.goto(`file://${htmlPath.replace(/\\/g, "/")}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(400);
    await waitEditorialImages(page, "section.pagzly-illustration-banner, section");

    const bannerEl = page.locator("section.pagzly-illustration-banner").first();
    const fallback = page.locator("section").first();
    const target = (await bannerEl.count()) > 0 ? bannerEl : fallback;
    await target.scrollIntoViewIfNeeded();
    await target.evaluate(async (sec) => {
      const img = sec.querySelector("img") as HTMLImageElement | null;
      if (!img) return;
      img.loading = "eager";
      const src = img.getAttribute("src");
      if (src) img.src = src;
      await new Promise<void>((resolve) => {
        if (img.complete && img.naturalWidth > 0) resolve();
        else {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          setTimeout(() => resolve(), 12000);
        }
      });
    });
    const shotPath = path.join(SHOT, `197cha-banner-${key}.png`);
    await target.screenshot({ path: shotPath });
    console.log(key, "banner shot", shotPath, "heading", (banner as { heading?: string }).heading);
  }

  await browser.close();
  console.log("API calls: 0 (local re-render only)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
