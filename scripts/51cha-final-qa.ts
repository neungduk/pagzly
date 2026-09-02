/**
 * 51차 Tier 2 — 카테고리 5종 각 1회 실제 생성 + 풀페이지 스크린샷
 *
 * 실행 (dev 서버 :3000 필요):
 *   npx tsx scripts/51cha-final-qa.ts
 *   npx tsx scripts/51cha-final-qa.ts --only=food
 *
 * 환경: .env.local PEXELS_API_KEY, scripts/auth-state.json
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
const ASSET_ROOT = path.join(__dirname, "test-assets", "_51cha-final");
const NEED = 8;

type PexelsPhoto = {
  id: number;
  photographer: string;
  src: { large2x: string; large: string };
};

type CategoryFixture = {
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

const FIXTURES: CategoryFixture[] = [
  {
    slug: "cosmetics",
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
      "히알루론산 3중 레이어 보습, 산뜻한 워터리 제형, 무향·저자극, 속건조 케어, 재구매율 자체평가 78%",
    ingredients: "히알루론산, 판테놀, 병풀추출물, 글리세린, 나이아신아마이드",
    certifications: "비건 포뮬러, 동물실험 없음, 더마 테스트 완료",
    wholesaleUrl:
      "원본: Hyaluronic Deep Moisture Serum 30ml / 사용법: 세안 후 2~3방울 / 포인트: 속건조, 메이크업 전 베이스",
  },
  {
    slug: "fashion",
    label: "의류/패션",
    queries: [
      "minimal fashion clothing flat lay white",
      "cotton t-shirt product photography",
      "linen shirt studio product shot",
      "casual outfit flat lay no model",
    ],
    productName: "에센셜 오버사이즈 코튼 티셔츠",
    brandName: "NEUTRAL LINE",
    price: "39000",
    targetCustomer: "미니멀 데일리룩을 선호하는 20~40대",
    keyFeatures:
      "20수 순면 100%, 오버핏 실루엣, 어깨 드롭 5cm, 240g 중량감, 4색 컬러, 세탁 후에도 형태 유지",
    ingredients: "면 100%, 싱글 저지, 봉제 이중 박음, 라벨 프린트 무천",
    certifications: "KC 아동용 아님, OEKO-TEX Standard 100",
    wholesaleUrl:
      "원본: Essential Oversized Cotton Tee / 사이즈: S~XL / 포인트: 레이어드·단독 착용, 사계절 데일리",
  },
  {
    slug: "food",
    label: "식품/건강기능식품",
    queries: [
      "udon noodles bowl food photography",
      "japanese noodle dish steam",
      "comfort food bowl natural light",
      "homemade soup bowl top view",
    ],
    productName: "들기름 메밀 우동 세트",
    brandName: "한그릇 키친",
    price: "8900",
    targetCustomer: "5분 안에 따뜻한 한 끼가 필요한 1~2인 가구",
    keyFeatures:
      "RENEWAL: 면 밀도 15% 증량, 기존 대비 국물 농도 업, 5분 조리, 1인분 420kcal, 냉동 보관 6개월",
    ingredients: "메밀면, 들기름, 간장 베이스, 건더기 스프, 고명 혼합",
    certifications: "HACCP 인증, 식품첨가물 무첨가",
    wholesaleUrl:
      "원본: Buckwheat Udon Set 2 servings / 조리: 끓는 물 5분 / 포인트: 쫄깃 메밀면, 진한 들기름 향",
  },
  {
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
      "하이브리드 ANC 42dB, 오픈형 이어훅, LDAC·AAC, 배터리 9h+케이스 27h, IPX5, 멀티포인트 2기기",
    ingredients: "12mm 다이내믹 드라이버, BT 5.3, USB-C, 편당 5.8g",
    certifications: "KC 인증, 블루투스 SIG, RoHS, 1년 무상 A/S",
    wholesaleUrl:
      "원본: AURA ONE Pro / 구성: 이어버드·케이스·이어팁 S/M/L·USB-C / 포인트: 오픈형+ANC 전환",
  },
  {
    slug: "pet",
    label: "반려동물",
    queries: [
      "dog treat snack product photography",
      "pet food kibble bowl",
      "dog biscuit product shot",
      "healthy dog treats package",
    ],
    productName: "바잇미 고구마 덴탈 스틱",
    brandName: "바잇미",
    price: "15900",
    targetCustomer: "중형·소형견 보호자, 구강 케어가 필요한 반려견",
    keyFeatures:
      "RENEWAL: 사과 대신 고구마 원료로 변경, USDA 승인 시설 제조, 치석·구취 케어, 무첨가 100%, 하루 1~2개",
    ingredients: "국내산 고구마 100%, 식물성 글리세린, 천연 향",
    certifications: "USDA 승인 시설, HACCP, 무첨가",
    wholesaleUrl:
      "원본: Sweet Potato Dental Stick 30pcs / 급여: 체중별 1~2개 / 포인트: 저알러지, 덴탈 케어",
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

  if (files.length < 7) {
    throw new Error(`Pexels 사진 ${files.length}장 — 최소 7장 필요 (${assetDir})`);
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

async function runCategory(page: Page, fixture: CategoryFixture, images: string[]) {
  console.log(`\n========== ${fixture.label} (${fixture.slug}) ==========`);

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

  const errorOverlay = page.getByText(/Console Error|order of Hooks/i);
  if (await errorOverlay.count()) {
    throw new Error(`${fixture.slug}: Next.js error overlay detected — screenshot aborted`);
  }

  const preview = page.locator('[data-testid="detail-preview"]');
  await preview.waitFor({ state: "visible", timeout: 30_000 });

  const expand = page.locator('[data-testid="detail-preview-expand"]');
  if (await expand.isVisible().catch(() => false)) {
    await expand.click();
    await page.waitForTimeout(600);
  }

  await freezeDetailScrollReveal(page);
  await page.waitForTimeout(400);

  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const shotPath = path.join(SHOT_DIR, `51cha-final-${fixture.slug}.png`);
  await page.screenshot({ path: shotPath, fullPage: true });
  const bytes = fs.statSync(shotPath).size;
  if (bytes < 50_000) {
    throw new Error(`${fixture.slug}: screenshot too small (${bytes} bytes) — likely error page`);
  }
  console.log(`  스크린샷: ${shotPath} (${bytes.toLocaleString()} bytes)`);
}

async function main() {
  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const onlySlug = onlyArg?.split("=")[1];
  const targets = onlySlug
    ? FIXTURES.filter((f) => f.slug === onlySlug)
    : FIXTURES;
  if (targets.length === 0) {
    throw new Error(`알 수 없는 slug: ${onlySlug}. 사용: cosmetics|fashion|food|electronics|pet`);
  }

  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const env = loadEnvLocal();
  for (const [k, v] of Object.entries(env)) {
    if (!process.env[k]) process.env[k] = v;
  }

  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    throw new Error("scripts/auth-state.json 없음 — npx tsx scripts/save-login-state.ts 먼저");
  }
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) throw new Error("PEXELS_API_KEY 필요");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120_000);

  page.on("response", async (response) => {
    const u = response.url();
    if (!u.includes("/api/generate") && !u.includes("/api/enhance")) return;
    if (response.status() >= 400) {
      const body = await response.text().catch(() => "");
      console.error(`  [api ${response.status()}] ${body.slice(0, 300)}`);
    }
  });

  for (const fixture of targets) {
    const shotPath = path.join(SHOT_DIR, `51cha-final-${fixture.slug}.png`);
    if (!process.argv.includes("--force") && fs.existsSync(shotPath)) {
      console.log(`[skip] ${fixture.slug} — already captured (${shotPath})`);
      continue;
    }
    const assetDir = path.join(ASSET_ROOT, fixture.slug);
    console.log(`[images] ${fixture.slug} Pexels 크롤…`);
    const images = await crawlPexels(apiKey, fixture.queries, assetDir);
    await runCategory(page, fixture, images);
  }

  await browser.close();
  console.log("\n51차 Tier 2 완료 — review/qa-screenshots/51cha-final-*.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
