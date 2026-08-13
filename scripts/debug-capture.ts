import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const BASE_URL = "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const TEST_ASSETS_DIR = path.join(__dirname, "test-assets");
const OUTPUT_DIR = path.join(__dirname, "..", "review");

async function main() {
  const testImages = fs
    .readdirSync(TEST_ASSETS_DIR)
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .map((f) => path.join(TEST_ASSETS_DIR, f));

  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();

  page.on("console", (msg) => console.log("[console]", msg.type(), msg.text()));
  page.on("pageerror", (err) => console.log("[pageerror]", err));
  page.on("requestfailed", (req) => console.log("[requestfailed]", req.url(), req.failure()?.errorText));
  page.on("response", (res) => {
    if (res.url().includes("/api/")) {
      console.log("[response]", res.status(), res.url());
    }
  });

  await page.goto(`${BASE_URL}/create`);
  await page.locator("select").first().selectOption({ label: "화장품/뷰티" });
  await page.setInputFiles('input[type="file"]', testImages.slice(0, 5));
  await page.fill("#productName", "테스트 상품 debug");
  await page.fill("#price", "29900");
  await page.click('button[type="submit"]');

  try {
    await page.waitForURL(`${BASE_URL}/create/result`, { timeout: 240000 });
    console.log("NAVIGATED OK");
  } catch (err) {
    console.log("TIMEOUT, current url:", page.url());
    const errorText = await page.locator("text=/오류|실패/").allTextContents().catch(() => []);
    console.log("visible error texts:", errorText);
    await page.screenshot({ path: path.join(OUTPUT_DIR, "debug-timeout.png"), fullPage: true });
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
