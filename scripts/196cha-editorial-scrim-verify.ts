/**
 * 196차 — editorial bleed 중립 스크림 검증 + 전체 섹션 스크린샷 (API 0).
 *   npx tsx scripts/196cha-editorial-scrim-verify.ts
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "196cha-export");
const SHOT = path.join(ROOT, "review", "qa-screenshots");

const TARGETS = [
  {
    key: "food",
    category: "식품/건강기능식품",
    slots: ["serving_suggestion"] as const,
  },
  {
    key: "fashion",
    category: "의류/패션",
    slots: ["coordination", "seasonal_styling"] as const,
  },
] as const;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SHOT, { recursive: true });

  const browser = await chromium
    .launch({ headless: true, channel: "chrome" })
    .catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 430, height: 1200 } });

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

    const hasBrandScrim = /getHeroGradient|deepAccent|accent\)\s*0%/.test(html);
    const hasNeutralScrim = html.includes("rgba(27,27,24");
    console.log(t.key, "neutral_scrim", hasNeutralScrim, "brand_leak_heuristic", hasBrandScrim);

    await page.goto(`file://${htmlPath.replace(/\\/g, "/")}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(700);
    await page.evaluate(async () => {
      const imgs = [...document.querySelectorAll("section.pagzly-editorial img")];
      for (const img of imgs) {
        const el = img as HTMLImageElement;
        el.loading = "eager";
        // re-trigger fetch if still unloaded
        if (!el.complete || el.naturalWidth === 0) {
          const src = el.getAttribute("src");
          if (src) el.src = src;
        }
      }
      await Promise.all(
        imgs.map(
          (img) =>
            new Promise<void>((resolve) => {
              const el = img as HTMLImageElement;
              if (el.complete && el.naturalWidth > 0) resolve();
              else {
                el.onload = () => resolve();
                el.onerror = () => resolve();
                setTimeout(() => resolve(), 12000);
              }
            }),
        ),
      );
    });
    await page.waitForTimeout(400);

    const editorials = page.locator("section.pagzly-editorial");
    const count = await editorials.count();
    for (let i = 0; i < count; i++) {
      const el = editorials.nth(i);
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      // force load this section's image after scroll
      const nw = await el.evaluate(async (sec) => {
        const img = sec.querySelector("img") as HTMLImageElement | null;
        if (!img) return 0;
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
        return img.naturalWidth;
      });
      const heading = (await el.locator("h2").first().textContent())?.trim() ?? `i${i}`;
      const slotHint =
        t.slots[i] ??
        heading
          .replace(/\s+/g, "-")
          .slice(0, 24);
      const shotPath = path.join(SHOT, `196cha-after-${t.key}-${slotHint}-full.png`);
      await el.screenshot({ path: shotPath });
      console.log("shot", shotPath, "naturalWidth", nw);

      const bodyText = await el.evaluate((sec) => {
        const wrap = [...sec.querySelectorAll("div")].find((d) =>
          (d.getAttribute("style") || "").includes("padding:24px 24px 48px"),
        );
        return wrap?.querySelector(":scope > p")?.textContent?.trim().slice(0, 80) ?? "";
      });
      console.log("  body", bodyText);
    }
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
