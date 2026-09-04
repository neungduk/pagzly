import type { DetailSection } from "@/lib/types/generate";
import { getSlotTemplate } from "@/lib/section-templates";

export function nonemptyHighlightCards(
  section: Extract<DetailSection, { type: "highlight_box" }>,
): { title: string; body: string }[] {
  if (!Array.isArray(section.cards)) return [];
  return section.cards.filter(
    (card) => (card?.title ?? "").trim() || (card?.body ?? "").trim(),
  );
}

/** cards가 비어 있는 highlight_box는 목록에서 제외 (98차) */
export function dropHollowHighlightBoxes(sections: DetailSection[]): DetailSection[] {
  return sections.filter((section) => {
    if (section.type !== "highlight_box") return true;
    const cards = nonemptyHighlightCards(section);
    if (cards.length === 0) {
      console.warn("[generate] highlight_box cards empty — section dropped", {
        slot: section.slot,
        heading: section.heading,
      });
      return false;
    }
    return true;
  });
}

export function missingRequiredHighlightBox(
  sections: DetailSection[],
  category: string,
  length?: string | null,
): boolean {
  const template = getSlotTemplate(category, length === "short" ? "short" : "long");
  return template.some((def) => {
    if (def.type !== "highlight_box" || !def.required) return false;
    return !sections.some(
      (section) =>
        section.type === "highlight_box" &&
        section.slot === def.slot &&
        nonemptyHighlightCards(section).length >= 1,
    );
  });
}

export const HIGHLIGHT_BOX_RETRY_APPENDIX = `
## 수정 지시 (필수)
highlight_box 섹션의 cards 배열이 비어 있으면 안 됩니다. 핵심 효과/성분을 카드 3장(title 6자 내외 + body 1~2문장)으로 반드시 채우세요.
`;
