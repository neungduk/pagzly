/**
 * 카테고리/상품명/가격/사진폴더를 인자로 받아 /create 폼으로 풀페이지 생성 + 캡처.
 *
 * 단일 실행:
 *   npx tsx scripts/capture-fullpage.ts <slug> <categoryLabel> <productName> <price> <assetsFolder>
 *
 * 5카테고리 일괄 (A 작업):
 *   npx tsx scripts/capture-fullpage.ts --batch-a
 *
 * 저장:
 *   review/fullpage-{slug}-desktop.png
 *   review/fullpage-{slug}-shadow-crop.png
 */

import { chromium, type Page } from "playwright";
import path from "path";
import fs from "fs";
import { freezeDetailScrollReveal } from "./capture-utils";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const OUTPUT_DIR = path.join(__dirname, "..", "review");
const TEST_ASSETS_ROOT = path.join(__dirname, "test-assets");

type CaptureCase = {
  slug: string;
  categoryLabel: string;
  productName: string;
  price: string;
  assetsFolder: string;
};

const BATCH_A: CaptureCase[] = [
  {
    slug: "beauty",
    categoryLabel: "화장품/뷰티",
    productName: "딥 버건디 앰플",
    price: "32000",
    assetsFolder: "화장품-뷰티",
  },
  {
    slug: "electronics",
    categoryLabel: "전자제품",
    productName: "오픈형 이어버드",
    price: "89000",
    assetsFolder: "전자기기-액세서리",
  },
  {
    slug: "fashion",
    categoryLabel: "의류/패션",
    productName: "린넨 오버핏 셔츠",
    price: "45000",
    assetsFolder: "의류-패션",
  },
  {
    slug: "food",
    categoryLabel: "식품/건강기능식품",
    productName: "단백질 쉐이크 바닐라",
    price: "28000",
    assetsFolder: "식품",
  },
  {
    slug: "home",
    categoryLabel: "생활용품",
    productName: "린넨 데코 쿠션",
    price: "34900",
    assetsFolder: "생활용품",
  },
];

function loadUploadImages(assetsFolder: string): string[] {
  const testAssetsDir = path.join(TEST_ASSETS_ROOT, assetsFolder);
  if (!fs.existsSync(testAssetsDir)) {
    throw new Error(`사진 폴더 없음: ${testAssetsDir}`);
  }
  const testImages = fs
    .readdirSync(testAssetsDir)
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .map((f) => path.join(testAssetsDir, f));
  const loopImages = testImages
    .filter((f) => /^loop-\d+/i.test(path.basename(f)))
    .sort();
  const uploadImages = (loopImages.length >= 2 ? loopImages : testImages.sort()).slice(0, 3);
  if (uploadImages.length === 0) {
    throw new Error(`사진 없음: ${testAssetsDir}`);
  }
  return uploadImages;
}

async function captureShadowCrop(page: Page, outPath: string): Promise<string> {
  const preview = page.locator('[data-testid="detail-preview"]');
  const sections = preview.locator("[data-scroll-reveal]");

  for (const index of [2, 3]) {
    const section = sections.nth(index);
    const img = section.locator("img").first();
    try {
      await img.waitFor({ state: "visible", timeout: 8000 });
      const box = await img.boundingBox();
      if (!box || box.width < 40 || box.height < 40) continue;

      const clip = {
        x: Math.max(0, box.x + box.width * 0.08),
        y: box.y + box.height * 0.62,
        width: box.width * 0.84,
        height: Math.min(box.height * 0.38, 420),
      };
      await page.screenshot({ path: outPath, clip });
      return index === 2 ? "ingredient" : "texture";
    } catch {
      // try next section
    }
  }

  const fallback = sections.nth(2);
  await fallback.screenshot({ path: outPath });
  return "ingredient-fallback";
}

async function runCapture(spec: CaptureCase): Promise<{ cost: number; errors: string[] }> {
  const uploadImages = loadUploadImages(spec.assetsFolder);
  const errors: string[] = [];
  let reportedCost = 0;

  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    reducedMotion: "reduce",
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    const text = msg.text();
    if (
      msg.type() === "error" ||
      /enhance-image|SVG|svg|cutout|fallback|\[cost\]/i.test(text)
    ) {
      console.log(`[browser:${msg.type()}] ${text}`);
    }
    if (/\[cost\].*total=\$([0-9.]+)/i.test(text)) {
      const m = text.match(/total=\$([0-9.]+)/);
      if (m) reportedCost = Math.max(reportedCost, Number(m[1]));
    }
  });

  page.on("pageerror", (err) => {
    const line = `[pageerror] ${err.message}`;
    errors.push(line);
    console.error(line);
  });

  page.on("response", async (response) => {
    const url = response.url();
    if (!url.includes("/api/enhance-image") && !url.includes("/api/generate")) return;
    if (response.status() >= 400) {
      let body = "";
      try {
        body = await response.text();
      } catch {
        body = "(body unreadable)";
      }
      const line = `[api ${response.status()}] ${url} → ${body.slice(0, 300)}`;
      errors.push(line);
      console.error(line);
    }
  });

  console.log(`\n=== [capture] ${spec.slug} (${spec.categoryLabel}) — ${spec.productName} ===`);
  console.log(`[capture] assets: ${uploadImages.map((p) => path.basename(p)).join(", ")}`);

  await page.goto(`${BASE_URL}/create`);
  await page.locator("select").first().selectOption({ label: spec.categoryLabel });
  await page.setInputFiles('input[type="file"]', uploadImages);
  await page.fill("#productName", spec.productName);
  await page.fill("#price", spec.price);
  await page.click('button[type="submit"]');

  const picker = page.locator('[data-testid="backdrop-picker"]');
  try {
    await picker.waitFor({ state: "visible", timeout: 480000 });
    await page.locator('[data-testid="backdrop-candidate-0"]').click();
    await page.locator('[data-testid="backdrop-confirm"]').click();
    console.log("[capture] 배경 후보 0번 자동 확정");
  } catch {
    // single candidate / TEST_MODE
  }

  await page.waitForURL(`${BASE_URL}/create/result`, { timeout: 480000 });
  await page.waitForTimeout(2000);
  await freezeDetailScrollReveal(page);
  await page.waitForTimeout(300);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const desktopPath = path.join(OUTPUT_DIR, `fullpage-${spec.slug}-desktop.png`);
  await page.screenshot({ path: desktopPath, fullPage: true });
  console.log(`저장됨: ${desktopPath}`);

  const shadowPath = path.join(OUTPUT_DIR, `fullpage-${spec.slug}-shadow-crop.png`);
  const shadowSource = await captureShadowCrop(page, shadowPath);
  console.log(`그림자 크롭 (${shadowSource}): ${shadowPath}`);

  const sessionRaw = await page.evaluate(() => sessionStorage.getItem("pagzly-create-result"));
  let sessionCost = 0;
  if (sessionRaw) {
    try {
      const session = JSON.parse(sessionRaw) as {
        photoProcessingCost?: number;
        photoCostBreakdown?: Record<string, number>;
        generated?: { generationCost?: number };
      };
      sessionCost =
        session.generated?.generationCost ??
        session.photoProcessingCost ??
        Object.values(session.photoCostBreakdown ?? {}).reduce((a, b) => a + b, 0);
      console.log(
        `[capture] session cost: photoProcessing=$${(session.photoProcessingCost ?? 0).toFixed(4)} breakdown=${JSON.stringify(session.photoCostBreakdown ?? {})}`,
      );
    } catch {
      // ignore
    }
  }

  await browser.close();
  return { cost: sessionCost || reportedCost, errors };
}

async function main() {
  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    throw new Error("auth-state.json 없음 — npx tsx scripts/save-login-state.ts 먼저 실행");
  }

  const args = process.argv.slice(2);
  let cases: CaptureCase[];

  if (args[0] === "--batch-a") {
    cases = BATCH_A;
  } else if (args.length >= 5) {
    cases = [
      {
        slug: args[0],
        categoryLabel: args[1],
        productName: args[2],
        price: args[3],
        assetsFolder: args[4],
      },
    ];
  } else {
    throw new Error(
      "Usage:\n  capture-fullpage.ts --batch-a\n  capture-fullpage.ts <slug> <categoryLabel> <productName> <price> <assetsFolder>",
    );
  }

  let totalCost = 0;
  const allErrors: Array<{ slug: string; errors: string[] }> = [];

  for (const spec of cases) {
    const result = await runCapture(spec);
    totalCost += result.cost;
    if (result.errors.length > 0) {
      allErrors.push({ slug: spec.slug, errors: result.errors });
    }
  }

  console.log(`\n=== 총 비용 합계: $${totalCost.toFixed(4)} (${cases.length}건) ===`);
  if (allErrors.length > 0) {
    console.log("\n=== 에러 요약 ===");
    for (const item of allErrors) {
      console.log(`[${item.slug}]`);
      for (const e of item.errors) console.log(`  ${e}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
