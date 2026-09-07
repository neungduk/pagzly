/**
 * 124차 — comparison_chart self_assessed 디스클레이머 캡처 (무비용)
 * npx tsx scripts/124cha-comparison-disclaimer-capture.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { freezeDetailScrollReveal } from "./capture-utils";
import { sanitizeComparisonChartSection } from "../lib/comparison-chart-guard";
import type { ComparisonChartSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = path.join(ROOT, "review");

async function main() {
  const sample: ComparisonChartSection = {
    type: "comparison_chart",
    slot: "comparison_chart",
    heading: "test",
    ourLabel: "우리",
    baselineLabel: "경쟁사X",
    basis: "self_assessed",
    basisNote: "AI가 보낸 잘못된 노트",
    metrics: [{ label: "안정성", ourValue: 90, baselineValue: 40 }],
  };
  const sanitized = sanitizeComparisonChartSection(sample);
  if (sanitized.baselineLabel !== "일반 제품") {
    throw new Error("baseline 강제 실패");
  }
  if (sanitized.basisNote !== "자체 평가 기준 (개인차가 있을 수 있어요)") {
    throw new Error("self_assessed disclaimer 강제 실패");
  }
  console.log("[124] sanitizeComparisonChartSection OK");

  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 2,
  });
  await page.goto(`${BASE_URL}/dev/detail-preview?capture=124-comparison`, {
    waitUntil: "networkidle",
  });
  await page.locator("text=COMPARE").first().waitFor({ state: "visible", timeout: 15000 });
  await freezeDetailScrollReveal(page);
  await page.getByText("자체 평가 기준").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(OUT, "124cha-comparison-disclaimer.png"),
    fullPage: true,
  });
  console.log("[124] wrote review/124cha-comparison-disclaimer.png");
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
