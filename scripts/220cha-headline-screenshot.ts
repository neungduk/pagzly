/**
 * 220차 — image_text 헤드라인 스크린샷만 (코드 변경 없음, API 0).
 *   npx tsx scripts/220cha-headline-screenshot.ts
 */
import fs from "fs";
import path from "path";
import { chromium, type Page } from "playwright";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "220cha-headline-check");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const TEST_EMAIL = "pagelab-test@test.local";
const TEST_PASSWORD = "TestPass1234!";

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    let val = m[2]!.trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]!]) process.env[m[1]!] = val;
  }
}

/** pet packaging_design demote 대응 — 219와 동일 (fixture 파일 불변) */
function ensurePetPackagingVisible(raw: string): string {
  const s = JSON.parse(raw) as {
    generated?: { sections?: Array<Record<string, unknown>> };
  };
  const sections = s.generated?.sections;
  if (!Array.isArray(sections)) return raw;
  const target = sections.find((sec) => sec.slot === "packaging_design");
  if (!target) return raw;
  const preferredSlots = [
    "usage_scenario",
    "feature_callout",
    "material_detail",
    "material_feature",
  ];
  const host =
    preferredSlots
      .map((slot) => sections.find((sec) => sec.type === "image_text" && sec.slot === slot))
      .find(Boolean) ??
    sections.find(
      (sec) =>
        sec.type === "image_text" &&
        sec.slot !== "packaging_design" &&
        sec.slot !== "quick_points",
    );
  if (!host) return raw;
  host.heading = target.heading;
  host.body = target.body;
  return JSON.stringify(s);
}

async function ensureTestUser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) return;
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: users } = await supabase.auth.admin.listUsers();
  if (users?.users?.find((u) => u.email === TEST_EMAIL)) return;
  await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
}

async function completeOnboardingIfNeeded(page: Page) {
  if (!page.url().includes("/onboarding")) return;
  await page.getByLabel("자사 브랜드 운영").click();
  const store = page.locator("#storeUrl");
  if (await store.count()) {
    await store.fill("https://smartstore.naver.com/pagzly-test");
  }
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByLabel("2~4개").click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByLabel("구글검색").click();
  await page.getByRole("button", { name: "시작하기" }).click();
  await page.waitForURL((u) => u.pathname.includes("/create"), { timeout: 30000 });
  await page.context().storageState({ path: STORAGE_STATE_PATH });
}

async function loadSession(page: Page, sessionRaw: string) {
  await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded", timeout: 30000 });
  if (page.url().includes("/login") || page.url().includes("/auth")) {
    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 30000 });
    await page.context().storageState({ path: STORAGE_STATE_PATH });
    await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded", timeout: 30000 });
  }
  await completeOnboardingIfNeeded(page);
  await page.evaluate((raw) => sessionStorage.setItem("pagzly-create-result", raw), sessionRaw);
  await page.goto(`${BASE_URL}/create/result`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForSelector('[data-testid="desktop-structure-sidebar"]', { timeout: 60000 });
  await page.waitForSelector('[data-testid="detail-preview"]', { timeout: 30000 });
  const expand = page
    .locator('[data-testid="result-desktop-split"] [data-testid="detail-preview-expand"]')
    .first();
  if (await expand.count()) {
    await expand.click();
    await page.waitForTimeout(400);
  }
  await page.addStyleTag({
    content: "*,*::before,*::after{animation:none!important;transition:none!important}",
  });
}

async function findHeadline(page: Page, heading: string) {
  return page.evaluate((h) => {
    const preview = document.querySelector(
      '[data-testid="result-desktop-split"] [data-testid="detail-preview"]',
    );
    if (!preview) return null;
    const target = h.replace(/\s+/g, "");
    const headings = Array.from(preview.querySelectorAll("h3"));
    const matches = headings.filter((el) => {
      const t = (el.textContent ?? "").replace(/\s+/g, "");
      return t === target || t.includes(target.slice(0, 4));
    });
    const h3 =
      matches.find((el) => String(el.className || "").includes("pagzly-display-headline")) ??
      matches.find((el) => String(el.className || "").includes("line-clamp")) ??
      matches[0];
    if (!h3) return null;
    const section = h3.closest("section");
    return {
      found: true,
      text: (h3.textContent ?? "").trim(),
      className: String(h3.className),
      hasSection: Boolean(section),
    };
  }, heading);
}

async function screenshotSection(page: Page, heading: string, outPath: string) {
  await page.evaluate((h) => {
    const preview = document.querySelector(
      '[data-testid="result-desktop-split"] [data-testid="detail-preview"]',
    );
    if (!preview) return;
    const target = h.replace(/\s+/g, "");
    const headings = Array.from(preview.querySelectorAll("h3"));
    const matches = headings.filter((el) => {
      const t = (el.textContent ?? "").replace(/\s+/g, "");
      return t === target || t.includes(target.slice(0, 4));
    });
    const h3 =
      matches.find((el) => String(el.className || "").includes("pagzly-display-headline")) ??
      matches.find((el) => String(el.className || "").includes("line-clamp")) ??
      matches[0];
    const section = h3?.closest("section") ?? h3;
    section?.scrollIntoView({ block: "center" });
  }, heading);
  await page.waitForTimeout(400);

  const box = await page.evaluate((h) => {
    const preview = document.querySelector(
      '[data-testid="result-desktop-split"] [data-testid="detail-preview"]',
    ) as HTMLElement | null;
    if (!preview) return null;
    const target = h.replace(/\s+/g, "");
    const headings = Array.from(preview.querySelectorAll("h3"));
    const matches = headings.filter((el) => {
      const t = (el.textContent ?? "").replace(/\s+/g, "");
      return t === target || t.includes(target.slice(0, 4));
    });
    const h3 =
      matches.find((el) => String(el.className || "").includes("pagzly-display-headline")) ??
      matches.find((el) => String(el.className || "").includes("line-clamp")) ??
      matches[0];
    const section = (h3?.closest("section") as HTMLElement | null) ?? (h3 as HTMLElement | null);
    if (!section) return null;
    const pr = preview.getBoundingClientRect();
    const sr = section.getBoundingClientRect();
    return {
      x: Math.max(0, sr.x - pr.x),
      y: Math.max(0, sr.y - pr.y),
      width: Math.min(sr.width, pr.width),
      height: Math.min(sr.height, preview.clientHeight),
    };
  }, heading);

  const preview = page.locator(
    '[data-testid="result-desktop-split"] [data-testid="detail-preview"]',
  );
  // Locator.screenshot에는 clip이 없음 → 섹션 마크 후 element 캡처
  const marked = await page.evaluate((heading) => {
    const previewEl = document.querySelector(
      '[data-testid="result-desktop-split"] [data-testid="detail-preview"]',
    );
    if (!previewEl) return false;
    const needle = heading.replace(/\s+/g, "");
    const matches = Array.from(previewEl.querySelectorAll("h3")).filter((el) => {
      const t = (el.textContent || "").replace(/\s+/g, "");
      return t.includes(needle.slice(0, 6)) || t === needle || t.includes("아주긴더미");
    });
    const h3 =
      matches.find((el) => String(el.className || "").includes("pagzly-display-headline")) ??
      matches[0];
    const section = h3?.closest("section");
    if (!section) return false;
    section.setAttribute("data-220-shot", "1");
    return true;
  }, heading);
  if (marked) {
    await page.locator('[data-220-shot="1"]').first().screenshot({ path: outPath });
    await page.evaluate(() => {
      document.querySelectorAll("[data-220-shot]").forEach((el) => el.removeAttribute("data-220-shot"));
    });
  } else if (box && box.width > 40 && box.height > 40) {
    await page.screenshot({
      path: outPath,
      clip: {
        x: box.x,
        y: Math.max(0, box.y),
        width: box.width,
        height: Math.min(box.height, 900),
      },
    });
  } else {
    await preview.screenshot({ path: outPath });
  }
  console.log(`[220] saved ${outPath}`);
}

async function main() {
  loadEnvLocal();
  await ensureTestUser();
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    storageState: fs.existsSync(STORAGE_STATE_PATH) ? STORAGE_STATE_PATH : undefined,
  });

  // 1) electronics design_detail
  {
    const page = await ctx.newPage();
    const raw = fs.readFileSync(
      path.join(ROOT, "review", "181cha-live", "electronics", "session.json"),
      "utf8",
    );
    await loadSession(page, raw);
    const info = await findHeadline(page, "방 안에 놓이는 디자인");
    console.log("[220] electronics", JSON.stringify(info));
    if (!info?.found) throw new Error("electronics heading not found");
    await screenshotSection(
      page,
      "방 안에 놓이는 디자인",
      path.join(OUT, "electronics-design-detail.png"),
    );
    await page.close();
  }

  // 2) pet packaging_design
  {
    const page = await ctx.newPage();
    const raw = ensurePetPackagingVisible(
      fs.readFileSync(path.join(ROOT, "review", "181cha-live", "pet", "session.json"), "utf8"),
    );
    await loadSession(page, raw);
    const info = await findHeadline(page, "2kg 한 봉 포장");
    console.log("[220] pet", JSON.stringify(info));
    if (!info?.found) throw new Error("pet heading not found");
    await screenshotSection(
      page,
      "2kg 한 봉 포장",
      path.join(OUT, "pet-packaging-design.png"),
    );
    await page.close();
  }

  // 3) optional long dummy on electronics
  {
    const page = await ctx.newPage();
    const raw = fs.readFileSync(
      path.join(ROOT, "review", "181cha-live", "electronics", "session.json"),
      "utf8",
    );
    await loadSession(page, raw);
    await page.evaluate(() => {
      const preview = document.querySelector(
        '[data-testid="result-desktop-split"] [data-testid="detail-preview"]',
      );
      if (!preview) return;
      const h3 = Array.from(preview.querySelectorAll("h3")).find((el) =>
        String(el.className || "").includes("pagzly-display-headline") &&
        (el.textContent || "").includes("방"),
      );
      if (!h3) return;
      h3.textContent =
        "아주긴더미헤드라인검증용사십자짜리문장으로클램프가여전히동작하는지확인합니다끝그리고더길게이어집니다";
      void (h3 as HTMLElement).offsetHeight;
      h3.closest("section")?.scrollIntoView({ block: "center" });
    });
    await page.waitForTimeout(400);
    await screenshotSection(
      page,
      "아주긴더미헤드라인검증용사십자짜리문장으로클램프가여전히동작하는지확인합니다끝그리고더길게이어집니다",
      path.join(OUT, "electronics-long-dummy.png"),
    );
    await page.close();
  }

  await ctx.close();
  await browser.close();
  console.log("API generate: 0");
  console.log("code changes: 0");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
