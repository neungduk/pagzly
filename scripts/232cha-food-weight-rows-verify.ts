/**
 * 232차 — FOOD nutrition_table 무게 게이트 + export visibleRows 동기화 검증 (API 0).
 *   npx tsx scripts/232cha-food-weight-rows-verify.ts
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { getCategoryTheme } from "../lib/category-theme";
import { isFoodCategory } from "../lib/food-compliance";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { matchWeightComparisonRow } from "../lib/weight-comparison-diagram";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "232cha-food-weight-rows");

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log("OK", msg);
}

/** Mirror of live/export gate after 232 */
function weightGate(
  category: string,
  slot: string,
  rows: { label: string; value: string }[],
) {
  const visibleRows = rows.filter((row) => row.label.trim());
  const ok =
    (slot === "spec_table" ||
      (isFoodCategory(category) && slot === "nutrition_table")) &&
    category !== "의류/패션";
  return ok ? matchWeightComparisonRow(visibleRows) : null;
}

function countWeightDiagram(html: string): number {
  return (html.match(/aria-label="무게 비교 다이어그램"/g) || []).length;
}

function esbuild(rel: string) {
  execSync(
    `npx esbuild "${rel}" --bundle=false --format=esm --loader:.tsx=tsx --outfile=NUL`,
    { cwd: ROOT, stdio: "pipe", shell: true },
  );
  console.log("OK esbuild", rel);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  console.log("=== esbuild ===");
  esbuild("lib/export-detail-html.ts");
  esbuild("components/DetailSectionRenderer.tsx");

  console.log("=== unit: weight gate ===");
  const foodRows = [{ label: "중량", value: "450g" }];
  const mNutrition = weightGate("식품/건강기능식품", "nutrition_table", foodRows);
  console.log("FOOD nutrition_table", mNutrition);
  assert(!!mNutrition && mNutrition.g === 450, "FOOD nutrition_table → g:450");

  const mSpecFood = weightGate("식품/건강기능식품", "spec_table", foodRows);
  assert(!!mSpecFood && mSpecFood.g === 450, "FOOD spec_table still matches (legacy path)");

  const mElec = weightGate("전자제품", "spec_table", foodRows);
  assert(!!mElec && mElec.g === 450, "electronics spec_table still matches");

  const mFashion = weightGate("의류/패션", "size_table", foodRows);
  assert(mFashion === null, "fashion excluded");

  console.log("=== unit: ghost row ===");
  const rawRows = [
    { label: "", value: "1개당 250g 소분 포장" },
    { label: "원산지", value: "국내산" },
  ];
  const ghost = matchWeightComparisonRow(rawRows);
  console.log("unfiltered ghost", ghost);
  assert(!!ghost && ghost.g === 250, "unfiltered empty-label → ghost match");

  const visibleRows = rawRows.filter((r) => r.label.trim());
  const filtered = matchWeightComparisonRow(visibleRows);
  console.log("filtered", filtered);
  assert(filtered === null, "visibleRows filter → null (live/export parity)");

  console.log("=== export FOOD snapshot ===");
  const food = JSON.parse(
    fs.readFileSync(path.join(ROOT, "review", "181cha-live", "food", "session.json"), "utf8"),
  ) as {
    productName?: string;
    category: string;
    imageUrls?: string[];
    generated: { sections: DetailSection[] };
  };
  const sections = food.generated.sections.map((sec) => {
    if (sec.type !== "spec_table" || sec.slot !== "nutrition_table") return sec;
    return {
      ...sec,
      rows: [{ label: "중량", value: "450g" }, ...sec.rows],
    };
  });
  const foodHtml = buildDetailPageHtml({
    productName: food.productName ?? "food",
    category: food.category,
    sections,
    imageUrls: food.imageUrls ?? [],
    theme: getCategoryTheme(food.category),
  });
  fs.writeFileSync(path.join(OUT, "food-export.html"), foodHtml, "utf8");
  const foodWeights = countWeightDiagram(foodHtml);
  console.log("food weight diagrams", foodWeights);
  assert(foodWeights >= 1, "FOOD export contains 무게 비교");
  assert(foodHtml.includes("무게 비교"), "FOOD export has 무게 비교 title");

  console.log("=== regression: electronics / pet / living ===");
  for (const name of ["electronics", "pet", "living"] as const) {
    const sess = JSON.parse(
      fs.readFileSync(path.join(ROOT, "review", "181cha-live", name, "session.json"), "utf8"),
    ) as typeof food;
    // ensure a weight row on first spec_table if missing
    const patched = sess.generated.sections.map((sec) => {
      if (sec.type !== "spec_table" || sec.slot !== "spec_table") return sec;
      const has = sec.rows.some((r) => /중량|무게|무게\(/.test(r.label));
      if (has) return sec;
      return { ...sec, rows: [{ label: "중량", value: "1.2kg" }, ...sec.rows] };
    });
    const html = buildDetailPageHtml({
      productName: sess.productName ?? name,
      category: sess.category,
      sections: patched,
      imageUrls: sess.imageUrls ?? [],
      theme: getCategoryTheme(sess.category),
    });
    const n = countWeightDiagram(html);
    console.log(name, "weight diagrams", n);
    assert(n >= 1, `${name} still renders weight diagram`);
    fs.writeFileSync(path.join(OUT, `${name}-export.html`), html, "utf8");
  }

  // ghost must not appear in export when empty label present
  {
    const ghostSec: DetailSection = {
      type: "spec_table",
      slot: "nutrition_table",
      heading: "영양",
      rows: rawRows,
    };
    const html = buildDetailPageHtml({
      productName: "ghost",
      category: "식품/건강기능식품",
      sections: [ghostSec],
      imageUrls: [],
      theme: getCategoryTheme("식품/건강기능식품"),
    });
    assert(countWeightDiagram(html) === 0, "export filters ghost empty-label weight");
    assert(!html.includes("<th") || !html.match(/<th[^>]*>\s*<\/th>/), "no empty th cells ideally");
  }

  // screenshot food weight section
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 720, height: 1100 } });
  await page.goto(`file:///${path.join(OUT, "food-export.html").replace(/\\/g, "/")}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(400);
  const el = page.locator('[aria-label="무게 비교 다이어그램"]').first();
  if (await el.count()) {
    await el.scrollIntoViewIfNeeded();
    const box = await el.boundingBox();
    if (box) {
      await page.screenshot({
        path: path.join(OUT, "food-weight-diagram.png"),
        clip: {
          x: 0,
          y: Math.max(0, box.y - 80),
          width: 720,
          height: Math.min(500, box.height + 160),
        },
      });
      console.log("saved food-weight-diagram.png");
    }
  }
  await browser.close();

  // scope: only 2 files for 232 feature
  const diffFiles = execSync("git diff --name-only -- components/DetailSectionRenderer.tsx lib/export-detail-html.ts", {
    cwd: ROOT,
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  console.log("touched (among allowed)", diffFiles);
  assert(
    !execSync("git diff -- lib/weight-comparison-diagram.ts lib/section-display-budget.ts", {
      cwd: ROOT,
      encoding: "utf8",
    }).includes("232차"),
    "weight-comparison / display-budget untouched by 232 comments",
  );

  console.log("API generate: 0");
  console.log("ALL PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
