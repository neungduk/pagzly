/**
 * Bria replace/genfill 강제 실험 캡처 (프로덕션 getBackdropProvider 미사용).
 *
 * 실행:
 *   npx tsx scripts/experiment-bria-backdrop-capture.ts <mode> <outputPrefix> <categoryKey> <productName> <price>
 *
 * mode: replace | genfill
 * outputPrefix: bria-v3-home | genfill-v3-home | bria-v1-pet | genfill-v1-pet
 *
 * 예:
 *   npx tsx scripts/experiment-bria-backdrop-capture.ts replace bria-v3-home 생활용품 "린넨 데코 쿠션" 34900
 */
import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { freezeDetailScrollReveal } from "./capture-utils";
import { extractProductTheme } from "../lib/color-extract";
import { getCategoryTheme } from "../lib/category-theme";
import { generateConceptBrief } from "../lib/concept-brief";
import {
  generateBackdropViaBria,
  generateBackdropViaBriaGenFill,
} from "../lib/photo-enhance";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const OUTPUT_DIR = path.join(__dirname, "..", "review");
const TEST_ASSETS_ROOT = path.join(__dirname, "test-assets");

const CATEGORY_MAP: Record<string, { label: string; folder?: string }> = {
  "생활용품": { label: "생활용품" },
  "반려동물": { label: "반려동물" },
  "화장품/뷰티": { label: "화장품/뷰티", folder: "화장품-뷰티" },
  "전자제품": { label: "전자제품" },
  "의류/패션": { label: "의류/패션", folder: "의류-패션" },
  "식품/건강기능식품": { label: "식품/건강기능식품", folder: "식품" },
};

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

async function main() {
  loadEnvLocal();
  const mode = process.argv[2] as "replace" | "genfill";
  const outputPrefix = process.argv[3];
  const categoryKey = process.argv[4];
  const productName = process.argv[5];
  const price = process.argv[6];

  if (!mode || !outputPrefix || !categoryKey || !productName || !price) {
    throw new Error(
      "Usage: experiment-bria-backdrop-capture.ts <replace|genfill> <outputPrefix> <categoryKey> <productName> <price>",
    );
  }
  if (!CATEGORY_MAP[categoryKey]) {
    throw new Error(`Unknown categoryKey: ${categoryKey}`);
  }
  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    throw new Error("auth-state.json 없음 — save-login-state.ts 먼저 실행");
  }
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN 필요");
  }

  const catEntry = CATEGORY_MAP[categoryKey];
  const categoryLabel = catEntry.label;
  const testAssetsDir = path.join(TEST_ASSETS_ROOT, catEntry.folder ?? categoryKey);
  const uploadImages = fs
    .readdirSync(testAssetsDir)
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .sort()
    .slice(0, 3)
    .map((f) => path.join(testAssetsDir, f));

  if (uploadImages.length === 0) {
    throw new Error(`test-assets/${categoryKey} 비어 있음`);
  }

  const requestJsonPath = path.join(
    OUTPUT_DIR,
    mode === "replace" ? `${outputPrefix}-request.json` : `${outputPrefix}-request.json`,
  );

  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  await page.route("**/api/generate-backdrop", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    try {
      const body = (await route.request().postDataJSON()) as {
        category?: string;
        productName?: string;
        brandName?: string | null;
        imageUrls?: string[];
        price?: number;
        keyFeatures?: string | null;
        ingredients?: string | null;
        targetCustomer?: string | null;
      };

      const { brief: conceptBrief, cost: conceptBriefCost } = await generateConceptBrief({
        category: body.category ?? categoryLabel,
        productName: body.productName ?? productName,
        brandName: body.brandName ?? null,
        price: body.price ?? Number(price),
        keyFeatures: body.keyFeatures ?? null,
        ingredients: body.ingredients ?? null,
        targetCustomer: body.targetCustomer ?? null,
      });

      let theme = getCategoryTheme(body.category ?? categoryLabel);
      if (body.imageUrls?.length) {
        try {
          const extracted = await extractProductTheme(body.imageUrls);
          if (extracted) theme = { ...theme, ...extracted };
        } catch {
          // optional
        }
      }

      const args = [
        body.category ?? categoryLabel,
        body.productName ?? productName,
        body.brandName ?? null,
        theme,
        body.imageUrls?.[0],
        conceptBrief,
      ] as const;

      const result =
        mode === "replace"
          ? await generateBackdropViaBria(...args)
          : await generateBackdropViaBriaGenFill(...args);

      if (mode === "replace" && outputPrefix.startsWith("bria-")) {
        fs.writeFileSync(
          requestJsonPath,
          JSON.stringify(
            {
              capturedAt: new Date().toISOString(),
              productName: body.productName ?? productName,
              category: body.category ?? categoryLabel,
              mode: "bria-replace",
              imageUrls: body.imageUrls,
              localFixtures: uploadImages.map((p) => path.relative(path.join(__dirname, ".."), p)),
              candidateCount: result.candidateCount,
              candidateUrls: result.candidateUrls,
            },
            null,
            2,
          ),
          "utf8",
        );
        console.log(`[experiment] request saved: ${requestJsonPath}`);
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          candidateUrls: result.candidateUrls,
          autoPicked: result.autoPicked,
          cost: result.cost + conceptBriefCost,
          conceptBriefCost,
          backdropCost: result.cost,
          claudeCost: result.claudeCost,
          shadowAnalysis: result.shadow,
          conceptBrief,
          testMode: false,
        }),
      });
    } catch (error) {
      console.error("[experiment] generate-backdrop intercept 실패:", error);
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        }),
      });
    }
  });

  await page.goto(`${BASE_URL}/create`);
  await page.locator("select").first().selectOption({ label: categoryLabel });
  await page.setInputFiles('input[type="file"]', uploadImages);
  await page.fill("#productName", productName);
  await page.fill("#price", price);
  await page.click('button[type="submit"]');

  const picker = page.locator('[data-testid="backdrop-picker"]');
  try {
    await picker.waitFor({ state: "visible", timeout: 480000 });
    await page.locator('[data-testid="backdrop-candidate-0"]').click();
    await page.locator('[data-testid="backdrop-confirm"]').click();
    console.log("[experiment] 배경 후보 0번 자동 확정");
  } catch {
    // single candidate
  }

  await page.waitForURL(`${BASE_URL}/create/result`, { timeout: 480000 });
  await page.waitForTimeout(2000);
  await freezeDetailScrollReveal(page);
  await page.waitForTimeout(300);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, `attempt-${categoryKey}-${outputPrefix}.png`);
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`저장됨: ${outPath}`);

  const preview = page.locator('[data-testid="detail-preview"]');
  const sections = preview.locator("[data-scroll-reveal]");
  for (const { index, label } of [
    { index: 0, label: "hero" },
    { index: 2, label: "ingredient" },
    { index: 3, label: "texture" },
  ]) {
    const sectionPath = path.join(OUTPUT_DIR, `${outputPrefix}-${label}.png`);
    await sections.nth(index).screenshot({ path: sectionPath });
    console.log(`섹션 저장: ${sectionPath}`);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
