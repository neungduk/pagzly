/**
 * 73차 — 캔버스 드래그/리사이즈 편집 QA
 *   npx tsx scripts/capture-73cha-canvas-edit.ts
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

  const desktopCanvas = page.locator('[data-testid="result-desktop-split"] [data-testid="canvas-frame"]');
  await desktopCanvas.waitFor({ state: "visible" });
  const layerPanel = page.locator('[data-testid="result-desktop-split"] [data-testid="canvas-layer-panel"]');
  await layerPanel.waitFor({ state: "visible" });
  await freezeDetailScrollReveal(page);

  const editPath = path.join(SHOT_DIR, "73cha-canvas-edit-mode.png");
  await desktopCanvas.screenshot({ path: editPath });
  console.log(`[73cha] edit ${editPath} (${bytes(editPath)} bytes)`);

  await page.locator('[data-testid="result-desktop-split"] [data-testid="canvas-add-text"]').click();
  await page.waitForTimeout(200);
  const layerPath = path.join(SHOT_DIR, "73cha-canvas-layer-panel.png");
  await layerPanel.screenshot({ path: layerPath });
  console.log(`[73cha] layer ${layerPath} (${bytes(layerPath)} bytes)`);

  const firstElement = page.locator('[data-testid="result-desktop-split"] [data-testid^="canvas-element-"]').first();
  const box = await firstElement.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 30, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(300);
  }

  const dragPath = path.join(SHOT_DIR, "73cha-canvas-after-drag.png");
  await desktopCanvas.screenshot({ path: dragPath });
  console.log(`[73cha] drag ${dragPath} (${bytes(dragPath)} bytes)`);

  await browser.close();
  console.log("[73cha] canvas edit regression ✓");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
