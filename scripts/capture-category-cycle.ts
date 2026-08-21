// 저장된 session.json으로 /create/result 를 다시 열어 스크린샷만 저장한다 (재생성 없음).
// 실행: npx tsx scripts/capture-category-cycle.ts 패션-소품 02

import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";
const ROOT = path.join(__dirname, "..");

async function main() {
  const categoryKey = process.argv[2];
  const cycle = (process.argv[3] ?? "02").padStart(2, "0");
  if (!categoryKey) {
    throw new Error("사용법: npx tsx scripts/capture-category-cycle.ts <카테고리키> <사이클>");
  }

  const dir = path.join(ROOT, "review", "iteration", categoryKey);
  const sessionPath = path.join(dir, "session.json");
  if (!fs.existsSync(sessionPath)) {
    throw new Error(`세션 없음: ${sessionPath}`);
  }
  const sessionRaw = fs.readFileSync(sessionPath, "utf8");

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 2,
  });

  await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded" });
  await page.evaluate((raw) => {
    sessionStorage.setItem("pagzly-create-result", raw);
  }, sessionRaw);
  await page.goto(`${BASE_URL}/create/result`, { waitUntil: "networkidle" });
  const preview = page.locator('[data-testid="detail-preview"]');
  await preview.waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(800);

  fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, `cycle-${cycle}.png`);
  await preview.screenshot({ path: outPath });
  console.log(`저장됨: ${outPath}`);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
