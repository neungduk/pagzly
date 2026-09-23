/**
 * 221차 — break-words 적용 후 더미 헤드라인 스크린샷 (API 0).
 *   npx tsx scripts/221cha-headline-screenshot.ts
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { chromium, type Page } from "playwright";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "221cha-headline-check");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const TEST_EMAIL = "pagelab-test@test.local";
const TEST_PASSWORD = "TestPass1234!";
const LONG_DUMMY =
  "아주긴더미헤드라인검증용사십자짜리문장으로클램프가여전히동작하는지확인합니다끝그리고더길게이어집니다";

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

async function completeOnboardingIfNeeded(page: Page) {
  if (!page.url().includes("/onboarding")) return;
  await page.getByLabel("자사 브랜드 운영").click();
  const store = page.locator("#storeUrl");
  if (await store.count()) await store.fill("https://smartstore.naver.com/pagzly-test");
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
  await page.waitForSelector('[data-testid="detail-preview"]', { timeout: 60000 });
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

async function screenshotHeadingSection(page: Page, headingNeedle: string, outPath: string) {
  await page.evaluate((needle) => {
    const preview = document.querySelector(
      '[data-testid="result-desktop-split"] [data-testid="detail-preview"]',
    );
    if (!preview) return;
    const n = needle.replace(/\s+/g, "");
    const matches = Array.from(preview.querySelectorAll("h3")).filter((el) => {
      const t = (el.textContent || "").replace(/\s+/g, "");
      return t === n || t.includes(n.slice(0, 4)) || t.includes("아주긴더미");
    });
    const h3 =
      matches.find((el) => String(el.className || "").includes("pagzly-display-headline")) ??
      matches.find((el) => String(el.className || "").includes("line-clamp")) ??
      matches[0];
    const section = h3?.closest("section") as HTMLElement | null;
    if (!section) return;
    section.setAttribute("data-221-shot", "1");
    section.scrollIntoView({ block: "center", inline: "nearest" });
  }, headingNeedle);
  await page.waitForTimeout(500);

  const metrics = await page.evaluate((needle) => {
    const preview = document.querySelector(
      '[data-testid="result-desktop-split"] [data-testid="detail-preview"]',
    ) as HTMLElement | null;
    if (!preview) return null;
    const n = needle.replace(/\s+/g, "");
    const matches = Array.from(preview.querySelectorAll("h3")).filter((el) => {
      const t = (el.textContent || "").replace(/\s+/g, "");
      return t === n || t.includes(n.slice(0, 4)) || t.includes("아주긴더미");
    });
    const h3 = (
      matches.find((el) => String(el.className || "").includes("pagzly-display-headline")) ??
      matches.find((el) => String(el.className || "").includes("line-clamp")) ??
      matches[0]
    ) as HTMLElement | undefined;
    if (!h3) return null;
    const section = (h3.closest("section") as HTMLElement | null) ?? h3;
    section.scrollIntoView({ block: "center", inline: "nearest" });
    const pr = preview.getBoundingClientRect();
    const hr = h3.getBoundingClientRect();
    const sr = section.getBoundingClientRect();
    return {
      className: String(h3.className),
      text: (h3.textContent || "").trim().slice(0, 80),
      overflowX: hr.right > pr.right + 2,
      hRight: hr.right,
      previewRight: pr.right,
      sh: h3.scrollHeight,
      ch: h3.clientHeight,
      // expand 후 preview 전체 비트맵 기준 crop 좌표
      clip: {
        x: Math.max(0, Math.round(sr.x - pr.x)),
        y: Math.max(0, Math.round(sr.y - pr.y)),
        width: Math.max(1, Math.round(Math.min(sr.width, pr.width))),
        height: Math.max(1, Math.round(Math.min(sr.height, 900))),
      },
    };
  }, headingNeedle);

  console.log("[221]", JSON.stringify(metrics));

  const preview = page.locator(
    '[data-testid="result-desktop-split"] [data-testid="detail-preview"]',
  );
  const handle = await preview.elementHandle();
  const tmpFull = outPath.replace(/\.png$/i, ".full.png");
  if (handle) {
    await handle.screenshot({ path: tmpFull, animations: "disabled" });
  } else {
    await preview.screenshot({ path: tmpFull, animations: "disabled" });
  }

  if (metrics?.clip && fs.existsSync(tmpFull)) {
    const meta = await sharp(tmpFull).metadata();
    const imgW = meta.width ?? 0;
    const imgH = meta.height ?? 0;
    const left = Math.min(metrics.clip.x, Math.max(0, imgW - 1));
    const top = Math.min(metrics.clip.y, Math.max(0, imgH - 1));
    const width = Math.min(metrics.clip.width, imgW - left);
    const height = Math.min(metrics.clip.height, imgH - top);
    if (width > 40 && height > 40) {
      await sharp(tmpFull).extract({ left, top, width, height }).png().toFile(outPath);
    } else {
      fs.copyFileSync(tmpFull, outPath);
    }
    fs.unlinkSync(tmpFull);
  } else if (fs.existsSync(tmpFull)) {
    fs.renameSync(tmpFull, outPath);
  }

  await page.evaluate(() => {
    document.querySelectorAll("[data-221-shot]").forEach((el) => el.removeAttribute("data-221-shot"));
  });
  console.log(`[221] saved ${outPath}`);
  return metrics;
}


async function main() {
  loadEnvLocal();
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    storageState: fs.existsSync(STORAGE_STATE_PATH) ? STORAGE_STATE_PATH : undefined,
  });

  // long dummy after
  {
    const page = await ctx.newPage();
    const raw = fs.readFileSync(
      path.join(ROOT, "review", "181cha-live", "electronics", "session.json"),
      "utf8",
    );
    await loadSession(page, raw);
    await page.evaluate((long) => {
      const preview = document.querySelector(
        '[data-testid="result-desktop-split"] [data-testid="detail-preview"]',
      );
      if (!preview) return;
      const h3 = Array.from(preview.querySelectorAll("h3")).find(
        (el) =>
          String(el.className || "").includes("pagzly-display-headline") &&
          (el.textContent || "").includes("방"),
      );
      if (!h3) return;
      h3.textContent = long;
      void (h3 as HTMLElement).offsetHeight;
    }, LONG_DUMMY);
    await page.waitForTimeout(300);
    const m = await screenshotHeadingSection(
      page,
      LONG_DUMMY,
      path.join(OUT, "electronics-long-dummy-after.png"),
    );
    if (m?.overflowX) {
      console.error("FAIL: long dummy still overflows viewport horizontally");
      process.exitCode = 1;
    } else {
      console.log("ok: long dummy no horizontal overflow");
    }
    await page.close();
  }

  // optional regressions
  {
    const page = await ctx.newPage();
    await loadSession(
      page,
      fs.readFileSync(
        path.join(ROOT, "review", "181cha-live", "electronics", "session.json"),
        "utf8",
      ),
    );
    await screenshotHeadingSection(
      page,
      "방 안에 놓이는 디자인",
      path.join(OUT, "electronics-design-detail.png"),
    );
    await page.close();
  }
  {
    const page = await ctx.newPage();
    await loadSession(
      page,
      ensurePetPackagingVisible(
        fs.readFileSync(path.join(ROOT, "review", "181cha-live", "pet", "session.json"), "utf8"),
      ),
    );
    await screenshotHeadingSection(
      page,
      "2kg 한 봉 포장",
      path.join(OUT, "pet-packaging-design.png"),
    );
    await page.close();
  }

  await ctx.close();
  await browser.close();
  console.log("API generate: 0");
  if (process.exitCode) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
