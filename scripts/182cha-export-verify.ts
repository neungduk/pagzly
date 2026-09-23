/**
 * 182차 — 181 저장 세션으로 export HTML 렌더 + sha256 + 스크린샷 (API 0).
 *   npx tsx scripts/182cha-export-verify.ts before|after
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "182cha-export");
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

async function main() {
  const tag = process.argv[2] === "after" ? "after" : "before";
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SHOT, { recursive: true });

  const hashes: Record<string, string> = {};
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

    // 원격 이미지 실패해도 레이아웃·타이포는 캡처
    await page.goto(`file://${htmlPath.replace(/\\/g, "/")}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      const seo = document.querySelector(".pagzly-seo-text");
      if (seo instanceof HTMLElement) seo.style.display = "none";
    });
    await page.screenshot({
      path: path.join(SHOT, `182cha-${tag}-${c.key}-export-full.png`),
      fullPage: true,
    });
    // brand_story / caution 근처 — 하단으로 스크롤
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.72));
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(SHOT, `182cha-${tag}-${c.key}-export-lower.png`),
      fullPage: false,
    });
    console.log(`[182] ${tag} ${c.key} sha=${hashes[c.key].slice(0, 12)}…`);
  }

  await browser.close();
  const hashPath = path.join(OUT, `${tag}-hashes.json`);
  fs.writeFileSync(hashPath, JSON.stringify({ tag, at: new Date().toISOString(), hashes }, null, 2));
  console.log(`[182] wrote ${hashPath}`);

  if (tag === "after") {
    const beforePath = path.join(OUT, "before-hashes.json");
    if (fs.existsSync(beforePath)) {
      const before = JSON.parse(fs.readFileSync(beforePath, "utf8")) as {
        hashes: Record<string, string>;
      };
      const diffs: Record<string, { before: string; after: string; same: boolean }> = {};
      for (const k of Object.keys(hashes)) {
        diffs[k] = {
          before: before.hashes[k] ?? "",
          after: hashes[k],
          same: before.hashes[k] === hashes[k],
        };
      }
      fs.writeFileSync(path.join(OUT, "hash-diff.json"), JSON.stringify(diffs, null, 2));
      // HTML 텍스트 diff — font-size 변경만 기대
      for (const k of Object.keys(hashes)) {
        const b = fs.readFileSync(path.join(OUT, `before-${k}.html`), "utf8");
        const a = fs.readFileSync(path.join(OUT, `after-${k}.html`), "utf8");
        if (b === a) {
          console.log(`[182] ${k} HTML identical`);
          continue;
        }
        // 단순: font-size 토큰화로 인한 동일값 치환 vs 실제 값 변경
        const normalize = (s: string) =>
          s
            .replace(/font-size:1\.25rem/g, "font-size:SECTION")
            .replace(/font-size:1\.35rem/g, "font-size:SECTION_SM")
            .replace(/font-size:1\.5rem/g, "font-size:SECTION");
        // 값 변경 지점만 추출 — before caution 1.25 / story 1.35 → after 1.5
        const cautionBefore = (b.match(/NOTICE[\s\S]{0,200}font-size:([^;]+)/) || [])[1];
        const cautionAfter = (a.match(/NOTICE[\s\S]{0,200}font-size:([^;]+)/) || [])[1];
        const storyBefore = (b.match(/STORY[\s\S]{0,280}font-size:([^;]+)/) || [])[1];
        const storyAfter = (a.match(/STORY[\s\S]{0,280}font-size:([^;]+)/) || [])[1];
        console.log(
          JSON.stringify({
            key: k,
            caution: { before: cautionBefore, after: cautionAfter },
            story: { before: storyBefore, after: storyAfter },
            hashSame: diffs[k]?.same,
          }),
        );
        void normalize;
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
