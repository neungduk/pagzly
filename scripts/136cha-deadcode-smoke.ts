/**
 * 136차 — 삭제 후 스모크 (유료 generate 없음, 세션 시드 + 모듈 import)
 *   npx tsx scripts/136cha-deadcode-smoke.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { buildReviewHighlightSection } from "../lib/section-inserts";
import { getCategoryTheme } from "../lib/category-theme";
import { SECTION_BG_PATTERN_C_ALPHA } from "../lib/design-tokens";
import { assignDistinctSectionImages } from "../lib/assign-section-images";

const ROOT = path.join(__dirname, "..");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SESSION = path.join(ROOT, "review/beauty-showcase-one/session.json");
const AUTH = path.join(ROOT, "scripts/auth-state.json");
const OUT = path.join(ROOT, "review/qa-screenshots/136cha-result-smoke.png");

async function main() {
  const sec = buildReviewHighlightSection(["ok"], [], 3);
  if (sec.praises[0] !== "ok") throw new Error("section-inserts broken");
  if (typeof SECTION_BG_PATTERN_C_ALPHA !== "number") {
    throw new Error("design-tokens broken");
  }
  // deleted countDistinctSectionImages must not be required
  const assigned = assignDistinctSectionImages(
    [
      {
        type: "hero",
        slot: "hero",
        headline: "t",
        subheadline: "s",
        imageIndex: 0,
      },
    ],
    2,
  );
  if (!assigned.length) throw new Error("assign-section-images broken");
  console.log("[136smoke] module imports ok", getCategoryTheme("화장품/뷰티").accent);

  if (!fs.existsSync(SESSION) || !fs.existsSync(AUTH)) {
    throw new Error("missing session or auth-state");
  }
  const raw = fs.readFileSync(SESSION, "utf8");
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    storageState: AUTH,
    viewport: { width: 1280, height: 800 },
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/create`, { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => sessionStorage.setItem("pagzly-create-result", s), raw);
  await page.goto(`${BASE}/create/result`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="detail-preview"]', { timeout: 30000 });
  const visible = await page.locator('[data-testid="detail-preview"]').first().isVisible();
  if (!visible) throw new Error("detail-preview not visible");
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT, fullPage: false });
  console.log(`[136smoke] result page ok -> ${OUT}`);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
