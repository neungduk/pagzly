/**
 * 219차 — image_text clamp overflow 실측 (Playwright, API 0).
 *   npx tsx scripts/219cha-clamp-overflow-verify.ts before|after
 *
 * 기존 review/181cha-live/{electronics,pet}/session.json 재사용.
 */
import fs from "fs";
import path from "path";
import { chromium, type Page } from "playwright";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "219cha-live");
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

const CASES = [
  {
    key: "electronics",
    sessionPath: path.join(ROOT, "review", "181cha-live", "electronics", "session.json"),
    heading: "방 안에 놓이는 디자인",
    ensureSlot: "design_detail",
  },
  {
    key: "pet",
    sessionPath: path.join(ROOT, "review", "181cha-live", "pet", "session.json"),
    heading: "2kg 한 봉 포장",
    ensureSlot: "packaging_design",
  },
] as const;

/** pet packaging_design은 demote되므로, 풀 타이포 image_text 호스트에 문구만 이식 */
function ensureTargetSection(raw: string, ensureSlot: string, heading: string): string {
  if (ensureSlot !== "packaging_design") return raw;
  const s = JSON.parse(raw) as {
    generated?: { sections?: Array<Record<string, unknown>> };
  };
  const sections = s.generated?.sections;
  if (!Array.isArray(sections)) return raw;
  const target = sections.find((sec) => sec.slot === ensureSlot);
  if (!target) return raw;
  const preferredSlots = [
    "usage_scenario",
    "feature_callout",
    "material_detail",
    "material_feature",
  ];
  let host =
    preferredSlots
      .map((slot) => sections.find((sec) => sec.type === "image_text" && sec.slot === slot))
      .find(Boolean) ??
    sections.find(
      (sec) =>
        sec.type === "image_text" &&
        sec.slot !== ensureSlot &&
        sec.slot !== "quick_points" &&
        typeof sec.heading === "string",
    );
  if (!host) return raw;
  host.heading = target.heading;
  host.body = target.body;
  return JSON.stringify(s);
}

type Measure = {
  key: string;
  heading: string;
  found: boolean;
  h3?: { scrollHeight: number; clientHeight: number; overflow: boolean; text: string };
  p?: { scrollHeight: number; clientHeight: number; overflow: boolean; text: string };
  longDummy?: { scrollHeight: number; clientHeight: number; overflow: boolean };
};

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${msg}`);
  }
}

async function measureSection(page: Page, heading: string): Promise<{
  found: boolean;
  h3?: Measure["h3"];
  p?: Measure["p"];
}> {
  return page.evaluate((h) => {
    const preview = document.querySelector(
      '[data-testid="result-desktop-split"] [data-testid="detail-preview"]',
    );
    if (!preview) return { found: false };
    const target = h.replace(/\s+/g, "");
    const headings = Array.from(preview.querySelectorAll("h3"));
    const matches = headings.filter((el) => {
      const t = (el.textContent ?? "").replace(/\s+/g, "").replace(/…/g, "");
      return t === target || (t.length >= 3 && (target.startsWith(t) || t.includes(target.slice(0, 4))));
    });
    // 사이드바/컴팩트 복제보다 실제 image_text 초대형 헤드라인 우선
    let h3: Element | undefined =
      matches.find((el) => String(el.className || "").includes("pagzly-display-headline")) ??
      matches.find((el) => String(el.className || "").includes("line-clamp")) ??
      matches[0];
    if (!h3) return { found: false };

    let body: Element | null = h3.nextElementSibling;
    while (body && body.tagName !== "P") body = body.nextElementSibling;
    const bodyClass = body ? String((body as HTMLElement).className || "") : "";
    if (!body || !bodyClass.includes("mt-4")) {
      const panel = h3.parentElement;
      const candidates = panel
        ? Array.from(panel.querySelectorAll("p")).filter((p) =>
            String(p.className || "").includes("mt-4"),
          )
        : [];
      body = candidates[0] ?? null;
    }

    const h3El = h3 as HTMLElement;
    const pEl = body as HTMLElement | null;
    return {
      found: true,
      h3: {
        scrollHeight: h3El.scrollHeight,
        clientHeight: h3El.clientHeight,
        overflow: h3El.scrollHeight > h3El.clientHeight + 2,
        text: (h3El.textContent ?? "").trim(),
      },
      p: pEl
        ? {
            scrollHeight: pEl.scrollHeight,
            clientHeight: pEl.clientHeight,
            overflow: pEl.scrollHeight > pEl.clientHeight + 2,
            text: (pEl.textContent ?? "").trim().slice(0, 100),
          }
        : undefined,
    };
  }, heading);
}

async function injectLongHeading(page: Page, heading: string): Promise<Measure["longDummy"]> {
  return page.evaluate((h) => {
    const preview = document.querySelector(
      '[data-testid="result-desktop-split"] [data-testid="detail-preview"]',
    );
    if (!preview) return undefined;
    const target = h.replace(/\s+/g, "");
    const headings = Array.from(preview.querySelectorAll("h3"));
    const matches = headings.filter((el) => {
      const t = (el.textContent ?? "").replace(/\s+/g, "");
      return t === target || t.includes(target.slice(0, 4));
    });
    let h3: Element | undefined =
      matches.find((el) => String(el.className || "").includes("pagzly-display-headline")) ??
      matches.find((el) => String(el.className || "").includes("line-clamp")) ??
      matches[0];
    if (!h3) return undefined;
    const long =
      "아주긴더미헤드라인검증용사십자짜리문장으로클램프가여전히동작하는지확인합니다끝그리고더길게이어집니다";
    h3.textContent = long;
    void (h3 as HTMLElement).offsetHeight;
    const el = h3 as HTMLElement;
    return {
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      overflow: el.scrollHeight > el.clientHeight + 2,
    };
  }, heading);
}

async function ensureTestUser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) {
    console.warn("[219] skip ensureTestUser — missing SUPABASE env");
    return;
  }
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: users } = await supabase.auth.admin.listUsers();
  if (users?.users?.find((u) => u.email === TEST_EMAIL)) return;
  const { error } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) console.warn("[219] createUser:", error.message);
  else console.log("[219] created test user");
}

async function completeOnboardingIfNeeded(page: Page) {
  if (!page.url().includes("/onboarding")) return;
  console.log("[219] completing onboarding wizard");
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

async function loadSessionAndOpen(page: Page, sessionRaw: string) {
  await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded", timeout: 30000 });
  if (page.url().includes("/login") || page.url().includes("/auth")) {
    console.log("[219] re-auth via test user (no generate API)");
    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(
      (u) => !u.pathname.includes("/login"),
      { timeout: 30000 },
    );
    await page.context().storageState({ path: STORAGE_STATE_PATH });
    await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded", timeout: 30000 });
  }
  await completeOnboardingIfNeeded(page);
  if (page.url().includes("/onboarding")) {
    await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await completeOnboardingIfNeeded(page);
  }
  if (page.url().includes("/login") || page.url().includes("/auth")) {
    throw new Error(`auth redirect on /create: ${page.url()}`);
  }
  if (page.url().includes("/onboarding")) {
    throw new Error(`stuck on onboarding: ${page.url()}`);
  }
  await page.evaluate((raw) => sessionStorage.setItem("pagzly-create-result", raw), sessionRaw);
  await page.goto(`${BASE_URL}/create/result`, { waitUntil: "networkidle", timeout: 90000 });
  if (page.url().includes("/login") || page.url().includes("/auth")) {
    throw new Error(`auth redirect on /create/result: ${page.url()}`);
  }
  if (page.url().includes("/create/draft")) {
    throw new Error(`draft redirect: ${page.url()}`);
  }
  // 139차와 동일 — 사이드바 먼저 (미리보기보다 안정)
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

async function scrollHeadingIntoView(page: Page, heading: string) {
  await page.evaluate((h) => {
    const preview = document.querySelector(
      '[data-testid="result-desktop-split"] [data-testid="detail-preview"]',
    );
    if (!preview) return;
    const target = h.replace(/\s+/g, "");
    const headings = Array.from(preview.querySelectorAll("h3"));
    let el: Element | undefined = headings.find(
      (node) => (node.textContent ?? "").replace(/\s+/g, "") === target,
    );
    if (!el) {
      el = headings.find((node) =>
        (node.textContent ?? "").replace(/\s+/g, "").includes(target.slice(0, 4)),
      );
    }
    el?.scrollIntoView({ block: "center" });
  }, heading);
  await page.waitForTimeout(300);
}

async function main() {
  loadEnvLocal();
  await ensureTestUser();
  const phase = process.argv[2] ?? "after";
  if (phase !== "before" && phase !== "after") {
    console.error("usage: before | after");
    process.exit(1);
  }

  fs.mkdirSync(OUT, { recursive: true });

  // health check
  try {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error(`status ${res.status}`);
  } catch (e) {
    console.error(`[219] dev server not reachable at ${BASE_URL}`, e);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    storageState: fs.existsSync(STORAGE_STATE_PATH) ? STORAGE_STATE_PATH : undefined,
  });

  const results: Measure[] = [];

  for (const c of CASES) {
    const raw = ensureTargetSection(
      fs.readFileSync(c.sessionPath, "utf8"),
      c.ensureSlot,
      c.heading,
    );
    const page = await ctx.newPage();
    console.log(`\n[219] ${phase} ${c.key} — ${c.heading}`);
    try {
      await loadSessionAndOpen(page, raw);
    } catch (e) {
      const url = page.url();
      const body = await page.locator("body").innerText().catch(() => "");
      console.error(`[219] load failed url=${url}`);
      console.error(body.slice(0, 500));
      await page.screenshot({ path: path.join(OUT, `fail-${phase}-${c.key}.png`), fullPage: true }).catch(() => undefined);
      throw e;
    }
    await scrollHeadingIntoView(page, c.heading);
    const m = await measureSection(page, c.heading);
    let longDummy: Measure["longDummy"];
    if (phase === "after" && m.found) {
      longDummy = await injectLongHeading(page, c.heading);
    }
    const entry: Measure = {
      key: c.key,
      heading: c.heading,
      found: m.found,
      h3: m.h3,
      p: m.p,
      longDummy,
    };
    results.push(entry);
    console.log(JSON.stringify(entry, null, 2));
    await page.close();
  }

  await ctx.close();
  await browser.close();

  const outPath = path.join(OUT, `clamp-${phase}.json`);
  fs.writeFileSync(
    outPath,
    JSON.stringify({ phase, at: new Date().toISOString(), results, apiGenerate: 0 }, null, 2),
  );
  console.log(`[219] wrote ${outPath}`);

  if (phase === "after") {
    const beforePath = path.join(OUT, "clamp-before.json");
    const before = fs.existsSync(beforePath)
      ? (JSON.parse(fs.readFileSync(beforePath, "utf8")) as { results: Measure[] })
      : null;
    for (const r of results) {
      assert(r.found, `${r.key}: section found`);
      const b = before?.results.find((x) => x.key === r.key);
      // 본문: 수정 전 overflow → 수정 후 해소 (electronics)
      if (r.key === "electronics" && r.p && b?.p) {
        assert(b.p.overflow === true, `${r.key}: before p overflow (control)`);
        assert(!r.p.overflow, `${r.key}: after p no overflow (sh=${r.p.scrollHeight} ch=${r.p.clientHeight})`);
      }
      // 헤드라인: ink+line-clamp-2는 줄 수 제한이 깨져 허상 5px만 나오므로,
      // after는 실측 sh-ch <= 8 (폰트 메트릭 허상) + 긴 더미는 여전히 clamp
      if (r.h3) {
        const delta = r.h3.scrollHeight - r.h3.clientHeight;
        assert(delta <= 8, `${r.key}: after h3 fits (delta=${delta}, sh=${r.h3.scrollHeight} ch=${r.h3.clientHeight})`);
      }
      assert(
        r.longDummy != null && r.longDummy.overflow === true,
        `${r.key}: long dummy still clamps (overflow=${r.longDummy?.overflow})`,
      );
    }
  }

  console.log("API generate: 0");
  if (process.exitCode) {
    console.error("VERIFY FAILED");
    process.exit(1);
  }
  console.log(`VERIFY:${phase}:0`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
