/**
 * 실제 /create 플로우로 화장품 1건 생성 후 illustration_banner 섹션 캡처.
 * 실행: npx tsx scripts/capture-real-illustration.ts
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

  console.log("[real-gen] /create 시작 — 딥 버건디 앰플");
  await page.goto(`${BASE_URL}/create`);
  await page.locator("select").first().selectOption({ label: "화장품/뷰티" });
  await page.setInputFiles('input[type="file"]', uploadImages);
  await page.fill("#productName", "딥 버건디 앰플");
  await page.fill("#price", "32000");
  await page.fill(
    "#keyFeatures",
    "히알루론산 87% 수분 개선, 나이아신아마이드 5%, 무향 저자극",
  );
  await page.fill("#ingredients", "히알루론산, 나이아신아마이드, 판테놀");
  await page.click('button[type="submit"]');

  const picker = page.locator('[data-testid="backdrop-picker"]');
  try {
    await picker.waitFor({ state: "visible", timeout: 480000 });
    await page.locator('[data-testid="backdrop-candidate-0"]').click();
    await page.locator('[data-testid="backdrop-confirm"]').click();
    console.log("[real-gen] 배경 후보 0번 자동 확정");
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
      generated?: { sections?: Array<{ type: string; slot?: string; metrics?: unknown[] }> };
    };
    const sections = session.generated?.sections ?? [];
    const types = sections.map((s) => `${s.type}${s.slot ? `(${s.slot})` : ""}`);
    console.log("[real-gen] sections:", types.join(", "));
    const stat = sections.find((s) => s.type === "stat_infographic");
    if (stat) {
      console.log("[real-gen] stat_infographic 포함:", JSON.stringify(stat));
    } else {
      console.log("[real-gen] stat_infographic 생략됨 (입력 근거 부족 또는 DeepSeek 판단)");
    }
    const banner = sections.find((s) => s.type === "illustration_banner");
    if (banner) {
      console.log(
        "[real-gen] illustration_banner:",
        JSON.stringify({
          heading: (banner as { heading?: string }).heading,
          body: (banner as { body?: string }).body,
          hasUrl: Boolean((banner as { illustrationUrl?: string }).illustrationUrl),
        }),
      );
    }
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const bannerSection = page.locator("section.aspect-video").first();
  await bannerSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const outPath = path.join(OUTPUT_DIR, "real-generation-illustration.png");
  await bannerSection.screenshot({ path: outPath });
  console.log(`저장됨: ${outPath}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
