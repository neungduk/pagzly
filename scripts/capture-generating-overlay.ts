/**
 * GeneratingOverlay 연속 스크린샷 + snap 검증.
 * 인증 만료 시 /dev/generating-overlay 로 폴백 (동일 컴포넌트).
 * 실행: npx tsx scripts/capture-generating-overlay.ts
 */
import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const OUTPUT_DIR = path.join(__dirname, "..", "review");
const ASSETS_DIR = path.join(__dirname, "test-assets", "화장품-뷰티");
const FIXTURES = path.join(__dirname, "fixtures");

async function resolveProductImages(): Promise<string[]> {
  if (fs.existsSync(ASSETS_DIR)) {
    const fromAssets = fs
      .readdirSync(ASSETS_DIR)
      .filter((f) => /^loop-\d+/i.test(f) && /\.(jpe?g|png)$/i.test(f))
      .sort()
      .slice(0, 2)
      .map((f) => path.join(ASSETS_DIR, f));
    if (fromAssets.length > 0) return fromAssets;
  }
  const fallback = path.join(FIXTURES, "reference-mood.png");
  if (fs.existsSync(fallback)) return [fallback];
  throw new Error("상품 사진 없음");
}

async function captureFromDevPreview(
  page: import("playwright").Page,
): Promise<void> {
  console.log("[overlay] /dev/generating-overlay?snapAt=4 (auth 폴백)");
  await page.goto(`${BASE_URL}/dev/generating-overlay?snapAt=4`, {
    waitUntil: "networkidle",
  });

  const overlay = page.locator('[data-testid="generating-overlay"]');
  await overlay.waitFor({ state: "visible", timeout: 15000 });

  await page.waitForTimeout(700);
  const shot1 = path.join(OUTPUT_DIR, "generating-overlay-1.png");
  await page.screenshot({ path: shot1, fullPage: false });
  console.log("저장:", shot1);

  const labels = await page.locator("[data-overlay-card] .text-sm.font-semibold").allTextContents();
  console.log("[overlay] slot labels:", labels.join(" | "));

  await page.waitForTimeout(2800);
  const shot2 = path.join(OUTPUT_DIR, "generating-overlay-2.png");
  await page.screenshot({ path: shot2, fullPage: false });
  console.log("저장:", shot2);

  // snapAt=4 → data-snap=true
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-testid="generating-overlay"]')
        ?.getAttribute("data-snap") === "true",
    { timeout: 10000 },
  );
  await page.waitForTimeout(200);
  const shot3 = path.join(OUTPUT_DIR, "generating-overlay.png");
  await page.screenshot({ path: shot3, fullPage: false });
  const completed = await overlay.getAttribute("data-completed");
  console.log(`[overlay] SNAP completed=${completed} →`, shot3);

  const statuses = await page.locator("[data-overlay-card]").evaluateAll((nodes) =>
    nodes.map((n) => n.getAttribute("data-status")),
  );
  const allDone = statuses.every((s) => s === "done");
  console.log(`[overlay] all cards done=${allDone} count=${statuses.length}`);
  if (!allDone) throw new Error("snap 후에도 미완료 카드 있음");
}

async function tryCreateFlow(page: import("playwright").Page): Promise<boolean> {
  const uploadImages = await resolveProductImages();
  await page.goto(`${BASE_URL}/create`, { waitUntil: "networkidle" });
  console.log("[overlay] url=", page.url());
  if (page.url().includes("/login") || page.url().includes("/onboarding")) {
    return false;
  }
  await page.locator("select").first().waitFor({ state: "visible", timeout: 15000 });
  await page.locator("select").first().selectOption({ label: "화장품/뷰티" });
  await page.setInputFiles('input[type="file"][accept*="image"]', uploadImages);
  await page.fill("#productName", "오버레이 테스트 앰플");
  await page.fill("#brandName", "Pagzly Lab");
  await page.fill("#price", "32000");
  await page.fill("#keyFeatures", "히알루론산 87%, 무향 저자극");
  await page.click('button[type="submit"]');

  const overlay = page.locator('[data-testid="generating-overlay"]');
  await overlay.waitFor({ state: "visible", timeout: 60000 });
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "generating-overlay-1.png"),
    fullPage: false,
  });
  await page.waitForTimeout(3500);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "generating-overlay-2.png"),
    fullPage: false,
  });
  console.log("[overlay] /create 샷 저장 완료");
  return true;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: fs.existsSync(STORAGE_STATE_PATH) ? STORAGE_STATE_PATH : undefined,
    reducedMotion: "reduce",
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const usedCreate = await tryCreateFlow(page).catch((err) => {
    console.warn("[overlay] /create 실패:", err);
    return false;
  });

  if (!usedCreate) {
    await captureFromDevPreview(page);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
