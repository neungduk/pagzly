import { CATEGORY_SLOT_TEMPLATES, resolveTemplateCategory } from "@/lib/section-templates";
import type { DetailSection } from "@/lib/types/generate";

export type TemplateSlotCoverageItem = {
  slot: string;
  label: string;
  required: boolean;
  present: boolean;
};

/** 현재 섹션 구성이 카테고리 템플릿 슬롯을 얼마나 채우는지 (API 없음). */
export function getTemplateSlotCoverage(
  sections: DetailSection[],
  category: string,
): TemplateSlotCoverageItem[] {
  const template = CATEGORY_SLOT_TEMPLATES[resolveTemplateCategory(category)];
  const presentSlots = new Set(sections.map((s) => s.slot));
  return template.map((def) => ({
    slot: def.slot,
    label: def.note?.slice(0, 24) || def.slot,
    required: def.required ?? false,
    present: presentSlots.has(def.slot),
  }));
}

export function countMissingRequiredSlots(
  sections: DetailSection[],
  category: string,
): number {
  return getTemplateSlotCoverage(sections, category).filter((i) => i.required && !i.present)
    .length;
}
