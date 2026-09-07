/**
 * 137차 — 리뷰 축 comparison 손검산 + 중복 방지 + 스크린샷
 *   npx tsx scripts/137cha-axis-comparison-smoke.ts
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { freezeDetailScrollReveal } from "./capture-utils";
import {
  buildAxisComparison,
  extractCoreKeywords,
  extractLinesFromTxt,
  matchingLines,
} from "../lib/review-insights";
import { insertReviewAxisComparisonSection } from "../lib/section-inserts";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review");
const SHOT = path.join(OUT, "qa-screenshots");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const FIXTURE = path.join(ROOT, "scripts/fixtures/cosmetics-reviews-axis.txt");

function writeHandCheck() {
  const lines = extractLinesFromTxt(fs.readFileSync(FIXTURE));
  const candidateAxes = ["수분감", "흡수", "무향", "자극", "은하수"];
  const table: string[] = [
    "# 137A axis match hand-check",
    `fixture=${FIXTURE}`,
    `lines=${lines.length}`,
    "",
    ...lines.map((l, i) => `${i + 1}. ${l}`),
    "",
  ];

  for (const label of candidateAxes) {
    const keywords = extractCoreKeywords(label);
    const matched = matchingLines(lines, label);
    table.push(`## axis: ${label}`);
    table.push(`keywords: ${JSON.stringify(keywords)}`);
    table.push(`count: ${matched.length}`);
    table.push(
      matched.length ? matched.map((m, i) => `  M${i + 1}: ${m}`).join("\n") : "  (no lines)",
    );
    table.push("");
  }

  const axisComparison = buildAxisComparison(lines, candidateAxes);
  table.push(`## surviving axes (>=2 matches, need >=2 axes)`);
  table.push(`count=${axisComparison.length}`);
  for (const a of axisComparison) {
    table.push(`- ${a.label}: ourValue=${a.ourValue} quotes=${a.quotes.length}`);
  }
  table.push("");

  if (axisComparison.length < 2) {
    throw new Error(`expected >=2 surviving axes, got ${axisComparison.length}`);
  }

  fs.writeFileSync(path.join(OUT, "137cha-axis-match.txt"), table.join("\n"), "utf8");
  console.log(`[137] hand-check written axes=${axisComparison.length}`);
  return axisComparison;
}

function assertDedup(axisComparison: ReturnType<typeof buildAxisComparison>) {
  const existingChart: DetailSection = {
    type: "comparison_chart",
    slot: "comparison_chart",
    heading: "AI 추정 비교",
    ourLabel: "우리 제품",
    baselineLabel: "일반 제품",
    unit: "%",
    basis: "self_assessed",
    metrics: [{ label: "보습", ourValue: 70, baselineValue: 40 }],
  };
  const withExisting = insertReviewAxisComparisonSection(
    [existingChart, { type: "cta_price", slot: "cta_price", price: 1, targetCustomer: "", badges: [] }],
    axisComparison,
    "AURA",
  );
  const charts = withExisting.filter((s) => s.type === "comparison_chart");
  if (charts.length !== 1) {
    throw new Error(`dedup failed: expected 1 chart, got ${charts.length}`);
  }
  if (charts[0]?.type === "comparison_chart" && charts[0].basis !== "self_assessed") {
    throw new Error("dedup replaced existing AI chart");
  }

  const empty: DetailSection[] = [
    { type: "cta_price", slot: "cta_price", price: 1, targetCustomer: "", badges: [] },
  ];
  const inserted = insertReviewAxisComparisonSection(empty, axisComparison, "AURA LAB");
  const chart = inserted.find((s) => s.type === "comparison_chart");
  if (!chart || chart.type !== "comparison_chart") throw new Error("insert failed");
  if (chart.basis !== "measured") throw new Error("expected measured");
  if (!chart.evidenceQuotes || chart.evidenceQuotes.length < 2) {
    throw new Error("expected evidenceQuotes");
  }
  if (chart.baselineLabel !== "일반 제품") throw new Error("baseline whitelist broken");

  const noAxes = insertReviewAxisComparisonSection(empty, undefined, "AURA");
  if (noAxes.some((s) => s.type === "comparison_chart")) {
    throw new Error("should skip when no axisComparison");
  }

  console.log("[137] dedup + insert tests ok");
}

async function captureUi() {
  fs.mkdirSync(SHOT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 2,
  });

  await page.goto(`${BASE_URL}/dev/detail-preview?capture=137-axis-measured`, {
    waitUntil: "networkidle",
  });
  await freezeDetailScrollReveal(page);
  await page.locator("text=COMPARE").first().waitFor({ state: "visible" });
  const closed = path.join(SHOT, "137cha-axis-chart.png");
  await page.locator("section").filter({ hasText: "COMPARE" }).first().screenshot({ path: closed });
  console.log(`[137] ${closed}`);

  const details = page.locator('[data-testid="comparison-evidence"]');
  await details.waitFor({ state: "visible" });
  await details.evaluate((el) => {
    (el as HTMLDetailsElement).open = true;
  });
  await page.waitForTimeout(200);
  const open = path.join(SHOT, "137cha-axis-evidence-open.png");
  await page.locator("section").filter({ hasText: "COMPARE" }).first().screenshot({ path: open });
  console.log(`[137] ${open}`);

  await page.goto(`${BASE_URL}/dev/detail-preview?capture=137-no-review`, {
    waitUntil: "networkidle",
  });
  await freezeDetailScrollReveal(page);
  const hasCompare = await page.locator("text=COMPARE").count();
  if (hasCompare > 0) throw new Error("no-review capture must not show COMPARE");
  const none = path.join(SHOT, "137cha-no-review.png");
  await page.screenshot({ path: none, fullPage: false });
  console.log(`[137] ${none} (no comparison_chart)`);

  await browser.close();
}

async function main() {
  const axes = writeHandCheck();
  assertDedup(axes);
  await captureUi();
  console.log("[137] all checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
