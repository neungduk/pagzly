/**
 * 174차 — 다이어그램 아이콘 전/후 + 카테고리 tint 스모크
 *   npx tsx scripts/174cha-diagram-icons-preview.ts
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { getCategoryTheme } from "../lib/category-theme";
import { buildWaterproofIpDiagramSvg } from "../lib/waterproof-ip-diagram";
import { buildPackageContentsDiagramSvg } from "../lib/package-contents-diagram";
import { buildVolumeComparisonDiagramSvg, buildVolumeComparisonEntries } from "../lib/volume-comparison-diagram";
import { buildFoodRatioDiagramSvg } from "../lib/food-ratio-diagram";
import { buildUsageOrderFlowSvg } from "../lib/usage-order-diagram";
import { tintDiagramIconSvg } from "../lib/diagram-icons";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "qa-screenshots");
const BEFORE_DIR = path.join(ROOT, "review", "174cha-before-snippets");

function beforeWaterproof(level: number, label: string, stroke: string): string {
  // 아이콘 없는 구버전 마크업 (스크린샷 비교용 — 좌표 동일)
  const { selectNearbyWaterproofPoints } = require("../lib/waterproof-ip-diagram") as typeof import("../lib/waterproof-ip-diagram");
  const refs = selectNearbyWaterproofPoints(level);
  const all = [...refs.map((r) => r.level), level];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const pad = Math.max((max - min) * 0.35, 0.8);
  const scaleMin = Math.max(0, min - pad);
  const scaleMax = Math.min(8, max + pad);
  const width = 340;
  const trackX1 = 30;
  const trackX2 = width - 30;
  const trackY = 96;
  const span = Math.max(scaleMax - scaleMin, 1);
  const toX = (v: number) => trackX1 + ((v - scaleMin) / span) * (trackX2 - trackX1);
  const prodX = toX(level);
  const refMarks = refs
    .map((r) => {
      const x = toX(r.level);
      return `<g><line x1="${x}" y1="${trackY - 6}" x2="${x}" y2="${trackY + 6}" stroke="${stroke}" stroke-width="1.2" opacity="0.5"/><text x="${x}" y="${trackY - 14}" text-anchor="middle" font-size="9" fill="${stroke}" opacity="0.72">IPX${r.level}</text><text x="${x}" y="${trackY + 24}" text-anchor="middle" font-size="9" fill="${stroke}" opacity="0.72">${r.label}</text></g>`;
    })
    .join("");
  return `<div style="margin:32px auto 0;max-width:340px;text-align:center"><p style="font-size:11px;letter-spacing:.12em;opacity:.85;margin:0 0 8px;color:${stroke}">방수 등급 비교</p><svg viewBox="0 0 ${width} 130" width="${width}" height="130"><line x1="${trackX1}" y1="${trackY}" x2="${trackX2}" y2="${trackY}" stroke="${stroke}" stroke-width="1.2" opacity="0.32"/>${refMarks}<circle cx="${prodX}" cy="${trackY}" r="5" fill="${stroke}"/><text x="${prodX}" y="${trackY - 14}" text-anchor="middle" font-size="10" font-weight="700" fill="${stroke}">IPX${level}</text><text x="${prodX}" y="${trackY + 24}" text-anchor="middle" font-size="10" font-weight="700" fill="${stroke}">${label}</text></svg></div>`;
}

async function shotHtml(html: string, file: string, w = 420, h = 520) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(
    `<!doctype html><html><body style="margin:0;padding:24px;background:#FAF8F3;font-family:sans-serif">${html}</body></html>`,
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForTimeout(200);
  fs.mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, file) });
  await browser.close();
}

async function main() {
  const beauty = getCategoryTheme("화장품/뷰티");
  const electronics = getCategoryTheme("전자제품");

  const beforeWp = beforeWaterproof(7, "IPX7", electronics.accentText);
  const afterWp = buildWaterproofIpDiagramSvg(7, "IPX7", electronics.accentText, electronics.accentText);

  const pkg = buildPackageContentsDiagramSvg(
    [{ label: "본체" }, { label: "케이블" }, { label: "설명서" }, { label: "파우치" }],
    electronics.deepAccent,
    "#1B1B18",
  );
  const vol = buildVolumeComparisonDiagramSvg(
    buildVolumeComparisonEntries(50)!,
    beauty.deepAccent,
    beauty.deepAccent,
  );
  const food = buildFoodRatioDiagramSvg(
    [
      { label: "귀리", percent: 40 },
      { label: "견과", percent: 25 },
      { label: "기타", percent: 35 },
    ],
    getCategoryTheme("식품/건강기능식품").deepAccent,
    "#1B1B18",
  );
  const usage = buildUsageOrderFlowSvg(
    ["세안 후 토너", "세럼 도포", "크림으로 마무리"],
    beauty.deepAccent,
    "#1B1B18",
  );

  const fashion = getCategoryTheme("의류/패션");
  const foodTheme = getCategoryTheme("식품/건강기능식품");
  const pet = getCategoryTheme("반려동물");
  // tint board — 카테고리 토큰이 실제로 다른 색인지 확인 (뷰티/전자는 accentText 동일)
  const tintBoard = `
    <div style="display:flex;gap:40px;align-items:center;justify-content:center;padding:40px">
      <div style="text-align:center">${tintDiagramIconSvg("waterproof-droplet", beauty.accentText)}<p style="font-size:12px;color:${beauty.accentText}">beauty ${beauty.accentText}</p></div>
      <div style="text-align:center">${tintDiagramIconSvg("food-bowl", foodTheme.accentText)}<p style="font-size:12px;color:${foodTheme.accentText}">food ${foodTheme.accentText}</p></div>
      <div style="text-align:center">${tintDiagramIconSvg("package-box", pet.accentText)}<p style="font-size:12px;color:${pet.accentText}">pet ${pet.accentText}</p></div>
      <div style="text-align:center">${tintDiagramIconSvg("volume-bottle", fashion.deepAccent)}<p style="font-size:12px;color:${fashion.deepAccent}">fashion deep</p></div>
    </div>`;

  await shotHtml(
    `<h2 style="font-size:14px;opacity:.6">BEFORE</h2>${beforeWp}<h2 style="font-size:14px;opacity:.6;margin-top:24px">AFTER</h2>${afterWp}`,
    "174cha-waterproof-before-after.png",
    440,
    420,
  );
  await shotHtml(
    `<div style="display:grid;gap:28px">${pkg}${vol}${food}${usage}</div>`,
    "174cha-diagrams-with-icons.png",
    440,
    1100,
  );
  await shotHtml(tintBoard, "174cha-icon-tint-compare.png", 560, 220);

  // assert coords unchanged: product circle still at same x for IPX7
  const beforeX = beforeWp.match(/circle cx="([^"]+)"/)?.[1];
  const afterX = afterWp.match(/circle cx="([^"]+)"/)?.[1];
  if (beforeX !== afterX) {
    throw new Error(`coord drift waterproof cx before=${beforeX} after=${afterX}`);
  }

  console.log("[174] screenshots OK, waterproof cx=", afterX);
  console.log("[174] beauty accent", beauty.accentText, "electronics", electronics.accentText);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
