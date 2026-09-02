/**
 * 67차 — 기준3(스와치)·기준4(annotated) 실사 재검증
 *
 *   npx tsx scripts/grant-qa-credits.ts 100000 qa_topup_67cha
 *   npx tsx scripts/67cha-paid-qa.ts --task=A
 *   npx tsx scripts/67cha-paid-qa.ts --task=B
 *   npx tsx scripts/67cha-paid-qa.ts --task=both
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
const ASSET_ROOT = path.join(__dirname, "test-assets", "_67cha-paid");
const NEED = 8;

type PexelsPhoto = {
  id: number;
  src: { large2x: string; large: string };
};

type Fixture = {
  id: string;
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

const ELECTRONICS_FIXTURES: Fixture[] = [
  {
    id: "electronics-speaker",
    label: "전자제품",
    queries: [
      "bluetooth speaker product white background",
      "portable speaker grille button closeup",
      "mini wireless speaker studio",
    ],
    productName: "SOUND POCKET 미니 블루투스 스피커",
    brandName: "NORA AUDIO",
    price: "89000",
    targetCustomer: "20~40대",
    keyFeatures:
      "360도 서라운드, IPX7 방수, 12시간 재생, USB-C 충전, 멀티 페어링, 터치 컨트롤",
    ingredients: "40mm 드라이버, BT 5.3, 2000mAh 배터리",
    certifications: "KC 인증, RoHS",
    wholesaleUrl:
      "원본: Sound Pocket Mini / 구성: 스피커·USB-C 케이블·스트랩 / 포인트: 방수·장시간 재생",
  },
  {
    id: "electronics-powerbank",
    label: "전자제품",
    queries: [
      "power bank portable charger product",
      "usb c power bank white background",
      "slim power bank ports closeup",
    ],
    productName: "슬림 파워뱅크 10000",
    brandName: "VOLT ONE",
    price: "45900",
    targetCustomer: "출장·야외 활동이 잦은 20~50대",
    keyFeatures: "10000mAh, 22.5W 고속충전, USB-C 입출력, 슬림 알루미늄",
    ingredients: "Li-Poly 10000mAh, USB-C PD, QC 3.0",
    certifications: "KC 인증, PSE",
    wholesaleUrl: "원본: Slim 10000mAh / 포트: USB-C·USB-A",
  },
];

const COSMETICS_FIXTURES: Fixture[] = [
  {
    id: "cosmetics-cream-solo",
    label: "화장품/뷰티",
    queries: [
      "face cream jar white background solo",
      "moisturizer cream jar product photography minimal",
      "skincare cream jar isolated white",
    ],
    productName: "시카 리페어 수딩 크림",
    brandName: "AURA LAB",
    price: "38900",
    targetCustomer: "민감성·속건조 피부 20~40대",
    keyFeatures: "고보습 크림 제형, 시카 성분, 저자극 무향, 산뜻한 마무리",
    ingredients: "센텔라아시아티카, 판테놀, 세라마이드, 쉐어버터",
    certifications: "더마 테스트 완료, 동물실험 없음",
    wholesaleUrl: "원본: Cica Repair Cream 50ml / 제형: 고보습 크림",
  },
  {
    id: "cosmetics-lotion-solo",
    label: "화장품/뷰티",
    queries: [
      "body lotion bottle white background",
      "moisturizing lotion pump bottle product",
      "skincare lotion minimal product photo",
    ],
    productName: "딥 모이스처 바디 로션",
    brandName: "루미에르 랩",
    price: "24900",
    targetCustomer: "건조한 피부 전 연령",
    keyFeatures: "촉촉한 로션 제형, 빠른 흡수, 무향, 데일리 보습",
    ingredients: "글리세린, 히알루론산, 시어버터, 알로에",
    certifications: "피부 자극 테스트 완료",
    wholesaleUrl: "원본: Deep Moisture Body Lotion 300ml / 제형: 로션",
  },
];

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

  if (files.length < 7) throw new Error(`Pexels 사진 ${files.length}장 — 최소 7장 필요`);
  return files.slice(0, NEED);
}

async function fillIfExists(page: Page, selector: string, value: string) {
  const loc = page.locator(selector).first();
  if ((await loc.count()) === 0) return;
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

async function runGeneration(page: Page, fixture: Fixture, images: string[]) {
  console.log(`\n========== 67차 ${fixture.id} ==========`);

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
  console.log(`  full: ${outPath} (${bytes.toLocaleString()} bytes)`);
  return bytes;
}

async function verifyAnnotated(page: Page, shotDir: string, slug: string) {
  const svgLines = await page.locator('[data-testid="detail-preview"] section svg line').count();
  const labelChips = await page
    .locator('[data-testid="detail-preview"] section span.rounded-full')
    .count();
  console.log(`  [67cha-A] svg lines: ${svgLines}, label chips: ${labelChips}`);

  const feature = page
    .getByRole("heading", { name: /기능|스피커|충전|방수|배터리|포트|드라이버|페어링/i })
    .first();
  const cropPath = path.join(shotDir, `67cha-annotated-${slug}-crop.png`);
  if (await feature.count()) {
    await feature.scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => undefined);
    await page.waitForTimeout(400);
    try {
      await feature.locator("xpath=ancestor::section[1]").screenshot({ path: cropPath, timeout: 15_000 });
      console.log(`  [67cha-A] crop: ${cropPath} (${fs.statSync(cropPath).size.toLocaleString()} bytes)`);
    } catch {
      console.log("  [67cha-A] feature 섹션 crop 생략");
    }
  }

  return { svgLines, labelChips, annotatedRendered: svgLines >= 1 };
}

async function verifySwatch(page: Page, shotDir: string, slug: string) {
  const heading = page
    .getByRole("heading", { name: /성분|텍스처|크림|보습|시카|로션|제형|발림/i })
    .first();
  const cropPath = path.join(shotDir, `67cha-swatch-${slug}-crop.png`);
  if (await heading.count()) {
    await heading.scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => undefined);
    await page.waitForTimeout(400);
    try {
      await heading.locator("xpath=ancestor::section[1]").screenshot({ path: cropPath, timeout: 15_000 });
      console.log(`  [67cha-B] crop: ${cropPath} (${fs.statSync(cropPath).size.toLocaleString()} bytes)`);
    } catch {
      console.log("  [67cha-B] texture/ingredient 섹션 crop 생략");
    }
  }
  const sectionCount = await page.locator('[data-testid="detail-preview"] section').count();
  console.log(`  [67cha-B] sections: ${sectionCount}`);
  return { sectionCount, cropPath: fs.existsSync(cropPath) ? cropPath : null };
}

type AttemptResult = {
  fixtureId: string;
  fullPath: string;
  fullBytes: number;
  annotated?: { svgLines: number; labelChips: number; annotatedRendered: boolean };
  swatch?: { sectionCount: number; cropPath: string | null };
};

async function runElectronics(
  page: Page,
  apiKey: string,
  maxAttempts: number,
  onlyId?: string,
): Promise<AttemptResult[]> {
  const results: AttemptResult[] = [];
  const fixtures = onlyId
    ? ELECTRONICS_FIXTURES.filter((f) => f.id === onlyId)
    : ELECTRONICS_FIXTURES;
  if (fixtures.length === 0) throw new Error(`electronics fixture not found: ${onlyId}`);

  for (const fixture of fixtures.slice(0, maxAttempts)) {
    const assetDir = path.join(ASSET_ROOT, fixture.id);
    const images = await crawlPexels(apiKey, fixture.queries, assetDir);
    await runGeneration(page, fixture, images);
    const fullPath = path.join(SHOT_DIR, `67cha-final-${fixture.id}.png`);
    const fullBytes = await captureFull(page, fullPath);
    const annotated = await verifyAnnotated(page, SHOT_DIR, fixture.id);
    results.push({ fixtureId: fixture.id, fullPath, fullBytes, annotated });
    if (annotated.annotatedRendered) {
      console.log(`  [67cha-A] annotated 렌더 성공 — ${fixture.id}`);
      break;
    }
    console.log(`  [67cha-A] annotated 미적용 — ${fixture.id}`);
  }
  return results;
}

async function runCosmetics(
  page: Page,
  apiKey: string,
  maxAttempts: number,
  imageOverride?: string[],
  onlyId?: string,
): Promise<AttemptResult[]> {
  const results: AttemptResult[] = [];
  const fixtures = onlyId
    ? COSMETICS_FIXTURES.filter((f) => f.id === onlyId)
    : COSMETICS_FIXTURES;
  if (fixtures.length === 0) throw new Error(`cosmetics fixture not found: ${onlyId}`);

  for (const fixture of fixtures.slice(0, maxAttempts)) {
    const assetDir = path.join(ASSET_ROOT, fixture.id);
    const images =
      imageOverride && imageOverride.length >= 7
        ? imageOverride.slice(0, NEED)
        : await crawlPexels(apiKey, fixture.queries, assetDir);
    await runGeneration(page, fixture, images);
    const fullPath = path.join(SHOT_DIR, `67cha-final-${fixture.id}.png`);
    const fullBytes = await captureFull(page, fullPath);
    const swatch = await verifySwatch(page, SHOT_DIR, fixture.id);
    results.push({ fixtureId: fixture.id, fullPath, fullBytes, swatch });
  }
  return results;
}

async function main() {
  const taskArg = process.argv.find((a) => a.startsWith("--task="));
  const task = taskArg?.split("=")[1] ?? "both";
  const attemptsArg = process.argv.find((a) => a.startsWith("--attempts="));
  const maxAttempts = Number(attemptsArg?.split("=")[1] ?? 2);
  const electronicsId = process.argv.find((a) => a.startsWith("--electronics-id="))?.split("=")[1];
  const cosmeticsId = process.argv.find((a) => a.startsWith("--cosmetics-id="))?.split("=")[1];
  const usePixabayCosmetics = process.argv.includes("--use-pixabay-cosmetics");

  const pixabayDir = path.join(__dirname, "test-assets", "_pixabay-cosmetics-run");
  const pixabayImages = usePixabayCosmetics
    ? fs
        .readdirSync(pixabayDir)
        .filter((f) => /\.(jpe?g|png)$/i.test(f))
        .map((f) => path.join(pixabayDir, f))
        .slice(0, NEED)
    : undefined;

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

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });

  const summary: {
    task: string;
    electronics?: AttemptResult[];
    cosmetics?: AttemptResult[];
  } = { task };

  if (task === "A" || task === "both") {
    summary.electronics = await runElectronics(page, apiKey, maxAttempts, electronicsId);
  }
  if (task === "B" || task === "both") {
    summary.cosmetics = await runCosmetics(
      page,
      apiKey,
      maxAttempts,
      pixabayImages,
      cosmeticsId,
    );
  }

  await browser.close();

  const summaryPath = path.join(ROOT, "review", "67cha-qa-summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`\n[67cha] summary → ${summaryPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
