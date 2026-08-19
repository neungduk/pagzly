/**
 * 최종 승인(TEST_MODE=false) 1회: 배경 후보 선택 UI + 풀 파이프라인.
 * 서버가 TEST_MODE=false 로 떠 있어야 한다.
 *
 * 실행: npx tsx scripts/capture-final-approved.ts
 */

import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const OUTPUT_DIR = path.join(__dirname, "..", "review", "final-approved");
const ASSETS_DIR = path.join(__dirname, "test-assets", "화장품-확장", "세럼");

async function main() {
  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    throw new Error("로그인 세션 없음. npx tsx scripts/save-login-state.ts");
  }

  const uploadImages = fs
    .readdirSync(ASSETS_DIR)
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .sort()
    .map((f) => path.join(ASSETS_DIR, f))
    .slice(0, 2);
  if (uploadImages.length === 0) {
    throw new Error(`사진 없음: ${ASSETS_DIR}`);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();
  page.setDefaultTimeout(120000);

  await page.goto(`${BASE_URL}/create`);
  await page.locator("select").first().selectOption({ label: "화장품/뷰티" });
  await page.setInputFiles('input[type="file"]', uploadImages);
  await page.fill("#productName", "히알루론 세럼");
  await page.fill("#price", "28900");
  await page.fill(
    "#wholesaleUrl",
    "원본 상품명: 히알루론산 세럼 / 핵심 스펙: 30ml, 무향, 워터리 제형 / 포인트: 속건조 케어, 산뜻한 마무리",
  );

  await page.click('button[type="submit"]');

  const picker = page.locator('[data-testid="backdrop-picker"]');
  await picker.waitFor({ state: "visible", timeout: 420000 });
  await page.waitForTimeout(800);
  await picker.screenshot({ path: path.join(OUTPUT_DIR, "backdrop-picker-v2.png") });
  console.log(`선택 화면: ${path.join(OUTPUT_DIR, "backdrop-picker-v2.png")}`);

  const second = page.locator('[data-testid="backdrop-candidate-1"]');
  if (await second.count()) {
    await second.click();
    await page.waitForTimeout(400);
  }
  await page.locator('[data-testid="backdrop-confirm"]').click();

  await page.waitForURL(`${BASE_URL}/create/result`, { timeout: 480000 });
  await page.waitForTimeout(2000);

  const session = await page.evaluate(() => sessionStorage.getItem("pagzly-create-result"));
  if (session) {
    fs.writeFileSync(path.join(OUTPUT_DIR, "session.json"), session, "utf8");
  }

  const preview = page.locator('[data-testid="detail-preview"]');
  await preview.waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(800);
  await preview.screenshot({ path: path.join(OUTPUT_DIR, "result-v2.png") });
  await preview.screenshot({ path: path.join(OUTPUT_DIR, "result.png") });
  console.log(`결과: ${path.join(OUTPUT_DIR, "result-v2.png")}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
