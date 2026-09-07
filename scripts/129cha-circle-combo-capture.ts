/**
 * 129차 — apply 후 인접 circle+chart 가 128 combo로 발동하는지 캡처
 *   npx tsx scripts/129cha-circle-combo-capture.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { freezeDetailScrollReveal } from "./capture-utils";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = path.join(ROOT, "review");

const SHOTS: {
  capture: string;
  file: string;
  waitText: string;
  expectCombo: number;
}[] = [
  {
    capture: "129-after-apply-far",
    file: "129cha-combo-after-apply-far.png",
    waitText: "COMPARE",
    expectCombo: 1,
  },
  {
    capture: "69-circle-solo",
    file: "129cha-regression-circle-solo.png",
    waitText: "히알루론산",
    expectCombo: 0,
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
    if (comboCount !== shot.expectCombo) {
      throw new Error(
        `${shot.capture}: expected combo=${shot.expectCombo}, got ${comboCount}`,
      );
    }
    const outPath = path.join(OUT, shot.file);
    await page.screenshot({ path: outPath, fullPage: true });
    notes.push(`${shot.capture} → ${shot.file} combo=${comboCount}`);
    console.log(`[129] wrote ${outPath} combo=${comboCount}`);
  }

  fs.writeFileSync(path.join(OUT, "129cha-capture-notes.txt"), notes.join("\n") + "\n", "utf8");
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
