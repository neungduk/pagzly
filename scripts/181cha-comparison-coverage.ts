/**
 * 181차 — comparison_chart 카테고리 커버리지 확인 (코드만, API 0).
 *   npx tsx scripts/181cha-comparison-coverage.ts
 */
import {
  CATEGORY_SLOT_TEMPLATES,
  buildSectionLengthGuide,
  resolveTemplateCategory,
  type TemplateCategory,
} from "../lib/section-templates";

const FORM_CATEGORIES = [
  "화장품/뷰티",
  "의류/패션",
  "식품/건강기능식품",
  "전자제품",
  "생활용품",
  "반려동물",
] as const;

function hasChartSlot(cat: TemplateCategory): boolean {
  return CATEGORY_SLOT_TEMPLATES[cat].some(
    (s) => s.slot === "comparison_chart" && s.type === "comparison_chart",
  );
}

const rows = FORM_CATEGORIES.map((formCat) => {
  const template = resolveTemplateCategory(formCat);
  const guide = buildSectionLengthGuide(formCat);
  return {
    formCategory: formCat,
    templateCategory: template,
    hasSlot: hasChartSlot(template),
    lengthGuideMentionsChart: guide.includes("comparison_chart"),
  };
});

console.log(JSON.stringify({ rows, allHaveSlot: rows.every((r) => r.hasSlot) }, null, 2));
if (!rows.every((r) => r.hasSlot)) {
  console.error("[181] FAIL — missing comparison_chart slot");
  process.exit(1);
}
if (!rows.every((r) => r.lengthGuideMentionsChart)) {
  console.error("[181] FAIL — length guide missing comparison_chart");
  process.exit(1);
}
console.log("[181] comparison_chart coverage: 6/6 slots + length guides OK (161차 이후 유지)");
