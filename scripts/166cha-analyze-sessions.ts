import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");
const ids = [
  "cosmetics-review",
  "cosmetics-noreview",
  "food",
  "electronics",
  "fashion",
  "living",
];

for (const id of ids) {
  const j = JSON.parse(
    fs.readFileSync(path.join(ROOT, "review", `139cha-session-${id}.json`), "utf8"),
  ) as Record<string, unknown>;
  const generated = j.generated as { sections?: Array<{ type: string; slot?: string }> } | undefined;
  const sections = generated?.sections ?? [];
  const types = sections.map((s) => s.type);
  console.log(
    JSON.stringify({
      id,
      testMode: j.testMode,
      draftApproved: j.draftApproved,
      sectionCount: sections.length,
      chart: types.includes("comparison_chart"),
      hasReviewInsights: Boolean(j.reviewInsights),
      ingredientsLen: String(j.ingredients ?? "").length,
      keyFeaturesLen: String(j.keyFeatures ?? "").length,
      keyFeaturesHead: String(j.keyFeatures ?? "").slice(0, 100),
      ingredientsHead: String(j.ingredients ?? "").slice(0, 80),
      imageCount: Array.isArray(j.imageUrls) ? j.imageUrls.length : 0,
    }),
  );
}
