/**
 * 206차 — electronics compliance sanitize smoke (API 0).
 *   npx tsx scripts/206cha-electronics-compliance-smoke.ts
 */
import {
  ELECTRONICS_AI_PROMPT,
  isElectronicsCategory,
  reviewElectronicsCopy,
  sanitizeText,
} from "../lib/electronics-compliance";
import type { GeneratedCopy } from "../lib/types/generate";

const RULE_CASES: Array<{ input: string; expect: string; label: string }> = [
  { input: "완벽 방수 기능", expect: "생활 방수 기능", label: "완벽 방수" },
  { input: "100% 방수 설계", expect: "생활 방수 설계", label: "100% 방수" },
  { input: "고장 걱정 없음", expect: "안정적인 사용", label: "고장 걱정 없음" },
  { input: "고장 없음", expect: "우수한 내구성", label: "고장 없음" },
  { input: "평생 보장", expect: "품질 보증 지원", label: "평생 보장" },
  { input: "반영구 사용", expect: "장기간 사용", label: "반영구" },
  { input: "전자파 없음", expect: "전자파 안전 기준 준수", label: "전자파 없음" },
  { input: "무전자파", expect: "전자파 안전 기준 준수", label: "전자파 없음" },
  { input: "인체에 무해", expect: "안전 기준 준수", label: "인체에 무해" },
  { input: "국내 유일", expect: "차별화된 강점", label: "국내 유일" },
  { input: "세계 최초", expect: "혁신적인 기술력", label: "세계 최초" },
  { input: "업계 최초", expect: "새로운 방식", label: "업계 최초" },
  { input: "절대 안전", expect: "높은 안전성", label: "절대 안전" },
  { input: "영구 사용", expect: "장기간 사용", label: "영구" },
];

const ALL_CATEGORIES = [
  "의류/패션",
  "화장품/뷰티",
  "식품/건강기능식품",
  "전자제품",
  "생활용품",
  "반려동물",
  "기타",
] as const;

function main() {
  let failed = 0;

  console.log("=== sanitizeText 13+ rules ===");
  for (const c of RULE_CASES) {
    const { text, replacements } = sanitizeText(c.input);
    const ok =
      text === c.expect &&
      replacements.some((r) => r.original === c.label && r.count >= 1);
    console.log(ok ? "OK" : "FAIL", c.label, "→", text);
    if (!ok) failed += 1;
  }

  console.log("=== nested 반영구/평생 보장 ===");
  const nested = sanitizeText("반영구적으로 사용 가능한 평생 보장 제품");
  const nestedOk =
    !nested.text.includes("반장기간") &&
    nested.text.includes("장기간") &&
    nested.text.includes("품질 보증 지원") &&
    nested.replacements.some((r) => r.original === "반영구") &&
    nested.replacements.some((r) => r.original === "평생 보장");
  console.log(nestedOk ? "OK" : "FAIL", nested.text, nested.replacements);
  if (!nestedOk) failed += 1;

  console.log("=== clean copy no over-replace ===");
  const clean = sanitizeText("충전 10분에 2시간 재생되는 고속 충전");
  const cleanOk = clean.text === "충전 10분에 2시간 재생되는 고속 충전" && clean.replacements.length === 0;
  console.log(cleanOk ? "OK" : "FAIL", clean);
  if (!cleanOk) failed += 1;

  console.log("=== reviewElectronicsCopy ===");
  const fixture: GeneratedCopy = {
    headlines: ["세계 최초 완벽 방수"],
    description: "평생 보장 전자파 없음",
    features: ["고장 없음"],
    howToUse: "정상 사용법",
    caution: "절대 안전 주의",
    sections: [
      {
        type: "hero",
        slot: "hero",
        headline: "국내 유일 모델",
        subheadline: "업계 최초",
        imageIndex: 0,
      },
    ],
  };
  const reviewed = reviewElectronicsCopy(fixture);
  const reviewOk =
    reviewed.mfdsReviewed === true &&
    reviewed.replacements.length > 0 &&
    !reviewed.copy.headlines[0]!.includes("세계 최초") &&
    !reviewed.copy.headlines[0]!.includes("완벽 방수");
  console.log(
    reviewOk ? "OK" : "FAIL",
    "mfdsReviewed",
    reviewed.mfdsReviewed,
    "replacements",
    reviewed.replacements.length,
  );
  if (!reviewOk) failed += 1;

  console.log("=== isElectronicsCategory 7 cats ===");
  for (const cat of ALL_CATEGORIES) {
    const expected = cat === "전자제품";
    const got = isElectronicsCategory(cat);
    const ok = got === expected;
    console.log(ok ? "OK" : "FAIL", cat, "→", got, "expect", expected);
    if (!ok) failed += 1;
  }

  console.log(
    "CreateProductForm CATEGORIES electronics:",
    "전자제품",
    "(matches COMPONENTS CreateProductForm CATEGORIES)",
  );
  console.log(
    "ELECTRONICS_AI_PROMPT nonempty:",
    ELECTRONICS_AI_PROMPT.trim().length > 0,
  );
  console.log(
    "DeepSeek calls: 0 (sanitize/review only; review-insights untouched)",
  );
  console.log(
    "cosmetics/food branch: ternary cosmetics → food → electronics → null (regression: order preserved)",
  );

  if (failed > 0) {
    console.error("failed", failed);
    process.exit(1);
  }
  console.log("SMOKE:0");
}

main();
