import type { DetailSection } from "@/lib/types/generate";
import { resolveTemplateCategory } from "@/lib/section-templates";

export type DetailPageScoreResult = {
  score: number;
  maxScore: number;
  percent: number;
  items: { id: string; label: string; passed: boolean; weight: number }[];
};

const SLOT_CHECKS: Array<{
  id: string;
  label: string;
  weight: number;
  slots: string[];
  types?: DetailSection["type"][];
}> = [
  { id: "hero", label: "히어로", weight: 8, slots: ["hero"], types: ["hero"] },
  { id: "checklist", label: "핵심 포인트", weight: 6, slots: ["checklist"], types: ["checklist"] },
  { id: "callout", label: "말풍선 강조", weight: 6, slots: ["feature_callout"], types: ["image_text"] },
  { id: "highlight", label: "3축 하이라이트", weight: 6, slots: ["highlight_box"], types: ["highlight_box"] },
  { id: "steps", label: "스텝 카드", weight: 6, slots: ["step_card"], types: ["step_card"] },
  { id: "info", label: "INFO 고시표", weight: 8, slots: ["spec_table", "size_table", "nutrition_table"], types: ["spec_table"] },
  { id: "shipping", label: "배송·교환", weight: 5, slots: ["shipping_info"], types: ["spec_table"] },
  { id: "gallery", label: "갤러리/멀티컷", weight: 5, slots: ["gallery", "model_multicut"], types: ["gallery"] },
  { id: "usage_scene", label: "사용 장면", weight: 5, slots: ["usage_scenario", "coordination", "customer_scenario"], types: ["image_text"] },
  { id: "faq", label: "FAQ", weight: 4, slots: ["faq"], types: ["faq"] },
  { id: "caution", label: "주의·고시", weight: 4, slots: ["caution", "warranty_caution", "care_info"], types: ["caution", "image_text"] },
  { id: "cta", label: "CTA·가격", weight: 6, slots: ["cta_price"], types: ["cta_price"] },
  { id: "ai_disclosure", label: "AI 고지", weight: 3, slots: ["ai_disclosure"], types: ["ai_disclosure"] },
  { id: "brand_story", label: "브랜드 스토리", weight: 3, slots: ["brand_story"], types: ["brand_story"] },
  { id: "persona", label: "추천 대상", weight: 3, slots: ["target_persona"], types: ["target_persona"] },
];

function hasSlot(sections: DetailSection[], slot: string, type?: DetailSection["type"]): boolean {
  return sections.some((s) => s.slot === slot || (type != null && s.type === type && s.slot === slot));
}

function countSpecRows(sections: DetailSection[]): number {
  return sections
    .filter((s) => s.type === "spec_table")
    .reduce((n, s) => n + (s.type === "spec_table" ? s.rows.length : 0), 0);
}

/**
 * reference-patterns §10 + Page Maker 모듈 커버리지 근사 점수 (0~100).
 * API 호출 없이 섹션 구조만 평가.
 */
export function scoreDetailPageStructure(
  sections: DetailSection[],
  category: string,
): DetailPageScoreResult {
  const templateCat = resolveTemplateCategory(category);
  const items = SLOT_CHECKS.map((check) => {
    const passed = check.slots.some((slot) => hasSlot(sections, slot, check.types?.[0]));
    return { id: check.id, label: check.label, passed, weight: check.weight };
  });

  // INFO 행 5개 이상 보너스
  const specRows = countSpecRows(sections);
  const infoRich = specRows >= 5;
  items.push({
    id: "info_rows",
    label: `INFO 행 ≥5 (${specRows})`,
    passed: infoRich,
    weight: 5,
  });

  // stat 또는 comparison (Page Maker 수치 모듈)
  const hasStat = sections.some(
    (s) => s.type === "stat_infographic" || s.type === "comparison_chart",
  );
  items.push({
    id: "stat_compare",
    label: "수치/비교 모듈",
    passed: hasStat,
    weight: 4,
  });

  void templateCat;

  const maxScore = items.reduce((s, i) => s + i.weight, 0);
  const score = items.reduce((s, i) => s + (i.passed ? i.weight : 0), 0);
  const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return { score, maxScore, percent, items };
}
