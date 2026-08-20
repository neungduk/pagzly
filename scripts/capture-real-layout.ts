/**
 * 실제 /create 플로우로 화장품 1건 생성 후 compact quick_points + full POINT 섹션 캡처.
 * 실행: npx tsx scripts/capture-real-layout.ts
 */
import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { freezeDetailScrollReveal } from "./capture-utils";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const OUTPUT_DIR = path.join(__dirname, "..", "review");
const ASSETS_DIR = path.join(__dirname, "test-assets", "화장품-뷰티");

async function main() {
  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    throw new Error("auth-state.json 없음");
  }

  const uploadImages = fs
    .readdirSync(ASSETS_DIR)
    .filter((f) => /^loop-\d+/i.test(f) && /\.(jpe?g|png)$/i.test(f))
    .sort()
    .slice(0, 3)
    .map((f) => path.join(ASSETS_DIR, f));
  if (uploadImages.length === 0) {
    throw new Error("화장품-뷰티 loop 이미지 없음");
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    reducedMotion: "reduce",
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log("[layout-gen] /create 시작 — 딥 버건디 앰플");
  await page.goto(`${BASE_URL}/create`);
  await page.locator("select").first().selectOption({ label: "화장품/뷰티" });
  await page.setInputFiles('input[type="file"]', uploadImages);
  await page.fill("#productName", "딥 버건디 앰플");
  await page.fill("#price", "32000");
  await page.fill(
    "#keyFeatures",
    "히알루론산 87% 수분 개선, 나이아신아마이드 5%, 무향 저자극",
  );
  await page.fill("#ingredients", "히알루롨산, 나이아신아마이드, 판테놀");
  await page.click('button[type="submit"]');

  const picker = page.locator('[data-testid="backdrop-picker"]');
  try {
    await picker.waitFor({ state: "visible", timeout: 480000 });
    await page.locator('[data-testid="backdrop-candidate-0"]').click();
    await page.locator('[data-testid="backdrop-confirm"]').click();
    console.log("[layout-gen] 배경 후보 0번 자동 확정");
  } catch {
    // single candidate
  }

  await page.waitForURL(`${BASE_URL}/create/result`, { timeout: 480000 });
  await page.waitForTimeout(2000);
  await freezeDetailScrollReveal(page);
  await page.waitForTimeout(300);

  const sessionRaw = await page.evaluate(() => sessionStorage.getItem("pagzly-create-result"));
  if (sessionRaw) {
    const session = JSON.parse(sessionRaw) as {
      generated?: {
        sections?: Array<{
          type: string;
          slot?: string;
          layout?: string;
          heading?: string;
          compactFollow?: boolean;
        }>;
      };
    };
    const sections = session.generated?.sections ?? [];
    const types = sections.map((s) => `${s.type}${s.slot ? `(${s.slot})` : ""}`);
    console.log("[layout-gen] sections:", types.join(", "));
    const quickPoints = sections.filter((s) => s.slot === "quick_points");
    console.log(
      "[layout-gen] quick_points:",
      quickPoints.length > 0
        ? JSON.stringify(
            quickPoints.map((s) => ({
              heading: s.heading,
              layout: (s as { layout?: string }).layout,
            })),
          )
        : "생략됨",
    );
    const fullPoints = sections.filter(
      (s) =>
        s.type === "image_text" &&
        s.slot !== "quick_points" &&
        (s as { layout?: string }).layout !== "compact",
    );
    console.log("[layout-gen] full image_text:", fullPoints.map((s) => s.slot).join(", ") || "없음");
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const checklist = page.locator('section:has(ul.grid)').first();
  await checklist.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  const outPath = path.join(OUTPUT_DIR, "real-generation-layout.png");
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`저장됨: ${outPath}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
