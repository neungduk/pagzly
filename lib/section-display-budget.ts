/**
 * 183cha ? category section display budget (render/export only; session JSON untouched).
 * 190cha: MAX_EVIDENCE_LOW 2->1, MAX_EXTRA_IMAGE_LOW 1->0 (constants only).
 */
import type { DetailSection } from "@/lib/types/generate";

/** Form category labels (also pre-resolveTemplateCategory strings) */
const LOW_INVOLVEMENT = new Set([
  "\uC0DD\uD65C\uC6A9\uD488", // ????
  "\uC0DD\uD65C/\uB9AC\uBE59", // ??/??
  "\uBC18\uB824\uB3D9\uBB3C", // ????
]);

/** Evidence / persuasion optional types ? cap exposure count */
const EVIDENCE_TYPES = [
  "comparison_chart",
  "stat_infographic",
  "tradeoff_card",
  "review_highlight",
] as const;

const EVIDENCE_PRIORITY: Record<string, number> = {
  comparison_chart: 0,
  stat_infographic: 1,
  tradeoff_card: 2,
  review_highlight: 3,
};

const MAX_EVIDENCE_LOW = 1; // 190: was 2 ? keep comparison_chart first

/** Decorative / secondary slots ? hidden for low-involvement */
const DEMOTE_SLOTS = new Set([
  "illustration_banner",
  "package_contents",
  "target_persona",
  "usage_scenario_extra",
]);

/**
 * shortTier extra image-narrative slots ? at most N for low-involvement.
 * (Template may still mark required; this only adjusts display priority.)
 */
const EXTRA_IMAGE_SLOTS = new Set([
  "material_detail",
  "packaging_design",
  "care_tip",
  "material_feature",
]);

const MAX_EXTRA_IMAGE_LOW = 0; // 190: was 1 ? demote all EXTRA_IMAGE_SLOTS

export function isLowInvolvementCategory(category: string): boolean {
  return LOW_INVOLVEMENT.has(category);
}

/**
 * @returns demotedIndexes ? indexes into the original sections array (to hide)
 */
export function computeDemotedSectionIndexes(
  category: string,
  sections: DetailSection[],
): number[] {
  if (!isLowInvolvementCategory(category)) return [];

  const demote = new Set<number>();

  // 1) decorative / secondary slots
  sections.forEach((s, i) => {
    if (s.type === "illustration_banner" || DEMOTE_SLOTS.has(s.slot)) {
      demote.add(i);
    }
  });

  // 2) evidence cap (keep highest priority first)
  const evidenceIdx = sections
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => (EVIDENCE_TYPES as readonly string[]).includes(s.type))
    .sort(
      (a, b) =>
        (EVIDENCE_PRIORITY[a.s.type] ?? 99) - (EVIDENCE_PRIORITY[b.s.type] ?? 99),
    );
  evidenceIdx.slice(MAX_EVIDENCE_LOW).forEach(({ i }) => demote.add(i));

  // 3) extra image-narrative slot cap (keep from the front)
  // 231차 — 반려동물 material_feature는 성분 원형 링(185차)의 호스트 슬롯.
  // MAX_EXTRA_IMAGE_LOW=0이면 해당 섹션이 통째로 사라져 링 배선이 다시 죽은 코드가 된다.
  let keptExtra = 0;
  sections.forEach((s, i) => {
    if (demote.has(i)) return;
    if (s.type === "image_text" && EXTRA_IMAGE_SLOTS.has(s.slot)) {
      if (category === "반려동물" && s.slot === "material_feature") return;
      if (keptExtra >= MAX_EXTRA_IMAGE_LOW) demote.add(i);
      else keptExtra += 1;
    }
  });

  return [...demote].sort((a, b) => a - b);
}

/** Display sections (does not mutate the original array) */
export function applySectionDisplayBudget(
  category: string,
  sections: DetailSection[],
): DetailSection[] {
  const demoted = new Set(computeDemotedSectionIndexes(category, sections));
  if (demoted.size === 0) return sections;
  return sections.filter((_, i) => !demoted.has(i));
}
