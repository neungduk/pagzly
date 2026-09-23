/**
 * 204차 — fashion size/fit regex + category gating smoke (API 0).
 *   npx tsx scripts/204cha-fashion-size-fit-signal-smoke.ts
 */
import {
  countSizeFitMentions,
  extractReviewInsights,
} from "../lib/review-insights";
import { buildReviewHighlightSection } from "../lib/section-inserts";

function gate(category: string, count: number | undefined) {
  return category === "의류/패션" ? count : undefined;
}

async function main() {
  delete process.env.DEEPSEEK_API_KEY;

  const hit = countSizeFitMentions([
    "정사이즈로 딱 맞아요",
    "배송이 빨라요",
    "사이즈업 추천드려요",
  ]);
  const falsePositive = countSizeFitMentions([
    "가격이 크게 부담되진 않아요",
    "이 옷은 작다고 느낄 수도",
  ]);
  const mixed = countSizeFitMentions([
    "정사이즈입니다",
    "사이즈 다운 하세요",
    "사이즈 크게 나왔어요",
    "핏이 예뻐요",
  ]);
  console.log("regex hit", hit, "expect 2");
  console.log("regex falsePositive (크게/작다 단독)", falsePositive, "expect 0");
  console.log("regex mixed", mixed, "expect 3");

  const sample = [
    "정사이즈로 딱 맞아요",
    "가격이 크게 부담되진 않아요",
    "사이즈업 추천드려요",
  ].join("\n");
  const buf = Buffer.from(sample, "utf8");
  const insights = await extractReviewInsights(buf, "txt");
  console.log(
    "extract sizeFitMentionCount",
    insights.sizeFitMentionCount,
    "expect 2",
  );
  console.log("deepseekCalls", insights.deepseekCalls ?? 0, "expect 0");

  const fashionSec = buildReviewHighlightSection(
    ["좋아요"],
    [],
    3,
    undefined,
    undefined,
    undefined,
    undefined,
    gate("의류/패션", insights.sizeFitMentionCount),
  );
  const beautySec = buildReviewHighlightSection(
    ["좋아요"],
    [],
    3,
    undefined,
    undefined,
    undefined,
    undefined,
    gate("화장품/뷰티", insights.sizeFitMentionCount),
  );
  console.log(
    "gating fashion section sizeFitMentionCount",
    fashionSec.sizeFitMentionCount,
    "expect 2",
  );
  console.log(
    "gating beauty section sizeFitMentionCount",
    beautySec.sizeFitMentionCount,
    "expect undefined",
  );
  console.log(
    "CreateProductForm category gate string",
    "의류/패션",
    "(matches components/CreateProductForm.tsx CATEGORIES[0])",
  );

  if (hit !== 2 || falsePositive !== 0 || mixed !== 3) process.exitCode = 1;
  if (insights.sizeFitMentionCount !== 2) process.exitCode = 1;
  if ((insights.deepseekCalls ?? 0) !== 0) process.exitCode = 1;
  if (
    fashionSec.sizeFitMentionCount !== 2 ||
    beautySec.sizeFitMentionCount != null
  ) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
