import type { DetailSection, ImageTextSection } from "@/lib/types/generate";
import { parseIngredientLabels } from "@/lib/ingredient-labels";

const CIRCLE_PAIR_SLOT = "ingredient_circle_pair";
const CIRCLE_SOLO_SLOT = "ingredient_circle_solo";

function hasCircleVisual(sections: DetailSection[]): boolean {
  return sections.some(
    (s) =>
      s.type === "image_text" &&
      (s.layout === "circle-pair" || s.layout === "circle-solo"),
  );
}

function specTableIndex(sections: DetailSection[]): number {
  return sections.findIndex((s) => s.type === "spec_table" && s.slot === "spec_table");
}

/** 69차 — 성분 1개=circle-solo, 2개+=circle-pair (INFO 직전 삽입) */
export function applyIngredientCircleVisual(
  sections: DetailSection[],
  imageUrls: string[],
  ingredients: string | null | undefined,
): { sections: DetailSection[]; applied: boolean } {
  if (hasCircleVisual(sections)) {
    return { sections, applied: false };
  }

  const labels = parseIngredientLabels(ingredients);
  if (!labels) {
    return { sections, applied: false };
  }

  const specIdx = specTableIndex(sections);
  if (specIdx < 0) {
    return { sections, applied: false };
  }

  const ingSection = sections.find(
    (s): s is ImageTextSection =>
      s.type === "image_text" && s.slot === "ingredient_highlight",
  );
  if (!ingSection) {
    return { sections, applied: false };
  }

  const ingUrl = imageUrls[ingSection.imageIndex];
  if (!ingUrl) {
    return { sections, applied: false };
  }

  if (labels.length === 1) {
    const circleSection: ImageTextSection = {
      type: "image_text",
      slot: CIRCLE_SOLO_SLOT,
      layout: "circle-solo",
      heading: "",
      body: "",
      imageIndex: ingSection.imageIndex,
      imagePosition: "left",
      circleSolo: { imageUrl: ingUrl, label: labels[0] },
    };
    const next = [...sections.slice(0, specIdx), circleSection, ...sections.slice(specIdx)];
    console.log(
      `[circle-solo] INFO 직전 삽입 — "${labels[0]}" (img ${ingSection.imageIndex})`,
    );
    return { sections: next, applied: true };
  }

  const texSection = sections.find(
    (s): s is ImageTextSection => s.type === "image_text" && s.slot === "texture_feel",
  );
  if (!texSection) {
    return { sections, applied: false };
  }

  const texUrl = imageUrls[texSection.imageIndex];
  if (!texUrl || ingSection.imageIndex === texSection.imageIndex) {
    return { sections, applied: false };
  }

  const circleSection: ImageTextSection = {
    type: "image_text",
    slot: CIRCLE_PAIR_SLOT,
    layout: "circle-pair",
    heading: "",
    body: "",
    imageIndex: ingSection.imageIndex,
    imagePosition: "left",
    circlePair: [
      { imageUrl: ingUrl, label: labels[0] },
      { imageUrl: texUrl, label: labels[1] },
    ],
  };

  const next = [...sections.slice(0, specIdx), circleSection, ...sections.slice(specIdx)];
  console.log(
    `[circle-pair] INFO 직전 삽입 — "${labels[0]}" / "${labels[1]}" (img ${ingSection.imageIndex}, ${texSection.imageIndex})`,
  );
  return { sections: next, applied: true };
}

/** @deprecated applyIngredientCircleVisual 사용 */
export const applyIngredientCirclePair = applyIngredientCircleVisual;
