/**
 * 195차 — editorial bleed overlay 검증 (API 0).
 *   npx tsx scripts/195cha-editorial-verify.ts
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "195cha-export");
const SHOT = path.join(ROOT, "review", "qa-screenshots");

const TARGETS = [
  { key: "food", category: "식품/건강기능식품", slots: ["serving_suggestion"] },
  { key: "fashion", category: "의류/패션", slots: ["coordination", "seasonal_styling"] },
] as const;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SHOT, { recursive: true });

  const browser = await chromium
    .launch({ headless: true, channel: "chrome" })
    .catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });

  for (const t of TARGETS) {
    const sessionPath = path.join(ROOT, "review", "181cha-live", t.key, "session.json");
    if (!fs.existsSync(sessionPath)) {
      console.warn("skip", t.key);
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
    const editorial = sections.filter((s) => {
      const slot = (s as { slot?: string }).slot ?? "";
      return s.type === "image_text" && (t.slots as readonly string[]).includes(slot);
    });
    console.log(
      t.key,
      "editorial slots",
      editorial.map((s) => `${(s as { slot?: string }).slot}:${(s as { heading?: string }).heading}`),
    );

    const imageUrls = session.generated?.imageUrls?.length
      ? session.generated.imageUrls
      : [
          "data:image/svg+xml," +
            encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect fill="#888" width="100%" height="100%"/></svg>`,
            ),
        ];
    const html = buildDetailPageHtml({
      productName: session.generated?.productName || session.productName || t.key,
      brandName: session.generated?.brandName || session.brandName,
      keyFeatures: session.keyFeatures,
      ingredients: session.ingredients,
      certifications: session.certifications,
      category: t.category,
      sections,
      imageUrls,
      theme: getCategoryTheme(t.category),
    });
    const htmlPath = path.join(OUT, `after-${t.key}.html`);
    fs.writeFileSync(htmlPath, html, "utf8");

    await page.goto(`file://${htmlPath.replace(/\\/g, "/")}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(500);

    const stats = await page.evaluate(() => {
      const blocks = [...document.querySelectorAll("section.pagzly-editorial")];
      return blocks.map((sec) => {
        const overlay = sec.querySelector(
          "div[style*='position:relative'] > div[style*='justify-content:flex-end']",
        );
        const overlayH2 = overlay?.querySelector("h2");
        const bodyWrap = [...sec.querySelectorAll("div")].find((d) =>
          (d.getAttribute("style") || "").includes("padding:24px 24px 48px"),
        );
        const bodyP = bodyWrap?.querySelector(":scope > p");
        return {
          h2InOverlay: Boolean(overlayH2),
          heading: overlayH2?.textContent?.trim() ?? "",
          bodyPreview: bodyP?.textContent?.trim().slice(0, 60) ?? "",
          bodyBelowImage: Boolean(bodyP && !overlay?.contains(bodyP)),
        };
      });
    });
    console.log(t.key, "dom", JSON.stringify(stats, null, 2));

    const first = page.locator("section.pagzly-editorial").first();
    if ((await first.count()) > 0) {
      const shotPath = path.join(SHOT, `195cha-after-${t.key}-editorial.png`);
      await first.screenshot({ path: shotPath });
      console.log("shot", shotPath);
    }
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
