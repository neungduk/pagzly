/**
 * 화장품/뷰티 상세페이지 전체 파이프라인 캡처.
 * npx tsx scripts/capture-beauty-detail.ts
 */
import { chromium, type Page } from "playwright";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";
const OUTPUT_DIR = path.join(__dirname, "..", "review");
const TEST_ASSETS = path.join(__dirname, "test-assets", "화장품-뷰티");

const TEST_EMAIL = "pagelab-test@test.local";
const TEST_PASSWORD = "TestPass1234!";

async function ensureTestUser() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: users } = await supabase.auth.admin.listUsers();
  const existing = users?.users?.find((u) => u.email === TEST_EMAIL);
  if (existing) {
    console.log(`[auth] 테스트 사용자 존재: ${TEST_EMAIL}`);
    return;
  }

  const { error } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(`테스트 사용자 생성 실패: ${error.message}`);
  console.log(`[auth] 테스트 사용자 생성 완료: ${TEST_EMAIL}`);
}

async function loginAndSaveState(statePath: string) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector("#email", { timeout: 15000 });
  await page.fill("#email", TEST_EMAIL);
  await page.fill("#password", TEST_PASSWORD);
  await page.click('button[type="submit"]');

  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  console.log(`[auth] 로그인 성공, 현재 URL: ${page.url()}`);

  await context.storageState({ path: statePath });
  await browser.close();
  console.log(`[auth] 세션 저장: ${statePath}`);
}

async function freezeScrollReveal(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll("[data-scroll-reveal]").forEach((el) => {
      (el as HTMLElement).style.opacity = "1";
      (el as HTMLElement).style.transform = "none";
      (el as HTMLElement).style.transition = "none";
    });
  });
}

async function captureFullPage(
  statePath: string,
  viewport: { width: number; height: number },
  outPath: string,
) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: statePath,
    viewport,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[cost]") || text.includes("[cutout]") || text.includes("[preCrop]") || text.includes("[detectProductRegion]")) {
      console.log(`[browser] ${text}`);
    }
  });

  // /create 페이지로 이동
  console.log(`\n[capture] ${viewport.width}px viewport → ${path.basename(outPath)}`);
  await page.goto(`${BASE_URL}/create`, { waitUntil: "networkidle" });

  // 카테고리 선택
  const categorySelect = page.locator("select").first();
  await categorySelect.waitFor({ timeout: 10000 });

  // 옵션 값 확인
  const options = await categorySelect.locator("option").allTextContents();
  console.log("[form] 카테고리 옵션:", options.join(", "));

  const beautyOption = options.find((o) => o.includes("화장품") || o.includes("뷰티"));
  if (!beautyOption) throw new Error("화장품/뷰티 카테고리 옵션을 찾을 수 없습니다");
  await categorySelect.selectOption({ label: beautyOption });

  // 사진 업로드
  const images = fs.readdirSync(TEST_ASSETS)
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .sort()
    .slice(0, 3)
    .map((f) => path.join(TEST_ASSETS, f));
  console.log(`[form] 이미지 ${images.length}장: ${images.map((i) => path.basename(i)).join(", ")}`);
  await page.setInputFiles('input[type="file"]', images);

  // 폼 입력
  await page.fill("#productName", "딥 버건디 앰플");
  await page.fill("#price", "32000");

  // 주요 특징 필드 찾기
  const keyFeaturesInput = page.locator("#keyFeatures, [name='keyFeatures'], textarea").first();
  if (await keyFeaturesInput.isVisible().catch(() => false)) {
    await keyFeaturesInput.fill("저자극 진정 앰플, 비건 포뮬러, 병풀 추출물 95% 함유, 민감성 피부 전용");
  }

  const ingredientsInput = page.locator("#ingredients, [name='ingredients']").first();
  if (await ingredientsInput.isVisible().catch(() => false)) {
    await ingredientsInput.fill("병풀 추출물, 마데카소사이드, 히알루론산, 판테놀, 녹차 추출물");
  }

  const targetInput = page.locator("#targetCustomer, [name='targetCustomer']").first();
  if (await targetInput.isVisible().catch(() => false)) {
    const tag = await targetInput.evaluate((el) => el.tagName.toLowerCase());
    if (tag === "select") {
      const opts = await targetInput.locator("option").allTextContents();
      const match = opts.find((o) => o.includes("20") || o.includes("여성") || o.includes("민감"));
      if (match) await targetInput.selectOption({ label: match });
      else if (opts.length > 1) await targetInput.selectOption({ index: 1 });
    } else {
      await targetInput.fill("20-30대 민감성 피부 여성");
    }
  }

  // 제출
  console.log("[form] 제출 중...");
  await page.click('button[type="submit"]');

  // 배경 후보 선택기 처리
  const picker = page.locator('[data-testid="backdrop-picker"]');
  try {
    await picker.waitFor({ state: "visible", timeout: 480000 });
    console.log("[capture] 배경 후보 선택기 표시됨");
    await page.locator('[data-testid="backdrop-candidate-0"]').click();
    await page.locator('[data-testid="backdrop-confirm"]').click();
    console.log("[capture] 배경 후보 0번 확정");
  } catch {
    console.log("[capture] 배경 후보 자동 선택 (단일 후보)");
  }

  // 결과 페이지 대기
  await page.waitForURL(`${BASE_URL}/create/result`, { timeout: 600000 });
  console.log("[capture] 결과 페이지 도달");

  // 콘텐츠 렌더링 대기
  await page.waitForTimeout(3000);
  await freezeScrollReveal(page);
  await page.waitForTimeout(500);

  // 전체 페이지 스크린샷
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`[saved] ${outPath}`);

  const resultUrl = page.url();
  await browser.close();
  return resultUrl;
}

async function captureResultOnly(
  statePath: string,
  viewport: { width: number; height: number },
  resultUrl: string,
  outPath: string,
) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: statePath,
    viewport,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  console.log(`\n[capture] ${viewport.width}px viewport (결과 재사용) → ${path.basename(outPath)}`);
  await page.goto(resultUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  await freezeScrollReveal(page);
  await page.waitForTimeout(500);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`[saved] ${outPath}`);
  await browser.close();
}

async function main() {
  await ensureTestUser();

  const statePath = path.join(__dirname, "auth-state.json");
  await loginAndSaveState(statePath);

  // 데스크톱 (전체 파이프라인 실행)
  const resultUrl = await captureFullPage(
    statePath,
    { width: 1440, height: 900 },
    path.join(OUTPUT_DIR, "detail-page-beauty-desktop.png"),
  );

  // 모바일 (결과 URL 재사용, 재생성 없음)
  await captureResultOnly(
    statePath,
    { width: 375, height: 812 },
    resultUrl,
    path.join(OUTPUT_DIR, "detail-page-beauty-mobile.png"),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
