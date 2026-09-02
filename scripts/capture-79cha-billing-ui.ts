/**
 * 79차 — 결제 페이지 UI 개편 QA
 *   npx tsx scripts/capture-79cha-billing-ui.ts
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
  if (!fs.existsSync(STORAGE_STATE_PATH)) throw new Error(`auth-state.json 없음`);
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  const desktopContext = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1280, height: 900 },
  });
  const desktopPage = await desktopContext.newPage();

  await desktopPage.goto(`${BASE_URL}/billing/packs`, { waitUntil: "networkidle" });
  await desktopPage.locator('[data-testid="billing-account-summary"]').waitFor({ state: "visible" });
  const packsDesktop = path.join(SHOT_DIR, "79cha-billing-packs-desktop.png");
  await desktopPage.screenshot({ path: packsDesktop, fullPage: true });
  console.log(`[79cha] packs-desktop ${packsDesktop} (${bytes(packsDesktop)} bytes)`);

  await desktopPage.goto(`${BASE_URL}/billing/subscribe`, { waitUntil: "networkidle" });
  await desktopPage.locator('[data-testid="billing-account-summary"]').waitFor({ state: "visible" });
  const subscribeDesktop = path.join(SHOT_DIR, "79cha-billing-subscribe-desktop.png");
  await desktopPage.screenshot({ path: subscribeDesktop, fullPage: true });
  console.log(`[79cha] subscribe-desktop ${subscribeDesktop} (${bytes(subscribeDesktop)} bytes)`);

  await desktopContext.close();

  const mobileContext = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`${BASE_URL}/billing/packs`, { waitUntil: "networkidle" });
  const packsMobile = path.join(SHOT_DIR, "79cha-billing-packs-mobile.png");
  await mobilePage.screenshot({ path: packsMobile, fullPage: true });
  console.log(`[79cha] packs-mobile ${packsMobile} (${bytes(packsMobile)} bytes)`);

  await mobilePage.goto(`${BASE_URL}/billing/subscribe`, { waitUntil: "networkidle" });
  const subscribeMobile = path.join(SHOT_DIR, "79cha-billing-subscribe-mobile.png");
  await mobilePage.screenshot({ path: subscribeMobile, fullPage: true });
  console.log(`[79cha] subscribe-mobile ${subscribeMobile} (${bytes(subscribeMobile)} bytes)`);

  await mobileContext.close();
  await browser.close();
  console.log("[79cha] billing UI regression ✓");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
