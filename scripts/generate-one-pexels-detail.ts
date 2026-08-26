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
import { freezeDetailScrollReveal } from "./capture-utils";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const OUT_DIR = path.join(ROOT, "review", "pexels-one-detail");
const ASSET_DIR = path.join(__dirname, "test-assets", "_pexels-one-run");
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

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) throw new Error("PEXELS_API_KEY가 .env.local에 필요합니다.");

  console.log("[1/4] Pexels 크롤 (8장)…");
  const images = await crawlPexels(apiKey);
  console.log(`[1/4] 준비된 이미지 ${images.length}장`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120_000);

  page.on("console", (msg) => {
    const t = msg.text();
    if (/\[cost\]|\[images\]|\[qa\]|\[concept-illustration\]|error/i.test(t)) {
      console.log(`[browser] ${t.slice(0, 240)}`);
    }
  });
  page.on("response", async (response) => {
    const u = response.url();
    if (!u.includes("/api/generate") && !u.includes("/api/enhance")) return;
    if (response.status() >= 400) {
      const body = await response.text().catch(() => "");
      console.error(`[api ${response.status()}] ${u} → ${body.slice(0, 400)}`);
    }
  });

  console.log("[2/4] /create 폼 작성…");
  await page.goto(`${BASE_URL}/create`, { waitUntil: "networkidle" });
  await page.locator("select").first().selectOption({ label: "화장품/뷰티" });
  await page.setInputFiles('input[type="file"][accept*="image/jpeg"]', images);
  await page.fill("#productName", "히알루론 딥 모이스처 세럼");
  await fillIfExists(page, "#brandName", "페이즐리랩");
  await page.fill("#price", "32900");
  await fillIfExists(page, "#targetCustomer", "20~30대 여성");
  await fillIfExists(
    page,
    "#keyFeatures",
    "히알루론산 3중 레이어 보습, 산뜻한 워터리 제형, 무향·저자극, 속건조 케어, 재구매율 자체평가 78%",
  );
  await fillIfExists(
    page,
    "#ingredients",
    "히알루론산, 판테놀, 병풀추출물, 글리세린, 나이아신아마이드",
  );
  await fillIfExists(page, "#certifications", "비건 포뮬러, 동물실험 없음, 더마 테스트 완료");
  await fillIfExists(
    page,
    "#wholesaleUrl",
    "원본 상품명: Hyaluronic Deep Moisture Serum 30ml / 스펙: 워터리 세럼, 무향, 민감성 피부 사용 가능 / 사용법: 세안 후 2~3방울을 얼굴에 펴 바름 / 포인트: 속건조 케어, 메이크업 전 베이스",
  );

  await page.click('button[type="submit"]');
  console.log("[2/4] draft 생성 대기…");
  await page.waitForURL(/\/create\/draft/, { timeout: 480_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, "01-draft.png"), fullPage: true });

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
  await preview.screenshot({ path: path.join(OUT_DIR, "02-detail-preview.png") });
  await page.screenshot({ path: path.join(OUT_DIR, "03-result-full.png"), fullPage: true });
  console.log(`[4/4] 저장: ${OUT_DIR}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
