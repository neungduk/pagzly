/**
 * 71차 — result 3분할 레이아웃 스크린샷 (데스크톱 + 모바일)
 *   npx tsx scripts/capture-71cha-result-layout.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { buildGenerationPipelineSummary } from "../lib/generation-pipeline-summary";
import { freezeDetailScrollReveal } from "./capture-utils";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const SHOT_DIR = path.join(ROOT, "review", "qa-screenshots");
const SESSION_PATH = path.join(ROOT, "review", "beauty-showcase-one", "session.json");
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");

function bytes(file: string): number {
  return fs.statSync(file).size;
}

function enrichSession(raw: string): string {
  const session = JSON.parse(raw) as Record<string, unknown> & {
    generated?: {
      imageAnalysis?: string;
      theme?: { baseNeutral?: string };
      sections?: unknown[];
      photoCostBreakdown?: Record<string, number>;
    };
    photoProcessingCost?: number;
    photoCostBreakdown?: Record<string, number>;
    backdropFailed?: boolean;
  };

  if (!session.pipelineSummary) {
    const generated = session.generated;
    const pipelineSummary = buildGenerationPipelineSummary({
      imageAnalysis: generated?.imageAnalysis || "fixture vision summary",
      theme: generated?.theme,
      photoProcessingCost: Number(session.photoProcessingCost) || 0,
      photoCostBreakdown: session.photoCostBreakdown ?? generated?.photoCostBreakdown,
      backdropFailed: Boolean(session.backdropFailed),
      sectionCount: generated?.sections?.length ?? 0,
    });
    pipelineSummary.completedAt = new Date().toISOString();
    session.pipelineSummary = pipelineSummary;
  }

  session.draftApproved = true;
  return JSON.stringify(session);
}

async function seedResultPage(page: import("playwright").Page, sessionRaw: string) {
  await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded" });
  await page.evaluate((raw) => {
    sessionStorage.setItem("pagzly-create-result", raw);
  }, sessionRaw);
  await page.goto(`${BASE_URL}/create/result`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => {
    const nodes = document.querySelectorAll('[data-testid="detail-preview"]');
    return [...nodes].some((node) => getComputedStyle(node as Element).display !== "none");
  }, { timeout: 30000 });
  await freezeDetailScrollReveal(page);
  await page.waitForTimeout(600);
}

async function main() {
  if (!fs.existsSync(SESSION_PATH)) {
    throw new Error(`세션 없음: ${SESSION_PATH}`);
  }
  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    throw new Error(`auth-state.json 없음: ${STORAGE_STATE_PATH}`);
  }
  const sessionRaw = enrichSession(fs.readFileSync(SESSION_PATH, "utf8"));
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  const desktopContext = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const desktopPage = await desktopContext.newPage();
  await seedResultPage(desktopPage, sessionRaw);
  await desktopPage.locator('[data-testid="result-desktop-split"]').waitFor({ state: "visible" });
  await desktopPage.locator('[data-testid="desktop-structure-sidebar"]').waitFor({ state: "visible" });
  await desktopPage.locator('[data-testid="desktop-patch-panel"]').waitFor({ state: "visible" });
  await desktopPage
    .locator('[data-testid="result-desktop-split"] [data-testid="pipeline-summary-card"]')
    .waitFor({ state: "visible" });

  const desktopPath = path.join(SHOT_DIR, "71cha-result-desktop-split.png");
  await desktopPage.screenshot({ path: desktopPath, fullPage: true });
  console.log(`[71cha] desktop ${desktopPath} (${bytes(desktopPath)} bytes)`);
  await desktopContext.close();

  const mobileContext = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const mobilePage = await mobileContext.newPage();
  await seedResultPage(mobilePage, sessionRaw);
  await mobilePage.evaluate(() => window.scrollTo(0, 0));
  await mobilePage.locator('[data-testid="result-mobile-tools"]').waitFor({ state: "attached" });
  const desktopVisibleOnMobile = await mobilePage.evaluate(() => {
    const el = document.querySelector('[data-testid="result-desktop-split"]');
    return el ? getComputedStyle(el).display !== "none" : false;
  });
  if (desktopVisibleOnMobile) {
    throw new Error("모바일에서 desktop split이 보이면 안 됩니다");
  }
  const mobileToolsVisible = await mobilePage.evaluate(() => {
    const el = document.querySelector('[data-testid="result-mobile-tools"]');
    if (!el) return false;
    const style = getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden";
  });
  if (!mobileToolsVisible) {
    throw new Error("모바일 도구 영역이 display:none 입니다");
  }

  const mobilePath = path.join(SHOT_DIR, "71cha-result-mobile-tabs.png");
  await mobilePage.screenshot({ path: mobilePath, fullPage: true });
  console.log(`[71cha] mobile ${mobilePath} (${bytes(mobilePath)} bytes)`);

  // 간단 회귀: 패치 패널·구조 탭 존재
  await mobilePage.locator('[data-testid="result-mobile-tools"] [data-testid="tab-structure"]').click({ force: true });
  await mobilePage.locator('[data-testid="result-mobile-tools"] [data-testid="tab-patch"]').click({ force: true });
  await mobilePage.locator('[data-testid="result-mobile-tools"] [data-testid="panel-patch"]').waitFor({ state: "attached" });
  console.log("[71cha] mobile tab regression ✓");

  await mobileContext.close();
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
