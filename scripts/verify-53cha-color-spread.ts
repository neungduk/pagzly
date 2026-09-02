/**
 * 53차 — baseNeutral 채도/명도 스프레드 검증 (API 비용 없음)
 *   npx tsx scripts/verify-53cha-color-spread.ts
 */

import fs from "fs";
import path from "path";
import {
  STUDIO_NEUTRAL_SAMPLE,
  buildThemeFromHueWithNeutral,
} from "../lib/color-extract";

const ROOT = path.join(__dirname, "..");
const REPORT = path.join(ROOT, "review", "53cha-color-spread.md");

const TEST_HUES = [0, 40, 80, 120, 160, 200, 240, 280, 320];

const LEGACY = { minSaturation: 0.14, maxLightness: 0.97 };
const CURRENT = { minSaturation: 0.3, maxLightness: 0.9 };

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const INK = "#1B1B18";

type Row = {
  hue: number;
  legacyNeutral: string;
  currentNeutral: string;
  deepAccent: string;
  inkContrast: number;
};

function main() {
  const rows: Row[] = [];

  for (const hue of TEST_HUES) {
    const legacy = buildThemeFromHueWithNeutral(hue, STUDIO_NEUTRAL_SAMPLE, LEGACY);
    const current = buildThemeFromHueWithNeutral(hue, STUDIO_NEUTRAL_SAMPLE, CURRENT);
    const inkContrast = contrastRatio(INK, current.baseNeutral);
    rows.push({
      hue,
      legacyNeutral: legacy.baseNeutral,
      currentNeutral: current.baseNeutral,
      deepAccent: current.deepAccent,
      inkContrast: Math.round(inkContrast * 100) / 100,
    });
  }

  const uniqueCurrent = new Set(rows.map((r) => r.currentNeutral)).size;
  const uniqueLegacy = new Set(rows.map((r) => r.legacyNeutral)).size;
  const minInkContrast = Math.min(...rows.map((r) => r.inkContrast));
  const failInkContrast = rows.filter((r) => r.inkContrast < 4.5);

  const lines = [
    "# 53차 baseNeutral 색상 스프레드",
    "",
    `생성: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "## 상수",
    "",
    "| | 이전 (51차) | 현재 (53차) |",
    "|--|-------------|-------------|",
    "| MIN saturation | 0.14 | 0.30 |",
    "| MAX lightness | 0.97 | 0.90 |",
    "",
    "## 9 hue 비교 (스튜디오 neutral r235 g232 b227)",
    "",
    "| hue° | legacy baseNeutral | current baseNeutral | deepAccent | ink 대비 |",
    "|-----:|-------------------|---------------------|------------|--------:|",
    ...rows.map(
      (r) =>
        `| ${r.hue} | ${r.legacyNeutral} | ${r.currentNeutral} | ${r.deepAccent} | ${r.inkContrast}:1 |`,
    ),
    "",
    "## 요약",
    "",
    `- legacy 고유 hex: **${uniqueLegacy}/9**`,
    `- current 고유 hex: **${uniqueCurrent}/9**`,
    `- current 최소 대비(ink ${INK} vs baseNeutral): **${minInkContrast}:1** (WCAG AA 본문 4.5:1 기준)`,
    failInkContrast.length === 0
      ? "- ink 대비 실패 hue: **없음**"
      : `- ink 대비 실패 hue: ${failInkContrast.map((r) => r.hue).join(", ")}`,
    "",
  ];

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, lines.join("\n"), "utf8");

  console.log("[53cha-color] wrote", REPORT);
  console.log(`unique legacy=${uniqueLegacy}/9 current=${uniqueCurrent}/9 minInkContrast=${minInkContrast}:1`);

  for (const r of rows) {
    console.log(
      `  hue=${String(r.hue).padStart(3)}  legacy=${r.legacyNeutral}  current=${r.currentNeutral}  inkContrast=${r.inkContrast}:1`,
    );
  }

  if (uniqueCurrent < 7) {
    console.error("[53cha-color] FAIL: current baseNeutral이 9 hue 중 고유값이 7개 미만");
    process.exit(1);
  }
  if (failInkContrast.length > 0) {
    console.error("[53cha-color] FAIL: ink 대비 4.5:1 미만 hue 존재");
    process.exit(1);
  }
}

main();
