/**
 * 화장품 견본 상세페이지 1장 — Pexels 크롤 + /create 풀 플로우 + 고품질 캡처.
 *
 * 실행 (dev 서버 필요):
 *   npx tsx scripts/generate-beauty-showcase-one.ts
 *
 * 산출: review/beauty-showcase-one/
 *   - showcase-detail.png  (상세 미리보기 1장)
 *   - showcase-full.png    (결과 페이지 전체)
 *   - showcase.html        (export HTML)
 *   - session.json
 */

import { chromium, type Page } from "playwright";
import fs from "fs";
import path from "path";
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { freezeDetailScrollReveal } from "./capture-utils";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const OUT_DIR = path.join(ROOT, "review", "beauty-showcase-one");
const ASSET_DIR = path.join(__dirname, "test-assets", "_beauty-showcase-run");
const NEED = 8;

const PRODUCT = {
  category: "화장품/뷰티",
  productName: "라이트 워터 히알루론 세럼",
  brandName: "페이즐리랩",
  price: "34800",
  targetCustomer: "20~30대 속건조·민감 피부",
  keyFeatures:
    "히알루론산 3중 레이어 보습, 워터리 젤 제형, 무향·저자극, 메이크업 전 베이스, 속당김 데일리 케어",
  ingredients: "히알루론산, 판테놀, 병풀추출물, 글리세린, 나이아신아마이드, 알란토인",
  certifications: "비건 포뮬러, 동물실험 없음, 더마 테스트 완료",
  wholesaleUrl:
    "원본: Light Water Hyaluronic Serum 30ml / 스펙: 워터리 세럼, 무향, 민감성 피부 / 사용: 세안 후 2~3방울 / 포인트: 속건조, 끈적임 없음, 아침·저녁 데일리",
};

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
    "skincare serum dropper bottle white background",
    "face serum cosmetic product photography",
    "hyaluronic acid serum bottle minimal",
    "beauty serum texture skincare product",
    "moisturizer serum glass bottle aesthetic",
  ];
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
      const file = path.join(ASSET_DIR, `pexels-${photo.id}.jpeg`);
      fs.writeFileSync(file, buf);
      files.push(file);
      console.log(`[pexels] #${photo.id} ${photo.photographer} → ${path.basename(file)}`);
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
  if (!apiKey) throw new Error("PEXELS_API_KEY가 .env.local에 필요합니다.");

  console.log("[1/5] Pexels 화장품 사진 크롤…");
  const images = await crawlPexels(apiKey);
  fs.writeFileSync(
    path.join(OUT_DIR, "pexels-sources.json"),
    JSON.stringify(images.map((f) => path.basename(f)), null, 2),
    "utf8",
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(480_000);

  console.log("[2/5] /create 폼 (가상 상품 정보)…");
  await page.goto(`${BASE_URL}/create`, { waitUntil: "networkidle" });
  await page.locator("select").first().selectOption({ label: PRODUCT.category });
  await page.setInputFiles('input[type="file"][accept*="image/jpeg"]', images);
  await page.fill("#productName", PRODUCT.productName);
  await fillIfExists(page, "#brandName", PRODUCT.brandName);
  await page.fill("#price", PRODUCT.price);
  await fillIfExists(page, "#targetCustomer", PRODUCT.targetCustomer);
  await fillIfExists(page, "#keyFeatures", PRODUCT.keyFeatures);
  await fillIfExists(page, "#ingredients", PRODUCT.ingredients);
  await fillIfExists(page, "#certifications", PRODUCT.certifications);
  await fillIfExists(page, "#wholesaleUrl", PRODUCT.wholesaleUrl);

  await page.click('button[type="submit"]');
  await page.waitForURL(/\/create\/draft/, { timeout: 480_000 });
  await page.screenshot({ path: path.join(OUT_DIR, "01-draft.png"), fullPage: true });

  console.log("[3/5] 승인 → 최종 생성…");
  await page.getByRole("button", { name: /승인하고 최종 생성/ }).click();

  const picker = page.locator('[data-testid="backdrop-picker"]');
  try {
    await picker.waitFor({ state: "visible", timeout: 420_000 });
    await page.locator('[data-testid="backdrop-candidate-0"]').click();
    await page.locator('[data-testid="backdrop-confirm"]').click();
    console.log("[3/5] 배경 후보 #0 선택");
  } catch {
    console.log("[3/5] 배경 피커 없음 — 계속");
  }

  await page.waitForURL(/\/create\/result/, { timeout: 480_000 });
  await page.waitForTimeout(3000);
  await freezeDetailScrollReveal(page);
  await page.waitForTimeout(500);

  const sessionRaw = await page.evaluate(() => sessionStorage.getItem("pagzly-create-result"));
  if (!sessionRaw) throw new Error("session 없음");
  fs.writeFileSync(path.join(OUT_DIR, "session.json"), sessionRaw, "utf8");

  const session = JSON.parse(sessionRaw) as {
    imageUrls?: string[];
    generated?: {
      sections?: import("../lib/types/generate").DetailSection[];
      theme?: import("../lib/color-extract").ExtractedTheme | null;
      description?: string;
      features?: string[];
      howToUse?: string;
      caution?: string;
    };
    brandName?: string | null;
    certifications?: string | null;
  };

  const theme = session.generated?.theme
    ? { ...getCategoryTheme(PRODUCT.category), ...session.generated.theme }
    : getCategoryTheme(PRODUCT.category);

  if (session.generated?.sections?.length) {
    const html = buildDetailPageHtml({
      productName: PRODUCT.productName,
      brandName: PRODUCT.brandName,
      price: Number(PRODUCT.price),
      category: PRODUCT.category,
      sections: session.generated.sections,
      imageUrls: session.imageUrls ?? [],
      theme,
      description: session.generated.description,
      features: session.generated.features,
      howToUse: session.generated.howToUse,
      caution: session.generated.caution,
      certifications: PRODUCT.certifications,
    });
    fs.writeFileSync(path.join(OUT_DIR, "showcase.html"), html, "utf8");
  }

  console.log("[4/5] 상세 미리보기 캡처 (견본 1장)…");
  const preview = page.locator('[data-testid="detail-preview"]');
  await preview.waitFor({ state: "visible", timeout: 60_000 });
  await preview.screenshot({ path: path.join(OUT_DIR, "showcase-detail.png") });
  await page.screenshot({ path: path.join(OUT_DIR, "showcase-full.png"), fullPage: true });

  const meta = {
    product: PRODUCT,
    sections: session.generated?.sections?.length ?? 0,
    images: session.imageUrls?.length ?? 0,
    capturedAt: new Date().toISOString(),
    output: [
      "showcase-detail.png",
      "showcase-full.png",
      "showcase.html",
      "session.json",
    ],
  };
  fs.writeFileSync(path.join(OUT_DIR, "meta.json"), JSON.stringify(meta, null, 2), "utf8");

  console.log(`[5/5] 완료 → ${OUT_DIR}`);
  console.log(`  견본: showcase-detail.png (${session.generated?.sections?.length ?? 0} 섹션)`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
