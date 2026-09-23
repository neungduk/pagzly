/**
 * 181차 — 6카테고리 실생성 (입력 기근 회피: 성분/인증/수치/후기 풍부).
 * 160cha-live-generate + 172cha-live-fashion 패턴.
 *
 *   npx tsx scripts/181cha-live-generate.ts              # 전체
 *   npx tsx scripts/181cha-live-generate.ts beauty       # 1건
 *
 * 필요: :3000, auth-state.json, PEXELS_API_KEY
 */
import { chromium, type Page } from "playwright";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { freezeDetailScrollReveal } from "./capture-utils";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const OUT_ROOT = path.join(ROOT, "review", "181cha-live");
const ASSET_DIR = path.join(__dirname, "test-assets", "_181cha-live");
const REVIEW_FILE = path.join(ROOT, "public", "_verify146", "reviews_148cha.txt");
const SHOT = path.join(ROOT, "review", "qa-screenshots");

type ScenarioKey =
  | "beauty"
  | "fashion"
  | "food"
  | "electronics"
  | "living"
  | "pet";

type Scenario = {
  key: ScenarioKey;
  categoryLabel: string;
  productName: string;
  brand: string;
  price: string;
  queries: string[];
  need: number;
  keyFeatures: string;
  ingredients: string;
  certifications: string;
  wholesaleUrl: string;
  target: string;
  withReviews: boolean;
};

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

async function crawlPexels(
  apiKey: string,
  queries: string[],
  need: number,
  prefix: string,
): Promise<string[]> {
  fs.mkdirSync(ASSET_DIR, { recursive: true });
  const seen = new Set<number>();
  const files: string[] = [];
  for (const query of queries) {
    if (files.length >= need) break;
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "8");
    url.searchParams.set("orientation", "portrait");
    const res = await fetch(url.toString(), { headers: { Authorization: apiKey } });
    if (!res.ok) throw new Error(`Pexels ${res.status} ${query}`);
    const data = (await res.json()) as {
      photos: Array<{ id: number; src: { large2x: string; large: string } }>;
    };
    for (const photo of data.photos) {
      if (files.length >= need) break;
      if (seen.has(photo.id)) continue;
      seen.add(photo.id);
      const imgRes = await fetch(photo.src.large2x || photo.src.large);
      if (!imgRes.ok) continue;
      const jpegBuf = await sharp(Buffer.from(await imgRes.arrayBuffer()))
        .jpeg({ quality: 90 })
        .toBuffer();
      const file = path.join(ASSET_DIR, `${prefix}-${photo.id}.jpeg`);
      fs.writeFileSync(file, jpegBuf);
      files.push(file);
    }
  }
  if (files.length < need) throw new Error(`${prefix}: need ${need}, got ${files.length}`);
  return files.slice(0, need);
}

async function fillIfExists(page: Page, selector: string, value: string) {
  const loc = page.locator(selector).first();
  if ((await loc.count()) === 0) return;
  if (!(await loc.isVisible().catch(() => false))) return;
  const tag = await loc.evaluate((el) => el.tagName.toLowerCase());
  if (tag === "select") {
    const opts = await loc.locator("option").allTextContents();
    const match = opts.find((o) =>
      value.split(/[\s·,/]/).some((p) => p.length > 1 && o.includes(p)),
    );
    if (match) await loc.selectOption({ label: match });
    else if (opts.length > 1) await loc.selectOption({ index: 1 });
    return;
  }
  await loc.fill(value);
}

const SCENARIOS: Scenario[] = [
  {
    key: "beauty",
    categoryLabel: "화장품/뷰티",
    productName: "AURA LAB 나이아신아마이드 5% 세럼",
    brand: "AURA LAB",
    price: "28000",
    queries: [
      "serum bottle skincare product photography white background",
      "niacinamide serum dropper studio",
    ],
    need: 7,
    keyFeatures:
      "나이아신아마이드 5%, 히알루론산, 판테놀. 비교축: 수분감·흡수속도·끈적임·자극도. 민감피부 추천. 이런 분께 추천: 속건조·톤케어. 확인 후 구매: 레티놀과 동시 사용 시 자극 가능.",
    ingredients:
      "Water, Niacinamide 5%, Sodium Hyaluronate, Panthenol, Glycerin, 1,2-Hexanediol. 전성분 표기 있음.",
    certifications: "화장품책임판매업, 동물실험 없음, 피부자극 테스트 완료(자체, n=32)",
    wholesaleUrl: "ingredient_highlight + comparison_chart(self_assessed) 유도. baselineLabel 화이트리스트만.",
    target: "속건조·톤케어 고민 20~30대 민감피부",
    withReviews: true,
  },
  {
    key: "fashion",
    categoryLabel: "의류/패션",
    productName: "에센셜 오버사이즈 코튼 티셔츠",
    brand: "NEUTRAL LINE",
    price: "39000",
    queries: [
      "oversized cotton t-shirt product photography plain background",
      "beige cotton tee flat lay studio",
    ],
    need: 7,
    keyFeatures:
      "면 100%, 신축성 12%, 세탁 후 수축률 2% 이내, 오버사이즈 핏, 원단 중량 210g/yd. 이런 분께 추천: 루즈핏·데일리. 확인 후 구매: 슬림핏이면 한 사이즈 다운.",
    ingredients: "코튼 100%",
    certifications: "OEKO-TEX Standard 100",
    wholesaleUrl: "혼용률·신축성·수축률로 comparison_chart 가능. 사이즈표는 판매자 확인 필요 허용.",
    target: "데일리 미니멀 룩 20~30대",
    withReviews: true,
  },
  {
    key: "food",
    categoryLabel: "식품/건강기능식품",
    productName: "VITAL LAB 프로바이오틱스 30억",
    brand: "VITAL LAB",
    price: "39000",
    queries: [
      "probiotic powder sachet supplement product photography white background",
      "health supplement stick pack studio white",
      "green probiotic bottle product photo isolated",
    ],
    need: 7,
    keyFeatures:
      "1일 1포 30억 CFU. 임상: 한국화학융합시험연구원 2025.11 n=48 — 유해균 감소 92%, 냄새 개선 86%, 만족도 94%. 단백질·식이섬유 함량 표기. 무첨가(색소·보존료 없음).",
    ingredients:
      "Lactobacillus plantarum, Bifidobacterium lactis, 프락토올리고당, 비타민C. 단백질 2g/포.",
    certifications: "건강기능식품, HACCP, 한국화학융합시험연구원 시험성적서(2025.11, n=48)",
    wholesaleUrl: "stat measured + comparison_chart(함량·무첨가 checklist) 유도.",
    target: "장 건강 관리 직장인",
    withReviews: true,
  },
  {
    key: "electronics",
    categoryLabel: "전자제품",
    productName: "AURA PURE Mini 공기청정기",
    brand: "AURA AIR",
    price: "189000",
    queries: [
      "air purifier product photography white background",
      "compact hepa air cleaner studio",
    ],
    need: 7,
    keyFeatures:
      "소음도 24dB(최저), 조작패널 IPX5, H13 HEPA, CADR 120㎥/h, 타이머 1·2·4·8h, 필터 교체 알림. 비교축: CADR·소음·필터등급.",
    ingredients:
      "소음도 24dB / 방수등급 IPX5 / 소비전력 28W / 필터 H13 / 크기 22×38×22cm / CADR 120㎥/h",
    certifications: "KC 인증, RoHS, 에너지소비효율 1등급",
    wholesaleUrl: "noise + IP diagram + comparison_chart 수치 입력 충분.",
    target: "원룸·침실 공기질 고민 20~40대",
    withReviews: false,
  },
  {
    key: "living",
    categoryLabel: "생활용품",
    productName: "솔리드 스틸 모듈 선반 5단",
    brand: "FRAME HOME",
    price: "89000",
    queries: [
      "metal shelf product photography white background",
      "modular steel rack studio shot",
    ],
    need: 7,
    keyFeatures:
      "최대 하중 80kg/단, 분체도장 스틸, 내구성 수명 설계 5년, 조립 공구 포함 세트. 이런 분께 추천: 수납 확장. 확인 후 구매: 벽 고정 권장(지진 대비).",
    ingredients: "스틸 프레임, ABS 선반판, 분체도장",
    certifications: "KC 생활용품 안전확인, 하중 테스트 성적(자체, 80kg)",
    wholesaleUrl: "하중·수명으로 comparison_chart / tradeoff 유도.",
    target: "원룸·오피스텔 수납 필요 1인 가구",
    withReviews: false,
  },
  {
    key: "pet",
    categoryLabel: "반려동물",
    productName: "PAW PLAIN 그레인프리 독 사료 2kg",
    brand: "PAW PLAIN",
    price: "42000",
    queries: [
      "dog food bag product photography white background",
      "grain free dog kibble package studio",
    ],
    need: 7,
    keyFeatures:
      "조단백질 28%, 수분 10%, 동물성 원료 비율 높음, 그레인프리. 성견 급여 권장. 이런 분께 추천: 건식 급여. 확인 후 구매: 알레르기 원료 확인(닭·연어).",
    ingredients: "닭고기, 연어, 고구마, 완두콩. 조단백질 28%, 조지방 15%, 수분 10%.",
    certifications: "동물용 사료 신고, 원산지 표기(닭: 국산)",
    wholesaleUrl: "조단백·포함여부 checklist comparison_chart. 질병 치료 단정 금지.",
    target: "성견 건식 급여 보호자",
    withReviews: true,
  },
];

async function runScenario(cfg: Scenario) {
  const outDir = path.join(OUT_ROOT, cfg.key);
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(SHOT, { recursive: true });

  const env = loadEnvLocal();
  for (const [k, v] of Object.entries(env)) {
    if (!process.env[k]) process.env[k] = v;
  }
  if (!fs.existsSync(STORAGE_STATE_PATH)) throw new Error("scripts/auth-state.json 없음");
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) throw new Error("PEXELS_API_KEY 필요");

  console.log(`[${cfg.key}] crawl images…`);
  const images = await crawlPexels(apiKey, cfg.queries, cfg.need, cfg.key);

  const inputSnapshot = {
    ...cfg,
    imageCount: images.length,
    imageFiles: images.map((f) => path.basename(f)),
    at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(outDir, "input.json"), JSON.stringify(inputSnapshot, null, 2));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(180_000);

  let generateHits = 0;
  const costLogs: string[] = [];
  page.on("request", (req) => {
    const u = req.url();
    if (
      req.method() === "POST" &&
      u.includes("/api/generate") &&
      !u.includes("/api/generate-backdrop")
    ) {
      generateHits += 1;
      console.log(`[${cfg.key}] /api/generate #${generateHits}`);
    }
  });
  page.on("console", (msg) => {
    const t = msg.text();
    if (/\[cost\]|generationCost|photoProcessing|replicate|recraft/i.test(t)) {
      costLogs.push(t.slice(0, 400));
      console.log(`[browser] ${t.slice(0, 220)}`);
    }
  });

  await page.goto(`${BASE_URL}/create/detail`, { waitUntil: "networkidle" });
  if (page.url().includes("/login") || page.url().includes("/auth")) {
    throw new Error(`auth expired — ${page.url()}`);
  }
  await page.waitForSelector("select", { timeout: 60_000 });

  const catSelect = page.locator("select").first();
  const labels = await catSelect.locator("option").allTextContents();
  const matchLabel =
    labels.find((l) => l.includes(cfg.categoryLabel.split("/")[0]!)) ||
    labels.find((l) =>
      cfg.categoryLabel.split(/[/\s]/).some((p) => p.length > 1 && l.includes(p)),
    );
  if (!matchLabel) throw new Error(`category not found: ${cfg.categoryLabel} in ${labels.join("|")}`);
  await catSelect.selectOption({ label: matchLabel });

  const fileInput = page.locator('input[type="file"][accept*="image"]').first();
  await fileInput.setInputFiles(images);
  await page.waitForTimeout(1500);
  const thumbCount = await page.locator('img[src^="blob:"], img[alt*="업로드"]').count().catch(() => 0);
  console.log(`[${cfg.key}] uploaded thumbs≈${thumbCount} files=${images.length}`);

  await page.fill("#productName", cfg.productName);
  await fillIfExists(page, "#brandName", cfg.brand);
  await page.fill("#price", cfg.price);
  await fillIfExists(page, "#targetCustomer", cfg.target);
  await fillIfExists(page, "#keyFeatures", cfg.keyFeatures);
  await fillIfExists(page, "#ingredients", cfg.ingredients);
  await fillIfExists(page, "#certifications", cfg.certifications);
  await fillIfExists(page, "#wholesaleUrl", cfg.wholesaleUrl);
  if (cfg.withReviews && fs.existsSync(REVIEW_FILE)) {
    const rev = page.locator("#reviewFile");
    if (await rev.count()) await rev.setInputFiles(REVIEW_FILE);
  }

  await page.screenshot({
    path: path.join(outDir, "00-input.png"),
    fullPage: true,
  });
  fs.copyFileSync(path.join(outDir, "00-input.png"), path.join(SHOT, `181cha-${cfg.key}-input.png`));

  const apiHits: string[] = [];
  page.on("response", (res) => {
    const u = res.url();
    if (u.includes("/api/")) {
      apiHits.push(`${res.status()} ${res.request().method()} ${u.replace(BASE_URL, "")}`);
      console.log(`[${cfg.key}] api ${apiHits[apiHits.length - 1]}`);
    }
  });

  const submit = page.getByRole("button", { name: /AI 상세페이지 생성하기/ });
  await submit.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await submit.click({ force: true });
  console.log(`[${cfg.key}] waiting draft…`);
  try {
    await page.waitForURL(/\/create\/draft/, { timeout: 480_000 });
  } catch (e) {
    await page.screenshot({ path: path.join(outDir, "00-stuck.png"), fullPage: true });
    const body = await page.locator("body").innerText().catch(() => "");
    const errEl = await page.locator(".text-red-600, [role=alert]").allTextContents().catch(() => []);
    fs.writeFileSync(
      path.join(outDir, "stuck.txt"),
      `url=${page.url()}\napiHits=${JSON.stringify(apiHits)}\nerrors=${JSON.stringify(errEl)}\nbody=${body.slice(0, 4000)}\n`,
      "utf8",
    );
    throw e;
  }
  await page.screenshot({ path: path.join(outDir, "01-draft.png"), fullPage: true });

  await page.getByRole("button", { name: /승인하고 최종 생성/ }).click();
  try {
    const picker = page.locator('[data-testid="backdrop-picker"]');
    await picker.waitFor({ state: "visible", timeout: 420_000 });
    const c0 = page.locator('[data-testid="backdrop-candidate-0"]');
    if (await c0.count()) await c0.click();
    await page.locator('[data-testid="backdrop-confirm"]').click();
  } catch {
    console.log(`[${cfg.key}] no backdrop picker`);
  }

  // backdrop 실패 시 draft가 photoPending 확인 UI를 띄움 — 원본으로 계속
  try {
    const continueBtn = page.getByRole("button", {
      name: /이대로 최종 생성|이대로 진행|원본.*진행|원본으로/,
    });
    await continueBtn.waitFor({ state: "visible", timeout: 90_000 });
    console.log(`[${cfg.key}] backdrop failed → continue with originals`);
    await continueBtn.click();
  } catch {
    // picker 성공·자동 진행이면 없음
  }

  await page.waitForURL(/\/create\/result/, { timeout: 600_000 });
  await page.waitForTimeout(2500);
  await freezeDetailScrollReveal(page).catch(() => undefined);

  const sessionRaw = await page.evaluate(() => sessionStorage.getItem("pagzly-create-result"));
  if (sessionRaw) fs.writeFileSync(path.join(outDir, "session.json"), sessionRaw, "utf8");
  const session = sessionRaw
    ? (JSON.parse(sessionRaw) as {
        generated?: {
          sections?: Array<{
            type: string;
            slot?: string;
            metrics?: unknown[];
            baselineLabel?: string;
            presentationStyle?: string;
          }>;
        };
        generationCost?: number;
        photoProcessingCost?: number;
      })
    : {};
  const sections = session.generated?.sections ?? [];
  const types = sections.map((s) => `${s.type}:${s.slot ?? ""}`);
  const chart = sections.find((s) => s.type === "comparison_chart");

  const preview = page.locator('[data-testid="detail-preview"]').first();
  await preview.waitFor({ state: "visible", timeout: 45_000 });
  const expand = page
    .locator('[data-testid="result-desktop-split"] [data-testid="detail-preview-expand"]')
    .first();
  if (await expand.count()) {
    await expand.click();
    await page.waitForTimeout(400);
  }
  await preview.screenshot({ path: path.join(outDir, "02-preview.png") });
  fs.copyFileSync(path.join(outDir, "02-preview.png"), path.join(SHOT, `181cha-${cfg.key}-preview.png`));
  await page.screenshot({ path: path.join(outDir, "03-result-full.png"), fullPage: true });
  fs.copyFileSync(
    path.join(outDir, "03-result-full.png"),
    path.join(SHOT, `181cha-${cfg.key}-full.png`),
  );

  // mid-page rhythm capture
  await page.evaluate(() => window.scrollBy(0, 1200));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "04-mid.png") });
  fs.copyFileSync(path.join(outDir, "04-mid.png"), path.join(SHOT, `181cha-${cfg.key}-mid.png`));

  const summary = {
    key: cfg.key,
    category: cfg.categoryLabel,
    productName: cfg.productName,
    generateHits,
    sectionCount: sections.length,
    hasComparisonChart: Boolean(chart),
    chartBaseline: chart?.baselineLabel ?? null,
    chartStyle: chart?.presentationStyle ?? null,
    chartMetrics: chart?.metrics?.length ?? 0,
    generationCost: session.generationCost ?? null,
    photoProcessingCost: session.photoProcessingCost ?? null,
    costLogs: costLogs.slice(0, 20),
    types,
  };
  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));

  await browser.close();
  return summary;
}

async function main() {
  const arg = process.argv[2] as ScenarioKey | undefined;
  const list = arg ? SCENARIOS.filter((s) => s.key === arg) : SCENARIOS;
  if (arg && list.length === 0) {
    console.error(`unknown scenario ${arg}`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_ROOT, { recursive: true });
  const results = [];
  for (const s of list) {
    results.push(await runScenario(s));
  }
  const rollup = {
    at: new Date().toISOString(),
    count: results.length,
    totalGenerationCost: results.reduce((a, r) => a + (Number(r.generationCost) || 0), 0),
    totalPhotoCost: results.reduce((a, r) => a + (Number(r.photoProcessingCost) || 0), 0),
    generateHits: results.reduce((a, r) => a + r.generateHits, 0),
    chartByCat: Object.fromEntries(results.map((r) => [r.key, r.hasComparisonChart])),
    results,
  };
  fs.writeFileSync(path.join(OUT_ROOT, "rollup.json"), JSON.stringify(rollup, null, 2));
  console.log("[181] rollup", JSON.stringify(rollup, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
