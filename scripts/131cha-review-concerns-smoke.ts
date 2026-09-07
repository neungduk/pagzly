/**
 * 131차 — review_highlight concerns 배선 검증 (무비용)
 *   npx tsx scripts/131cha-review-concerns-smoke.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { freezeDetailScrollReveal } from "./capture-utils";
import {
  buildReviewHighlightSection,
  insertReviewHighlightSection,
} from "../lib/section-inserts";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import type { DetailSection } from "../lib/types/generate";
import { getCategoryTheme } from "../lib/category-theme";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = path.join(ROOT, "review");

function assertUnit() {
  const praisesOnly = buildReviewHighlightSection(["좋았어요"]);
  if (praisesOnly.concerns) throw new Error("praises-only must omit concerns field");

  const both = buildReviewHighlightSection(
    ["좋았어요", "흡수 빨라요"],
    ["용량이 작아요", "겨울엔 부족해요", "펌프가 세어요", "네 번째는 잘림"],
  );
  if (!both.concerns || both.concerns.length !== 3) {
    throw new Error(`concerns max 3 expected, got ${JSON.stringify(both.concerns)}`);
  }

  const base: DetailSection[] = [
    { type: "hero", slot: "hero", headline: "h", subheadline: "s", imageIndex: 0 },
    {
      type: "cta_price",
      slot: "cta_price",
      price: 1000,
      targetCustomer: "t",
      badges: [],
    },
  ];

  const noPraises = insertReviewHighlightSection(base, [], ["아쉬움만"]);
  if (noPraises !== base) throw new Error("complaints-only must skip insert");

  const inserted = insertReviewHighlightSection(base, ["칭찬"], ["아쉬움"]);
  const rh = inserted.find((s) => s.type === "review_highlight");
  if (!rh || rh.type !== "review_highlight") throw new Error("insert failed");
  if (!rh.concerns?.includes("아쉬움")) throw new Error("concerns not wired on insert");

  const html = buildDetailPageHtml({
    productName: "테스트",
    category: "화장품/뷰티",
    sections: [both],
    imageUrls: ["/iteration-fixtures/01.jpg"],
    theme: getCategoryTheme("화장품/뷰티"),
  });
  if (!html.includes("pagzly-review-concerns")) {
    throw new Error("export missing pagzly-review-concerns");
  }
  if (!html.includes("실제 후기에 나온 아쉬운 점")) {
    throw new Error("export missing concerns heading");
  }
  const htmlNo = buildDetailPageHtml({
    productName: "테스트",
    category: "화장품/뷰티",
    sections: [praisesOnly],
    imageUrls: ["/iteration-fixtures/01.jpg"],
    theme: getCategoryTheme("화장품/뷰티"),
  });
  if (htmlNo.includes("pagzly-review-concerns")) {
    throw new Error("praises-only export must omit concerns block");
  }

  console.log("[131] unit build/insert/export ✓");
}

async function capture() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 2,
  });
  const notes: string[] = [];

  // (a) praises only
  await page.goto(`${BASE_URL}/dev/detail-preview?capture=131-praises-only`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.getByText("실제 구매자들이 자주 남긴 이야기").first().waitFor({ state: "visible" });
  await freezeDetailScrollReveal(page);
  const rhA = await page.locator('[data-testid="review-highlight"]').count();
  const cA = await page.locator('[data-testid="review-highlight-concerns"]').count();
  if (rhA !== 1 || cA !== 0) throw new Error(`(a) expected rh=1 concerns=0, got ${rhA}/${cA}`);
  await page.screenshot({
    path: path.join(OUT, "131cha-praises-only.png"),
    fullPage: true,
  });
  notes.push(`(a) praises-only rh=${rhA} concerns=${cA}`);

  // (b) with concerns
  await page.goto(`${BASE_URL}/dev/detail-preview?capture=131-with-concerns`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.getByText("실제 후기에 나온 아쉬운 점").first().waitFor({ state: "visible" });
  await freezeDetailScrollReveal(page);
  const rhB = await page.locator('[data-testid="review-highlight"]').count();
  const cB = await page.locator('[data-testid="review-highlight-concerns"]').count();
  if (rhB !== 1 || cB !== 1) throw new Error(`(b) expected rh=1 concerns=1, got ${rhB}/${cB}`);
  await page.screenshot({
    path: path.join(OUT, "131cha-with-concerns.png"),
    fullPage: true,
  });
  notes.push(`(b) with-concerns rh=${rhB} concerns=${cB}`);

  // (c) no review section
  await page.goto(`${BASE_URL}/dev/detail-preview?capture=131-no-review`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.getByText("₩28,900").first().waitFor({ state: "visible" });
  await freezeDetailScrollReveal(page);
  const rhC = await page.locator('[data-testid="review-highlight"]').count();
  const cC = await page.locator('[data-testid="review-highlight-concerns"]').count();
  if (rhC !== 0 || cC !== 0) throw new Error(`(c) expected rh=0 concerns=0, got ${rhC}/${cC}`);
  await page.screenshot({
    path: path.join(OUT, "131cha-no-review.png"),
    fullPage: true,
  });
  notes.push(`(c) no-review rh=${rhC} concerns=${cC}`);

  fs.writeFileSync(path.join(OUT, "131cha-capture-notes.txt"), notes.join("\n") + "\n", "utf8");
  await browser.close();
  console.log(notes.join("\n"));
  console.log("[131] captures OK");
}

async function main() {
  assertUnit();
  await capture();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
