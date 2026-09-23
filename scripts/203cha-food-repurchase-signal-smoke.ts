/**
 * 203차 — food repurchase regex + category gating smoke (API 0).
 *   npx tsx scripts/203cha-food-repurchase-signal-smoke.ts
 */
import {
  countRepurchaseMentions,
  extractReviewInsights,
} from "../lib/review-insights";
import { buildReviewHighlightSection } from "../lib/section-inserts";

function gate(category: string, count: number | undefined) {
  return category === "식품/건강기능식품" ? count : undefined;
}

async function main() {
  // DeepSeek 호출 방지 — extract는 정규식 필드만 검증
  delete process.env.DEEPSEEK_API_KEY;

  const hit = countRepurchaseMentions([
    "맛있어서 재구매했어요",
    "배송이 빨라요",
    "또 주문했습니다",
  ]);
  const miss = countRepurchaseMentions(["맛이 좋아요", "포장이 깔끔해요"]);
  const mixed = countRepurchaseMentions([
    "재주문할게요",
    "계속 구매 중입니다",
    "또 구입했어요",
    "향이 좋아요",
  ]);
  console.log("regex hit", hit, "expect 2");
  console.log("regex miss", miss, "expect 0");
  console.log("regex mixed", mixed, "expect 3");

  const sample = [
    "맛있어서 재구매했어요",
    "배송이 빨라요",
    "또 시켰어요는 패턴 밖",
    "또 주문했습니다",
  ].join("\n");
  const buf = Buffer.from(sample, "utf8");
  const insights = await extractReviewInsights(buf, "txt");
  console.log(
    "extract repurchaseMentionCount",
    insights.repurchaseMentionCount,
    "expect 2",
  );
  console.log("deepseekCalls", insights.deepseekCalls ?? 0, "expect 0");

  const foodSec = buildReviewHighlightSection(
    ["좋아요"],
    [],
    4,
    undefined,
    undefined,
    undefined,
    gate("식품/건강기능식품", insights.repurchaseMentionCount),
  );
  const beautySec = buildReviewHighlightSection(
    ["좋아요"],
    [],
    4,
    undefined,
    undefined,
    undefined,
    gate("화장품/뷰티", insights.repurchaseMentionCount),
  );
  console.log(
    "gating food section repurchaseMentionCount",
    foodSec.repurchaseMentionCount,
    "expect 2",
  );
  console.log(
    "gating beauty section repurchaseMentionCount",
    beautySec.repurchaseMentionCount,
    "expect undefined",
  );
  console.log("sourceReviewCount regression", foodSec.sourceReviewCount, "expect 4");

  if (hit !== 2 || miss !== 0 || mixed !== 3) process.exitCode = 1;
  if (insights.repurchaseMentionCount !== 2) process.exitCode = 1;
  if ((insights.deepseekCalls ?? 0) !== 0) process.exitCode = 1;
  if (
    foodSec.repurchaseMentionCount !== 2 ||
    beautySec.repurchaseMentionCount != null
  ) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
