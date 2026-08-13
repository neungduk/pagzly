// 최초 1회만 수동으로 실행: 브라우저가 뜨면 직접 로그인하고,
// 터미널로 돌아와 Enter를 누르면 로그인 세션이 저장됩니다.
// 이후 capture-detail-page.ts가 이 세션을 재사용해서 매번 로그인하지 않습니다.
//
// 실행: npx tsx scripts/save-login-state.ts

import { chromium } from "playwright";
import path from "path";

const BASE_URL = "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`);

  console.log("브라우저 창에서 직접 로그인하세요.");
  console.log("로그인이 끝나면 이 터미널로 돌아와 Enter를 눌러주세요...");

  await new Promise<void>((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", () => resolve());
  });

  await context.storageState({ path: STORAGE_STATE_PATH });
  console.log(`로그인 세션 저장 완료: ${STORAGE_STATE_PATH}`);

  await browser.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
