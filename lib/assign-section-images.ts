import type { DetailSection } from "@/lib/types/generate";

function clampIndex(index: number, imageCount: number): number {
  return Number.isInteger(index) && index >= 0 && index < imageCount ? index : 0;
}

/**
 * 화장품처럼 성분/질감 전용 컷이 있으면 히어로는 첫 장(스튜디오 합성)을 고정한다.
 * 그 외 카테고리는 히어로 인덱스를 유지하고, image_text/갤러리는 연속 재사용을 피한다.
 */
export function assignDistinctSectionImages(
  sections: DetailSection[],
  imageCount: number,
): DetailSection[] {
  if (imageCount <= 1) return sections;

  const pinStudioHero = sections.some((section) => section.slot === "ingredient_highlight");
  const hero = sections.find((section) => section.type === "hero");
  const heroIndex = pinStudioHero
    ? 0
    : hero && hero.type === "hero"
      ? clampIndex(hero.imageIndex, imageCount)
      : 0;

  let imageTextCursor = 0;

  return sections.map((section) => {
    if (section.type === "hero") {
      return { ...section, imageIndex: heroIndex };
    }

    if (section.type === "image_text") {
      if (section.slot === "ingredient_highlight" && imageCount > 1) {
        return { ...section, imageIndex: 1 };
      }
      if (section.slot === "texture_feel") {
        const textureIndex = imageCount > 2 ? 2 : Math.min(1, imageCount - 1);
        return { ...section, imageIndex: textureIndex };
      }
      const imageIndex = (heroIndex + 1 + imageTextCursor) % imageCount;
      imageTextCursor += 1;
      return { ...section, imageIndex };
    }

    if (section.type === "gallery") {
      return {
        ...section,
        imageIndexes: fillDistinctIndexes(
          section.imageIndexes,
          imageCount,
          Math.max(2, section.imageIndexes.length),
        ),
      };
    }

    if (section.type === "color_variation") {
      let optionCursor = 0;
      return {
        ...section,
        options: section.options.map((option) => {
          const imageIndex = (heroIndex + 1 + optionCursor) % imageCount;
          optionCursor += 1;
          return { ...option, imageIndex };
        }),
      };
    }

    return section;
  });
}

function fillDistinctIndexes(
  indexes: number[],
  imageCount: number,
  wanted: number,
): number[] {
  const cap = Math.min(Math.max(wanted, 1), imageCount);
  const unique: number[] = [];
  for (const index of indexes) {
    const clamped = clampIndex(index, imageCount);
    if (!unique.includes(clamped)) unique.push(clamped);
    if (unique.length >= cap) return unique;
  }
  for (let index = 0; index < imageCount && unique.length < cap; index += 1) {
    if (!unique.includes(index)) unique.push(index);
  }
  return unique;
}
