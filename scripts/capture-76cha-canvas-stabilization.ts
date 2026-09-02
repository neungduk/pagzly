/**
 * 76차 — 캔버스 안정화 QA (회귀·모바일·스트레스·export)
 *   npx tsx scripts/capture-76cha-canvas-stabilization.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import {
  buildCanvasQaFixtureSection,
  buildCanvasStressFixtureSection,
} from "../lib/canvas-section-fixture";
import { getCategoryTheme } from "../lib/category-theme";
import { freezeDetailScrollReveal } from "./capture-utils";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const SHOT_DIR = path.join(ROOT, "review", "qa-screenshots");
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");

const SESSIONS = [
  { label: "beauty", path: path.join(ROOT, "review", "beauty-showcase-one", "session.json") },
  {
    label: "electronics",
    path: path.join(ROOT, "review", "pexels-electronics-detail", "session.json"),
  },
] as const;

function bytes(file: string): number {
  return fs.statSync(file).size;
}

type SessionShape = {
  category?: string;
  productName?: string;
  brandName?: string | null;
  price?: number;
  imageUrls?: string[];
  draftApproved?: boolean;
  generated?: { sections?: DetailSection[]; theme?: { baseNeutral?: string } };
};

function injectFixtures(raw: string, mode: "qa" | "stress"): string {
  const session = JSON.parse(raw) as SessionShape;
  const category = session.category ?? "화장품/뷰티";
  const baseNeutral =
    session.generated?.theme?.baseNeutral ?? getCategoryTheme(category).baseNeutral;
  const sections = session.generated?.sections ?? [];
  const imageUrls = session.imageUrls ?? [];
  const withoutFixture = sections.filter(
    (s) => s.slot !== "canvas_qa_fixture" && s.slot !== "canvas_stress_fixture",
  );
  const heroIdx = withoutFixture.findIndex((s) => s.type === "hero");
  const insertAt = heroIdx >= 0 ? heroIdx + 1 : 0;
  const canvasSection =
    mode === "stress"
      ? buildCanvasStressFixtureSection(baseNeutral)
      : buildCanvasQaFixtureSection(baseNeutral, imageUrls[0]);
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
  });
  await freezeDetailScrollReveal(page);
}

async function main() {
  if (!fs.existsSync(STORAGE_STATE_PATH)) throw new Error(`auth-state.json 없음`);
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  for (const { label, path: sessionPath } of SESSIONS) {
    if (!fs.existsSync(sessionPath)) {
      console.warn(`[76cha] skip ${label} — 세션 없음`);
      continue;
    }
    const sessionRaw = injectFixtures(fs.readFileSync(sessionPath, "utf8"), "qa");
    const session = JSON.parse(sessionRaw) as SessionShape & {
      productName: string;
      price: number;
      imageUrls: string[];
      generated: { sections: DetailSection[] };
    };

    const context = await browser.newContext({
      storageState: STORAGE_STATE_PATH,
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    await seedResultPage(page, sessionRaw);
    const shotPath = path.join(SHOT_DIR, `76cha-canvas-regression-${label}.png`);
    const canvas = page.locator('[data-testid="canvas-section"]').first();
    await canvas.scrollIntoViewIfNeeded();
    await canvas.screenshot({ path: shotPath });
    console.log(`[76cha] regression-${label} ${shotPath} (${bytes(shotPath)} bytes)`);
    await context.close();
  }

  const beautyPath = SESSIONS[0]!.path;
  if (!fs.existsSync(beautyPath)) throw new Error(`세션 없음: ${beautyPath}`);

  const stressRaw = injectFixtures(fs.readFileSync(beautyPath, "utf8"), "stress");
  const stressSession = JSON.parse(stressRaw) as SessionShape & {
    productName: string;
    price: number;
    imageUrls: string[];
    category: string;
    generated: { sections: DetailSection[] };
  };

  const desktopContext = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1280, height: 900 },
  });
  const desktopPage = await desktopContext.newPage();
  await seedResultPage(desktopPage, stressRaw);
  const stressPath = path.join(SHOT_DIR, "76cha-canvas-stress-24elements.png");
  await desktopPage.locator('[data-testid="canvas-section"]').first().screenshot({ path: stressPath });
  console.log(`[76cha] stress ${stressPath} (${bytes(stressPath)} bytes)`);

  const exportHtml = buildDetailPageHtml({
    productName: stressSession.productName,
    brandName: stressSession.brandName ?? null,
    price: stressSession.price ?? 0,
    category: stressSession.category,
    sections: stressSession.generated.sections,
    imageUrls: stressSession.imageUrls ?? [],
    theme: getCategoryTheme(stressSession.category),
  });
  const exportHtmlPath = path.join(SHOT_DIR, "76cha-canvas-export-stress.html");
  fs.writeFileSync(exportHtmlPath, exportHtml, "utf8");
  const elementCount = (exportHtml.match(/position:absolute;left:/g) ?? []).length;
  console.log(`[76cha] export elements=${elementCount} html=${bytes(exportHtmlPath)} bytes`);
  await desktopContext.close();

  const mobileContext = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const mobilePage = await mobileContext.newPage();
  const qaRaw = injectFixtures(fs.readFileSync(beautyPath, "utf8"), "qa");
  await seedResultPage(mobilePage, qaRaw);
  await mobilePage.getByRole("button", { name: "편집 시작" }).first().click();
  await mobilePage.waitForTimeout(400);
  const hint = mobilePage.locator('[data-testid="canvas-mobile-edit-hint"]').last();
  await hint.waitFor({ state: "visible" });
  const mobileHintPath = path.join(SHOT_DIR, "76cha-canvas-mobile-edit-hint.png");
  await hint.screenshot({ path: mobileHintPath });
  console.log(`[76cha] mobile-hint ${mobileHintPath} (${bytes(mobileHintPath)} bytes)`);

  const mobileCanvasPath = path.join(SHOT_DIR, "76cha-canvas-mobile-view.png");
  await mobilePage.locator('[data-testid="canvas-section"]').last().screenshot({ path: mobileCanvasPath });
  console.log(`[76cha] mobile-view ${mobileCanvasPath} (${bytes(mobileCanvasPath)} bytes)`);
  await mobileContext.close();

  await browser.close();
  console.log("[76cha] canvas stabilization regression ✓");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
