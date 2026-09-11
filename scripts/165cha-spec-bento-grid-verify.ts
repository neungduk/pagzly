/**
 * 165차 — "Bento 그리드 2.0" 스펙 하이라이트(buildSpecBentoGridHtml) 검증.
 * $0, 합성 데이터만 사용(API 호출 없음).
 */
import { buildSpecBentoGridHtml } from "../lib/spec-bento-grid";
import type { QuickFact } from "../lib/quick-fact-strip";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${msg}`);
  }
}

const theme = { accent: "#B08968", baseNeutral: "#F3EEE6", deepAccent: "#2E2A24" };

// 1) 1개 이하 fact는 렌더하지 않음 (그리드로서 의미 없음)
assert(buildSpecBentoGridHtml([], theme) === "", "empty facts array returns empty string");
assert(
  buildSpecBentoGridHtml([{ label: "소재", value: "면 100%" }], theme) === "",
  "single fact returns empty string (grid needs >=2 cells)",
);

// 2) 2개 fact -> 그리드 렌더, 두 값 모두 포함
const twoFacts: QuickFact[] = [
  { label: "소재", value: "면 100%" },
  { label: "원산지", value: "대한민국" },
];
const html2 = buildSpecBentoGridHtml(twoFacts, theme);
assert(html2.includes("면 100%") && html2.includes("소재"), "2-fact grid includes first cell label/value");
assert(html2.includes("대한민국") && html2.includes("원산지"), "2-fact grid includes second cell label/value");
assert(html2.includes("grid-template-columns"), "output uses CSS grid layout");

// 3) 첫 번째 셀은 deepAccent 배경(강조), 나머지는 baseNeutral 배경으로 시각적 비대칭 부여
assert(
  html2.indexOf(theme.deepAccent) < html2.indexOf(theme.baseNeutral),
  "first (hero) cell uses deepAccent background before any baseNeutral cell appears",
);

// 4) 5개 입력 -> 4개까지만 렌더(과밀 방지)
const fiveFacts: QuickFact[] = [
  { label: "소재", value: "면 100%" },
  { label: "원산지", value: "대한민국" },
  { label: "색상", value: "네이비" },
  { label: "중량", value: "320g" },
  { label: "제조사", value: "팩즐리" },
];
const html5 = buildSpecBentoGridHtml(fiveFacts, theme);
assert(!html5.includes("팩즐리"), "5th fact is dropped (grid caps at 4 cells)");
assert(html5.includes("320g"), "4th fact is still included");

// 5) HTML 이스케이프 확인 — 라벨/값에 특수문자가 있어도 안전하게 이스케이프
const specialChars: QuickFact[] = [
  { label: "소재<>&", value: '100% "순면"' },
  { label: "원산지", value: "대한민국" },
];
const htmlEsc = buildSpecBentoGridHtml(specialChars, theme);
assert(
  htmlEsc.includes("소재&lt;&gt;&amp;") && !htmlEsc.includes("소재<>&"),
  "special characters in label are escaped",
);
assert(
  htmlEsc.includes("100% &quot;순면&quot;"),
  "special characters (quotes) in value are escaped",
);

if (process.exitCode === 1) {
  console.error("\n165차 spec-bento-grid verification FAILED");
  process.exit(1);
} else {
  console.log("\n165차 spec-bento-grid verification PASSED (all assertions ok)");
}
