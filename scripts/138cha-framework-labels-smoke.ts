/**
 * 138차 — 설득 프레임워크 라벨 손검산 + 사이드바 스크린샷 + 구매자 경로 미노출
 *   npx tsx scripts/138cha-framework-labels-smoke.ts
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { freezeDetailScrollReveal } from "./capture-utils";
import { buildGenerationPipelineSummary } from "../lib/generation-pipeline-summary";
import {
  SECTION_FRAMEWORK_LABEL,
  getSectionFrameworkLabel,
} from "../lib/section-persuasion-labels";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review");
const SHOT = path.join(OUT, "qa-screenshots");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const SESSION_PATH = path.join(ROOT, "review", "beauty-showcase-one", "session.json");
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");

const ALL_TYPES: DetailSection["type"][] = [
  "hero",
  "checklist",
  "image_text",
  "highlight_box",
  "step_card",
  "usage_steps",
  "spec_table",
  "comparison_table",
  "comparison_chart",
  "stat_infographic",
  "review_highlight",
  "faq",
  "target_persona",
  "brand_story",
  "color_variation",
  "illustration_banner",
  "gallery",
  "caution",
  "ai_disclosure",
  "custom_gif",
  "cta_price",
  "canvas",
];

function writeLabelMap() {
  const lines = ["# 138cha section framework label map", ""];
  for (const type of ALL_TYPES) {
    const label = getSectionFrameworkLabel(type);
    lines.push(`${type}\t${label ?? "라벨 없음"}`);
  }
  const mapped = ALL_TYPES.filter((t) => getSectionFrameworkLabel(t)).length;
  lines.push("");
  lines.push(`mapped=${mapped} none=${ALL_TYPES.length - mapped} total=${ALL_TYPES.length}`);
  if (getSectionFrameworkLabel("canvas") != null) {
    throw new Error("canvas must have no label");
  }
  if (mapped !== 21) {
    // 22 types listed; canvas excluded → 21 mapped
    // ALL_TYPES has 22 entries (21 + canvas)
    if (!(mapped === 21 && ALL_TYPES.length === 22)) {
      throw new Error(`expected 21 mapped labels, got ${mapped}/${ALL_TYPES.length}`);
    }
  }
  // keys in constant should be exactly 21
  if (Object.keys(SECTION_FRAMEWORK_LABEL).length !== 21) {
    throw new Error(`SECTION_FRAMEWORK_LABEL size=${Object.keys(SECTION_FRAMEWORK_LABEL).length}`);
  }
  fs.writeFileSync(path.join(OUT, "138cha-label-map.txt"), lines.join("\n"), "utf8");
  console.log(`[138] label map written mapped=${mapped}`);
}

function assertBuyerPathsClean() {
  const files = [
    path.join(ROOT, "lib/export-detail-html.ts"),
    path.join(ROOT, "components/DetailSectionRenderer.tsx"),
  ];
  for (const file of files) {
    const raw = fs.readFileSync(file, "utf8");
    if (/section-persuasion-labels|SECTION_FRAMEWORK_LABEL|getSectionFrameworkLabel/.test(raw)) {
      throw new Error(`buyer path contaminated: ${path.relative(ROOT, file)}`);
    }
  }
  console.log("[138] buyer renderer/export: no framework label imports ✓");
}

function enrichSession(raw: string): string {
  const session = JSON.parse(raw) as Record<string, unknown> & {
    generated?: {
      imageAnalysis?: string;
      theme?: { baseNeutral?: string };
      sections?: DetailSection[];
      photoCostBreakdown?: Record<string, number>;
    };
    photoProcessingCost?: number;
    photoCostBreakdown?: Record<string, number>;
    backdropFailed?: boolean;
  };
  const generated = session.generated;
  if (generated?.sections && !generated.sections.some((s) => s.type === "canvas")) {
    generated.sections = [
      ...generated.sections,
      {
        type: "canvas",
        slot: "canvas_1",
        frameWidth: 1080,
        frameHeight: 720,
        background: { color: "#F5F1EA" },
        elements: [],
      },
    ];
  }
  if (!session.pipelineSummary) {
    session.pipelineSummary = buildGenerationPipelineSummary({
      imageAnalysis: generated?.imageAnalysis || "fixture vision summary",
      theme: generated?.theme,
      photoProcessingCost: Number(session.photoProcessingCost) || 0,
      photoCostBreakdown: session.photoCostBreakdown ?? generated?.photoCostBreakdown,
      backdropFailed: Boolean(session.backdropFailed),
      sectionCount: generated?.sections?.length ?? 0,
    });
    (session.pipelineSummary as { completedAt?: string }).completedAt = new Date().toISOString();
  }
  session.draftApproved = true;
  return JSON.stringify(session);
}

async function captureSidebar() {
  if (!fs.existsSync(SESSION_PATH)) throw new Error(`missing ${SESSION_PATH}`);
  if (!fs.existsSync(STORAGE_STATE_PATH)) throw new Error(`missing auth-state`);
  fs.mkdirSync(SHOT, { recursive: true });

  const sessionRaw = enrichSession(fs.readFileSync(SESSION_PATH, "utf8"));
  // Prefer system Chrome when sandbox PLAYWRIGHT_BROWSERS_PATH lacks browsers.
  const browser = await chromium.launch({ headless: true, channel: "chrome" }).catch(() =>
    chromium.launch({ headless: true }),
  );
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded" });
  await page.evaluate((raw) => sessionStorage.setItem("pagzly-create-result", raw), sessionRaw);
  await page.goto(`${BASE_URL}/create/result`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="desktop-structure-sidebar"]', { timeout: 30000 });
  await freezeDetailScrollReveal(page);

  const sidebar = page.locator('[data-testid="desktop-structure-sidebar"]');
  const badges = sidebar.locator('[data-testid="section-framework-badge"]');
  const badgeCount = await badges.count();
  if (badgeCount < 5) throw new Error(`expected several framework badges, got ${badgeCount}`);

  // canvas row must not have a framework badge
  const canvasRow = sidebar.locator("li").filter({ hasText: "자유 캔버스" }).first();
  await canvasRow.waitFor({ state: "visible" });
  const canvasBadges = canvasRow.locator('[data-testid="section-framework-badge"]');
  if ((await canvasBadges.count()) !== 0) {
    throw new Error("canvas row must not show framework badge");
  }
  console.log(`[138] badges=${badgeCount} canvas-badge=0 ✓`);

  const out = path.join(SHOT, "138cha-framework-badges.png");
  await sidebar.screenshot({ path: out });
  console.log(`[138] ${out}`);
  await browser.close();
}

async function main() {
  writeLabelMap();
  assertBuyerPathsClean();
  await captureSidebar();
  console.log("[138] all checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
