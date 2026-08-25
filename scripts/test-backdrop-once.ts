/**
 * TEST_MODE generate-backdrop 1회 호출 → 이미지/메타 저장.
 * 실행: npx tsx scripts/test-backdrop-once.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
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
const OUT_DIR = path.join(__dirname, "..", "review");
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
  if (existing) return;
  const { error } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(`테스트 사용자 생성 실패: ${error.message}`);
}

async function login(page: import("playwright").Page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("#email", { timeout: 15000 });
  await page.fill("#email", TEST_EMAIL);
  await page.fill("#password", TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20000 });
}

async function main() {
  await ensureTestUser();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await login(page);
  await context.storageState({ path: STORAGE_STATE_PATH });
  console.log("로그인 세션 저장 완료");

  await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded", timeout: 60000 });
  if (page.url().includes("/login")) {
    throw new Error("로그인 후에도 /create 접근 실패");
  }

  console.log("calling /api/generate-backdrop ...");
  const result = await page.evaluate(async () => {
    const res = await fetch("/api/generate-backdrop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "의류/패션",
        productName: "테스트 셔츠",
        brandName: null,
      }),
    });
    const json = await res.json();
    return { status: res.status, json };
  });

  const { backdropDataUrl, ...rest } = result.json as {
    backdropDataUrl?: string;
    cost?: number;
    backdropCost?: number;
    testMode?: boolean;
    error?: string;
  };

  fs.writeFileSync(
    path.join(OUT_DIR, "backdrop-once-meta.json"),
    JSON.stringify({ status: result.status, ...rest, hasBackdrop: Boolean(backdropDataUrl) }, null, 2),
  );

  if (backdropDataUrl?.startsWith("data:image/png;base64,")) {
    const b64 = backdropDataUrl.slice("data:image/png;base64,".length);
    const imgPath = path.join(OUT_DIR, "backdrop-once-fashion.png");
    fs.writeFileSync(imgPath, Buffer.from(b64, "base64"));
    console.log(`Saved image: ${imgPath}`);
  } else {
    console.log("No backdropDataUrl in response");
  }

  console.log("status:", result.status);
  console.log("meta:", JSON.stringify(rest, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
