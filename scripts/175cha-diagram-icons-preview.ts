/**
 * 175차 — 5개 다이어그램 아이콘 전/후 + tint 스모크
 *   npx tsx scripts/175cha-diagram-icons-preview.ts
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { getCategoryTheme } from "../lib/category-theme";
import { buildNoiseComparisonDiagramSvg } from "../lib/noise-comparison-diagram";
import { buildSizeComparisonDiagramSvg } from "../lib/size-comparison-diagram";
import { buildWeightComparisonDiagramSvg } from "../lib/weight-comparison-diagram";
import { buildPowerConsumptionDiagramSvg } from "../lib/power-consumption-diagram";
import { buildFashionSizeDiagramSvg } from "../lib/fashion-size-diagram";
import { tintDiagramIconSvg } from "../lib/diagram-icons";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "qa-screenshots");

async function shotHtml(html: string, file: string, w = 440, h = 900) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(
    `<!doctype html><html><body style="margin:0;padding:24px;background:#FAF8F3;font-family:sans-serif">${html}</body></html>`,
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForTimeout(250);
  fs.mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, file) });
  await browser.close();
}

function beforeTitle(title: string, color: string): string {
  return `<p style="font-size:11px;letter-spacing:.12em;opacity:.85;margin:0 0 12px;color:${color};text-align:center">${title}</p>`;
}

async function main() {
  const electronics = getCategoryTheme("전자제품");
  const food = getCategoryTheme("식품/건강기능식품");
  const fashion = getCategoryTheme("의류/패션");
  const stroke = electronics.accentText;

  const afterNoise = buildNoiseComparisonDiagramSvg(42, "수면모드 42dB", stroke, stroke);
  const beforeNoise = afterNoise.replace(
    /<p style="[^"]*display:flex[^"]*">[\s\S]*?<\/p>/,
    beforeTitle("소음 비교", stroke),
  );

  const afterWeight = buildWeightComparisonDiagramSvg(180, "본체 180g", stroke, stroke);
  const beforeWeight = afterWeight.replace(
    /<p style="[^"]*display:flex[^"]*">[\s\S]*?<\/p>/,
    beforeTitle("무게 비교", stroke),
  );

  const afterPower = buildPowerConsumptionDiagramSvg(45, "정격 45W", stroke, stroke);
  const beforePower = afterPower.replace(
    /<p style="[^"]*display:flex[^"]*">[\s\S]*?<\/p>/,
    beforeTitle("소비전력 비교", stroke),
  );

  const sizeDims = [
    { label: "높이", value: "18cm", cm: 18, kind: "height" as const },
    { label: "폭", value: "8cm", cm: 8, kind: "width" as const },
  ];
  const afterSize = buildSizeComparisonDiagramSvg(sizeDims, stroke, stroke);
  const beforeSize = afterSize.replace(
    /<p style="[^"]*display:flex[^"]*">[\s\S]*?<\/p>/,
    beforeTitle("크기 비교 (기준: 500ml 캔)", stroke),
  );

  const fashionMatches = [
    { key: "shoulder" as const, label: "어깨", value: "44cm" },
    { key: "chest" as const, label: "가슴", value: "52cm" },
    { key: "length" as const, label: "총장", value: "68cm" },
  ];
  const afterFashion = buildFashionSizeDiagramSvg(
    fashionMatches,
    fashion.accentText,
    fashion.accentText,
  );
  const beforeFashion = afterFashion.replace(
    /<p style="[^"]*display:flex[^"]*">[\s\S]*?<\/p>/,
    "",
  );

  // coord check — noise product circle cx must match before/after (icon only in title)
  const beforeCx = beforeNoise.match(/circle cx="([^"]+)"/)?.[1];
  const afterCx = afterNoise.match(/circle cx="([^"]+)"/)?.[1];
  if (beforeCx !== afterCx) {
    throw new Error(`noise cx drift before=${beforeCx} after=${afterCx}`);
  }

  await shotHtml(
    `<h2 style="font-size:13px;opacity:.55">BEFORE</h2>${beforeNoise}${beforeWeight}${beforePower}
     <h2 style="font-size:13px;opacity:.55;margin-top:20px">AFTER</h2>${afterNoise}${afterWeight}${afterPower}`,
    "175cha-track-diagrams-before-after.png",
    440,
    1200,
  );

  await shotHtml(
    `<h2 style="font-size:13px;opacity:.55">BEFORE</h2>${beforeSize}${beforeFashion}
     <h2 style="font-size:13px;opacity:.55;margin-top:20px">AFTER</h2>${afterSize}${afterFashion}`,
    "175cha-size-fashion-before-after.png",
    440,
    1100,
  );

  const tint = `
    <div style="display:flex;gap:36px;justify-content:center;padding:36px;align-items:flex-end">
      <div style="text-align:center">${tintDiagramIconSvg("noise-speaker", electronics.accentText)}
        <p style="font-size:11px;color:${electronics.accentText}">전자 ${electronics.accentText}</p></div>
      <div style="text-align:center">${tintDiagramIconSvg("weight-scale", food.accentText)}
        <p style="font-size:11px;color:${food.accentText}">식품 ${food.accentText}</p></div>
      <div style="text-align:center">${tintDiagramIconSvg("fashion-shirt", fashion.accentText)}
        <p style="font-size:11px;color:${fashion.accentText}">패션 ${fashion.accentText}</p></div>
      <div style="text-align:center">${tintDiagramIconSvg("power-plug", electronics.deepAccent)}
        <p style="font-size:11px;color:${electronics.deepAccent}">deepAccent</p></div>
    </div>`;
  await shotHtml(tint, "175cha-icon-tint-compare.png", 640, 220);

  console.log("[175] screenshots OK, noise cx=", afterCx);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
