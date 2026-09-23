/**
 * 227차 — Before/After 입력·삽입·게이팅 검증 (API 0).
 *   npx tsx scripts/227cha-before-after-verify.ts
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import {
  BEFORE_AFTER_COMPLIANCE_NOTE,
  isBeforeAfterEligibleCategory,
} from "../lib/before-after-eligibility";
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { insertBeforeAfterSection } from "../lib/section-inserts";
import type { DetailSection, ReviewHighlightSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "227cha-before-after");

const ALL_CATEGORIES = [
  "의류/패션",
  "화장품/뷰티",
  "식품/건강기능식품",
  "전자제품",
  "생활용품",
  "반려동물",
] as const;

const SAMPLE_PAIRS = [
  {
    beforeUrl: "https://placehold.co/400x400/png?text=Before1",
    afterUrl: "https://placehold.co/400x400/png?text=After1",
    caption: "2주 사용 후",
  },
  {
    beforeUrl: "https://placehold.co/401x401/png?text=Before2",
    afterUrl: "https://placehold.co/401x401/png?text=After2",
    caption: null,
  },
];

function baseSections(): DetailSection[] {
  return [
    {
      type: "hero",
      slot: "hero",
      headline: "히어로",
      subheadline: "서브",
      imageIndex: 0,
    } as DetailSection,
    {
      type: "image_text",
      slot: "feature_detail",
      heading: "기능",
      body: "본문",
      imageIndex: 0,
      imagePosition: "left",
    } as DetailSection,
    {
      type: "cta_price",
      slot: "cta_price",
      price: 10000,
      badges: [],
    } as DetailSection,
  ];
}

function withReviewHighlight(sections: DetailSection[]): DetailSection[] {
  const rh: ReviewHighlightSection = {
    type: "review_highlight",
    slot: "review_highlight",
    heading: "후기 요약",
    praises: ["좋아요"],
  };
  // insert before cta
  const cta = sections.findIndex((s) => s.type === "cta_price");
  return [...sections.slice(0, cta), rh, ...sections.slice(cta)];
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  let failed = 0;

  console.log("=== isBeforeAfterEligibleCategory (6 cats) ===");
  for (const cat of ALL_CATEGORIES) {
    const got = isBeforeAfterEligibleCategory(cat);
    const expect = !["화장품/뷰티", "반려동물", "식품/건강기능식품"].includes(cat);
    const ok = got === expect;
    console.log(ok ? "OK" : "FAIL", cat, "→", got);
    if (!ok) failed += 1;
  }

  console.log("=== insertBeforeAfterSection ===");
  {
    const excluded = insertBeforeAfterSection(baseSections(), SAMPLE_PAIRS, "반려동물");
    const okEx = !excluded.some((s) => s.type === "before_after");
    console.log(okEx ? "OK" : "FAIL", "pet excluded despite pairs");
    if (!okEx) failed += 1;

    const beauty = insertBeforeAfterSection(baseSections(), SAMPLE_PAIRS, "화장품/뷰티");
    console.log(
      !beauty.some((s) => s.type === "before_after") ? "OK" : "FAIL",
      "beauty excluded",
    );
    if (beauty.some((s) => s.type === "before_after")) failed += 1;

    const food = insertBeforeAfterSection(baseSections(), SAMPLE_PAIRS, "식품/건강기능식품");
    console.log(!food.some((s) => s.type === "before_after") ? "OK" : "FAIL", "food excluded");
    if (food.some((s) => s.type === "before_after")) failed += 1;

    const elec = insertBeforeAfterSection(baseSections(), SAMPLE_PAIRS, "전자제품");
    const ba = elec.find((s) => s.type === "before_after");
    const okElec =
      ba?.type === "before_after" &&
      ba.pairs.length === 2 &&
      ba.heading === "실제 사용 전후";
    console.log(okElec ? "OK" : "FAIL", "electronics inserts", ba);
    if (!okElec) failed += 1;

    // position: before cta when no review_highlight
    const ctaIdx = elec.findIndex((s) => s.type === "cta_price");
    const baIdx = elec.findIndex((s) => s.type === "before_after");
    console.log(baIdx === ctaIdx - 1 ? "OK" : "FAIL", "insert before cta", { baIdx, ctaIdx });
    if (baIdx !== ctaIdx - 1) failed += 1;

    // with review_highlight → immediately after
    const withRh = insertBeforeAfterSection(
      withReviewHighlight(baseSections()),
      SAMPLE_PAIRS,
      "전자제품",
    );
    const rhIdx = withRh.findIndex((s) => s.type === "review_highlight");
    const baAfterRh = withRh.findIndex((s) => s.type === "before_after");
    console.log(
      baAfterRh === rhIdx + 1 ? "OK" : "FAIL",
      "after review_highlight",
      { rhIdx, baAfterRh },
    );
    if (baAfterRh !== rhIdx + 1) failed += 1;

    // invalid pairs filtered
    const filtered = insertBeforeAfterSection(
      baseSections(),
      [
        { beforeUrl: "", afterUrl: "https://x", caption: null },
        { beforeUrl: "https://a", afterUrl: "  ", caption: null },
        { beforeUrl: "https://b1", afterUrl: "https://a1", caption: "ok" },
      ],
      "생활용품",
    );
    const fBa = filtered.find((s) => s.type === "before_after");
    console.log(
      fBa?.type === "before_after" && fBa.pairs.length === 1 ? "OK" : "FAIL",
      "filter incomplete pairs",
    );
    if (!(fBa?.type === "before_after" && fBa.pairs.length === 1)) failed += 1;

    // max 4
    const many = Array.from({ length: 6 }, (_, i) => ({
      beforeUrl: `https://b${i}`,
      afterUrl: `https://a${i}`,
      caption: null as string | null,
    }));
    const capped = insertBeforeAfterSection(baseSections(), many, "의류/패션");
    const cBa = capped.find((s) => s.type === "before_after");
    console.log(
      cBa?.type === "before_after" && cBa.pairs.length === 4 ? "OK" : "FAIL",
      "max 4 pairs",
    );
    if (!(cBa?.type === "before_after" && cBa.pairs.length === 4)) failed += 1;

    // duplicate guard
    const once = insertBeforeAfterSection(elec, SAMPLE_PAIRS, "전자제품");
    const count = once.filter((s) => s.type === "before_after").length;
    console.log(count === 1 ? "OK" : "FAIL", "no duplicate insert", count);
    if (count !== 1) failed += 1;

    // empty pairs
    const empty = insertBeforeAfterSection(baseSections(), [], "전자제품");
    console.log(
      !empty.some((s) => s.type === "before_after") ? "OK" : "FAIL",
      "empty pairs no-op",
    );
    if (empty.some((s) => s.type === "before_after")) failed += 1;
  }

  console.log("=== export HTML ===");
  {
    const sections = insertBeforeAfterSection(baseSections(), SAMPLE_PAIRS, "전자제품");
    const html = buildDetailPageHtml({
      productName: "테스트",
      category: "전자제품",
      sections,
      imageUrls: ["https://placehold.co/400x400/png"],
      theme: getCategoryTheme("전자제품"),
    });
    const ok =
      html.includes("BEFORE") &&
      html.includes("AFTER") &&
      html.includes("2주 사용 후") &&
      html.includes("개인차가 있을 수 있으며");
    console.log(ok ? "OK" : "FAIL", "export markup");
    if (!ok) failed += 1;
    fs.writeFileSync(path.join(OUT, "electronics-before-after-export.html"), html, "utf8");

    const petSections = insertBeforeAfterSection(baseSections(), SAMPLE_PAIRS, "반려동물");
    const petHtml = buildDetailPageHtml({
      productName: "펫",
      category: "반려동물",
      sections: petSections,
      imageUrls: ["https://placehold.co/400x400/png"],
      theme: getCategoryTheme("반려동물"),
    });
    const petOk = !petHtml.includes(">BEFORE<") && !petHtml.includes("실제 사용 전후");
    console.log(petOk ? "OK" : "FAIL", "pet export has no before_after");
    if (!petOk) failed += 1;
  }

  console.log("=== CreateProductForm gating source ===");
  {
    const src = fs.readFileSync(
      path.join(ROOT, "components", "CreateProductForm.tsx"),
      "utf8",
    );
    const ok =
      src.includes("isBeforeAfterEligibleCategory") &&
      src.includes("효과 비교 사진") &&
      src.includes("beforeAfterPairs");
    console.log(ok ? "OK" : "FAIL", "form wiring");
    if (!ok) failed += 1;
  }

  console.log(failed === 0 ? "\nSYNC PASS" : `\nSYNC FAILED: ${failed}`);
  return failed;
}

async function screenshot() {
  const htmlPath = path.join(OUT, "electronics-before-after-export.html");
  if (!fs.existsSync(htmlPath)) return;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 520, height: 900 } });
  await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(800);
  const sec = page
    .locator("section")
    .filter({ has: page.locator("span", { hasText: "BEFORE" }) })
    .first();
  if ((await sec.count()) > 0) {
    await sec.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await sec.screenshot({
      path: path.join(OUT, "electronics-before-after.png"),
      animations: "disabled",
    });
    console.log("OK screenshot", path.join(OUT, "electronics-before-after.png"));
  } else {
    console.log("FAIL screenshot section missing");
  }
  await browser.close();
}

async function run() {
  const failed = main();
  try {
    await screenshot();
  } catch (e) {
    console.log("FAIL screenshot", e);
  }
  console.log("API generate: 0");
  if (failed > 0) process.exit(1);
  console.log("ALL PASS");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
