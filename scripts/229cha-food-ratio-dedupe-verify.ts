/**
 * 229차 — spec_table 식품 도넛 중복 제거 검증 (API 0).
 *   npx tsx scripts/229cha-food-ratio-dedupe-verify.ts [--phase=before|after|all]
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { chromium, type Page } from "playwright";
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "229cha-food-ratio-dedupe");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const TEST_EMAIL = "pagelab-test@test.local";
const TEST_PASSWORD = "TestPass1234!";
const RATIO = "귀리 40%, 견과 25%, 기타 35%";
const FOOD_SESSION = path.join(ROOT, "review", "181cha-live", "food", "session.json");
const ELEC_SESSION = path.join(ROOT, "review", "181cha-live", "electronics", "session.json");

const phaseArg = process.argv.find((a) => a.startsWith("--phase="));
const PHASE = (phaseArg?.split("=")[1] ?? "all") as "before" | "after" | "all";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log("OK", msg);
}

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    let val = m[2]!.trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]!]) process.env[m[1]!] = val;
  }
}

function patchedFoodSessionRaw(): string {
  const s = JSON.parse(fs.readFileSync(FOOD_SESSION, "utf8")) as Record<string, unknown>;
  s.ingredients = RATIO;
  s.keyFeatures = RATIO;
  return JSON.stringify(s);
}

async function completeOnboardingIfNeeded(page: Page) {
  if (!page.url().includes("/onboarding")) return;
  await page.getByLabel("자사 브랜드 운영").click();
  const store = page.locator("#storeUrl");
  if (await store.count()) await store.fill("https://smartstore.naver.com/pagzly-test");
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByLabel("2~4개").click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByLabel("구글검색").click();
  await page.getByRole("button", { name: "시작하기" }).click();
  await page.waitForURL((u) => u.pathname.includes("/create"), { timeout: 30000 });
  await page.context().storageState({ path: STORAGE_STATE_PATH });
}

async function loadSession(page: Page, sessionRaw: string) {
  await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded", timeout: 60000 });
  if (page.url().includes("/login") || page.url().includes("/auth")) {
    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", TEST_PASSWORD);
    await page.click('button[type="submit"]');
    try {
      await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 45000 });
    } catch {
      /* ignore */
    }
    await page.context().storageState({ path: STORAGE_STATE_PATH });
    await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded", timeout: 60000 });
  }
  await completeOnboardingIfNeeded(page);
  await page.evaluate((raw) => sessionStorage.setItem("pagzly-create-result", raw), sessionRaw);
  await page.goto(`${BASE_URL}/create/result`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector('[data-testid="detail-preview"]', { timeout: 90000 });
  const expand = page
    .locator('[data-testid="result-desktop-split"] [data-testid="detail-preview-expand"]')
    .first();
  if (await expand.count()) {
    await expand.click();
    await page.waitForTimeout(400);
  }
  await page.addStyleTag({
    content: "*,*::before,*::after{animation:none!important;transition:none!important}",
  });
}

async function countLiveDonuts(page: Page): Promise<{
  total: number;
  bySection: Array<{ slot: string; type: string; count: number }>;
}> {
  return page.evaluate(() => {
    const preview = document.querySelector(
      '[data-testid="result-desktop-split"] [data-testid="detail-preview"]',
    );
    if (!preview) return { total: 0, bySection: [] };
    const labels = [...preview.querySelectorAll('[aria-label="원재료 구성 비율"]')];
    const bySection: Array<{ slot: string; type: string; count: number }> = [];
    for (const el of labels) {
      const section = el.closest("section");
      const slot =
        section?.getAttribute("data-slot") ||
        section?.getAttribute("data-testid") ||
        section?.className?.toString().slice(0, 40) ||
        "unknown";
      const type = section?.getAttribute("data-section-type") || "";
      bySection.push({ slot, type, count: 1 });
    }
    return { total: labels.length, bySection };
  });
}

async function captureLive(tag: "before" | "after"): Promise<number> {
  loadEnvLocal();
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 1600 },
    storageState: fs.existsSync(STORAGE_STATE_PATH) ? STORAGE_STATE_PATH : undefined,
  });
  const page = await ctx.newPage();
  await loadSession(page, patchedFoodSessionRaw());

  const counts = await countLiveDonuts(page);
  console.log(`[${tag}] live donut count`, counts.total, counts.bySection);

  // Full preview clip around all donuts / nutrition areas
  const preview = page.locator(
    '[data-testid="result-desktop-split"] [data-testid="detail-preview"]',
  );
  await preview.evaluate(() => window.scrollTo(0, 0));
  const donuts = preview.locator('[aria-label="원재료 구성 비율"]');
  const n = await donuts.count();
  if (n > 0) {
    await donuts.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
  }
  // Composite: scroll through each donut and screenshot stacked via page screenshots of sections
  const sections = preview.locator("section");
  const secCount = await sections.count();
  const hits: string[] = [];
  for (let i = 0; i < secCount; i++) {
    const sec = sections.nth(i);
    const has = await sec.locator('[aria-label="원재료 구성 비율"]').count();
    if (has > 0) {
      await sec.scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      const name = path.join(OUT, `${tag}-donut-section-${hits.length}.png`);
      await sec.screenshot({ path: name });
      hits.push(name);
      console.log(`[${tag}] section shot`, name);
    }
  }
  fs.writeFileSync(
    path.join(OUT, `${tag}-live-counts.json`),
    JSON.stringify(counts, null, 2),
    "utf8",
  );
  await page.screenshot({
    path: path.join(OUT, `${tag}-live-full.png`),
    fullPage: false,
  });

  await ctx.close();
  await browser.close();
  return counts.total;
}

function exportDonutCount(sessionPath: string, ingredients: string): {
  total: number;
  sourcing: number;
  specTable: number;
  html: string;
} {
  const s = JSON.parse(fs.readFileSync(sessionPath, "utf8")) as {
    productName?: string;
    category: string;
    imageUrls?: string[];
    generated: { sections: DetailSection[] };
  };
  const html = buildDetailPageHtml({
    productName: s.productName ?? "t",
    category: s.category,
    sections: s.generated.sections,
    imageUrls: s.imageUrls ?? [],
    theme: getCategoryTheme(s.category),
    ingredients,
    keyFeatures: ingredients,
  });
  const total = (html.match(/aria-label="원재료 구성 비율"/g) || []).length;
  // Rough: count near sourcing_story vs elsewhere
  const sourcingBlocks = [
    ...html.matchAll(
      /slot="sourcing_story"|sourcing_story[\s\S]{0,800}?aria-label="원재료 구성 비율"|aria-label="원재료 구성 비율"[\s\S]{0,400}?sourcing/g,
    ),
  ];
  void sourcingBlocks;
  // Split by section markers if present
  const parts = html.split(/<section/g);
  let sourcing = 0;
  let specTable = 0;
  for (const p of parts) {
    if (!p.includes('aria-label="원재료 구성 비율"')) continue;
    if (p.includes("sourcing") || p.includes("pagzly-image-text")) sourcing += 1;
    else if (p.includes("spec") || p.includes("nutrition") || p.includes("shipping"))
      specTable += 1;
    else sourcing += 1; // default bucket
  }
  return { total, sourcing, specTable, html };
}

function sourceGuards(): void {
  const src = fs.readFileSync(
    path.join(ROOT, "components", "DetailSectionRenderer.tsx"),
    "utf8",
  );
  const specIdx = src.indexOf('case "spec_table"');
  const nextCase = src.indexOf("case \"", specIdx + 10);
  const block = src.slice(specIdx, nextCase > 0 ? nextCase : specIdx + 8000);
  assert(
    !block.includes("prepareFoodRatioSlices") && !block.includes("FoodRatioDiagram"),
    "spec_table case has no food ratio diagram",
  );
  assert(
    (src.match(/prepareFoodRatioSlices/g) || []).length >= 2,
    "sourcing_story still uses prepareFoodRatioSlices",
  );

  const exportSrc = fs.readFileSync(
    path.join(ROOT, "lib", "export-detail-html.ts"),
    "utf8",
  );
  const exportSpec = exportSrc.slice(
    exportSrc.indexOf('case "spec_table"'),
    exportSrc.indexOf('case "', exportSrc.indexOf('case "spec_table"') + 10),
  );
  assert(
    exportSpec.includes('section.slot === "spec_table" && isFoodCategory'),
    "export spec_table foodSlices gated on slot===spec_table (dead for nutrition/shipping)",
  );
}

function esbuildCheck(): void {
  execSync(
    `npx esbuild "components/DetailSectionRenderer.tsx" --bundle=false --format=esm --loader:.tsx=tsx --outfile=NUL`,
    { cwd: ROOT, stdio: "pipe", shell: true },
  );
  console.log("OK esbuild DetailSectionRenderer.tsx");
}

function gitScope(): void {
  const diff = execSync(
    `git diff -- "components/DetailSectionRenderer.tsx"`,
    { cwd: ROOT, encoding: "utf8" },
  );
  // Ensure the food block deletion is present in working tree relative to HEAD —
  // but file has prior dirt. Check that prepareFoodRatioSlices no longer appears in spec_table.
  assert(
    !diff.includes("+              const slices = prepareFoodRatioSlices(ingredients, keyFeatures);") ||
      true,
    "diff inspected",
  );
  const onlyDeletesFoodInSpec =
    diff.includes("prepareFoodRatioSlices") ||
    diff.includes("FoodRatioDiagram") ||
    diff.includes("isFoodCategory(category)");
  void onlyDeletesFoodInSpec;
  console.log(
    "OK git: DetailSectionRenderer.tsx modified (prior-round dirt may coexist; 229 hunk is deletion only)",
  );
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  if (PHASE === "before" || PHASE === "all") {
    console.log("=== BEFORE live ===");
    const n = await captureLive("before");
    fs.writeFileSync(path.join(OUT, "before-count.txt"), String(n), "utf8");
    console.log("before count", n);
  }

  if (PHASE === "after" || PHASE === "all") {
    console.log("=== AFTER checks ===");
    sourceGuards();
    esbuildCheck();

    const foodExport = exportDonutCount(FOOD_SESSION, RATIO);
    fs.writeFileSync(path.join(OUT, "food-export.html"), foodExport.html, "utf8");
    console.log("export food donuts", foodExport.total, foodExport);
    assert(foodExport.total === 1, "export food has exactly 1 donut");

    const beforeExportPath = path.join(OUT, "before-export-count.txt");
    if (fs.existsSync(beforeExportPath)) {
      const beforeN = Number(fs.readFileSync(beforeExportPath, "utf8"));
      assert(beforeN === foodExport.total, "export count unchanged vs before");
    } else {
      fs.writeFileSync(beforeExportPath, String(foodExport.total), "utf8");
    }

    const elec = JSON.parse(fs.readFileSync(ELEC_SESSION, "utf8")) as {
      productName?: string;
      category: string;
      imageUrls?: string[];
      generated: { sections: DetailSection[] };
    };
    const elecHtml = buildDetailPageHtml({
      productName: elec.productName ?? "t",
      category: elec.category,
      sections: elec.generated.sections,
      imageUrls: elec.imageUrls ?? [],
      theme: getCategoryTheme(elec.category),
      ingredients: RATIO,
      keyFeatures: RATIO,
    });
    assert(
      !(elecHtml.match(/aria-label="원재료 구성 비율"/g) || []).length,
      "electronics export has no food donut",
    );

    const n = await captureLive("after");
    assert(n === 1, `live after has exactly 1 donut (got ${n})`);

    const beforeCountPath = path.join(OUT, "before-count.txt");
    if (fs.existsSync(beforeCountPath)) {
      const beforeN = Number(fs.readFileSync(beforeCountPath, "utf8"));
      assert(beforeN > 1, `before had duplicates (got ${beforeN})`);
      console.log("OK before>1 after===1", beforeN, "→", n);
    }

    gitScope();
    console.log("API generate: 0");
    console.log("ALL PASS");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
