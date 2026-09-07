/**
 * 128차 — circle+comparison 병합 캡처 (무비용)
 * npx tsx scripts/128cha-circle-comparison-capture.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { freezeDetailScrollReveal } from "./capture-utils";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = path.join(ROOT, "review");

const SHOTS: { capture: string; file: string; waitText: string; assertCombo?: boolean }[] = [
  {
    capture: "128-circle-then-chart",
    file: "128cha-combo-circle-then-chart.png",
    waitText: "COMPARE",
    assertCombo: true,
  },
  {
    capture: "128-chart-then-circle",
    file: "128cha-combo-chart-then-circle.png",
    waitText: "COMPARE",
    assertCombo: true,
  },
  {
    capture: "69-circle-solo",
    file: "128cha-regression-circle-solo.png",
    waitText: "히알루론산",
    assertCombo: false,
  },
  {
    capture: "124-comparison",
    file: "128cha-regression-comparison-only.png",
    waitText: "COMPARE",
    assertCombo: false,
  },
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 2,
  });
  const notes: string[] = [];

  for (const shot of SHOTS) {
    await page.goto(`${BASE_URL}/dev/detail-preview?capture=${shot.capture}`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.getByText(shot.waitText).first().waitFor({ state: "visible", timeout: 20000 });
    await freezeDetailScrollReveal(page);
    await page.waitForTimeout(400);
    const comboCount = await page.locator('[data-testid="circle-comparison-combo"]').count();
    if (shot.assertCombo && comboCount !== 1) {
      throw new Error(`${shot.capture}: expected 1 combo, got ${comboCount}`);
    }
    if (!shot.assertCombo && comboCount !== 0) {
      throw new Error(`${shot.capture}: expected 0 combo (regression), got ${comboCount}`);
    }
    const outPath = path.join(OUT, shot.file);
    await page.screenshot({ path: outPath, fullPage: true });
    notes.push(`${shot.capture} → ${shot.file} combo=${comboCount}`);
    console.log(`[128] wrote ${outPath} combo=${comboCount}`);
  }

  // non-adjacent: must NOT merge
  await page.goto(`${BASE_URL}/dev/detail-preview?capture=128-non-adjacent`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.getByText("COMPARE").first().waitFor({ state: "visible", timeout: 20000 });
  await freezeDetailScrollReveal(page);
  const nonAdj = await page.locator('[data-testid="circle-comparison-combo"]').count();
  if (nonAdj !== 0) {
    throw new Error(`128-non-adjacent: expected 0 combo, got ${nonAdj}`);
  }
  notes.push(`128-non-adjacent combo=0 (ok)`);
  console.log("[128] non-adjacent merge skipped OK");

  fs.writeFileSync(path.join(OUT, "128cha-capture-notes.txt"), notes.join("\n") + "\n", "utf8");
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
