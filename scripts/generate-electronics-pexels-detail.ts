/**
 * Pexels에서 전자제품 사진 10장 크롤 → /create 전체 플로우로 가상 제품 상세페이지 생성 + 캡처.
 *
 * 실행 (dev 서버 필요):
 *   npx tsx scripts/generate-electronics-pexels-detail.ts
 *
 * 환경: .env.local 의 PEXELS_API_KEY, scripts/auth-state.json, BASE_URL(기본 :3000)
 */

import { chromium, type Page } from "playwright";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { freezeDetailScrollReveal } from "./capture-utils";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const OUT_DIR = path.join(ROOT, "review", "pexels-electronics-detail");
const ASSET_DIR = path.join(__dirname, "test-assets", "_pexels-electronics-run");
const NEED = 10;

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
  // 각도·장면이 다른 전자 제품샷을 골고루 모은다
  const queries = [
    "wireless earbuds isolated white background product",
    "bluetooth earbuds charging case studio white backdrop",
    "noise cancelling headphones product photography white background",
    "true wireless earbuds flat lay no hand",
    "earbuds product shot plain background",
    "premium headphones product photo studio lighting",
    "wireless earphones case product photography isolated",
  ];
  const seen = new Set<number>();
  const meta: Array<{ id: number; photographer: string; query: string; file: string }> = [];
  const files: string[] = [];

  for (const query of queries) {
    if (files.length >= NEED) break;
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "8");
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
      // Claude Vision은 media_type과 실제 바이트가 다르면 400 — 항상 진짜 JPEG로 정규화
      const jpegBuf = await sharp(buf).jpeg({ quality: 92 }).toBuffer();
      const file = path.join(ASSET_DIR, `pexels-${photo.id}.jpeg`);
      fs.writeFileSync(file, jpegBuf);
      files.push(file);
      meta.push({
        id: photo.id,
        photographer: photo.photographer,
        query,
        file: path.basename(file),
      });
      console.log(`[pexels] #${photo.id} by ${photo.photographer} → ${path.basename(file)}`);
    }
  }

  if (files.length < NEED) {
    throw new Error(`Pexels 사진이 ${files.length}장뿐입니다. ${NEED}장 필요.`);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, "pexels-sources.json"),
    JSON.stringify(meta, null, 2),
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

  console.log("[1/4] Pexels 전자제품 크롤 (10장)…");
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
    if (/\[cost\]|\[images\]|\[qa\]|\[concept-illustration\]|\[enhance\]|\[section-backdrop\]|error/i.test(t)) {
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

  // 가상 제품: NORA AUDIO — AURA ONE Pro 오픈형 ANC 이어버드
  console.log("[2/4] /create 폼 작성 (전자제품 · AURA ONE Pro)…");
  await page.goto(`${BASE_URL}/create`, { waitUntil: "networkidle" });
  await page.locator("select").first().selectOption({ label: "전자제품" });
  await page.setInputFiles('input[type="file"][accept*="image/jpeg"]', images);
  await page.fill("#productName", "AURA ONE Pro 오픈형 ANC 이어버드");
  await fillIfExists(page, "#brandName", "NORA AUDIO");
  await page.fill("#price", "189000");
  await fillIfExists(page, "#targetCustomer", "출퇴근·운동 중에도 주변음을 듣는 20~40대");
  await fillIfExists(
    page,
    "#keyFeatures",
    "하이브리드 ANC 42dB, 오픈형 이어훅 설계로 장시간 착용 편안함, LDAC·AAC 듀얼 코덱, 배터리 이어버드 9시간·케이스 포함 36시간, IPX5 생활방수, 터치+앱 커스터마이즈, 멀티포인트 2기기 동시 연결",
  );
  await fillIfExists(
    page,
    "#ingredients",
    "드라이버 12mm 다이내믹, 블루투스 5.3, 충전 USB-C, 무게 이어버드 편당 5.8g, 컬러 미드나잇 블랙 / 클라우드 화이트",
  );
  await fillIfExists(
    page,
    "#certifications",
    "KC 인증, 블루투스 SIG 인증, RoHS, 1년 무상 A/S, 30일 청음 만족 보장",
  );
  await fillIfExists(
    page,
    "#wholesaleUrl",
    "원본 상품명: NORA AUDIO AURA ONE Pro Open-Ear ANC Earbuds / 스펙: 하이브리드 ANC 42dB, 12mm 드라이버, BT 5.3, LDAC·AAC, IPX5, 배터리 9h+케이스 27h / 구성: 이어버드·충전 케이스·이어팁 S/M/L·USB-C 케이블·퀵가이드 / 포인트: 오픈형으로 주변음 유지+ANC 전환, 운동·통근·화상회의 올인원",
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
