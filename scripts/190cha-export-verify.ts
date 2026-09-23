/**
 * 190차 — 저관여 표시 예산 상한 축소 검증 (API 0).
 * 181 저장 세션으로 demote 수치 + living export 스크린샷.
 *   npx tsx scripts/190cha-export-verify.ts
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import {
  applySectionDisplayBudget,
  computeDemotedSectionIndexes,
  isLowInvolvementCategory,
} from "../lib/section-display-budget";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "190cha-export");
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

function mainSync() {
  fs.mkdirSync(OUT, { recursive: true });
  const table: Record<
    string,
    {
      low: boolean;
      raw: number;
      displayed: number;
      demoted: number;
      demotedSlots: string[];
    }
  > = {};

  for (const c of CATS) {
    const sessionPath = path.join(ROOT, "review", "181cha-live", c.key, "session.json");
    if (!fs.existsSync(sessionPath)) {
      console.warn("skip", c.key);
      continue;
    }
    const session = JSON.parse(fs.readFileSync(sessionPath, "utf8")) as {
      generated?: { sections?: DetailSection[] };
    };
    const sections = session.generated?.sections ?? [];
    const demotedIdx = computeDemotedSectionIndexes(c.category, sections);
    const displayed = applySectionDisplayBudget(c.category, sections);
    const demotedSlots = demotedIdx.map((i) => {
      const s = sections[i];
      return `${s.slot || s.type}`;
    });
    table[c.key] = {
      low: isLowInvolvementCategory(c.category),
      raw: sections.length,
      displayed: displayed.length,
      demoted: demotedIdx.length,
      demotedSlots,
    };
  }

  console.log("=== 190cha display budget ===");
  console.log("cat\tlow\traw\tdisplayed\tdemoted\tslots");
  for (const c of CATS) {
    const t = table[c.key];
    if (!t) continue;
    console.log(
      [c.key, t.low, t.raw, t.displayed, t.demoted, t.demotedSlots.join(",")].join("\t"),
    );
  }
  fs.writeFileSync(path.join(OUT, "budget-table.json"), JSON.stringify(table, null, 2), "utf8");
  return table;
}

async function shotLiving(tag: "before" | "after") {
  fs.mkdirSync(SHOT, { recursive: true });
  const sessionPath = path.join(ROOT, "review", "181cha-live", "living", "session.json");
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
  const htmlPath = path.join(OUT, `${tag}-living.html`);
  fs.writeFileSync(htmlPath, html, "utf8");
  fs.writeFileSync(path.join(OUT, `${tag}-living.sha256`), sha256(html), "utf8");

  const browser = await chromium
    .launch({ headless: true, channel: "chrome" })
    .catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
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
  const shotPath = path.join(SHOT, `190cha-${tag}-living-export-full.png`);
  await page.screenshot({ path: shotPath, fullPage: true });
  await browser.close();
  console.log("screenshot", shotPath);
  console.log("renderedSections", renderedSections);
  console.log("sha256", sha256(html));
}

async function main() {
  const tag = process.argv[2] === "before" ? "before" : "after";
  if (tag === "after") mainSync();
  await shotLiving(tag);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
