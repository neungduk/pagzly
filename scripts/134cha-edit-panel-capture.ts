/**
 * 134차 — 결과 화면 "직접 편집" 사이드바 UI 스크린샷
 *   npx tsx scripts/134cha-edit-panel-capture.ts
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
  await page.waitForTimeout(500);
}

async function main() {
  if (!fs.existsSync(SESSION_PATH)) throw new Error(`세션 없음: ${SESSION_PATH}`);
  if (!fs.existsSync(STORAGE_STATE_PATH)) throw new Error(`auth-state.json 없음: ${STORAGE_STATE_PATH}`);

  const sessionRaw = enrichSession(fs.readFileSync(SESSION_PATH, "utf8"));
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await seedResultPage(page, sessionRaw);

  await page.locator('[data-testid="result-desktop-split"]').waitFor({ state: "visible" });
  await page.locator('[data-testid="desktop-structure-sidebar"]').waitFor({ state: "visible" });
  await page.locator('[data-testid="desktop-patch-panel"]').waitFor({ state: "visible" });

  // 편집 시작 → 우측 편집 패널 활성 톤 확인
  const editStart = page
    .locator('[data-testid="result-desktop-split"]')
    .getByRole("button", { name: "편집 시작" });
  await editStart.click();
  await page.waitForTimeout(300);

  // 추천 칩 → 입력창 채움 (동작 유지)
  const chip = page.locator('[data-testid="patch-suggestions"] button').first();
  if (await chip.count()) {
    await chip.click();
    const instruction = await page.locator('[data-testid="patch-instruction"]').inputValue();
    console.log(`[134cha] chip→instruction: ${JSON.stringify(instruction.slice(0, 80))}`);
  }

  const aside = page.locator('[data-testid="result-desktop-split"] aside').first();
  await aside.scrollIntoViewIfNeeded();

  const panelShot = path.join(SHOT_DIR, "134cha-edit-panel-open.png");
  await aside.screenshot({ path: panelShot });
  console.log(`[134cha] panel ${panelShot}`);

  // 도구 아코디언 — 헤더 버튼만 (내부 CTA와 이름 충돌 방지)
  const accordion = page.locator('[data-testid="desktop-tools-accordion"]');
  await accordion.scrollIntoViewIfNeeded();

  const headers = accordion.locator(':scope > div > button[aria-expanded]');
  // upload는 defaultOpen — 이미 펼침
  await headers.nth(0).click({ force: true }).catch(() => undefined);
  await page.waitForTimeout(200);
  // 확실히 펼치기
  if ((await headers.nth(0).getAttribute("aria-expanded")) !== "true") {
    await headers.nth(0).click();
    await page.waitForTimeout(200);
  }
  const uploadShot = path.join(SHOT_DIR, "134cha-tools-upload.png");
  await accordion.screenshot({ path: uploadShot });
  console.log(`[134cha] upload ${uploadShot}`);

  await headers.nth(1).click();
  await page.waitForTimeout(250);
  const aiShot = path.join(SHOT_DIR, "134cha-tools-ai.png");
  await accordion.screenshot({ path: aiShot });
  console.log(`[134cha] ai ${aiShot}`);

  const fullRight = path.join(SHOT_DIR, "134cha-edit-sidebar-full.png");
  await aside.screenshot({ path: fullRight });
  console.log(`[134cha] full ${fullRight}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
