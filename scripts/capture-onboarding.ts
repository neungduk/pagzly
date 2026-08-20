/**
 * 회원가입(가능하면) 또는 기존 세션으로 온보딩 3단계 제출 → /create 진입 확인.
 * 실행: npx tsx scripts/capture-onboarding.ts
 */
import { chromium, type Page } from "playwright";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUTPUT_DIR = path.join(__dirname, "..", "review");
const AUTH_STATE_PATH = path.join(__dirname, "auth-state.json");
const stamp = Date.now();
const email = `pagzly.onboard.${stamp}@gmail.com`;
const password = "OnboardTest1!";

function dbQuery(sql: string): string {
  return execSync(`npx supabase db query --linked --yes ${JSON.stringify(sql)}`, {
    encoding: "utf8",
    cwd: path.join(__dirname, ".."),
  });
}

async function runOnboardingWizard(page: Page) {
  await page.goto(`${BASE_URL}/create`);
  await page.waitForURL(/\/(onboarding|create|login)/, { timeout: 30000 });
  if (page.url().includes("/login")) {
    throw new Error("세션이 만료되어 /login으로 이동했습니다.");
  }
  if (page.url().includes("/create") && !page.url().includes("onboarding")) {
    console.log("[onboard] 이미 온보딩 완료 — /create 유지");
    return;
  }

  await page.getByLabel("자사 브랜드 운영").click();
  await page.fill("#storeUrl", "https://smartstore.naver.com/pagzly-test");
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByLabel("2~4개").click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByLabel("구글검색").click();
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "onboarding-wizard.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "시작하기" }).click();
  await page.waitForURL(/\/create/, { timeout: 30000 });
  console.log("[onboard] /create 진입 성공");
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "onboarding-create-unlocked.png"),
  });
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/login`);
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "google-login-button.png"),
    fullPage: true,
  });
  console.log("[onboard] 로그인 페이지 스크린샷 저장 (구글 버튼)");

  console.log(`[onboard] 회원가입 시도 ${email}`);
  await page.goto(`${BASE_URL}/signup`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  const afterSignup = (await page.locator("main").innerText()).slice(0, 800);
  console.log("[onboard] 가입 후:", page.url(), afterSignup.replace(/\n/g, " | "));

  if (afterSignup.includes("Signups not allowed")) {
    await browser.close();
    console.log("[onboard] 이메일 가입 비활성 — 기존 auth-state 세션으로 온보딩");
    const authed = await chromium.launch();
    const authedContext = await authed.newContext({
      storageState: AUTH_STATE_PATH,
      viewport: { width: 430, height: 900 },
      deviceScaleFactor: 2,
    });
    await runOnboardingWizard(await authedContext.newPage());
    await authed.close();
  } else {
    const onOnboarding = page.url().includes("/onboarding");
    const confirmNotice = await page.locator("text=인증 링크").count();
    if (!onOnboarding && confirmNotice > 0) {
      dbQuery(
        `update auth.users set email_confirmed_at = now(), confirmed_at = now() where email = '${email}'`,
      );
      await page.goto(`${BASE_URL}/login`);
      await page.fill("#email", email);
      await page.fill("#password", password);
      await page.click('button[type="submit"]');
    }
    await page.waitForURL(/\/onboarding/, { timeout: 30000 });
    await runOnboardingWizard(page);
    await browser.close();
  }

  const queryOut = dbQuery(
    "select u.email, o.business_type, o.monthly_volume, o.referral_source, o.store_url, o.completed_at from public.user_onboarding o join auth.users u on u.id = o.user_id order by o.completed_at desc limit 5",
  );
  const queryPath = path.join(OUTPUT_DIR, "onboarding-query.txt");
  fs.writeFileSync(queryPath, queryOut, "utf8");
  console.log("[onboard] 쿼리 결과:\n", queryOut);
  console.log("저장됨:", queryPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
