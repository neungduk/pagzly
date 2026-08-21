/**
 * 레퍼런스/리뷰/기획안 각각 1건씩 화장품 생성 후 결과 캡처.
 * 실행: npx tsx scripts/capture-input-sources.ts [reference|review|planning|all]
 */
import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { freezeDetailScrollReveal } from "./capture-utils";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const OUTPUT_DIR = path.join(__dirname, "..", "review");
const FIXTURES = path.join(__dirname, "fixtures");
const ASSETS_DIR = path.join(__dirname, "test-assets", "화장품-뷰티");

type Scenario = "reference" | "review" | "planning";

const SCENARIOS: Record<
  Scenario,
  { label: string; output: string; attach: (page: import("playwright").Page) => Promise<void> }
> = {
  reference: {
    label: "레퍼런스 이미지만",
    output: "real-generation-input-reference.png",
    attach: async (page) => {
      const refPath = path.join(FIXTURES, "reference-mood.png");
      if (!fs.existsSync(refPath)) {
        throw new Error(`레퍼런스 fixture 없음: ${refPath}`);
      }
      await page.setInputFiles("#referenceImage", refPath);
      console.log("[input-sources] reference image attached");
    },
  },
  review: {
    label: "리뷰 파일만",
    output: "real-generation-input-review.png",
    attach: async (page) => {
      const reviewPath = path.join(FIXTURES, "cosmetics-reviews.txt");
      await page.setInputFiles("#reviewFile", reviewPath);
      console.log("[input-sources] review file attached");
    },
  },
  planning: {
    label: "기획안만",
    output: "real-generation-input-planning.png",
    attach: async (page) => {
      const docxPath = path.join(FIXTURES, "cosmetics-planning.docx");
      if (!fs.existsSync(docxPath)) {
        throw new Error(`기획안 DOCX fixture 없음: ${docxPath}`);
      }
      await page.setInputFiles("#planningDoc", docxPath);
      console.log("[input-sources] planning doc (docx) attached");
    },
  },
};

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
  throw new Error("상품 사진 fixture 없음 (test-assets/화장품-뷰티 또는 fixtures/reference-mood.png)");
}

async function runScenario(scenario: Scenario): Promise<void> {
  const config = SCENARIOS[scenario];
  const uploadImages = await resolveProductImages();

  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    reducedMotion: "reduce",
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log(`[input-sources:${scenario}] /create — ${config.label}`);
  await page.goto(`${BASE_URL}/create`);
  await page.locator("select").first().selectOption({ label: "화장품/뷰티" });
  await page.setInputFiles('input[type="file"][accept*="image"]', uploadImages);
  await page.fill("#productName", `입력소스 테스트 ${scenario}`);
  await page.fill("#brandName", "Pagzly Lab");
  await page.fill("#price", "32000");
  await page.fill(
    "#keyFeatures",
    "히알루론산 87% 수분 개선, 나이아신아마이드 5%, 무향 저자극",
  );
  await page.fill("#ingredients", "히알루롨산, 나이아신아마이드, 판테놀");

  await config.attach(page);

  await page.click('button[type="submit"]');

  const picker = page.locator('[data-testid="backdrop-picker"]');
  try {
    await picker.waitFor({ state: "visible", timeout: 480000 });
    await page.locator('[data-testid="backdrop-candidate-0"]').click();
    await page.locator('[data-testid="backdrop-confirm"]').click();
    console.log(`[input-sources:${scenario}] 배경 후보 0번 확정`);
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
      referenceAnalysis?: { colorHex: string[]; moodKeywords: string[] };
      reviewInsights?: { commonPraises: string[]; commonComplaints: string[] };
      planningDocText?: string;
      generated?: { sections?: Array<{ type: string; slot?: string; headline?: string; heading?: string; body?: string }> };
    };
    console.log(`[input-sources:${scenario}] referenceAnalysis`, session.referenceAnalysis ?? "(없음)");
    console.log(`[input-sources:${scenario}] reviewInsights`, session.reviewInsights ?? "(없음)");
    console.log(
      `[input-sources:${scenario}] planningDocText`,
      session.planningDocText ? `${session.planningDocText.slice(0, 120)}...` : "(없음)",
    );
    const hero = session.generated?.sections?.find((s) => s.type === "hero");
    console.log(`[input-sources:${scenario}] hero`, hero?.headline ?? "(없음)");
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, config.output);
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`저장됨: ${outPath}`);

  await browser.close();
}

async function main() {
  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    throw new Error("auth-state.json 없음 — scripts/save-login-state.ts 실행 필요");
  }

  const arg = process.argv[2] ?? "all";
  const list: Scenario[] =
    arg === "all" ? ["reference", "review", "planning"] : [arg as Scenario];

  for (const scenario of list) {
    if (!SCENARIOS[scenario]) {
      throw new Error(`unknown scenario: ${scenario}`);
    }
    await runScenario(scenario);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
