/**
 * 77차 — 캔버스 표 셀 편집 QA
 *   npx tsx scripts/capture-77cha-canvas-table-edit.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { buildCanvasQaFixtureSection } from "../lib/canvas-section-fixture";
import { getCategoryTheme } from "../lib/category-theme";
import { freezeDetailScrollReveal } from "./capture-utils";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const SHOT_DIR = path.join(ROOT, "review", "qa-screenshots");
const SESSION_PATH = path.join(ROOT, "review", "beauty-showcase-one", "session.json");
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const EXPORT_HTML_PATH = path.join(SHOT_DIR, "77cha-canvas-table-export.html");

const SPEC_ROWS = [
  { label: "용량", value: "100ml" },
  { label: "제형", value: "에센스" },
  { label: "주요 성분", value: "나이아신아마이드 5%" },
  { label: "피부 타입", value: "모든 피부" },
];

function bytes(file: string): number {
  return fs.statSync(file).size;
}

function injectCanvasFixture(raw: string): string {
  const session = JSON.parse(raw) as {
    category?: string;
    draftApproved?: boolean;
    imageUrls?: string[];
    generated?: { sections?: DetailSection[]; theme?: { baseNeutral?: string } };
  };
  const category = session.category ?? "화장품/뷰티";
  const baseNeutral =
    session.generated?.theme?.baseNeutral ?? getCategoryTheme(category).baseNeutral;
  const sections = session.generated?.sections ?? [];
  const imageUrls = session.imageUrls ?? [];
  const withoutFixture = sections.filter((s) => s.slot !== "canvas_qa_fixture");
  const heroIdx = withoutFixture.findIndex((s) => s.type === "hero");
  const insertAt = heroIdx >= 0 ? heroIdx + 1 : 0;
  const canvasSection = buildCanvasQaFixtureSection(baseNeutral, imageUrls[0]);
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
  await split.locator('[data-testid="canvas-section"]').scrollIntoViewIfNeeded();

  const tableLayer = split
    .locator('[data-testid="canvas-layer-panel"] button', { hasText: "표" })
    .first();
  await tableLayer.click();
  await page.waitForTimeout(200);

  const panel = split.locator('[data-testid="canvas-table-edit-panel"]');
  await panel.waitFor({ state: "visible" });

  await split.locator('[data-testid="canvas-table-label-0"]').fill(SPEC_ROWS[0]!.label);
  await split.locator('[data-testid="canvas-table-value-0"]').fill(SPEC_ROWS[0]!.value);
  await split.locator('[data-testid="canvas-table-label-1"]').fill(SPEC_ROWS[1]!.label);
  await split.locator('[data-testid="canvas-table-value-1"]').fill(SPEC_ROWS[1]!.value);
  await split.locator('[data-testid="canvas-table-add-row"]').click();
  await page.waitForTimeout(150);
  await split.locator('[data-testid="canvas-table-label-2"]').fill(SPEC_ROWS[2]!.label);
  await split.locator('[data-testid="canvas-table-value-2"]').fill(SPEC_ROWS[2]!.value);
  await split.locator('[data-testid="canvas-table-add-row"]').click();
  await page.waitForTimeout(150);
  await split.locator('[data-testid="canvas-table-label-3"]').fill(SPEC_ROWS[3]!.label);
  await split.locator('[data-testid="canvas-table-value-3"]').fill(SPEC_ROWS[3]!.value);
  await page.waitForTimeout(200);

  await freezeDetailScrollReveal(page);

  const panelPath = path.join(SHOT_DIR, "77cha-canvas-table-edit-panel.png");
  await panel.screenshot({ path: panelPath });
  console.log(`[77cha] panel ${panelPath} (${bytes(panelPath)} bytes)`);

  const previewPath = path.join(SHOT_DIR, "77cha-canvas-table-preview.png");
  await split.locator('[data-testid="canvas-frame"]').screenshot({ path: previewPath });
  console.log(`[77cha] preview ${previewPath} (${bytes(previewPath)} bytes)`);

  const updatedSession = await page.evaluate(() => {
    const raw = sessionStorage.getItem("pagzly-create-result");
    return raw ? JSON.parse(raw) : null;
  }) as {
    category: string;
    productName: string;
    brandName?: string | null;
    price: number;
    imageUrls: string[];
    generated: { sections: DetailSection[] };
  } | null;

  if (!updatedSession?.generated?.sections) {
    throw new Error("편집 후 sessionStorage에 sections가 없습니다.");
  }

  const exportHtml = buildDetailPageHtml({
    productName: updatedSession.productName,
    brandName: updatedSession.brandName,
    price: updatedSession.price,
    category: updatedSession.category,
    sections: updatedSession.generated.sections,
    imageUrls: updatedSession.imageUrls,
    theme: getCategoryTheme(updatedSession.category),
  });
  fs.writeFileSync(EXPORT_HTML_PATH, exportHtml, "utf8");

  await context.close();

  const exportPage = await browser.newPage({ viewport: { width: 750, height: 1200 } });
  await exportPage.goto(`file:///${EXPORT_HTML_PATH.replace(/\\/g, "/")}`, {
    waitUntil: "load",
  });
  await exportPage.locator('[data-testid="canvas-section-export"]').waitFor({ state: "visible" });
  const exportShotPath = path.join(SHOT_DIR, "77cha-canvas-table-export.png");
  await exportPage.locator('[data-testid="canvas-section-export"]').screenshot({ path: exportShotPath });
  console.log(`[77cha] export ${exportShotPath} (${bytes(exportShotPath)} bytes)`);
  console.log(`[77cha] export html ${EXPORT_HTML_PATH} (${bytes(EXPORT_HTML_PATH)} bytes)`);

  const html = fs.readFileSync(EXPORT_HTML_PATH, "utf8");
  for (const row of SPEC_ROWS) {
    if (!html.includes(row.label) || !html.includes(row.value)) {
      throw new Error(`export HTML에 스펙 행 누락: ${row.label}`);
    }
  }

  await browser.close();
  console.log("[77cha] canvas table edit regression ✓");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
