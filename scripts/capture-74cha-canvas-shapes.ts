/**
 * 74차 — 캔버스 도형·표·색상 테마 QA
 *   npx tsx scripts/capture-74cha-canvas-shapes.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { buildCanvasQaFixtureSection } from "../lib/canvas-section-fixture";
import { getCategoryTheme } from "../lib/category-theme";
import { freezeDetailScrollReveal } from "./capture-utils";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const SHOT_DIR = path.join(ROOT, "review", "qa-screenshots");
const SESSION_PATH = path.join(ROOT, "review", "beauty-showcase-one", "session.json");
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");

function bytes(file: string): number {
  return fs.statSync(file).size;
}

function injectCanvasFixture(raw: string): string {
  const session = JSON.parse(raw) as {
    category?: string;
    draftApproved?: boolean;
    generated?: { sections?: DetailSection[]; theme?: { baseNeutral?: string } };
  };
  const category = session.category ?? "화장품/뷰티";
  const baseNeutral =
    session.generated?.theme?.baseNeutral ?? getCategoryTheme(category).baseNeutral;
  const sections = session.generated?.sections ?? [];
  const withoutFixture = sections.filter((s) => s.slot !== "canvas_qa_fixture");
  const heroIdx = withoutFixture.findIndex((s) => s.type === "hero");
  const insertAt = heroIdx >= 0 ? heroIdx + 1 : 0;
  const canvasSection = buildCanvasQaFixtureSection(baseNeutral);
  session.generated = {
    ...session.generated,
    sections: [
      ...withoutFixture.slice(0, insertAt),
      canvasSection,
      ...withoutFixture.slice(insertAt),
    ],
  };
  session.draftApproved = true;
  return JSON.stringify(session);
}

async function main() {
  if (!fs.existsSync(SESSION_PATH)) throw new Error(`세션 없음: ${SESSION_PATH}`);
  if (!fs.existsSync(STORAGE_STATE_PATH)) throw new Error(`auth-state.json 없음`);

  const sessionRaw = injectCanvasFixture(fs.readFileSync(SESSION_PATH, "utf8"));
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded" });
  await page.evaluate((raw) => {
    sessionStorage.setItem("pagzly-create-result", raw);
  }, sessionRaw);
  await page.goto(`${BASE_URL}/create/result`, { waitUntil: "networkidle" });

  const expand = page.locator('[data-testid="detail-preview-expand"]');
  if (await expand.isVisible().catch(() => false)) {
    await expand.click();
    await page.waitForTimeout(400);
  }

  await page.getByRole("button", { name: "편집 시작" }).first().click();
  await page.waitForTimeout(300);

  const split = page.locator('[data-testid="result-desktop-split"]');
  const toolbar = split.locator('[data-testid="canvas-edit-toolbar"]');
  await toolbar.waitFor({ state: "visible" });

  await split.locator('[data-testid="canvas-add-table"]').click();
  await page.waitForTimeout(200);
  await split.locator('[data-testid="canvas-add-circle"]').click();
  await page.waitForTimeout(200);

  await freezeDetailScrollReveal(page);

  const toolbarPath = path.join(SHOT_DIR, "74cha-canvas-toolbar-shapes.png");
  await toolbar.screenshot({ path: toolbarPath });
  console.log(`[74cha] toolbar ${toolbarPath} (${bytes(toolbarPath)} bytes)`);

  const themePicker = split.locator('[data-testid="canvas-theme-picker"]');
  await themePicker.waitFor({ state: "visible" });

  await split.locator('[data-testid="canvas-theme-swatch-accentSoft"]').click();
  await page.waitForTimeout(200);

  const tableLayer = split.locator('[data-testid="canvas-layer-panel"] button', { hasText: "표" }).first();
  if (await tableLayer.isVisible().catch(() => false)) {
    await tableLayer.click();
    await page.waitForTimeout(150);
    await split.locator('[data-testid="canvas-theme-swatch-accent"]').click();
    await page.waitForTimeout(200);
  }

  const themePath = path.join(SHOT_DIR, "74cha-canvas-theme-picker.png");
  await themePicker.screenshot({ path: themePath });
  console.log(`[74cha] theme ${themePath} (${bytes(themePath)} bytes)`);

  const desktopCanvas = split.locator('[data-testid="canvas-frame"]');
  const canvasPath = path.join(SHOT_DIR, "74cha-canvas-shapes-table.png");
  await desktopCanvas.screenshot({ path: canvasPath });
  console.log(`[74cha] canvas ${canvasPath} (${bytes(canvasPath)} bytes)`);

  await browser.close();
  console.log("[74cha] canvas shapes/theme regression ✓");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
