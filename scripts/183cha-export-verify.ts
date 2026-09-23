/**
 * 183차 — 181 저장 세션으로 export HTML 렌더 + 섹션수 + 스크린샷 (API 0).
 *   npx tsx scripts/183cha-export-verify.ts before|after
 *
 * before 캡처: 제품 코드 stash 후 실행 (section-display-budget 없을 수 있음)
 * after 캡처: stash pop 후 실행
 */
import crypto from "crypto";
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
  { key: "food", category: "식품/건강기능식품" },
  { key: "electronics", category: "전자제품" },
  { key: "living", category: "생활용품" },
  { key: "pet", category: "반려동물" },
] as const;

function sha256(s: string) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

async function loadBudgetFn(): Promise<
  (category: string, sections: DetailSection[]) => DetailSection[]
> {
  try {
    const mod = await import("../lib/section-display-budget");
    return mod.applySectionDisplayBudget;
  } catch {
    return (_c, sections) => sections;
  }
}

async function main() {
  const tag = process.argv[2] === "after" ? "after" : "before";
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SHOT, { recursive: true });
  const applyBudget = await loadBudgetFn();

  const hashes: Record<string, string> = {};
  const sectionCounts: Record<
    string,
    { raw: number; displayed: number; demoted: number; renderedSections: number }
  > = {};

  const browser = await chromium
    .launch({ headless: true, channel: "chrome" })
    .catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });

  for (const c of CATS) {
    const sessionPath = path.join(ROOT, "review", "181cha-live", c.key, "session.json");
    if (!fs.existsSync(sessionPath)) {
      console.warn("skip", c.key);
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
    const displayed = applyBudget(c.category, sections);

    const imageUrls = session.generated?.imageUrls?.length
      ? session.generated.imageUrls
      : [
          "data:image/svg+xml," +
            encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect fill="#ddd" width="100%" height="100%"/></svg>`,
            ),
        ];
    const html = buildDetailPageHtml({
      productName: session.generated?.productName || session.productName || c.key,
      brandName: session.generated?.brandName || session.brandName,
      keyFeatures: session.keyFeatures,
      ingredients: session.ingredients,
      certifications: session.certifications,
      category: c.category,
      sections,
      imageUrls,
      theme: getCategoryTheme(c.category),
    });
    const htmlPath = path.join(OUT, `${tag}-${c.key}.html`);
    fs.writeFileSync(htmlPath, html, "utf8");
    hashes[c.key] = sha256(html);

    await page.goto(`file://${htmlPath.replace(/\\/g, "/")}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      const seo = document.querySelector(".pagzly-seo-text");
      if (seo instanceof HTMLElement) seo.style.display = "none";
    });

    const renderedSections = await page.evaluate(
      () => document.querySelectorAll("section").length,
    );
    sectionCounts[c.key] = {
      raw: sections.length,
      displayed: displayed.length,
      demoted: sections.length - displayed.length,
      renderedSections,
    };

    await page.screenshot({
      path: path.join(SHOT, `183cha-${tag}-${c.key}-export-full.png`),
      fullPage: true,
    });

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);
    await page.screenshot({
      path: path.join(SHOT, `183cha-${tag}-${c.key}-hero.png`),
      fullPage: false,
    });

    const chartY = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll("section, p, h1, h2, h3"));
      for (const el of nodes) {
        const t = (el.textContent || "").trim();
        if (t.includes("COMPARE") || t.includes("일반 제품")) {
          const r = el.getBoundingClientRect();
          return Math.max(0, window.scrollY + r.top - 80);
        }
      }
      return Math.floor(document.body.scrollHeight * 0.42);
    });
    await page.evaluate((y) => window.scrollTo(0, y), chartY);
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(SHOT, `183cha-${tag}-${c.key}-chart.png`),
      fullPage: false,
    });

    console.log(
      `[183] ${tag} ${c.key} raw=${sectionCounts[c.key]!.raw} displayed=${sectionCounts[c.key]!.displayed} rendered=${renderedSections} sha=${hashes[c.key]!.slice(0, 12)}…`,
    );
  }

  await browser.close();
  const meta = { tag, at: new Date().toISOString(), hashes, sectionCounts };
  fs.writeFileSync(path.join(OUT, `${tag}-meta.json`), JSON.stringify(meta, null, 2));
  console.log(`[183] wrote ${path.join(OUT, `${tag}-meta.json`)}`);

  if (tag === "after") {
    const beforePath = path.join(OUT, "before-meta.json");
    if (fs.existsSync(beforePath)) {
      const before = JSON.parse(fs.readFileSync(beforePath, "utf8")) as {
        hashes: Record<string, string>;
        sectionCounts: typeof sectionCounts;
      };
      const diffs: Record<
        string,
        {
          hashSame: boolean;
          renderedBefore: number;
          renderedAfter: number;
        }
      > = {};
      for (const k of Object.keys(hashes)) {
        diffs[k] = {
          hashSame: before.hashes[k] === hashes[k],
          renderedBefore: before.sectionCounts?.[k]?.renderedSections ?? 0,
          renderedAfter: sectionCounts[k]?.renderedSections ?? 0,
        };
      }
      fs.writeFileSync(path.join(OUT, "diff.json"), JSON.stringify(diffs, null, 2));
      console.log("[183] diff", JSON.stringify(diffs, null, 2));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
