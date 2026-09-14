/**
 * 172차 — 패션 실사 1건: tradeoff_card + comparison_chart + review_highlight.
 *
 *   npx tsx scripts/172cha-live-fashion.ts
 *
 * 이미지 생성 API 정확히 1회. 필요: :3000, auth-state.json, PEXELS_API_KEY
 */
import { chromium, type Page } from "playwright";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { freezeDetailScrollReveal } from "./capture-utils";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const OUT_DIR = path.join(ROOT, "review", "172cha-live-fashion");
const ASSET_DIR = path.join(__dirname, "test-assets", "_172cha-fashion");
const REVIEW_FILE = path.join(ROOT, "public", "_verify146", "reviews_148cha.txt");

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
  url.searchParams.set("per_page", String(Math.max(need, 8)));
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
    throw new Error("scripts/auth-state.json 없음");
  }
  if (!fs.existsSync(REVIEW_FILE)) throw new Error(`missing ${REVIEW_FILE}`);
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) throw new Error("PEXELS_API_KEY 필요");

  console.log("[172] crawl fashion product images…");
  const productImages = await crawlPexels(
    apiKey,
    "oversized cotton t-shirt product photography plain background",
    8,
    "tee",
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(180_000);

  let generateHits = 0;
  page.on("request", (req) => {
    if (req.url().includes("/api/generate") && req.method() === "POST") {
      generateHits += 1;
      console.log(`[172] /api/generate hit #${generateHits}`);
    }
  });

  await page.goto(`${BASE_URL}/create/detail`, { waitUntil: "networkidle" });
  if (page.url().includes("/login") || page.url().includes("/auth")) {
    throw new Error(`auth expired — url=${page.url()}`);
  }
  await page.waitForSelector("select", { timeout: 60_000 });

  // 카테고리: 의류/패션
  const catSelect = page.locator("select").first();
  const labels = await catSelect.locator("option").allTextContents();
  const fashionLabel =
    labels.find((l) => l.includes("패션") || l.includes("의류")) ?? labels[1];
  await catSelect.selectOption({ label: fashionLabel! });

  await page.setInputFiles('input[type="file"][accept*="image/jpeg"]', productImages);
  await page.fill("#productName", "에센셜 오버사이즈 코튼 티셔츠");
  await fillIfExists(page, "#brandName", "NEUTRAL LINE");
  await page.fill("#price", "39000");
  await fillIfExists(page, "#targetCustomer", "데일리 미니멀 룩을 선호하는 20~30대");
  await fillIfExists(
    page,
    "#keyFeatures",
    "면 100%, 신축성 12%, 세탁 후 수축률 2% 이내, 오버사이즈 핏, 원단 중량 210g/yd. 이런 분께 추천: 루즈핏·데일리 룩을 원하는 분. 이런 점은 확인 후 구매: 슬림핏을 선호하면 한 사이즈 다운, 드라이클리닝을 권장합니다.",
  );
  await fillIfExists(page, "#ingredients", "코튼 100%");
  await fillIfExists(page, "#certifications", "OEKO-TEX Standard 100");
  await page.setInputFiles("#reviewFile", REVIEW_FILE);

  await page.screenshot({ path: path.join(OUT_DIR, "00-before-submit.png"), fullPage: true });

  const submit = page.locator('button[type="submit"]').first();
  await submit.scrollIntoViewIfNeeded();
  await submit.click({ force: true });
  console.log("[172] waiting draft…");
  try {
    await page.waitForURL(/\/create\/draft/, { timeout: 480_000 });
  } catch (e) {
    await page.screenshot({ path: path.join(OUT_DIR, "00-stuck.png"), fullPage: true });
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
    console.log("[172] backdrop confirmed");
  } catch {
    console.log("[172] no backdrop picker (ok)");
  }

  console.log("[172] waiting result…");
  try {
    await page.waitForURL(/\/create\/result/, { timeout: 600_000 });
  } catch (e) {
    await page.screenshot({ path: path.join(OUT_DIR, "02-stuck-final.png"), fullPage: true });
    const url = page.url();
    const body = await page.locator("body").innerText().catch(() => "");
    fs.writeFileSync(
      path.join(OUT_DIR, "stuck-final.txt"),
      `url=${url}\nbody=${body.slice(0, 3000)}\n`,
      "utf8",
    );
    throw e;
  }
  await page.waitForTimeout(2000);
  await freezeDetailScrollReveal(page).catch(() => undefined);

  const sessionRaw = await page.evaluate(() => sessionStorage.getItem("pagzly-create-result"));
  if (sessionRaw) {
    fs.writeFileSync(path.join(OUT_DIR, "session.json"), sessionRaw, "utf8");
  }
  const session = sessionRaw ? (JSON.parse(sessionRaw) as {
    generated?: { sections?: Array<{ type: string; slot?: string; recommendFor?: string[]; considerIf?: string[]; metrics?: unknown[]; praises?: string[] }> };
    generationCost?: number;
    photoProcessingCost?: number;
  }) : {};
  const sections = session.generated?.sections ?? [];
  const types = sections.map((s) => s.type);
  const tradeoff = sections.find((s) => s.type === "tradeoff_card");
  const chart = sections.find((s) => s.type === "comparison_chart");
  const review = sections.find((s) => s.type === "review_highlight");

  await page.screenshot({ path: path.join(OUT_DIR, "02-result-full.png"), fullPage: true });

  // 섹션별 캡처
  for (const [name, testid, fallback] of [
    ["tradeoff", "tradeoff-card", "구매"],
    ["chart", "comparison-chart", "일반 제품"],
    ["review", "review-highlight", "후기"],
  ] as const) {
    let loc = page.locator(`[data-testid="${testid}"]`).first();
    if ((await loc.count()) === 0) {
      loc = page.locator("section").filter({ hasText: fallback }).first();
    }
    if ((await loc.count()) > 0) {
      await loc.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await loc.screenshot({ path: path.join(OUT_DIR, `03-${name}.png`) }).catch(() => undefined);
    }
  }

  const summary = {
    generateHits,
    sectionCount: types.length,
    hasTradeoff: Boolean(tradeoff),
    hasChart: Boolean(chart),
    hasReview: Boolean(review),
    tradeoffRecommend: tradeoff?.recommendFor?.slice(0, 4) ?? [],
    tradeoffConsider: tradeoff?.considerIf?.slice(0, 4) ?? [],
    reviewPraises: review?.praises?.slice(0, 5) ?? [],
    generationCost: session.generationCost,
    photoProcessingCost: session.photoProcessingCost,
    types: types.slice(0, 40),
  };
  fs.writeFileSync(path.join(OUT_DIR, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify(summary, null, 2));

  await browser.close();
  // draft + final 이면 POST 2회가 정상(한 번의 실사 세션). 3회 이상은 이상.
  if (generateHits < 1 || generateHits > 2) {
    console.error(`[172] unexpected /api/generate POST count=${generateHits} (expect 1~2 for draft+final)`);
    process.exit(1);
  }
  console.log("[172] done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
