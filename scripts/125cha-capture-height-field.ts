/**
 * 125차 — 제품 높이 필드 UI 스크린샷 (무비용)
 * npx tsx scripts/125cha-capture-height-field.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE = path.join(__dirname, "auth-state.json");
const OUT = path.join(__dirname, "..", "review");
const TEST_EMAIL = "pagelab-test@test.local";
const TEST_PASSWORD = "TestPass1234!";

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: fs.existsSync(STORAGE) ? STORAGE : undefined,
    viewport: { width: 900, height: 1200 },
  });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded", timeout: 60000 });
  if (page.url().includes("/login")) {
    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 20000 });
    await context.storageState({ path: STORAGE });
    await page.goto(`${BASE_URL}/create`, { waitUntil: "networkidle" });
  }
  const height = page.locator("#productHeightCm");
  await height.waitFor({ state: "visible", timeout: 20000 });
  await height.scrollIntoViewIfNeeded();
  await height.fill("9");
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(OUT, "125cha-product-height-field.png"),
    fullPage: false,
  });
  console.log("[125cha] productHeightCm input value=", await height.inputValue());
  console.log("[125cha] screenshot review/125cha-product-height-field.png");
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
