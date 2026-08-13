// 저장된 로그인 세션으로 /create 폼을 자동으로 채워 제출하고,
// /create/result 페이지 전체를 스크린샷으로 저장한다.
//
// 실행: npx tsx scripts/capture-detail-page.ts <시도번호>
// 예:   npx tsx scripts/capture-detail-page.ts 1
//
// ⚠️ 셀렉터(#productName 등)는 CreateProductForm.tsx의 실제 구조와
// 맞아야 합니다. 폼 구조가 바뀌면 이 스크립트도 같이 고쳐야 해요.

import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const BASE_URL = "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const OUTPUT_DIR = path.join(__dirname, "..", "review");
const TEST_ASSETS_DIR = path.join(__dirname, "test-assets");

async function main() {
  const attemptNumber = process.argv[2] ?? "1";

  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    throw new Error(
      `로그인 세션이 없습니다. 먼저 실행하세요: npx tsx scripts/save-login-state.ts`,
    );
  }

  const testImages = fs.existsSync(TEST_ASSETS_DIR)
    ? fs
        .readdirSync(TEST_ASSETS_DIR)
        .filter((f) => /\.(jpe?g|png)$/i.test(f))
        .map((f) => path.join(TEST_ASSETS_DIR, f))
    : [];

  if (testImages.length === 0) {
    throw new Error(
      `scripts/test-assets/ 폴더에 테스트용 상품 사진(jpg/png)을 1장 이상 넣어주세요.`,
    );
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/create`);

  // 카테고리 (페이지 첫 번째 select — 실제 구조와 다르면 조정 필요)
  await page.locator("select").first().selectOption({ label: "화장품/뷰티" });

  // 사진 업로드
  await page.setInputFiles('input[type="file"]', testImages.slice(0, 5));

  // 상품 기본 정보
  await page.fill("#productName", "테스트 상품 " + attemptNumber);
  await page.fill("#price", "29900");

  // 제출
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/create/result`, { timeout: 180000 });
  await page.waitForTimeout(2000);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  const outPath = path.join(OUTPUT_DIR, `attempt-${attemptNumber}.png`);
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`저장됨: ${outPath}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
