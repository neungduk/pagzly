/**
 * draft만 생성 (mode=draft) — QA 로그 확인용. 이미지 보정 없음.
 * npx tsx scripts/capture-draft-qa-only.ts
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
const ASSETS_DIR = path.join(__dirname, "test-assets", "화장품-뷰티");
const REVIEW_TXT = path.join(__dirname, "fixtures", "review-praises-repeat.txt");
const TEST_EMAIL = "pagelab-test@test.local";
const TEST_PASSWORD = "TestPass1234!";

async function ensureTestUser() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: users } = await supabase.auth.admin.listUsers();
  if (users?.users?.find((u) => u.email === TEST_EMAIL)) return;
  await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
}

async function main() {
  await ensureTestUser();
  const images = fs
    .readdirSync(ASSETS_DIR)
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .sort()
    .slice(0, 1)
    .map((f) => path.join(ASSETS_DIR, f));

  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: fs.existsSync(STORAGE_STATE_PATH) ? STORAGE_STATE_PATH : undefined,
  });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) {
    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 20000 });
    await context.storageState({ path: STORAGE_STATE_PATH });
    await page.goto(`${BASE_URL}/create`);
  }

  console.log("[qa-draft] submitting draft only...");
  await page.locator("select").first().selectOption({ label: "화장품/뷰티" });
  await page.setInputFiles('input[type="file"][accept*="image"]', images);
  await page.fill("#productName", "QA 진부함 체크용 세럼");
  await page.fill("#price", "28000");
  await page.fill("#keyFeatures", "수분 보습");
  if (fs.existsSync(REVIEW_TXT)) {
    await page.setInputFiles("#reviewFile", REVIEW_TXT);
  }
  await page.click('button[type="submit"]');
  await page.waitForURL("**/create/draft**", { timeout: 480000 });
  console.log("[qa-draft] reached /create/draft — stop here (no approve)");
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
