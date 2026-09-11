import {
  parseWeightG,
  matchWeightComparisonRow,
  selectNearbyReferencePoints,
  formatWeightLabel,
  buildWeightComparisonDiagramSvg,
} from "../lib/weight-comparison-diagram";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("OK:", msg);
  }
}

// 1. parseWeightG
assert(parseWeightG("150g") === 150, "parse 150g");
assert(parseWeightG("1.5kg") === 1500, "parse 1.5kg");
assert(parseWeightG("1,200g") === 1200, "parse comma-separated g");
assert(parseWeightG("약 500g 내외") === 500, "parse with surrounding text");
assert(parseWeightG("판매자 확인 필요") === null, "placeholder → null");
assert(parseWeightG("") === null, "empty → null");
assert(parseWeightG("무게 미상") === null, "no unit → null");
assert(parseWeightG("300kg") === null, "absurd 300kg rejected (>200kg cap)");

// 2. matchWeightComparisonRow — label aliasing + placeholder skip
const rowsWithWeight = [
  { label: "색상", value: "블랙" },
  { label: "제품무게", value: "320g" },
  { label: "용량", value: "500ml" },
];
const m1 = matchWeightComparisonRow(rowsWithWeight);
assert(m1 !== null && m1.g === 320, "matchWeightComparisonRow finds 제품무게 320g");

const rowsNoWeight = [
  { label: "색상", value: "블랙" },
  { label: "용량", value: "500ml" },
];
assert(matchWeightComparisonRow(rowsNoWeight) === null, "no weight row → null (섹션 생략 근거)");

const rowsPlaceholder = [{ label: "중량", value: "판매자 확인 필요" }];
assert(matchWeightComparisonRow(rowsPlaceholder) === null, "placeholder value → null (지어내기 금지)");

// 3. selectNearbyReferencePoints — 작은/중간/큰 값 각각 두 개의 기준점을 고른다
const small = selectNearbyReferencePoints(30); // 계란(60g) 근처, 신용카드(5g)~계란 사이
assert(small.length === 2, "small weight (30g) picks 2 reference points");
console.log("  small refs:", small.map((r) => `${r.label}=${r.g}g`).join(", "));

const mid = selectNearbyReferencePoints(800); // 사과(200g)~우유(1000g) 사이
assert(mid.length === 2, "mid weight (800g) picks 2 reference points");
console.log("  mid refs:", mid.map((r) => `${r.label}=${r.g}g`).join(", "));

const extreme = selectNearbyReferencePoints(50000); // 범위 밖(전 기준점보다 무거움) — 가장 무거운 기준점 1개
assert(extreme.length >= 1, "out-of-range weight (50kg) still returns at least 1 reference");
assert(extreme[0].g === 5000, "out-of-range weight anchors to the heaviest reference (쌀 5kg)");
console.log("  extreme refs:", extreme.map((r) => `${r.label}=${r.g}g`).join(", "));

// 4. formatWeightLabel
assert(formatWeightLabel(320) === "320g", "format 320g");
assert(formatWeightLabel(1500) === "1.5kg", "format 1500g → 1.5kg");
assert(formatWeightLabel(5000) === "5kg", "format 5000g → 5kg (no trailing .0)");

// 5. SVG builder — 채워지는 케이스 / omit 케이스
const svg = buildWeightComparisonDiagramSvg(320, "320g", "#123456", "#123456");
assert(svg.includes("무게 비교"), "svg contains 무게 비교 label");
assert(svg.includes("320g"), "svg contains product weight label");

console.log("\n162cha-verify.ts done.");
