/**
 * 192차 — pet age/weight regex + category gating smoke (API 0).
 *   npx tsx scripts/192cha-pet-review-signal-smoke.ts
 */
import {
  countPetAgeWeightMentions,
  extractReviewInsights,
} from "../lib/review-insights";
import { buildReviewHighlightSection } from "../lib/section-inserts";

function gate(category: string, count: number | undefined) {
  return category === "반려동물" ? count : undefined;
}

async function main() {
  const hit = countPetAgeWeightMentions([
    "우리 강아지 3살인데 체중 5kg라 딱 맞아요",
  ]);
  const miss = countPetAgeWeightMentions(["배송이 빨라요"]);
  const mixed = countPetAgeWeightMentions([
    "배송이 빨라요",
    "8개월 무료배송",
    "몸무게 2kg 제품이라 가벼워요",
  ]);
  console.log("regex hit", hit, "expect 1");
  console.log("regex miss", miss, "expect 0");
  console.log("regex mixed", mixed, "expect 2 (8개월 + 2kg)");

  const sample = [
    "우리 강아지 3살인데 체중 5kg라 딱 맞아요",
    "배송이 빨라요",
    "2살 고양이도 잘 먹어요",
  ].join("\n");
  const buf = Buffer.from(sample, "utf8");
  const insights = await extractReviewInsights(buf, "txt");
  console.log("extract petAgeWeightMentionCount", insights.petAgeWeightMentionCount, "expect 2");

  const petSec = buildReviewHighlightSection(
    ["좋아요"],
    [],
    3,
    undefined,
    undefined,
    gate("반려동물", insights.petAgeWeightMentionCount),
  );
  const elecSec = buildReviewHighlightSection(
    ["좋아요"],
    [],
    3,
    undefined,
    undefined,
    gate("전자제품", insights.petAgeWeightMentionCount),
  );
  console.log(
    "gating pet section petAgeWeightMentionCount",
    petSec.petAgeWeightMentionCount,
    "expect 2",
  );
  console.log(
    "gating electronics petAgeWeightMentionCount",
    elecSec.petAgeWeightMentionCount,
    "expect undefined",
  );
  console.log("sourceReviewCount regression", petSec.sourceReviewCount, "expect 3");

  if (hit !== 1 || miss !== 0 || mixed !== 2) process.exitCode = 1;
  if (insights.petAgeWeightMentionCount !== 2) process.exitCode = 1;
  if (petSec.petAgeWeightMentionCount !== 2 || elecSec.petAgeWeightMentionCount != null) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
