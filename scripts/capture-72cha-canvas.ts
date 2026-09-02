/**
 * 72차 — 자유 캔버스 Phase 1 QA 캡처 (미리보기 / export HTML / 모바일)
 *   npx tsx scripts/capture-72cha-canvas.ts
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
const EXPORT_HTML_PATH = path.join(SHOT_DIR, "72cha-canvas-export.html");

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
  const nextSections = [
    ...withoutFixture.slice(0, insertAt),
    canvasSection,
    ...withoutFixture.slice(insertAt),
  ];
  session.generated = { ...session.generated, sections: nextSections };
  session.draftApproved = true;
  return JSON.stringify(session);
}

async function seedResultPage(page: import("playwright").Page, sessionRaw: string) {
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
  await page.waitForFunction(() => {
    const nodes = document.querySelectorAll('[data-testid="canvas-section"]');
    return [...nodes].some((node) => getComputedStyle(node as Element).display !== "none");
  }, { timeout: 30000 });
  await freezeDetailScrollReveal(page);
  await page.waitForTimeout(500);
}

async function main() {
  if (!fs.existsSync(SESSION_PATH)) throw new Error(`세션 없음: ${SESSION_PATH}`);
  if (!fs.existsSync(STORAGE_STATE_PATH)) throw new Error(`auth-state.json 없음`);

  const sessionRaw = injectCanvasFixture(fs.readFileSync(SESSION_PATH, "utf8"));
  const session = JSON.parse(sessionRaw) as {
    category: string;
    productName: string;
    brandName?: string | null;
    price: number;
    imageUrls: string[];
    generated: { sections: DetailSection[]; theme?: { baseNeutral?: string } };
  };

  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const exportHtml = buildDetailPageHtml({
    productName: session.productName,
    brandName: session.brandName,
    price: session.price,
    category: session.category,
    sections: session.generated.sections,
    imageUrls: session.imageUrls,
    theme: getCategoryTheme(session.category),
  });
  fs.writeFileSync(EXPORT_HTML_PATH, exportHtml, "utf8");

  const browser = await chromium.launch({ headless: true });

  const desktopContext = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1280, height: 900 },
  });
  const desktopPage = await desktopContext.newPage();
  await seedResultPage(desktopPage, sessionRaw);
  const previewPath = path.join(SHOT_DIR, "72cha-canvas-preview.png");
  const canvas = desktopPage.locator('[data-testid="canvas-section"]').first();
  await canvas.scrollIntoViewIfNeeded();
  await canvas.screenshot({ path: previewPath });
  console.log(`[72cha] preview ${previewPath} (${bytes(previewPath)} bytes)`);
  await desktopContext.close();

  const exportPage = await browser.newPage({ viewport: { width: 750, height: 1200 } });
  await exportPage.goto(`file:///${EXPORT_HTML_PATH.replace(/\\/g, "/")}`, {
    waitUntil: "load",
  });
  await exportPage.locator('[data-testid="canvas-section-export"]').waitFor({ state: "visible" });
  const exportShotPath = path.join(SHOT_DIR, "72cha-canvas-export.png");
  await exportPage.locator('[data-testid="canvas-section-export"]').screenshot({ path: exportShotPath });
  console.log(`[72cha] export ${exportShotPath} (${bytes(exportShotPath)} bytes)`);

  const mobileContext = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const mobilePage = await mobileContext.newPage();
  await seedResultPage(mobilePage, sessionRaw);
  const mobilePath = path.join(SHOT_DIR, "72cha-canvas-mobile.png");
  const mobileCanvas = mobilePage.locator('[data-testid="canvas-section"]').last();
  await mobileCanvas.screenshot({ path: mobilePath });
  console.log(`[72cha] mobile ${mobilePath} (${bytes(mobilePath)} bytes)`);
  await mobileContext.close();

  await browser.close();
  console.log(`[72cha] export html ${EXPORT_HTML_PATH} (${bytes(EXPORT_HTML_PATH)} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
