/**
 * 168차 — living 실사 1건: productHeightCm 손 합성 클램프 + tradeoff_card 채움.
 *
 *   npx tsx scripts/168cha-live-living.ts
 *
 * 필요: dev 서버 :3000, scripts/auth-state.json, PEXELS_API_KEY
 */
import { chromium, type Page } from "playwright";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { freezeDetailScrollReveal } from "./capture-utils";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const OUT_DIR = path.join(ROOT, "review", "168cha-live-living");
const ASSET_DIR = path.join(__dirname, "test-assets", "_168cha-living");

function loadEnvLocal(): Record<string, string> {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]!] = m[2]!.trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

async function crawlPexels(apiKey: string, query: string, need: number, prefix: string): Promise<string[]> {
  fs.mkdirSync(ASSET_DIR, { recursive: true });
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(Math.max(need, 6)));
  url.searchParams.set("orientation", "portrait");
  const res = await fetch(url.toString(), { headers: { Authorization: apiKey } });
  if (!res.ok) throw new Error(`Pexels ${res.status}`);
  const data = (await res.json()) as {
    photos: Array<{ id: number; src: { large2x: string; large: string } }>;
  };
  const files: string[] = [];
  for (const photo of data.photos) {
    if (files.length >= need) break;
    const imgRes = await fetch(photo.src.large2x || photo.src.large);
    if (!imgRes.ok) continue;
    const jpegBuf = await sharp(Buffer.from(await imgRes.arrayBuffer()))
      .jpeg({ quality: 90 })
      .toBuffer();
    const file = path.join(ASSET_DIR, `${prefix}-${photo.id}.jpeg`);
    fs.writeFileSync(file, jpegBuf);
    files.push(file);
  }
  if (files.length < need) throw new Error(`${prefix}: need ${need}, got ${files.length}`);
  return files;
}

async function fillIfExists(page: Page, selector: string, value: string) {
  const loc = page.locator(selector).first();
  if ((await loc.count()) === 0) return;
  if (!(await loc.isVisible().catch(() => false))) return;
  const tag = await loc.evaluate((el) => el.tagName.toLowerCase());
  if (tag === "select") {
    const opts = await loc.locator("option").allTextContents();
    const match = opts.find((o) => value.split(/[\s·,/]/).some((p) => p.length > 1 && o.includes(p)));
    if (match) await loc.selectOption({ label: match });
    else if (opts.length > 1) await loc.selectOption({ index: 1 });
    return;
  }
  await loc.fill(value);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const env = loadEnvLocal();
  for (const [k, v] of Object.entries(env)) {
    if (!process.env[k]) process.env[k] = v;
  }
  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    throw new Error("scripts/auth-state.json 없음 — npx tsx scripts/save-login-state.ts");
  }
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) throw new Error("PEXELS_API_KEY 필요");

  console.log("[168] crawl product + hand lifestyle…");
  const productImages = await crawlPexels(
    apiKey,
    "ceramic mug product photography white background",
    8,
    "mug",
  );
  const lifestyleImages = await crawlPexels(
    apiKey,
    "hand holding ceramic mug lifestyle",
    1,
    "hand",
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(180_000);

  const logs: string[] = [];
  page.on("console", (msg) => {
    const t = msg.text();
    if (
      /lifestyle-composite|canvas-overflow|physical.scale|tradeoff|direct-paste|error|Error/i.test(
        t,
      )
    ) {
      console.log(`[browser] ${t.slice(0, 300)}`);
      logs.push(t);
    }
  });

  await page.goto(`${BASE_URL}/create/detail`, { waitUntil: "networkidle" });
  // 로그인 리다이렉트면 중단
  if (page.url().includes("/login") || page.url().includes("/auth")) {
    throw new Error(`auth expired — url=${page.url()}`);
  }
  await page.waitForSelector("select", { timeout: 60_000 });

  await page.locator("select").first().selectOption({ label: "생활용품" });
  await page.setInputFiles('input[type="file"][accept*="image/jpeg"]', productImages);
  await page.setInputFiles("#lifestyleImage", lifestyleImages);
  await page.fill("#productName", "플레인 세라믹 머그 350");
  await fillIfExists(page, "#brandName", "PLAIN HOME");
  await page.fill("#price", "24000");
  await fillIfExists(
    page,
    "#targetCustomer",
    "미니멀 테이블웨어를 선호하는 1~2인 가구, 아침 커피 루틴",
  );
  await fillIfExists(
    page,
    "#keyFeatures",
    "내열 120℃, 용량 350mL, 무게 280g, 식기세척기 가능, 하중 내구성 일반 도자기 대비. 이런 분께 추천: 아침 커피·티 루틴을 즐기는 분, 심플한 무광 식기를 찾는 분. 이런 점은 확인 후 구매: 전자레인지 사용은 불가(손잡이 접합부 접착), 급격한 온도 변화는 피해주세요.",
  );
  await fillIfExists(page, "#ingredients", "도자기(세라믹), 무연 유약");
  await fillIfExists(page, "#certifications", "식품접촉기구 기준 적합");
  await fillIfExists(page, "#productHeightCm", "9.5");
  await fillIfExists(page, "#productSizeHint", "용량 350mL, 높이 약 9.5cm");

  await page.screenshot({ path: path.join(OUT_DIR, "00-before-submit.png"), fullPage: true });
  const preErr = await page.locator('[role="alert"], .text-registration-red, [data-testid="form-error"]').allTextContents().catch(() => []);
  console.log("[168] pre-submit errors:", preErr.slice(0, 5));

  const submit = page.locator('button[type="submit"]').first();
  await submit.scrollIntoViewIfNeeded();
  await submit.click({ force: true });
  console.log("[168] draft waiting…");
  try {
    await page.waitForURL(/\/create\/draft/, { timeout: 480_000 });
  } catch (e) {
    await page.screenshot({ path: path.join(OUT_DIR, "00-stuck-after-submit.png"), fullPage: true });
    const url = page.url();
    const bodyErr = await page.locator("body").innerText().catch(() => "");
    fs.writeFileSync(
      path.join(OUT_DIR, "stuck-debug.txt"),
      `url=${url}\npreErr=${JSON.stringify(preErr)}\nbodyHead=${bodyErr.slice(0, 2000)}\n`,
      "utf8",
    );
    throw e;
  }
  await page.screenshot({ path: path.join(OUT_DIR, "01-draft.png"), fullPage: true });

  await page.getByRole("button", { name: /승인하고 최종 생성/ }).click();
  try {
    const picker = page.locator('[data-testid="backdrop-picker"]');
    await picker.waitFor({ state: "visible", timeout: 420_000 });
    const c0 = page.locator('[data-testid="backdrop-candidate-0"]');
    if (await c0.count()) await c0.click();
    await page.locator('[data-testid="backdrop-confirm"]').click();
  } catch {
    console.log("[168] no backdrop picker (ok)");
  }

  await page.waitForURL(/\/create\/result/, { timeout: 480_000 });
  await page.waitForTimeout(3000);
  await freezeDetailScrollReveal(page);

  const expand = page
    .locator('[data-testid="result-desktop-split"] [data-testid="detail-preview-expand"]')
    .first();
  if (await expand.count()) {
    await expand.click();
    await page.waitForTimeout(500);
  }

  const session = await page.evaluate(() => sessionStorage.getItem("pagzly-create-result"));
  let analysis: Record<string, unknown> = { logs };
  if (session) {
    fs.writeFileSync(path.join(OUT_DIR, "session.json"), session, "utf8");
    const parsed = JSON.parse(session) as {
      generationCost?: number;
      photoProcessingCost?: number;
      generated?: {
        sections?: Array<Record<string, unknown>>;
        generationCost?: number;
      };
      pipelineSummary?: { lifestyle?: unknown; photo?: unknown };
    };
    const sections = parsed.generated?.sections ?? [];
    const tradeoff = sections.find((s) => s.type === "tradeoff_card");
    const stat = sections.find((s) => s.type === "stat_infographic");
    const chart = sections.find((s) => s.type === "comparison_chart");
    const lifestyleFail = logs.some((l) => /canvas-overflow|direct-paste failed/i.test(l));
    const lifestyleOk = logs.some((l) => /direct-paste success|lifestyle-composite.*success/i.test(l));
    analysis = {
      sectionCount: sections.length,
      types: sections.map((s) => `${s.type}:${s.slot ?? ""}`),
      hasTradeoff: Boolean(tradeoff),
      tradeoff,
      hasStat: Boolean(stat),
      hasChart: Boolean(chart),
      generationCost: parsed.generationCost ?? parsed.generated?.generationCost ?? null,
      photoProcessingCost: parsed.photoProcessingCost ?? null,
      lifestyleFail,
      lifestyleOk,
      logs: logs.slice(0, 40),
    };
    fs.writeFileSync(path.join(OUT_DIR, "analysis.json"), JSON.stringify(analysis, null, 2), "utf8");
    console.log(
      `[168] tradeoff=${Boolean(tradeoff)} stat=${Boolean(stat)} chart=${Boolean(chart)} lifestyleOk=${lifestyleOk} fail=${lifestyleFail}`,
    );
  }

  await page.screenshot({ path: path.join(OUT_DIR, "02-result-full.png"), fullPage: true });

  // tradeoff 섹션으로 스크롤
  await page.evaluate(() => {
    const el =
      Array.from(document.querySelectorAll("h2,h3,p")).find((n) =>
        /이런 분께 추천|참고하세요|tradeoff|추천 대상/i.test(n.textContent || ""),
      ) || null;
    el?.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT_DIR, "03-tradeoff-region.png") });

  // 라이프스타일/갤러리 이미지 영역
  await page.evaluate(() => {
    const img = document.querySelector(
      '[data-testid="detail-preview"] img, .detail-preview img, img[alt*="라이프"], img[alt*="사용"]',
    );
    img?.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT_DIR, "04-lifestyle-region.png") });

  await browser.close();
  console.log("[168] done →", OUT_DIR);
  console.log(JSON.stringify(analysis, null, 2).slice(0, 1500));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
