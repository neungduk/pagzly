/**
 * 237차 — 패션 사이즈 실측 다이어그램 측정/체형 안내 문구 검증 (API 0).
 *   npx tsx scripts/237cha-size-disclaimer-verify.ts
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { matchSizeDiagramRows } from "../lib/fashion-size-diagram";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "237cha-fashion-size-disclaimer");

const DISCLAIMER_A = "사이즈는 측정 방법에 따라 1~3cm 오차가 발생할 수 있습니다";
const DISCLAIMER_B = "사람마다 체형이 다르기 때문에 착용감이 조금씩 다를 수 있습니다";

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

function buildHtml(
  category: string,
  sections: DetailSection[],
): string {
  return buildDetailPageHtml({
    productName: "사이즈안내테스트",
    category,
    sections,
    imageUrls: [],
    theme: getCategoryTheme(category),
  });
}

function sizeTableSection(
  rows: { label: string; value: string }[],
): DetailSection {
  return {
    type: "spec_table",
    slot: "size_table",
    heading: "사이즈",
    rows,
  } as DetailSection;
}

function minimalPage(category: string, sizeRows: { label: string; value: string }[]): string {
  const sections: DetailSection[] = [
    {
      type: "hero",
      slot: "hero",
      headline: "히어로",
      subheadline: "서브",
      imageIndex: 0,
    } as DetailSection,
    sizeTableSection(sizeRows),
    {
      type: "cta_price",
      slot: "cta_price",
      price: 39000,
      badges: [],
    } as DetailSection,
  ];
  return buildHtml(category, sections);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  for (const f of ["lib/export-detail-html.ts", "components/DetailSectionRenderer.tsx"]) {
    const loader = f.endsWith(".tsx") ? " --loader:.tsx=tsx" : "";
    execSync(
      `npx esbuild "${f}" --bundle=false --format=esm${loader} --outfile=NUL`,
      { cwd: ROOT, stdio: "pipe", shell: true },
    );
    console.log("OK esbuild", f);
  }

  // Source-level: live gate present
  const liveSrc = fs.readFileSync(
    path.join(ROOT, "components", "DetailSectionRenderer.tsx"),
    "utf8",
  );
  assert(
    liveSrc.includes("sizeDiagramMatches.length > 0") &&
      liveSrc.includes(DISCLAIMER_A) &&
      liveSrc.includes(DISCLAIMER_B),
    "live DetailSectionRenderer has gated disclaimer",
  );

  const sizeRows = [
    { label: "어깨너비", value: "38cm" },
    { label: "가슴단면", value: "48cm" },
    { label: "총장", value: "62cm" },
    { label: "소매길이", value: "20cm" },
  ];
  assert(matchSizeDiagramRows(sizeRows).length >= 3, "fixture matches size diagram");

  const fashionHtml = minimalPage("의류/패션", sizeRows);
  fs.writeFileSync(path.join(OUT, "fashion-with-diagram.html"), fashionHtml, "utf8");
  assert(count(fashionHtml, DISCLAIMER_A) === 1, "fashion+matches: disclaimer A exactly once");
  assert(count(fashionHtml, DISCLAIMER_B) === 1, "fashion+matches: disclaimer B exactly once");

  // FOOD nutrition_table — must not leak
  const foodHtml = buildHtml("식품/건강기능식품", [
    {
      type: "hero",
      slot: "hero",
      headline: "히어로",
      subheadline: "서브",
      imageIndex: 0,
    } as DetailSection,
    {
      type: "spec_table",
      slot: "nutrition_table",
      heading: "영양정보",
      rows: [
        { label: "열량", value: "100kcal" },
        { label: "단백질", value: "10g" },
        { label: "중량", value: "450g" },
      ],
    } as DetailSection,
    {
      type: "cta_price",
      slot: "cta_price",
      price: 10000,
      badges: [],
    } as DetailSection,
  ]);
  assert(!foodHtml.includes(DISCLAIMER_A), "FOOD export has no size disclaimer");
  assert(!foodHtml.includes(DISCLAIMER_B), "FOOD export has no body-fit disclaimer");

  // Electronics spec_table — no leak
  const elecHtml = buildHtml("전자제품", [
    {
      type: "hero",
      slot: "hero",
      headline: "히어로",
      subheadline: "서브",
      imageIndex: 0,
    } as DetailSection,
    {
      type: "spec_table",
      slot: "spec_table",
      heading: "스펙",
      rows: [
        { label: "무게", value: "1.2kg" },
        { label: "소비전력", value: "40W" },
      ],
    } as DetailSection,
    {
      type: "cta_price",
      slot: "cta_price",
      price: 10000,
      badges: [],
    } as DetailSection,
  ]);
  assert(!elecHtml.includes(DISCLAIMER_A), "electronics export has no size disclaimer");

  // Fashion but no measurable size rows (placeholders only) → no diagram → no disclaimer
  const placeholderRows = [
    { label: "어깨너비", value: "판매자 확인 필요" },
    { label: "가슴단면", value: "판매자 확인 필요" },
    { label: "총장", value: "판매자 확인 필요" },
  ];
  assert(matchSizeDiagramRows(placeholderRows).length === 0, "placeholders yield 0 matches");
  const noMatchHtml = minimalPage("의류/패션", placeholderRows);
  fs.writeFileSync(path.join(OUT, "fashion-no-diagram.html"), noMatchHtml, "utf8");
  assert(!noMatchHtml.includes(DISCLAIMER_A), "fashion without diagram omits disclaimer");
  assert(!noMatchHtml.includes(DISCLAIMER_B), "fashion without diagram omits body-fit line");

  // Optional: real fashion session if present
  const sessionPath = path.join(ROOT, "review", "181cha-live", "fashion", "session.json");
  if (fs.existsSync(sessionPath)) {
    const food = JSON.parse(fs.readFileSync(sessionPath, "utf8")) as {
      productName?: string;
      category: string;
      imageUrls?: string[];
      generated: { sections: DetailSection[] };
    };
    const html = buildDetailPageHtml({
      productName: food.productName ?? "fashion",
      category: food.category,
      sections: food.generated.sections,
      imageUrls: food.imageUrls ?? [],
      theme: getCategoryTheme(food.category),
    });
    fs.writeFileSync(path.join(OUT, "fashion-session-export.html"), html, "utf8");
    const sizeSec = food.generated.sections.find(
      (s) => s.type === "spec_table" && (s as { slot?: string }).slot === "size_table",
    ) as { rows?: { label: string; value: string }[] } | undefined;
    const matches = sizeSec?.rows ? matchSizeDiagramRows(sizeSec.rows) : [];
    console.log("session size matches", matches.length);
    if (matches.length > 0) {
      assert(html.includes(DISCLAIMER_A), "fashion session export includes disclaimer");
    } else {
      assert(!html.includes(DISCLAIMER_A), "session without matches omits disclaimer");
    }
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 750, height: 1400 } });
  await page.goto(
    `file:///${path.join(OUT, "fashion-with-diagram.html").replace(/\\/g, "/")}`,
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForTimeout(500);
  const disc = page.locator("text=측정 방법에 따라");
  await disc.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const box = await disc.boundingBox();
  await page.screenshot({
    path: path.join(OUT, "size-disclaimer.png"),
    clip: {
      x: 0,
      y: Math.max(0, (box?.y ?? 400) - 280),
      width: 750,
      height: 420,
    },
  });
  await browser.close();
  console.log("saved size-disclaimer.png");

  console.log("API generate: 0");
  console.log("ALL PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
