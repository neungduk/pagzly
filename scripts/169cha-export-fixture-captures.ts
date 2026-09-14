/**
 * 169차 — 픽스처 세션을 export HTML로 무료 렌더 캡처 (유료 API 0).
 * 리듬 대비·네이티브 섹션 트리 육안용.
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "169cha-export-captures");
const SHOT = path.join(ROOT, "review", "qa-screenshots");

const CASES: { id: string; themeCategory: string }[] = [
  { id: "cosmetics-noreview", themeCategory: "화장품/뷰티" },
  { id: "fashion", themeCategory: "의류/패션" },
  { id: "food", themeCategory: "식품/건강기능식품" },
  { id: "living", themeCategory: "생활용품" },
  { id: "electronics", themeCategory: "전자제품" },
  { id: "cosmetics-review", themeCategory: "화장품/뷰티" },
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SHOT, { recursive: true });
  const browser = await chromium
    .launch({ headless: true, channel: "chrome" })
    .catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 860, height: 1200 } });

  for (const c of CASES) {
    const sessionPath = path.join(ROOT, "review", `139cha-session-${c.id}.json`);
    if (!fs.existsSync(sessionPath)) {
      console.warn("skip missing", c.id);
      continue;
    }
    const session = JSON.parse(fs.readFileSync(sessionPath, "utf8")) as {
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
    const imageUrls =
      session.generated?.imageUrls?.length
        ? session.generated.imageUrls
        : [
            "data:image/svg+xml," +
              encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect fill="#ddd" width="100%" height="100%"/><text x="50%" y="50%" text-anchor="middle" fill="#666" font-size="28">fixture</text></svg>`,
              ),
          ];
    const html = buildDetailPageHtml({
      productName: session.generated?.productName || session.productName || c.id,
      brandName: session.generated?.brandName || session.brandName,
      keyFeatures: session.keyFeatures,
      ingredients: session.ingredients,
      certifications: session.certifications,
      category: c.themeCategory,
      sections,
      imageUrls,
      theme: getCategoryTheme(c.themeCategory),
    });
    const htmlPath = path.join(OUT, `${c.id}.html`);
    fs.writeFileSync(htmlPath, html, "utf8");
    await page.goto(`file://${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);
    // SEO 텍스트 블록은 스크롤 아웃 — 본문 섹션 리듬만 캡처
    await page.evaluate(() => {
      const seo = document.querySelector(".pagzly-seo-text");
      if (seo instanceof HTMLElement) seo.style.display = "none";
    });
    const full = path.join(SHOT, `169cha-export-${c.id}-full.png`);
    await page.screenshot({ path: full, fullPage: true });
    const rhythm = path.join(SHOT, `169cha-export-${c.id}-rhythm.png`);
    await page.screenshot({ path: rhythm, fullPage: false });
    // 중간 본문(패턴 대비) — brand_story 이후 영역
    const mid = path.join(SHOT, `169cha-export-${c.id}-mid.png`);
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(200);
    await page.screenshot({ path: mid, fullPage: false });
    const types = sections.map((s) => s.type);
    console.log(
      JSON.stringify({
        id: c.id,
        sectionCount: types.length,
        hasStat: types.includes("stat_infographic"),
        hasChart: types.includes("comparison_chart"),
        hasTradeoff: types.includes("tradeoff_card"),
        shot: path.relative(ROOT, full),
      }),
    );
  }

  await browser.close();
  console.log("[169] export captures done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
