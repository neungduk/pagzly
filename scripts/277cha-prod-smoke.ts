/**
 * 277차 — 프로덕션(pagzly.com) 스모크 테스트, 실사용자 플로우 정확히 1건 (유료).
 *   npx tsx scripts/277cha-prod-smoke.ts
 *
 * 181차 live-generate(beauty) 플로우를 프로덕션 URL로. 재시도 없음.
 * 재실행 방지: review/277cha-live/.ran 잠금 파일이 있으면 브라우저 열기 전에 중단.
 * 로그인: 브라우저 창을 띄워 사용자가 직접 로그인하면 같은 창에서 이어서 진행.
 */
import { chromium, type Page } from "playwright";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { freezeDetailScrollReveal } from "./capture-utils";
import { screenshotFullPageSafe } from "./lib/neutralize-sticky";

const ROOT = path.join(__dirname, "..");
const BASE_URL = "https://www.pagzly.com";
const OUT = path.join(ROOT, "review", process.env.SMOKE_OUT_DIR ?? "277cha-live");
const maskSupabase = (s: string) => s.replace(/https?:\/\/[a-z0-9-]+\.supabase\.co/gi, "https://<supabase>");
const LOCK = path.join(OUT, ".ran");
const ASSET_DIR = path.join(__dirname, "test-assets", "_181cha-live");
const REVIEW_FILE = path.join(ROOT, "public", "_verify146", "reviews_148cha.txt");
const CASE = {
  categoryLabel: "화장품/뷰티",
  productName: "AURA LAB 나이아신아마이드 5% 세럼",
  brand: "AURA LAB",
  price: "28000",
  keyFeatures:
    "나이아신아마이드 5%, 히알루론산, 판테놀. 비교축: 수분감·흡수속도·끈적임·자극도. 민감피부 추천. 이런 분께 추천: 속건조·톤케어. 확인 후 구매: 레티놀과 동시 사용 시 자극 가능.",
  ingredients:
    "Water, Niacinamide 5%, Sodium Hyaluronate, Panthenol, Glycerin, 1,2-Hexanediol. 전성분 표기 있음.",
  certifications: "화장품책임판매업, 동물실험 없음, 피부자극 테스트 완료(자체, n=32)",
  target: "속건조·톤케어 고민 20~30대 민감피부",
};

const log: string[] = [];
const t0 = Date.now();
function note(msg: string) {
  const line = `[${((Date.now() - t0) / 1000).toFixed(1)}s] ${msg}`;
  log.push(line);
  console.log(line);
}

async function fillIfExists(page: Page, selector: string, value: string) {
  const loc = page.locator(selector).first();
  if ((await loc.count()) === 0) return;
  if (!(await loc.isVisible().catch(() => false))) return;
  if ((await loc.evaluate((el) => el.tagName)) === "SELECT") return;
  await loc.fill(value);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (fs.existsSync(LOCK)) throw new Error(`이미 1회 실행됨(${LOCK}) — 재실행 금지`);
  const images = fs
    .readdirSync(ASSET_DIR)
    .filter((f) => f.startsWith("beauty-"))
    .map((f) => path.join(ASSET_DIR, f))
    .slice(0, 7);
  if (images.length < 3) throw new Error(`beauty 이미지 부족: ${images.length}`);

  note(`start base=${BASE_URL} images=${images.length}`);

  // 창을 띄워 사용자가 직접 로그인 → 같은 컨텍스트로 이어서 진행 (세션은 파일로 저장하지 않음)
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(180_000);

  const apiLog: string[] = [];
  const serverErrors: string[] = [];
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  let generateHits = 0;
  page.on("request", (req) => {
    if (req.method() === "POST" && /\/api\/generate(\?|$)/.test(req.url())) generateHits += 1;
  });
  page.on("response", (res) => {
    const u = res.url();
    if (!u.includes("pagzly.com")) return;
    if (u.includes("/api/")) apiLog.push(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${res.status()} ${res.request().method()} ${u.replace(BASE_URL, "")}`);
    if (res.status() >= 500) serverErrors.push(`${res.status()} ${res.request().method()} ${u}`);
  });
  const failedRequests: string[] = [];
  page.on("requestfailed", (req) =>
    failedRequests.push(maskSupabase(`${req.failure()?.errorText ?? "?"} ${req.method()} ${req.url().slice(0, 200)}`)),
  );
  page.on("pageerror", (err) => pageErrors.push(maskSupabase(err.message.slice(0, 400))));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(maskSupabase(msg.text().slice(0, 400)));
  });

  const readBalance = () =>
    page
      .evaluate(async () => {
        const r = await fetch("/api/billing/me");
        if (!r.ok) return null;
        const j = (await r.json()) as { balance?: number };
        return typeof j.balance === "number" ? j.balance : null;
      })
      .catch(() => null);
  let balanceBefore: number | null = null;

  const finish = async (status: string, extra: Record<string, unknown> = {}) => {
    const balanceAfter = await readBalance();
    const summary = {
      status,
      balanceBefore,
      balanceAfter,
      baseUrl: BASE_URL,
      finalUrl: page.url(),
      elapsedSec: +((Date.now() - t0) / 1000).toFixed(1),
      generateHits,
      serverErrors,
      pageErrors,
      failedRequests: failedRequests.slice(0, 40),
      consoleErrors: consoleErrors.slice(0, 30),
      apiLog,
      ...extra,
    };
    fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
    fs.writeFileSync(path.join(OUT, "run-log.txt"), log.join("\n") + "\n");
    console.log(JSON.stringify(summary, null, 2));
    await browser.close();
  };

  try {
    await page.goto(`${BASE_URL}/create/detail`, { waitUntil: "networkidle" });
    if (/\/login|\/auth/.test(page.url())) {
      note("로그인 대기 — 열린 브라우저 창에서 직접 로그인 (최대 15분)");
      await page.bringToFront();
      try {
        await page.waitForURL((u) => !/\/login|\/auth|\/signup|\/forgot-password|\/reset-password/.test(u.pathname), { timeout: 900_000 });
      } catch {
        await finish("blocked-auth");
        return;
      }
      note(`로그인 감지 ${page.url()}`);
      await page.goto(`${BASE_URL}/create/detail`, { waitUntil: "networkidle" });
      if (/\/login|\/auth/.test(page.url())) {
        await finish("blocked-auth");
        return;
      }
    }
    if (!/\/create\/detail/.test(page.url())) {
      note(`폼 대기 — 온보딩 등을 마치고 /create/detail 로 이동 (최대 15분) 현재 ${page.url()}`);
      await page.waitForURL(/\/create\/detail/, { timeout: 900_000 });
    }
    note(`form loaded ${page.url()}`);
    await page.waitForSelector("select", { timeout: 60_000 });
    const catSelect = page.locator("select").first();
    const labels = await catSelect.locator("option").allTextContents();
    const match = labels.find((l) => l.includes("화장품") || l.includes("뷰티"));
    if (!match) throw new Error(`category not found: ${labels.join("|")}`);
    await catSelect.selectOption({ label: match });

    await page.locator('input[type="file"][accept*="image"]').first().setInputFiles(images);
    await page.waitForTimeout(1500);
    await page.fill("#productName", CASE.productName);
    await fillIfExists(page, "#brandName", CASE.brand);
    await page.fill("#price", CASE.price);
    await fillIfExists(page, "#targetCustomer", CASE.target);
    await fillIfExists(page, "#keyFeatures", CASE.keyFeatures);
    await fillIfExists(page, "#ingredients", CASE.ingredients);
    await fillIfExists(page, "#certifications", CASE.certifications);
    if (fs.existsSync(REVIEW_FILE)) {
      const rev = page.locator("#reviewFile");
      if (await rev.count()) await rev.setInputFiles(REVIEW_FILE);
    }
    await page.screenshot({ path: path.join(OUT, "00-input.png"), fullPage: true });

    const submit = page.getByRole("button", { name: /AI 상세페이지 생성하기/ });
    await submit.scrollIntoViewIfNeeded();
    balanceBefore = await readBalance();
    note(`balance before=${balanceBefore}`);
    fs.writeFileSync(LOCK, new Date().toISOString());
    await submit.click({ force: true });
    note("submitted — waiting draft");
    try {
      await page.waitForURL(/\/create\/draft/, { timeout: 480_000 });
    } catch {
      await page.screenshot({ path: path.join(OUT, "00-stuck.png"), fullPage: true });
      const body = await page.locator("body").innerText().catch(() => "");
      await finish("stuck-before-draft", { bodyExcerpt: body.slice(0, 3000) });
      return;
    }
    note("draft reached");
    await page.screenshot({ path: path.join(OUT, "01-draft.png"), fullPage: true });

    await page.getByRole("button", { name: /승인하고 최종 생성/ }).click();
    note("approved draft");
    try {
      const picker = page.locator('[data-testid="backdrop-picker"]');
      await picker.waitFor({ state: "visible", timeout: 420_000 });
      note("backdrop picker shown");
      const c0 = page.locator('[data-testid="backdrop-candidate-0"]');
      if (await c0.count()) await c0.click();
      await page.locator('[data-testid="backdrop-confirm"]').click();
    } catch {
      note("no backdrop picker");
    }
    try {
      const cont = page.getByRole("button", { name: /이대로 최종 생성|이대로 진행|원본.*진행|원본으로/ });
      await cont.waitFor({ state: "visible", timeout: 90_000 });
      note("backdrop failed → continue with originals");
      await cont.click();
    } catch {
      // 자동 진행
    }

    try {
      await page.waitForURL(/\/create\/result/, { timeout: 600_000 });
    } catch {
      await page.screenshot({ path: path.join(OUT, "02-stuck.png"), fullPage: true });
      const body = await page.locator("body").innerText().catch(() => "");
      await finish("stuck-before-result", { bodyExcerpt: body.slice(0, 3000) });
      return;
    }
    note("result reached");
    await page.waitForTimeout(3000);
    await freezeDetailScrollReveal(page).catch(() => undefined);

    const sessionRaw = await page.evaluate(() => sessionStorage.getItem("pagzly-create-result"));
    if (sessionRaw) fs.writeFileSync(path.join(OUT, "session.json"), sessionRaw, "utf8");
    const session = sessionRaw
      ? (JSON.parse(sessionRaw) as {
          generated?: { sections?: Array<{ type: string }> };
          generationCost?: number;
          photoProcessingCost?: number;
        })
      : {};
    const sectionTypes = (session.generated?.sections ?? []).map((s) => s.type);

    await page.locator('[data-testid="detail-preview"]').first().waitFor({ state: "visible", timeout: 45_000 });
    await page.screenshot({ path: path.join(OUT, "03-result-desktop.png") });

    const previewImages = await page.evaluate(() => {
      const root = [...document.querySelectorAll<HTMLElement>('[data-testid="detail-preview"]')].find(
        (n) => n.getBoundingClientRect().width >= 40,
      );
      const imgs = root ? [...root.querySelectorAll("img")] : [];
      return {
        total: imgs.length,
        broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src.slice(0, 160)),
      };
    });
    const fonts = await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts].map((f) => `${f.family}:${f.status}`).filter((v, i, a) => a.indexOf(v) === i);
    });
    note(`images total=${previewImages.total} broken=${previewImages.broken.length}`);

    // PNG 다운로드 (lib/capture-detail-png.ts)
    let download: Record<string, unknown> = { attempted: false };
    const downloadBtn = page.getByRole("button", { name: /이미지로 다운로드|다운로드 준비/ });
    if (await downloadBtn.count()) {
      const dlPromise = page.waitForEvent("download", { timeout: 180_000 }).catch((e: Error) => e);
      const dlStart = Date.now();
      await downloadBtn.first().click();
      const dl = await dlPromise;
      if (dl instanceof Error) {
        download = { attempted: true, ok: false, error: dl.message };
      } else {
        const file = path.join(OUT, "download.png");
        await dl.saveAs(file);
        const meta = await sharp(file, { limitInputPixels: false }).metadata();
        download = {
          attempted: true,
          ok: true,
          suggestedName: dl.suggestedFilename(),
          bytes: fs.statSync(file).size,
          width: meta.width,
          height: meta.height,
          sec: +((Date.now() - dlStart) / 1000).toFixed(1),
        };
      }
      note(`download ${JSON.stringify(download)}`);
    }

    // 풀페이지 — 모바일 폭에서 sticky 무력화 후 스크롤 스티치
    await page.setViewportSize({ width: 430, height: 900 });
    await page.waitForTimeout(1500);
    await freezeDetailScrollReveal(page).catch(() => undefined);
    await screenshotFullPageSafe(page, { path: path.join(OUT, "04-fullpage-mobile.png") });
    note("fullpage captured");

    await finish("ok", {
      sectionTypes,
      generationCost: session.generationCost ?? null,
      photoProcessingCost: session.photoProcessingCost ?? null,
      images: previewImages,
      fonts,
      download,
    });
  } catch (err) {
    await page.screenshot({ path: path.join(OUT, "99-error.png"), fullPage: true }).catch(() => undefined);
    await finish("error", { error: err instanceof Error ? `${err.message}\n${err.stack}` : String(err) });
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
