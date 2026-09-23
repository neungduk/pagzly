/**
 * 205차 — long-term use regex + 6-category gating smoke (API 0).
 *   npx tsx scripts/205cha-long-term-use-signal-smoke.ts
 */
import {
  countLongTermUseMentions,
  extractReviewInsights,
} from "../lib/review-insights";
import { buildReviewHighlightSection } from "../lib/section-inserts";

const LONG_TERM_GATE_CATEGORIES = [
  "화장품/뷰티",
  "전자제품",
  "생활용품",
] as const;

const OTHER_CATEGORIES = [
  "의류/패션",
  "식품/건강기능식품",
  "반려동물",
] as const;

function gateLongTerm(category: string, count: number | undefined) {
  if (
    category === "화장품/뷰티" ||
    category === "전자제품" ||
    category === "생활용품"
  ) {
    return count;
  }
  return undefined;
}

async function main() {
  delete process.env.DEEPSEEK_API_KEY;

  const hit = countLongTermUseMentions([
    "3개월째 사용중이에요",
    "배송 빨라요",
    "2주 사용해봤는데 좋아요",
  ]);
  const falsePositive = countLongTermUseMentions([
    "10개월 전에 상했어요",
    "가격이 10만원대",
  ]);
  const mixed = countLongTermUseMentions([
    "1년째 쓰고 있어요",
    "30일 사용해 봤습니다",
    "한 달째 좋아요",
    "5주 사용중",
  ]);
  console.log("regex hit", hit, "expect 2");
  console.log("regex falsePositive", falsePositive, "expect 0");
  console.log("regex mixed", mixed, "expect 3 (한 달째 excluded)");

  const sample = [
    "3개월째 사용중이에요",
    "10개월 전에 상했어요",
    "2주 사용해봤는데",
  ].join("\n");
  const buf = Buffer.from(sample, "utf8");
  const insights = await extractReviewInsights(buf, "txt");
  console.log(
    "extract longTermUseMentionCount",
    insights.longTermUseMentionCount,
    "expect 2",
  );
  console.log("deepseekCalls", insights.deepseekCalls ?? 0, "expect 0");

  const count = insights.longTermUseMentionCount;
  for (const cat of LONG_TERM_GATE_CATEGORIES) {
    const sec = buildReviewHighlightSection(
      ["좋아요"],
      [],
      3,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      gateLongTerm(cat, count),
    );
    console.log(`gating ON ${cat}`, sec.longTermUseMentionCount, "expect 2");
    if (sec.longTermUseMentionCount !== 2) process.exitCode = 1;
  }
  for (const cat of OTHER_CATEGORIES) {
    const sec = buildReviewHighlightSection(
      ["좋아요"],
      [],
      3,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      gateLongTerm(cat, count),
    );
    console.log(`gating OFF ${cat}`, sec.longTermUseMentionCount, "expect undefined");
    if (sec.longTermUseMentionCount != null) process.exitCode = 1;
  }

  console.log(
    "CreateProductForm CATEGORIES long-term gate:",
    LONG_TERM_GATE_CATEGORIES.join(", "),
  );

  if (hit !== 2 || falsePositive !== 0 || mixed !== 3) process.exitCode = 1;
  if (insights.longTermUseMentionCount !== 2) process.exitCode = 1;
  if ((insights.deepseekCalls ?? 0) !== 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
