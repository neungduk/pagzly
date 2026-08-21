// /dev/detail-preview를 캡처해 review/iteration/cycle-NN.png 로 저장한다.
// 이미지는 scripts/test-assets/화장품-뷰티 원본을 public/iteration-fixtures 로 복사만 한다 (재생성 없음).
//
// 실행: npx tsx scripts/capture-iteration.ts 01

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { freezeDetailScrollReveal } from "./capture-utils";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";
const ROOT = path.join(__dirname, "..");
const ASSETS = path.join(__dirname, "test-assets", "화장품-뷰티");
const FIXTURES = path.join(ROOT, "public", "iteration-fixtures");
const OUTPUT_DIR = path.join(ROOT, "review", "iteration");

function copyFixtures(): string[] {
  fs.mkdirSync(FIXTURES, { recursive: true });
  const files = fs
    .readdirSync(ASSETS)
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .slice(0, 4);
  if (files.length === 0) {
    throw new Error("scripts/test-assets/화장품-뷰티 에 테스트 사진이 없습니다.");
  }
  return files.map((file, i) => {
    const ext = path.extname(file);
    const destName = `${String(i + 1).padStart(2, "0")}.jpg`;
    fs.copyFileSync(path.join(ASSETS, file), path.join(FIXTURES, destName));
    return destName;
  });
}

async function main() {
  const cycle = (process.argv[2] ?? "01").padStart(2, "0");
  copyFixtures();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 2,
  });

  await page.goto(`${BASE_URL}/dev/detail-preview?capture=1`, {
    waitUntil: "networkidle",
  });
  await page.locator("[data-preview-chrome]").evaluate((el) => {
    (el as HTMLElement).style.display = "none";
  });
  await page.waitForTimeout(500);
  await freezeDetailScrollReveal(page);
  await page.waitForTimeout(300);

  const outPath = path.join(OUTPUT_DIR, `cycle-${cycle}.png`);
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`저장됨: ${outPath}`);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
