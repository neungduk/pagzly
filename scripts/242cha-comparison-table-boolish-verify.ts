/**
 * 242차 — comparison_table 불린 셀 export 배지 검증 (API 0).
 *   npx tsx scripts/242cha-comparison-table-boolish-verify.ts
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { getCategoryTheme } from "../lib/category-theme";
import { classifyBoolishCell } from "../lib/comparison-cell-classify";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "242cha-comparison-table-boolish");

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log("OK", msg);
}

function count(hay: string, needle: string): number {
  let n = 0;
  let i = 0;
  while (true) {
    const j = hay.indexOf(needle, i);
    if (j < 0) break;
    n += 1;
    i = j + needle.length;
  }
  return n;
}

const CASES: { input: string; expect: "yes" | "no" | null }[] = [
  { input: "있음", expect: "yes" },
  { input: "없음", expect: "no" },
  { input: "지원", expect: "yes" },
  { input: "미지원", expect: "no" },
  { input: "O", expect: "yes" },
  { input: "X", expect: "no" },
  { input: "o", expect: "yes" },
  { input: "x", expect: "no" },
  { input: "예", expect: "yes" },
  { input: "아니오", expect: "no" },
  { input: "✓", expect: "yes" },
  { input: "✗", expect: "no" },
  { input: "가능", expect: "yes" },
  { input: "불가", expect: "no" },
  { input: "포함", expect: "yes" },
  { input: "미포함", expect: "no" },
  { input: "yes", expect: "yes" },
  { input: "no", expect: "no" },
  { input: "○", expect: "yes" },
  { input: "×", expect: "no" },
  { input: "  있음  ", expect: "yes" },
  { input: "", expect: null },
  { input: "   ", expect: null },
  { input: "3.5kg", expect: null },
  { input: "무료배송", expect: null },
  { input: "지원함", expect: null },
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  for (const f of [
    "lib/comparison-cell-classify.ts",
    "lib/export-detail-html.ts",
    "components/DetailSectionRenderer.tsx",
  ]) {
    const loader = f.endsWith(".tsx") ? " --loader:.tsx=tsx" : "";
    execSync(
      `npx esbuild "${f}" --bundle=false --format=esm${loader} --outfile=NUL`,
      { cwd: ROOT, stdio: "pipe", shell: true },
    );
    console.log("OK esbuild", f);
  }

  for (const c of CASES) {
    const got = classifyBoolishCell(c.input);
    assert(got === c.expect, `classify(${JSON.stringify(c.input)}) → ${got} (want ${c.expect})`);
  }

  // Shared file body matches live intent (no local classify left in renderer)
  const renderer = fs.readFileSync(
    path.join(ROOT, "components", "DetailSectionRenderer.tsx"),
    "utf8",
  );
  assert(
    renderer.includes('from "@/lib/comparison-cell-classify"') &&
      !/function classifyBoolishCell\(/.test(renderer),
    "renderer imports shared classify; no local definition",
  );

  const sections: DetailSection[] = [
    {
      type: "hero",
      slot: "hero",
      headline: "히어로",
      subheadline: "서브",
      imageIndex: 0,
    } as DetailSection,
    {
      type: "comparison_table",
      slot: "comparison_table",
      heading: "스펙 비교",
      columns: ["일반", "본 제품"],
      rows: [
        { label: "방수", values: ["있음", "없음"] },
        { label: "무선", values: ["지원", "미지원"] },
        { label: "보증", values: ["O", "X"] },
        { label: "무게", values: ["3.5kg", "2.1kg"] },
      ],
    } as DetailSection,
    {
      type: "comparison_chart",
      slot: "comparison_chart",
      heading: "수치 비교",
      ourLabel: "본 제품",
      baselineLabel: "일반",
      unit: "%",
      presentationStyle: "checklist",
      metrics: [
        { label: "방수", ourValue: 100, baselineValue: 0 },
        { label: "무선", ourValue: 100, baselineValue: 100 },
      ],
    } as DetailSection,
    {
      type: "cta_price",
      slot: "cta_price",
      price: 39000,
      badges: [],
    } as DetailSection,
  ];

  const html = buildDetailPageHtml({
    productName: "비교표배지테스트",
    category: "전자제품",
    sections,
    imageUrls: [],
    theme: getCategoryTheme("전자제품"),
  });
  fs.writeFileSync(path.join(OUT, "comparison-table-export.html"), html, "utf8");

  assert(count(html, "border-radius:9999px") >= 6, "≥6 circular badges");
  // 3 boolish rows × 2 cols = 6 badges; checklist chart may add more marks but not 9999px
  const badgeSpans = (html.match(/width:28px;height:28px;border-radius:9999px/g) || []).length;
  assert(badgeSpans === 6, `exactly 6 comparison_table badges (got ${badgeSpans})`);

  assert(html.includes("3.5kg") && html.includes("2.1kg"), "plain text weights present");
  // plain text cells should not wrap kg in badge spans
  assert(
    !/aria-label="3\.5kg"/.test(html) && !/aria-label="2\.1kg"/.test(html),
    "weight cells are not badges",
  );

  const checkMarks = count(html, "&#10003;");
  const xMarks = count(html, "&#10005;");
  // table: yes cells = 있음,지원,O → 3; no = 없음,미지원,X → 3
  // checklist chart also uses ✓/✗ unicode differently (not HTML entities necessarily)
  assert(checkMarks === 3, `exactly 3 check entities in table (got ${checkMarks})`);
  assert(xMarks === 3, `exactly 3 X entities in table (got ${xMarks})`);

  // emphasized (col2) uses 0.2 alpha for yes; col1 uses 0.12
  const yesBgLoose = (html.match(/border-radius:9999px;background:rgba\([^)]+,0\.12\)/g) || [])
    .length;
  const yesBgEmph = (html.match(/border-radius:9999px;background:rgba\([^)]+,0\.2\)/g) || [])
    .length;
  assert(yesBgLoose === 3, `3 yes badges at alpha 0.12 (got ${yesBgLoose})`);
  assert(yesBgEmph === 0, `no emphasized yes in first fixture (got ${yesBgEmph})`);

  // Second fixture: yes in emphasized column
  const html2 = buildDetailPageHtml({
    productName: "비교표배지테스트2",
    category: "전자제품",
    sections: [
      {
        type: "comparison_table",
        slot: "comparison_table",
        heading: "스펙 비교",
        columns: ["일반", "본 제품"],
        rows: [{ label: "방수", values: ["없음", "있음"] }],
      } as DetailSection,
    ],
    imageUrls: [],
    theme: getCategoryTheme("전자제품"),
  });
  const yesBgEmph2 = (
    html2.match(/border-radius:9999px;background:rgba\([^)]+,0\.2\)/g) || []
  ).length;
  const yesBgLoose2 = (
    html2.match(/border-radius:9999px;background:rgba\([^)]+,0\.12\)/g) || []
  ).length;
  assert(yesBgEmph2 === 1, "emphasized yes uses alpha 0.2");
  assert(yesBgLoose2 === 0, "no non-emphasized yes in html2");
  assert(count(html2, "&#10003;") === 1 && count(html2, "&#10005;") === 1, "html2 one each mark");

  // comparison_chart case must not call comparisonCellHtml
  const exportSrc = fs.readFileSync(path.join(ROOT, "lib", "export-detail-html.ts"), "utf8");
  const chartSlice = exportSrc.slice(
    exportSrc.indexOf('case "comparison_chart"'),
    exportSrc.indexOf('case "comparison_chart"') + 3500,
  );
  assert(
    !chartSlice.includes("comparisonCellHtml") && !chartSlice.includes("classifyBoolishCell"),
    "comparison_chart case untouched by boolish helpers",
  );
  assert(html.includes("수치 비교"), "comparison_chart section present");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 750, height: 900 } });
  await page.goto(
    `file:///${path.join(OUT, "comparison-table-export.html").replace(/\\/g, "/")}`,
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForTimeout(400);
  const table = page.locator("table").first();
  await table.scrollIntoViewIfNeeded();
  const box = await table.boundingBox();
  if (box) {
    await page.screenshot({
      path: path.join(OUT, "comparison-table-badges-export.png"),
      clip: {
        x: 0,
        y: Math.max(0, box.y - 40),
        width: 750,
        height: Math.min(500, box.height + 80),
      },
    });
  } else {
    await page.screenshot({ path: path.join(OUT, "comparison-table-badges-export.png") });
  }
  await browser.close();
  console.log("saved comparison-table-badges-export.png");

  console.log("API generate: 0");
  console.log("ALL PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
