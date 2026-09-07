/**
 * 123차 — history "보기" + missing-id toast 검증 (API 생성 호출 없음)
 * npx tsx scripts/123cha-verify-history-view.ts
 */
import { chromium } from "playwright";
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

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const OUT = path.join(__dirname, "..", "review");
const TEST_EMAIL = "pagelab-test@test.local";
const TEST_PASSWORD = "TestPass1234!";
const SELECT =
  "id, category, product_name, brand_name, logo_url, price, target_customer, key_features, ingredients, certifications, competitor_url, wholesale_url, image_urls, image_origins, headlines, description, features, how_to_use, caution, image_analysis, theme, photo_cost_breakdown, mfds_reviewed, replacements, sections, created_at, generation_cost";

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

async function login(
  page: import("playwright").Page,
  context: import("playwright").BrowserContext,
) {
  await page.goto(`${BASE_URL}/create/history`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  if (!page.url().includes("/login")) return;
  await page.waitForSelector("#email", { timeout: 15000 });
  await page.fill("#email", TEST_EMAIL);
  await page.fill("#password", TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 20000 });
  await context.storageState({ path: STORAGE_STATE_PATH });
  await page.goto(`${BASE_URL}/create/history`, { waitUntil: "networkidle" });
}

async function main() {
  await ensureTestUser();
  fs.mkdirSync(OUT, { recursive: true });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: probeRows, error: probeErr } = await admin
    .from("products")
    .select(SELECT)
    .limit(1);
  if (probeErr) {
    console.error("SELECT_PROBE_FAIL", probeErr.code, probeErr.message);
    process.exit(1);
  }
  console.log("SELECT_PROBE_OK rows=", probeRows?.length ?? 0);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: fs.existsSync(STORAGE_STATE_PATH) ? STORAGE_STATE_PATH : undefined,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  const failedLoads: string[] = [];
  page.on("console", (msg) => {
    const t = msg.text();
    if (t.includes("[create/result] DB load failed")) failedLoads.push(t);
  });

  await login(page, context);
  await page.goto(`${BASE_URL}/create/history`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });

  const viewLink = page.locator('a:has-text("보기")').first();
  await viewLink.waitFor({ state: "visible", timeout: 20000 });
  await page.evaluate(() => sessionStorage.clear());
  await viewLink.click();
  await page.waitForTimeout(2500);

  const url = page.url();
  console.log("AFTER_VIEW_URL", url);
  if (!url.includes("/create/result")) {
    console.error("FAIL: redirected away from result", url);
    await page.screenshot({
      path: path.join(OUT, "123cha-history-view-FAILED.png"),
      fullPage: true,
    });
    process.exit(1);
  }

  await page.waitForTimeout(1500);
  if (failedLoads.length) {
    console.error("FAIL: console DB load failed", failedLoads);
    process.exit(1);
  }

  await page.screenshot({
    path: path.join(OUT, "123cha-history-view-fixed.png"),
    fullPage: true,
  });
  console.log("SCREENSHOT_OK review/123cha-history-view-fixed.png");

  await page.goto(
    `${BASE_URL}/create/result?id=00000000-0000-4000-8000-000000000099`,
    { waitUntil: "networkidle" },
  );
  await page.waitForTimeout(1500);
  const errText = await page.locator("body").innerText();
  const toastOk = errText.includes("저장된 페이지를 불러오지 못했습니다");
  console.log("FAKE_ID_TOAST", toastOk ? "OK" : "MISSING");
  console.log("FAKE_ID_URL", page.url());
  await page.screenshot({
    path: path.join(OUT, "123cha-missing-id-toast.png"),
    fullPage: true,
  });
  if (!toastOk) process.exit(1);
  if (page.url().includes("/create") && !page.url().includes("/create/result")) {
    console.error("FAIL: silent redirect on missing id");
    process.exit(1);
  }

  await browser.close();
  console.log("ALL_OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
