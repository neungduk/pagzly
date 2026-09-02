/**
 * 80차 — 구독 페이지 리뉴얼 QA
 *   npx tsx scripts/capture-80cha-subscribe-ui.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const SHOT_DIR = path.join(ROOT, "review", "qa-screenshots");
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");

function bytes(file: string): number {
  return fs.statSync(file).size;
}

async function main() {
  if (!fs.existsSync(STORAGE_STATE_PATH)) throw new Error("auth-state.json 없음");
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  const desktopContext = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1280, height: 900 },
  });
  const desktopPage = await desktopContext.newPage();

  await desktopPage.goto(`${BASE_URL}/billing/subscribe`, { waitUntil: "networkidle" });
  await desktopPage.locator('[data-testid="billing-cycle-toggle"]').waitFor({ state: "visible" });
  await desktopPage.locator('[data-testid="billing-tier-features-starter"]').waitFor({ state: "visible" });

  const desktop = path.join(SHOT_DIR, "80cha-billing-subscribe-desktop.png");
  await desktopPage.screenshot({ path: desktop, fullPage: true });
  console.log(`[80cha] subscribe-desktop ${desktop} (${bytes(desktop)} bytes)`);

  await desktopPage.locator('[data-testid="billing-cycle-annual"]').click();
  await desktopPage.locator('[data-testid="billing-cycle-annual-notice"]').waitFor({ state: "visible" });
  const toggle = path.join(SHOT_DIR, "80cha-billing-subscribe-annual-notice.png");
  await desktopPage.screenshot({ path: toggle, fullPage: true });
  console.log(`[80cha] annual-notice ${toggle} (${bytes(toggle)} bytes)`);

  await desktopContext.close();

  const mobileContext = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`${BASE_URL}/billing/subscribe`, { waitUntil: "networkidle" });
  const mobile = path.join(SHOT_DIR, "80cha-billing-subscribe-mobile.png");
  await mobilePage.screenshot({ path: mobile, fullPage: true });
  console.log(`[80cha] subscribe-mobile ${mobile} (${bytes(mobile)} bytes)`);

  await mobileContext.close();
  await browser.close();
  console.log("[80cha] subscribe UI regression ✓");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
