/**
 * 59·61·62차 유료 QA — 카테고리 1개씩 실제 final 생성
 *
 *   npx tsx scripts/59-62cha-paid-qa.ts --round=59
 *   npx tsx scripts/59-62cha-paid-qa.ts --round=61
 *   npx tsx scripts/59-62cha-paid-qa.ts --round=62
 *
 * dev 서버 :3000, scripts/auth-state.json, PEXELS_API_KEY 필요
 */

import { chromium, type Page } from "playwright";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { freezeDetailScrollReveal } from "./capture-utils";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const SHOT_DIR = path.join(ROOT, "review", "qa-screenshots");
const ASSET_ROOT = path.join(__dirname, "test-assets", "_59-62cha-paid");
const NEED = 8;

type PexelsPhoto = {
  id: number;
  src: { large2x: string; large: string };
};

type Fixture = {
  round: "59" | "61" | "62";
  slug: string;
  label: string;
  queries: string[];
  productName: string;
  brandName: string;
  price: string;
  targetCustomer: string;
  keyFeatures: string;
  ingredients: string;
  certifications: string;
  wholesaleUrl: string;
};

const FIXTURES: Record<"59" | "61" | "62", Fixture> = {
  "59": {
    round: "59",
    slug: "electronics",
    label: "전자제품",
    queries: [
      "wireless earbuds isolated white background product",
      "bluetooth earbuds charging case studio",
      "noise cancelling headphones product photography",
      "true wireless earbuds flat lay",
    ],
    productName: "AURA ONE Pro 오픈형 ANC 이어버드",
    brandName: "NORA AUDIO",
    price: "189000",
    targetCustomer: "출퇴근·운동 중 주변음을 유지하고 싶은 20~40대",
    keyFeatures:
      "하이브리드 ANC 42dB, 12mm 다이내믹 드라이버, LDAC·AAC, 배터리 9h+케이스 27h, IPX5, 터치 센서",
    ingredients: "12mm 다이내믹 드라이버, BT 5.3, USB-C, 편당 5.8g",
    certifications: "KC 인증, 블루투스 SIG, RoHS, 1년 무상 A/S",
    wholesaleUrl:
      "원본: AURA ONE Pro / 구성: 이어버드·케이스·이어팁 S/M/L·USB-C / 포인트: 오픈형+ANC 전환",
  },
  "61": {
    round: "61",
    slug: "cosmetics-lighting",
    label: "화장품/뷰티",
    queries: [
      "skincare serum bottle product",
      "moisturizer cream jar beauty",
      "cosmetic dropper bottle",
      "hyaluronic acid serum product photo",
    ],
    productName: "히알루론 딥 모이스처 세럼",
    brandName: "루미에르 랩",
    price: "32900",
    targetCustomer: "20~30대 속건조 고민 여성",
    keyFeatures:
      "히알루론산 3중 레이어 보습, 산뜻한 워터리 제형, 무향·저자극, 속건조 케어",
    ingredients: "히알루론산, 판테놀, 병풀추출물, 글리세린, 나이아신아마이드",
    certifications: "비건 포뮬러, 동물실험 없음, 더마 테스트 완료",
    wholesaleUrl:
      "원본: Hyaluronic Deep Moisture Serum 30ml / 제형: 워터리 세럼 / 사용법: 세안 후 2~3방울",
  },
  "62": {
    round: "62",
    slug: "cosmetics-texture",
    label: "화장품/뷰티",
    queries: [
      "cream jar skincare product photography",
      "moisturizer cream texture beauty",
      "face cream cosmetic jar white background",
      "rich cream skincare product",
    ],
    productName: "딥 리페어 모이스처 크림",
    brandName: "AURA LAB",
    price: "42900",
    targetCustomer: "건성·속건조 피부 20~40대",
    keyFeatures:
      "세라마이드·쉐어버터 복합, 고보습 크림 제형, 밤 루틴 집중 케어, 무향",
    ingredients: "세라마이드, 쉐어버터, 스쿠알란, 판테놀, 히알루론산",
    certifications: "더마 테스트 완료, 동물실험 없음",
    wholesaleUrl:
      "원본: Deep Repair Moisture Cream 50ml / 제형: 고보습 크림 / 사용법: 스킨케어 마지막 단계",
  },
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

async function crawlPexels(apiKey: string, queries: string[], assetDir: string): Promise<string[]> {
  fs.mkdirSync(assetDir, { recursive: true });
  const seen = new Set<number>();
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
      const jpegBuf = await sharp(buf).jpeg({ quality: 92 }).toBuffer();
      const file = path.join(assetDir, `pexels-${photo.id}.jpeg`);
      fs.writeFileSync(file, jpegBuf);
      files.push(file);
      console.log(`  [pexels] #${photo.id} → ${path.basename(file)}`);
    }
  }

  if (files.length < 7) {
    throw new Error(`Pexels 사진 ${files.length}장 — 최소 7장 필요`);
  }
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

async function sampleCornerHex(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`fetch failed: ${imageUrl}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buf).metadata();
  const w = meta.width ?? 100;
  const h = meta.height ?? 100;
  const regionW = Math.max(8, Math.floor(w * 0.12));
  const regionH = Math.max(8, Math.floor(h * 0.12));
  const sample = await sharp(buf)
    .extract({ left: 0, top: 0, width: regionW, height: regionH })
    .resize(1, 1)
    .raw()
    .toBuffer();
  const [r, g, b] = [sample[0], sample[1], sample[2]];
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
}

async function runGeneration(page: Page, fixture: Fixture, images: string[]) {
  console.log(`\n========== ${fixture.round}차 ${fixture.label} ==========`);

  await page.goto(`${BASE_URL}/create/detail`, { waitUntil: "networkidle" });
  await page.waitForSelector("select", { timeout: 60_000 });
  await page.locator("select").first().selectOption({ label: fixture.label });
  await page.setInputFiles('input[type="file"][accept*="image/jpeg"]', images);
  await page.fill("#productName", fixture.productName);
  await fillIfExists(page, "#brandName", fixture.brandName);
  await page.fill("#price", fixture.price);
  await fillIfExists(page, "#targetCustomer", fixture.targetCustomer);
  await fillIfExists(page, "#keyFeatures", fixture.keyFeatures);
  await fillIfExists(page, "#ingredients", fixture.ingredients);
  await fillIfExists(page, "#certifications", fixture.certifications);
  await fillIfExists(page, "#wholesaleUrl", fixture.wholesaleUrl);

  await page.click('button[type="submit"]');
  console.log("  draft 생성 대기…");
  await page.waitForURL(/\/create\/draft/, { timeout: 480_000 });
  await page.waitForTimeout(1200);

  await page.getByRole("button", { name: /승인하고 최종 생성/ }).click();

  const picker = page.locator('[data-testid="backdrop-picker"]');
  try {
    await picker.waitFor({ state: "visible", timeout: 420_000 });
    const c0 = page.locator('[data-testid="backdrop-candidate-0"]');
    if (await c0.count()) await c0.click();
    await page.locator('[data-testid="backdrop-confirm"]').click();
    console.log("  배경 후보 확정");
  } catch {
    console.log("  배경 피커 없음 — 계속");
  }

  await page.waitForURL(/\/create\/result/, { timeout: 480_000 });
  await page.waitForTimeout(2500);
}

async function captureFull(page: Page, outPath: string) {
  const preview = page.locator('[data-testid="detail-preview"]');
  await preview.waitFor({ state: "visible", timeout: 30_000 });
  const expand = page.locator('[data-testid="detail-preview-expand"]');
  if (await expand.isVisible().catch(() => false)) {
    await expand.click();
    await page.waitForTimeout(600);
  }
  await freezeDetailScrollReveal(page);
  await page.waitForTimeout(400);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await page.screenshot({ path: outPath, fullPage: true });
  const bytes = fs.statSync(outPath).size;
  console.log(`  스크린샷: ${outPath} (${bytes.toLocaleString()} bytes)`);
  return bytes;
}

async function verify59(page: Page, shotDir: string) {
  const svgLines = await page.locator('[data-testid="detail-preview"] section svg line').count();
  const labels = await page.locator('[data-testid="detail-preview"] section span.rounded-full').count();
  console.log(`  [59cha] svg leader lines: ${svgLines}, label chips: ${labels}`);

  const feature = page.getByRole("heading", { name: /드라이버|ANC|기능|센서|사운드|배터리/i }).first();
  if (await feature.count()) {
    await feature.scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => undefined);
    await page.waitForTimeout(400);
    const cropPath = path.join(shotDir, "59cha-annotated-live-crop.png");
    try {
      await feature.locator("xpath=ancestor::section[1]").screenshot({ path: cropPath, timeout: 15_000 });
      console.log(`  [59cha] crop: ${cropPath} (${fs.statSync(cropPath).size.toLocaleString()} bytes)`);
    } catch {
      console.log("  [59cha] feature 섹션 crop 생략 (타임아웃)");
    }
  }

  return { svgLines, labels, applied: svgLines >= 1 };
}

async function verify61(page: Page, shotDir: string) {
  const imgs = page.locator('[data-testid="detail-preview"] section img[src^="http"]');
  const count = Math.min(await imgs.count(), 4);
  const samples: { index: number; hex: string; src: string }[] = [];
  for (let i = 0; i < count; i += 1) {
    const src = (await imgs.nth(i).getAttribute("src")) ?? "";
    if (!src.startsWith("http")) continue;
    try {
      const hex = await sampleCornerHex(src);
      samples.push({ index: i, hex, src: src.slice(0, 80) });
      console.log(`  [61cha] img[${i}] corner hex: ${hex}`);
    } catch (err) {
      console.warn(`  [61cha] img[${i}] sample failed`, err);
    }
  }

  const reportPath = path.join(shotDir, "61cha-lighting-samples.json");
  fs.writeFileSync(reportPath, JSON.stringify(samples, null, 2));
  console.log(`  [61cha] samples → ${reportPath}`);

  if (samples.length >= 2) {
    const deltas = samples.slice(1).map((s, i) => {
      const a = samples[i];
      const dr = Math.abs(parseInt(s.hex.slice(1, 3), 16) - parseInt(a.hex.slice(1, 3), 16));
      const dg = Math.abs(parseInt(s.hex.slice(3, 5), 16) - parseInt(a.hex.slice(3, 5), 16));
      const db = Math.abs(parseInt(s.hex.slice(5, 7), 16) - parseInt(a.hex.slice(5, 7), 16));
      return dr + dg + db;
    });
    const maxDelta = Math.max(...deltas);
    console.log(`  [61cha] max RGB delta across sections: ${maxDelta}`);
  }

  return { samples };
}

async function verify62(page: Page, shotDir: string) {
  const ingredientHeading = page
    .getByRole("heading", { name: /성분|히알루론|세라마이드|보습|텍스처|크림/i })
    .first();
  if (await ingredientHeading.count()) {
    await ingredientHeading.scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => undefined);
    await page.waitForTimeout(400);
    const cropPath = path.join(shotDir, "62cha-texture-swatch-crop.png");
    try {
      await ingredientHeading.locator("xpath=ancestor::section[1]").screenshot({
        path: cropPath,
        timeout: 15_000,
      });
      console.log(`  [62cha] crop: ${cropPath} (${fs.statSync(cropPath).size.toLocaleString()} bytes)`);
    } catch {
      console.log("  [62cha] ingredient 섹션 crop 생략 (타임아웃)");
    }
  }

  const sectionCount = await page.locator('[data-testid="detail-preview"] section').count();
  console.log(`  [62cha] sections rendered: ${sectionCount}`);
  return { sectionCount };
}

async function main() {
  const roundArg = process.argv.find((a) => a.startsWith("--round="));
  const round = roundArg?.split("=")[1] as "59" | "61" | "62" | undefined;
  if (!round || !FIXTURES[round]) {
    throw new Error("사용: npx tsx scripts/59-62cha-paid-qa.ts --round=59|61|62");
  }

  const fixture = FIXTURES[round];
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const env = loadEnvLocal();
  for (const [k, v] of Object.entries(env)) {
    if (!process.env[k]) process.env[k] = v;
  }

  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    throw new Error("scripts/auth-state.json 없음");
  }
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) throw new Error("PEXELS_API_KEY 필요");

  const assetDir = path.join(ASSET_ROOT, fixture.slug);
  const images = await crawlPexels(apiKey, fixture.queries, assetDir);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  await runGeneration(page, fixture, images);

  const fullPath = path.join(SHOT_DIR, `${round}cha-final-${fixture.slug}.png`);
  await captureFull(page, fullPath);

  if (round === "59") await verify59(page, SHOT_DIR);
  if (round === "61") await verify61(page, SHOT_DIR);
  if (round === "62") await verify62(page, SHOT_DIR);

  await browser.close();
  console.log(`\n[${round}cha] 완료 — 1회 final 생성`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
