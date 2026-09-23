/**
 * 241차 — stat_infographic ring export 원형 게이지 검증 (API 0).
 *   npx tsx scripts/241cha-stat-infographic-ring-verify.ts
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { getCategoryTheme } from "../lib/category-theme";
import { FONT_SIZE } from "../lib/design-tokens";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "241cha-stat-infographic-ring");

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

function clampPct(percent: number | undefined): number {
  return Math.min(100, Math.max(0, percent ?? 0));
}

function ringGeom(percent: number) {
  const size = 112;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = clampPct(percent);
  const offset = circumference * (1 - pct / 100);
  return { size, strokeWidth, radius, circumference, offset, pct };
}

function buildHtml(metrics: DetailSection extends never ? never : object[]): string {
  const sections: DetailSection[] = [
    {
      type: "hero",
      slot: "hero",
      headline: "히어로",
      subheadline: "서브",
      imageIndex: 0,
    } as DetailSection,
    {
      type: "stat_infographic",
      slot: "stat_infographic",
      heading: "수치 하이라이트",
      metrics,
    } as DetailSection,
    {
      type: "cta_price",
      slot: "cta_price",
      price: 29000,
      badges: [],
    } as DetailSection,
  ];
  return buildDetailPageHtml({
    productName: "링게이지테스트",
    category: "전자제품",
    sections,
    imageUrls: [],
    theme: getCategoryTheme("전자제품"),
  });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const rendererPath = path.join(ROOT, "components", "DetailSectionRenderer.tsx");
  const mtimeBefore = fs.statSync(rendererPath).mtimeMs;

  execSync(
    `npx esbuild "lib/export-detail-html.ts" --bundle=false --format=esm --outfile=NUL`,
    { cwd: ROOT, stdio: "pipe", shell: true },
  );
  console.log("OK esbuild lib/export-detail-html.ts");

  // Geometry unit
  const g = ringGeom(50);
  assert(g.radius === 51, "radius = (112-10)/2 = 51");
  assert(Math.abs(g.circumference - 2 * Math.PI * 51) < 1e-9, "circumference = 2π·51");
  assert(Math.abs(ringGeom(0).offset - g.circumference) < 1e-9, "percent=0 → offset=circumference");
  assert(Math.abs(ringGeom(100).offset - 0) < 1e-9, "percent=100 → offset=0");
  assert(
    Math.abs(ringGeom(50).offset - g.circumference / 2) < 1e-9,
    "percent=50 → offset=half circumference",
  );
  assert(clampPct(150) === 100, "percent=150 clamps to 100");
  assert(clampPct(-20) === 0, "percent=-20 clamps to 0");
  assert(Math.abs(ringGeom(150).offset - 0) < 1e-9, "clamped 150 → full ring");
  assert(Math.abs(ringGeom(-20).offset - g.circumference) < 1e-9, "clamped -20 → empty ring");

  const mixed = buildHtml([
    { label: "재생시간", value: "40h", style: "number" },
    {
      label: "만족도",
      value: "30%",
      percent: 30,
      style: "ring",
      basis: "measured",
      sourceNote: "자사 설문, 2026.03, n=120",
    },
    { label: "재구매", value: "80%", percent: 80, style: "ring" },
    { label: "점유율", value: "45%", percent: 45, style: "bar" },
  ]);
  fs.writeFileSync(path.join(OUT, "mixed-styles.html"), mixed, "utf8");

  assert(count(mixed, 'class="ring-fill"') === 2, "exactly 2 ring-fill circles");
  assert(count(mixed, 'class="fill-bar"') >= 1, "bar still uses fill-bar");
  assert(
    mixed.includes(`font-size:${FONT_SIZE.statNumber}`) && mixed.includes("40h"),
    "number style still uses FONT_SIZE.statNumber",
  );

  const off30 = ringGeom(30).offset;
  const off80 = ringGeom(80).offset;
  const dashOffsets = [...mixed.matchAll(/stroke-dashoffset="([^"]+)"/g)].map((m) =>
    Number(m[1]),
  );
  assert(dashOffsets.length === 2, "exactly 2 stroke-dashoffset attrs");
  assert(
    Math.abs(dashOffsets[0]! - off30) < 0.01,
    `ring30 offset ≈ ${off30.toFixed(2)} got ${dashOffsets[0]}`,
  );
  assert(
    Math.abs(dashOffsets[1]! - off80) < 0.01,
    `ring80 offset ≈ ${off80.toFixed(2)} got ${dashOffsets[1]}`,
  );

  // Footnote on ring
  assert(mixed.includes("<sup") && mixed.includes("자사 설문"), "ring footnote mark + list");
  assert(/\b1\.\s*자사 설문/.test(mixed) || mixed.includes("1. 자사 설문"), "footnote list item 1");

  // CSS keyframes present
  assert(
    mixed.includes("@keyframes ringFill") &&
      mixed.includes(".ring-fill{animation:ringFill") &&
      mixed.includes(".fill-bar,.pulse-card,.ring-fill"),
    "ringFill CSS + reduced-motion includes ring-fill",
  );

  // comparison_chart untouched (still fill-bar only for its bars — present in other pages)
  const src = fs.readFileSync(path.join(ROOT, "lib", "export-detail-html.ts"), "utf8");
  assert(src.includes('case "comparison_chart"'), "comparison_chart case still present");
  assert(
    !src.includes('case "comparison_chart"') ||
      !/case "comparison_chart":[\s\S]*?ring-fill/.test(
        src.slice(src.indexOf('case "comparison_chart"'), src.indexOf('case "comparison_chart"') + 2000),
      ),
    "comparison_chart block has no ring-fill",
  );

  // Screenshot fixture
  const shotHtml = buildHtml([
    { label: "완성도", value: "65%", percent: 65, style: "ring" },
    { label: "재구매", value: "80%", percent: 80, style: "ring" },
  ]);
  fs.writeFileSync(path.join(OUT, "ring-only.html"), shotHtml, "utf8");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 750, height: 900 } });
  await page.goto(`file:///${path.join(OUT, "ring-only.html").replace(/\\/g, "/")}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(1100);
  await page.locator(".ring-fill").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const box = await page.locator(".ring-fill").first().boundingBox();
  if (box) {
    await page.screenshot({
      path: path.join(OUT, "ring-gauge-export.png"),
      clip: {
        x: 0,
        y: Math.max(0, box.y - 80),
        width: 750,
        height: 420,
      },
    });
  } else {
    await page.screenshot({ path: path.join(OUT, "ring-gauge-export.png") });
  }
  await browser.close();
  console.log("saved ring-gauge-export.png");

  const mtimeAfter = fs.statSync(rendererPath).mtimeMs;
  assert(mtimeBefore === mtimeAfter, "DetailSectionRenderer.tsx mtime unchanged");

  console.log("API generate: 0");
  console.log("ALL PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
