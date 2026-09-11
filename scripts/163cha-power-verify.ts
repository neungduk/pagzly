/**
 * 163차 — 소비전력(W) 비교 다이어그램 검증. $0, API 호출 없음.
 */
import {
  parsePowerW,
  matchPowerComparisonRow,
  selectNearbyPowerReferencePoints,
  formatPowerLabel,
  buildPowerConsumptionDiagramSvg,
} from "../lib/power-consumption-diagram";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${msg}`);
  }
}

// parsePowerW
assert(parsePowerW("1200W") === 1200, 'parsePowerW("1200W") === 1200');
assert(parsePowerW("1.2kW") === 1200, 'parsePowerW("1.2kW") === 1200');
assert(parsePowerW("700 W") === 700, 'parsePowerW("700 W") with space === 700');
assert(parsePowerW("1,200W") === 1200, 'parsePowerW("1,200W") with comma === 1200');
assert(parsePowerW("700W(고출력 시 1000W)") === 700, 'parsePowerW picks first number in compound string');
assert(parsePowerW("판매자 확인 필요") === null, "parsePowerW rejects placeholder");
assert(parsePowerW("") === null, "parsePowerW rejects empty string");
assert(parsePowerW("50000W") === null, "parsePowerW rejects absurd out-of-range value (>30000W)");
assert(parsePowerW("35kW") === null, "parsePowerW rejects out-of-range kW (>30kW)");

// matchPowerComparisonRow
const rows1 = [
  { label: "색상", value: "화이트" },
  { label: "소비전력", value: "1200W" },
  { label: "무게", value: "500g" },
];
const m1 = matchPowerComparisonRow(rows1);
assert(m1?.w === 1200, "matchPowerComparisonRow finds 소비전력 row and parses 1200W");

const rows2 = [{ label: "정격전력", value: "700W" }];
const m2 = matchPowerComparisonRow(rows2);
assert(m2?.w === 700, "matchPowerComparisonRow matches alias 정격전력");

const rows3 = [{ label: "색상", value: "블랙" }];
assert(matchPowerComparisonRow(rows3) === null, "matchPowerComparisonRow returns null when no power row present");

const rows4 = [{ label: "소비전력", value: "확인 필요" }];
assert(matchPowerComparisonRow(rows4) === null, "matchPowerComparisonRow returns null for placeholder value");

// selectNearbyPowerReferencePoints
const mid = selectNearbyPowerReferencePoints(500); // between 노트북 어댑터(65) and 전자레인지(700)
assert(mid.length === 2, "mid-range power (500W) selects 2 nearby reference points");
assert(mid[0]!.w < 500 && mid[1]!.w > 500, "mid-range reference points bracket the product value");

const extreme = selectNearbyPowerReferencePoints(20000); // far beyond all references
assert(extreme.length >= 1, "out-of-range power (20000W) falls back to nearest reference(s)");
assert(extreme[0]!.w === 1500, "out-of-range power picks heaviest reference (에어컨 1500W) as nearest");

const tiny = selectNearbyPowerReferencePoints(1); // far below all references
assert(tiny.length >= 1, "extremely low power (1W) falls back to nearest reference(s)");
assert(tiny[0]!.w === 10, "extremely low power picks lightest reference (LED 전구 10W) as nearest");

// formatPowerLabel
assert(formatPowerLabel(10) === "10W", 'formatPowerLabel(10) === "10W"');
assert(formatPowerLabel(700) === "700W", 'formatPowerLabel(700) === "700W"');
assert(formatPowerLabel(1200) === "1.2kW", 'formatPowerLabel(1200) === "1.2kW"');
assert(formatPowerLabel(1500) === "1.5kW", 'formatPowerLabel(1500) === "1.5kW"');
assert(formatPowerLabel(2000) === "2kW", 'formatPowerLabel(2000) === "2kW" (whole kW, no trailing .0)');

// buildPowerConsumptionDiagramSvg
const svg = buildPowerConsumptionDiagramSvg(1200, "1200W", "#111111", "#333333");
assert(svg.includes("<svg"), "buildPowerConsumptionDiagramSvg produces an <svg> element");
assert(svg.includes("소비전력 비교"), "buildPowerConsumptionDiagramSvg includes Korean label");
assert(svg.includes("1.2kW") || svg.includes("1200W"), "buildPowerConsumptionDiagramSvg renders product value");

const emptySvg = buildPowerConsumptionDiagramSvg(NaN, "", "#111111", "#333333");
assert(emptySvg === "" || emptySvg.includes("<svg"), "buildPowerConsumptionDiagramSvg handles degenerate input without throwing");

if (process.exitCode === 1) {
  console.error("\n163차 power-consumption verification FAILED");
  process.exit(1);
} else {
  console.log("\n163차 power-consumption verification PASSED (all assertions ok)");
}
