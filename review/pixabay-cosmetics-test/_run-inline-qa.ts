/**
 * Pexels에서 화장품 사진 8장 크롤 → /create 전체 플로우로 상세페이지 1건 생성 + 캡처.
 *
 * 실행 (dev 서버 필요):
 *   npx tsx scripts/generate-one-pexels-detail.ts
 *
 * 환경: .env.local 의 PEXELS_API_KEY, scripts/auth-state.json, BASE_URL(기본 :3000)
 */

import { chromium, type Page } from "playwright";
import fs from "fs";
import path from "path";
import { freezeDetailScrollReveal } from "../../scripts/capture-utils";

const ROOT = path.join(__dirname, "..", "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(ROOT, "scripts", "auth-state.json");
const OUT_DIR = path.join(ROOT, "review", "pixabay-cosmetics-test");
const ASSET_DIR = path.join(ROOT, "scripts", "test-assets", "_pixabay-cosmetics-run");
const NEED = 8;

type PexelsPhoto = {
  id: number;
  photographer: string;
  url: string;
  src: { large2x: string; large: string };
};

function loadEnvLocal(): Record<string, string> {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

async function crawlPexels(apiKey: string): Promise<string[]> {
  fs.mkdirSync(ASSET_DIR, { recursive: true });
  const queries = [
    "skincare serum bottle product",
    "moisturizer cream jar beauty",
    "cosmetic dropper bottle",
    "hyaluronic acid serum product photo",
  ];
  const seen = new Set<number>();
  const files: string[] = [];

  for (const query of queries) {
    if (files.length >= NEED) break;
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "6");
    url.searchParams.set("orientation", "portrait");
    const res = await fetch(url.toString(), { headers: { Authorization: apiKey } });
    if (!res.ok) throw new Error(`Pexels search failed: ${res.status}`);
    const data = (await res.json()) as { photos: PexelsPhoto[] };
    for (const photo of data.photos) {
      if (files.length >= NEED) break;
      if (seen.has(photo.id)) continue;
      seen.add(photo.id);
      const imgRes = await fetch(photo.src.large2x || photo.src.large);
      if (!imgRes.ok) continue;
      const buf = Buffer.from(await imgRes.arrayBuffer());
      const file = path.join(ASSET_DIR, `pexels-${photo.id}.jpeg`);
      fs.writeFileSync(file, buf);
      files.push(file);
      console.log(`[pexels] #${photo.id} by ${photo.photographer} → ${path.basename(file)}`);
    }
  }

  if (files.length < 7) {
    throw new Error(`Pexels 사진이 ${files.length}장뿐입니다. 최소 7장 필요.`);
  }
  fs.writeFileSync(
    path.join(OUT_DIR, "pexels-sources.json"),
    JSON.stringify(
      files.map((f) => path.basename(f)),
      null,
      2,
    ),
    "utf8",
  );
  return files.slice(0, NEED);
}


function loadPixabayImages(): string[] {
  fs.mkdirSync(ASSET_DIR, { recursive: true });
  const skip = new Set(["pixabay-1.jpg"]); // crawl 오매칭(비화장품)
  const files = fs
    .readdirSync(ASSET_DIR)
    .filter((name) => /^pixabay-.*\.(jpe?g|png)$/i.test(name) && !skip.has(name))
    .map((name) => path.join(ASSET_DIR, name))
    .sort();
  if (files.length < 7) {
    throw new Error(`Need 7+ pixabay images in ${ASSET_DIR}, found ${files.length}. Run crawl-pixabay.mts first.`);
  }
  return files.slice(0, NEED);
}

const QA_PRODUCT = {
  productName: "글로우밤 수분 크림",
  brandName: "루미에르 랩",
  price: "25000",
  targetCustomer: "20~40대 민감성·건성 피부",
  keyFeatures:
    "수분감 있는 텍스처, 산뜻한 마무리, 민감성 피부 사용 가능, 속당김 케어, 무향 포뮬러",
  ingredients: "히알루론산, 세라마이드, 판테놀, 알로에베라잎추출물, 글리세린",
  certifications: "피부 자극 테스트 완료, 동물실험 없음",
  wholesaleUrl:
    "원본: GlowBalm Moisture Cream 50ml / 워터리 크림, 무향, 민감성 피부 / 사용법: 세안 후 적당량을 얼굴에 펴 바름",
};

async function fillIfExists(page: Page, selector: string, value: string) {
  const loc = page.locator(selector).first();
  if ((await loc.count()) === 0) return;
  if (!(await loc.isVisible().catch(() => false))) return;
  const tag = await loc.evaluate((el) => el.tagName.toLowerCase());
  if (tag === "select") {
    const opts = await loc.locator("option").allTextContents();
    const match = opts.find((o) => value.split(/[\s·,]/).some((p) => p && o.includes(p)));
    if (match) await loc.selectOption({ label: match });
    else if (opts.length > 1) await loc.selectOption({ index: 1 });
  } else {
    await loc.fill(value);
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const env = loadEnvLocal();
  for (const [k, v] of Object.entries(env)) {
    if (!process.env[k]) process.env[k] = v;
  }

  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    throw new Error("scripts/auth-state.json 없음 — npx tsx scripts/save-login-state.ts 먼저 실행");
  }

  console.log("[1/4] Pixabay images from disk");
  const images = loadPixabayImages();
  console.log(`[1/4] prepared images ${images.length}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120_000);
  const consoleLog: { type: string; text: string }[] = [];
  const apiErrors: string[] = [];
  const runStartedAt = Date.now();

  page.on("console", (msg) => {
    const t = msg.text();
    consoleLog.push({ type: msg.type(), text: t });
    if (/\[cost\]|\[images\]|\[qa\]|\[concept-illustration\]|\[enhance\]|\[section-backdrop\]|error/i.test(t)) {
      console.log(`[browser] ${t.slice(0, 240)}`);
    }
  });
  page.on("pageerror", (err) => {
    consoleLog.push({ type: "pageerror", text: err.message });
  });
  page.on("response", async (response) => {
    const u = response.url();
    if (!u.includes("/api/generate") && !u.includes("/api/enhance") && !u.includes("/api/generate-backdrop"))
      return;
    if (response.status() >= 400) {
      const body = await response.text().catch(() => "");
      const line = `[api ${response.status()}] ${u} → ${body.slice(0, 400)}`;
      apiErrors.push(line);
      console.error(line);
    }
  });

  console.log("[2/4] /create/detail 폼 작성…");
  await page.goto(`${BASE_URL}/create/detail`, { waitUntil: "networkidle" });
  await page.locator("select").first().selectOption({ label: "화장품/뷰티" });
  await page.setInputFiles('input[type="file"][accept*="image/jpeg"], input[type="file"][accept*="image/png"]', images);
  await page.fill("#productName", QA_PRODUCT.productName);
  await fillIfExists(page, "#brandName", QA_PRODUCT.brandName);
  await page.fill("#price", QA_PRODUCT.price);
  await fillIfExists(page, "#targetCustomer", QA_PRODUCT.targetCustomer);
  await fillIfExists(page, "#keyFeatures", QA_PRODUCT.keyFeatures);
  await fillIfExists(page, "#ingredients", QA_PRODUCT.ingredients);
  await fillIfExists(page, "#certifications", QA_PRODUCT.certifications);
  await fillIfExists(page, "#wholesaleUrl", QA_PRODUCT.wholesaleUrl);

  await page.click('button[type="submit"]');
  console.log("[2/4] draft 생성 대기…");
  await page.waitForURL(/\/create\/draft/, { timeout: 480_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, "draft.png"), fullPage: true });

  console.log("[3/4] 승인 → 최종 생성…");
  await page.getByRole("button", { name: /승인하고 최종 생성/ }).click();

  const picker = page.locator('[data-testid="backdrop-picker"]');
  try {
    await picker.waitFor({ state: "visible", timeout: 420_000 });
    const c0 = page.locator('[data-testid="backdrop-candidate-0"]');
    if (await c0.count()) await c0.click();
    await page.locator('[data-testid="backdrop-confirm"]').click();
    console.log("[3/4] 배경 후보 확정");
  } catch {
    console.log("[3/4] 배경 피커 없음(또는 TEST_MODE) — 계속");
  }

  await page.waitForURL(/\/create\/result/, { timeout: 480_000 });
  await page.waitForTimeout(2500);
  await freezeDetailScrollReveal(page);
  await page.waitForTimeout(400);

  const session = await page.evaluate(() => sessionStorage.getItem("pagzly-create-result"));
  if (session) {
    fs.writeFileSync(path.join(OUT_DIR, "session.json"), session, "utf8");
    const parsed = JSON.parse(session) as {
      imageUrls?: string[];
      generated?: { sections?: unknown[]; productId?: string };
    };
    console.log(
      `[4/4] productId=${parsed.generated?.productId ?? "n/a"} sections=${parsed.generated?.sections?.length ?? 0} images=${parsed.imageUrls?.length ?? 0}`,
    );
  }

  const preview = page.locator('[data-testid="detail-preview"]');
  await preview.waitFor({ state: "visible", timeout: 30_000 });
  const SCREENSHOT_PATH = path.join(ROOT, "review", "qa-screenshots", "cosmetics-pixabay-test-full.png");
  fs.mkdirSync(path.dirname(SCREENSHOT_PATH), { recursive: true });
  await preview.screenshot({ path: SCREENSHOT_PATH });
  await page.screenshot({ path: path.join(OUT_DIR, "03-result-full.png"), fullPage: true });
  console.log(`[4/4] 저장: ${OUT_DIR}`);

  const sources = JSON.parse(
    fs.readFileSync(path.join(OUT_DIR, "pixabay-sources.json"), "utf8"),
  ) as { pageUrl: string; cdnUrl: string }[];
  const parsed = session ? JSON.parse(session) : null;
  const runtimeSec = ((Date.now() - runStartedAt) / 1000).toFixed(1);
  const report = `# 화장품 Pixabay QA 테스트 리포트

생성: ${new Date().toISOString()}
BASE_URL: ${BASE_URL}
TEST_MODE: ${process.env.TEST_MODE ?? "(dev server env)"}
실행 시간: ${runtimeSec}s

## 입력 (가라 상품)

| 필드 | 값 |
|------|-----|
| 상품명 | ${QA_PRODUCT.productName} |
| 브랜드 | ${QA_PRODUCT.brandName} |
| 카테고리 | 화장품/뷰티 |
| 가격 | ${QA_PRODUCT.price}원 |
| 타겟 | ${QA_PRODUCT.targetCustomer} |
| 핵심 특징 | ${QA_PRODUCT.keyFeatures} |
| 성분 | ${QA_PRODUCT.ingredients} |
| 인증 | ${QA_PRODUCT.certifications} |
| wholesaleUrl | ${QA_PRODUCT.wholesaleUrl} |

## Pixabay 이미지 (page URL)

${sources
  .filter((s) => !s.pageUrl.endsWith("/photos/"))
  .slice(0, 8)
  .map((s, i) => `${i + 1}. ${s.pageUrl}`)
  .join("\n")}

## 결과

- **스크린샷:** \`review/qa-screenshots/cosmetics-pixabay-test-full.png\`
- **session:** \`review/pixabay-cosmetics-test/session.json\`
- **productId:** ${parsed?.generated?.productId ?? "n/a"}
- **sections:** ${parsed?.generated?.sections?.length ?? "n/a"}
- **generationCost:** ${parsed?.generated?.generationCost ?? parsed?.generationCost ?? "n/a"}

## API 에러

${apiErrors.length === 0 ? "없음" : apiErrors.map((e) => `- ${e}`).join("\n")}

## 콘솔 (error/warning)

${consoleLog
  .filter((l) => l.type === "error" || l.type === "warning" || l.type === "pageerror")
  .slice(0, 20)
  .map((l) => `- [${l.type}] ${l.text.slice(0, 200)}`)
  .join("\n") || "없음"}

## 품질 관찰 (자동 실행 후 수동 보완 필요)

- 스크린샷을 열어 합성·카피·여백을 확인하세요.
- pixabay-1.jpg(비화장품)는 제외하고 7장 JPEG + 1 PNG(2357981) 사용.

`;
  fs.writeFileSync(path.join(ROOT, "review", "cosmetics-pixabay-test-report.md"), report, "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "run.log"), report, "utf8");

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
