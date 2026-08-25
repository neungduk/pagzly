/**
 * 직접 편집 → DB PATCH 저장 → sessionStorage 비우고 재진입 시 유지 검증.
 * npx tsx scripts/verify-edit-save-db.ts
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
const MARKER = `DB저장검증-${Date.now()}`;

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

async function login(page: import("playwright").Page, context: import("playwright").BrowserContext) {
  await page.goto(`${BASE_URL}/create/history`, { waitUntil: "domcontentloaded", timeout: 60000 });
  if (!page.url().includes("/login")) return;
  await page.waitForSelector("#email", { timeout: 15000 });
  await page.fill("#email", TEST_EMAIL);
  await page.fill("#password", TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 20000 });
  await context.storageState({ path: STORAGE_STATE_PATH });
  await page.goto(`${BASE_URL}/create/history`, { waitUntil: "domcontentloaded" });
}

async function main() {
  await ensureTestUser();
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: fs.existsSync(STORAGE_STATE_PATH) ? STORAGE_STATE_PATH : undefined,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  const patchResponses: { status: number; url: string; body: string }[] = [];
  page.on("response", async (res) => {
    if (res.request().method() === "PATCH" && res.url().includes("/api/products/")) {
      let body = "";
      try {
        body = await res.text();
      } catch {
        body = "(unreadable)";
      }
      patchResponses.push({ status: res.status(), url: res.url(), body });
    }
  });

  await login(page, context);

  // 작업 내역에서 첫 상품 열기 — 세션 캐시 없이 DB에서 로드
  await page.goto(`${BASE_URL}/create/history`, { waitUntil: "networkidle", timeout: 60000 });
  await page.evaluate(() => {
    sessionStorage.removeItem("pagzly-create-result");
    sessionStorage.removeItem("pagzly-create-draft");
  });
  const firstLink = page.locator('a[href*="/create/result?id="]').first();
  if ((await firstLink.count()) === 0) {
    throw new Error("작업 내역에 상품이 없습니다. 먼저 하나 생성해 주세요.");
  }
  const href = await firstLink.getAttribute("href");
  console.log("[verify] opening", href);
  await firstLink.click();
  await page.waitForURL("**/create/result**", { timeout: 30000 });
  await page.waitForSelector('[data-testid="detail-preview"]', { timeout: 30000 });
  await page.waitForTimeout(1500);

  const productId = new URL(page.url(), BASE_URL).searchParams.get("id");
  if (!productId) throw new Error("URL에 id 없음");

  const sessionProductId = await page.evaluate(() => {
    const raw = sessionStorage.getItem("pagzly-create-result");
    if (!raw) return null;
    try {
      return (JSON.parse(raw) as { generated?: { productId?: string } }).generated?.productId ?? null;
    } catch {
      return null;
    }
  });
  console.log("[verify] session productId=", sessionProductId);

  const editTab = page.locator('[data-testid="tab-edit"]');
  await editTab.scrollIntoViewIfNeeded();
  await editTab.click();
  await page.waitForTimeout(300);

  const startEdit = page.getByRole("button", { name: "편집 시작" });
  if ((await startEdit.count()) > 0) {
    await startEdit.click();
  }
  await page.waitForTimeout(400);

  const preview = page.locator('[data-testid="detail-preview"]');
  const input = preview.locator("input[type='text']").first();
  await input.waitFor({ state: "visible", timeout: 10000 });
  await input.click({ clickCount: 3 });
  await input.fill("");
  await input.pressSequentially(MARKER, { delay: 10 });
  await input.blur();
  await page.waitForTimeout(300);
  console.log("[verify] edited marker=", MARKER);

  const saveBtn = page.getByRole("button", { name: "저장" });
  const disabled = await saveBtn.isDisabled();
  console.log("[verify] save disabled=", disabled);
  if (disabled) throw new Error("저장 버튼이 비활성화 — 편집 모드 미진입");

  const patchWait = page.waitForResponse(
    (res) => res.request().method() === "PATCH" && res.url().includes("/api/products/"),
    { timeout: 20000 },
  );
  await saveBtn.click();
  const patchRes = await patchWait;
  const patchBody = await patchRes.text();
  console.log("[verify] PATCH status=", patchRes.status(), "body=", patchBody);

  await page.waitForTimeout(800);
  const toastOk = page.getByText("수정 내용이 저장됐습니다");
  const okVisible = (await toastOk.count()) > 0;
  console.log("[verify] toast ok=", okVisible);
  console.log("[verify] PATCH responses", JSON.stringify(patchResponses, null, 2));

  if (patchRes.status() !== 200) {
    await page.screenshot({ path: path.join(OUT, "verify-edit-save-fail.png"), fullPage: true });
    throw new Error(`PATCH status ${patchRes.status()}: ${patchBody}`);
  }
  if (!okVisible) {
    console.warn("[verify] toast not visible but PATCH 200 — continue");
  }

  await page.screenshot({ path: path.join(OUT, "verify-edit-save-after.png"), fullPage: false });

  // sessionStorage 비우고 같은 id로 재진입 — DB fallback만 타야 함
  await page.evaluate(() => {
    sessionStorage.removeItem("pagzly-create-result");
    sessionStorage.removeItem("pagzly-create-draft");
  });
  await page.goto(`${BASE_URL}/create/result?id=${productId}`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForSelector('[data-testid="detail-preview"]', { timeout: 30000 });
  await page.waitForTimeout(1500);

  const stillThere = await page.getByText(MARKER).count();
  console.log("[verify] after reload without session, marker count=", stillThere);
  await page.screenshot({
    path: path.join(OUT, "verify-edit-save-reload.png"),
    fullPage: false,
  });

  if (stillThere === 0) {
    throw new Error("새로고침 후 DB에서 수정 텍스트가 사라짐 — 버그 미해결");
  }

  console.log("[verify] PASS — DB persist confirmed");
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
