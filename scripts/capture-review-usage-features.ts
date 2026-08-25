/**
 * draft → 승인 → result 까지 1회 생성 후 review_highlight / usage_steps 스크린샷.
 * 실행: npx tsx scripts/capture-review-usage-features.ts
 */
import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { freezeDetailScrollReveal } from "./capture-utils";

const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const OUTPUT_DIR = path.join(__dirname, "..", "review");
const ASSETS_DIR = path.join(__dirname, "test-assets", "화장품-뷰티");
const REVIEW_TXT = path.join(__dirname, "fixtures", "review-praises-repeat.txt");
const TEST_EMAIL = "pagelab-test@test.local";
const TEST_PASSWORD = "TestPass1234!";

async function ensureLogin(page: import("playwright").Page, context: import("playwright").BrowserContext) {
  await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded", timeout: 60000 });
  if (!page.url().includes("/login")) return;

  await page.waitForSelector("#email", { timeout: 15000 });
  await page.fill("#email", TEST_EMAIL);
  await page.fill("#password", TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 20000 });
  await context.storageState({ path: STORAGE_STATE_PATH });
  await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded" });
}

async function ensureTestUser() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: users } = await supabase.auth.admin.listUsers();
  if (users?.users?.find((u) => u.email === TEST_EMAIL)) return;
  const { error } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(error.message);
}

function productImages(): string[] {
  const files = fs
    .readdirSync(ASSETS_DIR)
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .sort()
    .slice(0, 2)
    .map((f) => path.join(ASSETS_DIR, f));
  if (files.length === 0) throw new Error("상품 사진 없음");
  return files;
}

async function main() {
  await ensureTestUser();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: fs.existsSync(STORAGE_STATE_PATH) ? STORAGE_STATE_PATH : undefined,
    reducedMotion: "reduce",
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  await ensureLogin(page, context);

  console.log("[capture] fill form + review file");
  await page.locator("select").first().selectOption({ label: "화장품/뷰티" });
  await page.setInputFiles('input[type="file"][accept*="image"]', productImages());
  await page.fill("#productName", "촉촉 수분 크림 QA확인");
  await page.fill("#brandName", "Pagzly Lab");
  await page.fill("#price", "32000");
  await page.fill("#keyFeatures", "히알루론산 수분 보습, 무향 저자극");
  await page.fill("#ingredients", "히알루론산, 판테놀");
  await page.setInputFiles("#reviewFile", REVIEW_TXT);

  await page.click('button[type="submit"]');
  console.log("[capture] waiting draft...");
  await page.waitForURL("**/create/draft**", { timeout: 480000 });
  await page.waitForTimeout(1500);

  const draftInfo = await page.evaluate(() => {
    const raw = sessionStorage.getItem("pagzly-create-draft");
    if (!raw) return null;
    const d = JSON.parse(raw) as {
      reviewInsights?: { commonPraises?: string[] };
      sections?: Array<{ type: string; slot?: string }>;
    };
    return {
      praises: d.reviewInsights?.commonPraises ?? [],
      sectionTypes: (d.sections ?? []).map((s) => s.type),
      hasReviewHighlight: (d.sections ?? []).some(
        (s) => s.type === "review_highlight" || s.slot === "review_highlight",
      ),
      hasUsageSteps: (d.sections ?? []).some((s) => s.type === "usage_steps"),
    };
  });
  console.log("[capture] draft info", JSON.stringify(draftInfo, null, 2));

  // 승인 버튼
  await page.getByRole("button", { name: "승인하고 최종 생성" }).click();
  console.log("[capture] approved — waiting result...");

  // backdrop picker if any
  const picker = page.locator('[data-testid="backdrop-picker"]');
  try {
    await picker.waitFor({ state: "visible", timeout: 120000 });
    await page.locator('[data-testid="backdrop-candidate-0"]').click();
    await page.locator('[data-testid="backdrop-confirm"]').click();
  } catch {
    /* TEST_MODE single candidate */
  }

  await page.waitForURL("**/create/result**", { timeout: 480000 });
  await page.waitForTimeout(2500);
  await freezeDetailScrollReveal(page);
  await page.waitForTimeout(400);

  const preview = page.locator('[data-testid="detail-preview"]');
  await preview.waitFor({ state: "visible", timeout: 30000 });

  const resultInfo = await page.evaluate(() => {
    const raw = sessionStorage.getItem("pagzly-create-result");
    if (!raw) return null;
    const d = JSON.parse(raw) as {
      reviewInsights?: { commonPraises?: string[] };
      generated?: { sections?: Array<{ type: string; slot?: string }> };
    };
    return {
      praises: d.reviewInsights?.commonPraises ?? [],
      types: (d.generated?.sections ?? []).map((s) => s.type),
    };
  });
  console.log("[capture] result sections", resultInfo);

  // scroll to review_highlight caption
  const reviewCaption = page.getByText("실제 구매자 리뷰에서 자주 나온 내용을 요약했습니다");
  if ((await reviewCaption.count()) > 0) {
    await reviewCaption.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "feature-review-highlight.png"),
      fullPage: false,
    });
    console.log("saved feature-review-highlight.png");
  } else {
    console.warn("review_highlight caption NOT found on page");
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "feature-review-highlight-MISSING.png"),
      fullPage: true,
    });
  }

  // usage_steps — look for STEP text or heading containing 사용
  const usageHeading = preview.locator("h3").filter({ hasText: /사용|STEP|방법/ });
  if ((await usageHeading.count()) > 0) {
    await usageHeading.first().scrollIntoViewIfNeeded();
  } else {
    // scroll to mid-page sections
    await page.evaluate(() => window.scrollBy(0, 800));
  }
  await page.waitForTimeout(400);

  // Find usage_steps section via structure: ol with STEP badges
  const usageOl = preview.locator("ol").filter({ has: page.locator("text=/STEP|01|02/") });
  if ((await usageOl.count()) > 0) {
    await usageOl.first().scrollIntoViewIfNeeded();
  }
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "feature-usage-steps-timeline.png"),
    fullPage: false,
  });
  console.log("saved feature-usage-steps-timeline.png");

  // also mobile viewport for vertical timeline
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  if ((await usageOl.count()) > 0) {
    await usageOl.first().scrollIntoViewIfNeeded();
  }
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "feature-usage-steps-timeline-mobile.png"),
    fullPage: false,
  });
  console.log("saved feature-usage-steps-timeline-mobile.png");

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
