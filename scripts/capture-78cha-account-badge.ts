/**
 * 78차 — 상단 계정/토큰 배지 QA
 *   npx tsx scripts/capture-78cha-account-badge.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const SHOT_DIR = path.join(ROOT, "review", "qa-screenshots");
const SESSION_PATH = path.join(ROOT, "review", "beauty-showcase-one", "session.json");
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
    viewport: { width: 1280, height: 800 },
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto(`${BASE_URL}/create`, { waitUntil: "networkidle" });
  const badge = desktopPage.locator('[data-testid="account-status-badge"]');
  await badge.waitFor({ state: "visible", timeout: 15000 });

  const headerPath = path.join(SHOT_DIR, "78cha-account-badge-desktop.png");
  await desktopPage.locator('[data-testid="create-app-header"]').screenshot({ path: headerPath });
  console.log(`[78cha] desktop ${headerPath} (${bytes(headerPath)} bytes)`);

  await desktopPage.goto(`${BASE_URL}/create/history`, { waitUntil: "networkidle" });
  await badge.waitFor({ state: "visible" });
  const historyPath = path.join(SHOT_DIR, "78cha-account-badge-history.png");
  await desktopPage.locator('[data-testid="create-app-header"]').screenshot({ path: historyPath });
  console.log(`[78cha] history ${historyPath} (${bytes(historyPath)} bytes)`);

  await desktopContext.close();

  const mobileContext = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`${BASE_URL}/create`, { waitUntil: "networkidle" });
  await mobilePage.locator('[data-testid="account-status-badge"]').waitFor({ state: "visible" });
  const mobilePath = path.join(SHOT_DIR, "78cha-account-badge-mobile.png");
  await mobilePage.locator('[data-testid="create-app-header"]').screenshot({ path: mobilePath });
  console.log(`[78cha] mobile ${mobilePath} (${bytes(mobilePath)} bytes)`);
  await mobileContext.close();

  await browser.close();
  console.log("[78cha] account badge regression ✓");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
