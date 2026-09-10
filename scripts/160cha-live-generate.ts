/**
 * 160차 — 실라이브 /api/generate 검증 (전자제품: 소음+IP, 식품: 각주, 뷰티: comparison_chart).
 * 풍부한 텍스트 입력으로 input starvation을 피한다.
 *
 * 실행 (dev 서버 + auth-state 필요):
 *   npx tsx scripts/160cha-live-generate.ts electronics
 *   npx tsx scripts/160cha-live-generate.ts food
 *   npx tsx scripts/160cha-live-generate.ts beauty
 */
import { chromium, type Page } from "playwright";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { freezeDetailScrollReveal } from "./capture-utils";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const OUT_ROOT = path.join(ROOT, "review", "160cha-live");
const ASSET_DIR = path.join(__dirname, "test-assets", "_160cha-live");

type Scenario = "electronics" | "food" | "beauty";

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

async function crawlPexels(apiKey: string, queries: string[], need: number): Promise<string[]> {
  fs.mkdirSync(ASSET_DIR, { recursive: true });
  const seen = new Set<number>();
  const files: string[] = [];
  for (const query of queries) {
    if (files.length >= need) break;
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "6");
    url.searchParams.set("orientation", "portrait");
    const res = await fetch(url.toString(), { headers: { Authorization: apiKey } });
    if (!res.ok) throw new Error(`Pexels ${res.status}`);
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
      const file = path.join(ASSET_DIR, `160-${photo.id}.jpeg`);
      fs.writeFileSync(file, jpegBuf);
      files.push(file);
    }
  }
  if (files.length < need) throw new Error(`need ${need} images, got ${files.length}`);
  return files.slice(0, need);
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

const SCENARIOS: Record<
  Scenario,
  {
    category: string;
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
  }
> = {
  electronics: {
    category: "전자제품",
    productName: "AURA PURE Mini 공기청정기",
    brand: "AURA AIR",
    price: "189000",
    queries: [
      "air purifier product photography white background",
      "compact air cleaner studio shot",
      "hepa air purifier isolated",
    ],
    need: 6,
    keyFeatures:
      "소음도 24dB(최저 모드), 방수등급 해당없음(본체 생활방수 IPX0), 실제 스펙표 행으로: 소음도 24dB / 방수등급 IPX5(조작패널), H13 HEPA, CADR 120㎥/h, 타이머 1·2·4·8h, 필터 교체 알림, 앱 연동",
    ingredients:
      "소음도: 24dB, 방수등급: IPX5, 소비전력: 28W, 필터: H13 HEPA, 크기: 가로 22cm 높이 38cm 깊이 22cm, CADR: 120㎥/h",
    certifications: "KC 인증, RoHS, 에너지소비효율 1등급",
    wholesaleUrl:
      "스펙표 필수 행 — 소음도 24dB / 방수등급 IPX5 / 필터 H13 / CADR 120. 비교축: CADR·소음·필터등급을 업계 평균 대비 자체평가 가능.",
    target: "원룸·침실 공기질 고민 20~40대",
  },
  food: {
    category: "식품/건강기능식품",
    productName: "VITAL LAB 프로바이오틱스 30억",
    brand: "VITAL LAB",
    price: "39000",
    queries: [
      "probiotic supplement bottle product photography white background",
      "vitamin capsule bottle studio",
      "health supplement jar isolated",
    ],
    need: 5,
    keyFeatures:
      "임상 근거(동일 출처 반복): 한국화학융합시험연구원 2025.11 n=48 — 유해균 감소 92%, 냄새 개선 86%, 만족도 94%. 별도 출처: 피부임상연구센터 2026.01 n=32 — 자극 없음 100%. 1일 1포 30억 CFU.",
    ingredients:
      "Lactobacillus plantarum, Bifidobacterium lactis, 프락토올리고당, 비타민C. 임상 수치를 stat_infographic에 measured+sourceNote로 채울 것(동일 출처는 같은 sourceNote 문자열).",
    certifications: "건강기능식품, HACCP, 한국화학융합시험연구원 시험성적서(2025.11, n=48)",
    wholesaleUrl:
      "판매자 입력 임상: 한국화학융합시험연구원, 2025.11, n=48 — 유해균 감소 92% / 냄새 개선 86% / 만족도 94%. 피부임상연구센터, 2026.01, n=32 — 자극 없음 100%.",
    target: "장 건강 관리하는 직장인",
  },
  beauty: {
    category: "화장품/뷰티",
    productName: "AURA LAB 나이아신아마이드 세럼",
    brand: "AURA LAB",
    price: "28000",
    queries: [
      "serum bottle skincare product photography white background",
      "niacinamide serum dropper studio",
      "cosmetic serum bottle isolated",
    ],
    need: 6,
    keyFeatures:
      "나이아신아마이드 5%, 히알루론산, 판테놀. 비교 가능 축: 수분감·흡수속도·끈적임·자극도. 일반 제품 대비 자체평가 가능. SPF 없음.",
    ingredients:
      "Water, Niacinamide 5%, Sodium Hyaluronate, Panthenol, Glycerin, 1,2-Hexanediol. 전성분 표기 있음 → comparison_chart 채움(self_assessed 허용).",
    certifications: "화장품책임판매업, 동물실험 없음",
    wholesaleUrl:
      "ingredient_highlight + comparison_chart 필수. baselineLabel은 일반 제품/업계 평균/타 제품만.",
    target: "속건조·톤케어 고민 20~30대",
  },
};

async function runScenario(scenario: Scenario) {
  const cfg = SCENARIOS[scenario];
  const outDir = path.join(OUT_ROOT, scenario);
  fs.mkdirSync(outDir, { recursive: true });

  const env = loadEnvLocal();
  for (const [k, v] of Object.entries(env)) {
    if (!process.env[k]) process.env[k] = v;
  }
  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    throw new Error("scripts/auth-state.json 없음");
  }
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) throw new Error("PEXELS_API_KEY 필요");

  console.log(`[${scenario}] crawl images…`);
  const images = await crawlPexels(apiKey, cfg.queries, cfg.need);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120_000);

  const iconLogs: string[] = [];
  page.on("console", (msg) => {
    const t = msg.text();
    if (/\[concept-icons\]|\[cost\]|comparison_chart|sourceNote|Noise|IPX|error/i.test(t)) {
      console.log(`[browser] ${t.slice(0, 280)}`);
      if (/concept-icons/.test(t)) iconLogs.push(t);
    }
  });

  await page.goto(`${BASE_URL}/create`, { waitUntil: "networkidle" });
  await page.locator("select").first().selectOption({ label: cfg.category });
  await page.setInputFiles('input[type="file"][accept*="image/jpeg"]', images);
  await page.fill("#productName", cfg.productName);
  await fillIfExists(page, "#brandName", cfg.brand);
  await page.fill("#price", cfg.price);
  await fillIfExists(page, "#targetCustomer", cfg.target);
  await fillIfExists(page, "#keyFeatures", cfg.keyFeatures);
  await fillIfExists(page, "#ingredients", cfg.ingredients);
  await fillIfExists(page, "#certifications", cfg.certifications);
  await fillIfExists(page, "#wholesaleUrl", cfg.wholesaleUrl);

  await page.click('button[type="submit"]');
  console.log(`[${scenario}] draft waiting…`);
  await page.waitForURL(/\/create\/draft/, { timeout: 480_000 });
  await page.screenshot({ path: path.join(outDir, "01-draft.png"), fullPage: true });

  await page.getByRole("button", { name: /승인하고 최종 생성/ }).click();
  try {
    const picker = page.locator('[data-testid="backdrop-picker"]');
    await picker.waitFor({ state: "visible", timeout: 420_000 });
    const c0 = page.locator('[data-testid="backdrop-candidate-0"]');
    if (await c0.count()) await c0.click();
    await page.locator('[data-testid="backdrop-confirm"]').click();
  } catch {
    console.log(`[${scenario}] no backdrop picker`);
  }

  await page.waitForURL(/\/create\/result/, { timeout: 480_000 });
  await page.waitForTimeout(2500);
  await freezeDetailScrollReveal(page);

  const session = await page.evaluate(() => sessionStorage.getItem("pagzly-create-result"));
  if (session) {
    fs.writeFileSync(path.join(outDir, "session.json"), session, "utf8");
    const parsed = JSON.parse(session) as {
      generated?: { sections?: Array<{ type: string; slot?: string; rows?: unknown; metrics?: unknown; baselineLabel?: string }> };
    };
    const sections = parsed.generated?.sections ?? [];
    const types = sections.map((s) => `${s.type}:${s.slot ?? ""}`);
    const hasChart = sections.some((s) => s.type === "comparison_chart");
    const spec = sections.find((s) => s.type === "spec_table" && s.slot === "spec_table");
    const stat = sections.find((s) => s.type === "stat_infographic");
    fs.writeFileSync(
      path.join(outDir, "analysis.json"),
      JSON.stringify(
        {
          sectionTypes: types,
          hasComparisonChart: hasChart,
          specRows: spec && "rows" in spec ? spec.rows : null,
          statMetrics: stat && "metrics" in stat ? stat.metrics : null,
          iconLogs,
        },
        null,
        2,
      ),
      "utf8",
    );
    console.log(
      `[${scenario}] sections=${sections.length} chart=${hasChart} types=${types.join(", ")}`,
    );
  }

  const preview = page.locator('[data-testid="detail-preview"]');
  await preview.waitFor({ state: "visible", timeout: 30_000 });
  await preview.screenshot({ path: path.join(outDir, "02-detail-preview.png") });
  await page.screenshot({ path: path.join(outDir, "03-result-full.png"), fullPage: true });

  // scroll to INFO / stats if present
  await page.evaluate(() => {
    const el =
      document.querySelector('[aria-label="소음 비교 다이어그램"]') ||
      document.querySelector('[aria-label="방수 등급 비교 다이어그램"]') ||
      Array.from(document.querySelectorAll("p")).find((p) => /수치로|임상|INFO/.test(p.textContent || ""));
    el?.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "04-target-section.png") });

  await browser.close();
  console.log(`[${scenario}] done → ${outDir}`);
}

const arg = (process.argv[2] as Scenario) || "electronics";
if (!["electronics", "food", "beauty"].includes(arg)) {
  console.error("usage: electronics|food|beauty");
  process.exit(1);
}
runScenario(arg).catch((err) => {
  console.error(err);
  process.exit(1);
});
