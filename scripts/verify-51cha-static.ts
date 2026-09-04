/**
 * 51차 Tier 1 정적 검증 (API 비용 없음)
 *   npx tsx scripts/verify-51cha-static.ts
 */

import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");
let pass = 0;
let fail = 0;

function ok(label: string) {
  pass += 1;
  console.log(`  PASS  ${label}`);
}

function bad(label: string, detail?: string) {
  fail += 1;
  console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
}

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function includesAll(src: string, needles: string[], label: string) {
  for (const n of needles) {
    if (!src.includes(n)) {
      bad(label, `missing: ${n.slice(0, 60)}`);
      return;
    }
  }
  ok(label);
}

console.log("[51cha-static] Tier 1 A~F\n");

const renderer = read("components/DetailSectionRenderer.tsx");
includesAll(
  renderer,
  ["getCategoryTitleKeyword", "formatPointBadge", "parseMegaKeywordHeading", "hasBrandCard", "certTokens"],
  "T1-A/B/F DetailSectionRenderer hooks",
);
includesAll(
  renderer,
  ["TYPO.keywordDisplay", "TYPO.pointBadgePill", "pointBadge", "megaKeyword"],
  "T1-B POINT + mega keyword typography",
);

const tokens = read("lib/design-tokens.ts");
includesAll(
  tokens,
  [
    "CATEGORY_PATTERN_SVG",
    "getCategoryPatternBackground",
    "composeSectionBackground",
    '"생활용품"',
  ],
  "T1-C category SVG patterns",
);

const backdrop = read("lib/backdrop-prompt-templates.ts");
if (backdrop.includes("mood-shot") || backdrop.includes("appetizing mood-shot")) {
  ok("T1-D food mood-shot backdrop prompt");
} else {
  bad("T1-D food mood-shot backdrop prompt");
}

const route = read("app/api/generate/route.ts");
if (route.includes("리뉴얼/투명 공개형") && route.includes("✅")) {
  ok("T1-E renewal checklist prompt");
} else {
  bad("T1-E renewal checklist prompt");
}

const exportHtml = read("lib/export-detail-html.ts");
includesAll(
  exportHtml,
  ["formatPointBadge", "getCategoryTitleKeyword", "isCertificationHighlight", "hasBrandCard"],
  "T1 export HTML parity",
);

console.log(`\n[51cha-static] ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
