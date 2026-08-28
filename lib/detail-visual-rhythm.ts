import type { DetailSection } from "@/lib/types/generate";

const SECTION_KICKERS: Partial<Record<DetailSection["type"], string>> = {
  checklist: "OVERVIEW",
  highlight_box: "KEY POINTS",
  image_text: "FEATURE",
  gallery: "GALLERY",
  brand_story: "STORY",
  target_persona: "FOR YOU",
  step_card: "HOW TO",
  spec_table: "INFO",
  stat_infographic: "DATA",
  comparison_chart: "COMPARE",
  faq: "FAQ",
  usage_steps: "GUIDE",
  caution: "NOTICE",
};

export function getSectionKicker(section: DetailSection): string | null {
  if (section.type === "hero") return null;
  const slotLabel = section.slot
    ? section.slot.replace(/_/g, " ").toUpperCase()
    : null;
  return SECTION_KICKERS[section.type] ?? slotLabel ?? "DETAIL";
}

export function formatSectionIndex(bodyIndex: number): string {
  return String(bodyIndex + 1).padStart(2, "0");
}

export function resolveSplitImageLeft(
  section: Extract<DetailSection, { type: "image_text" }>,
  pointIndex?: number,
): boolean {
  if (section.imagePosition === "right") return false;
  if (section.imagePosition === "left") return true;
  return (pointIndex ?? 0) % 2 === 0;
}

export function shouldUseSplitLayout(section: DetailSection): boolean {
  if (section.type !== "image_text") return false;
  if (section.layout === "compact" || section.layout === "callout") return false;
  if (section.slot === "quick_points" || section.slot === "feature_callout") return false;
  return true;
}

export function shouldInsertBreather(
  prev: DetailSection | undefined,
  current: DetailSection,
): boolean {
  if (!prev || prev.type === "hero" || current.type === "hero") return false;

  const breaksAfter = new Set<DetailSection["type"]>([
    "checklist",
    "highlight_box",
    "gallery",
    "step_card",
    "stat_infographic",
    "comparison_chart",
  ]);
  const breaksBefore = new Set<DetailSection["type"]>([
    "gallery",
    "brand_story",
    "target_persona",
    "faq",
    "spec_table",
  ]);

  return breaksAfter.has(prev.type) || breaksBefore.has(current.type);
}
