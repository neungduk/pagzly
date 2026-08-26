import type { DetailSection } from "@/lib/types/generate";

/** 업로드·생성 공통 한도 */
export const MAX_PRODUCT_IMAGES = 10;
/** AI가 상세페이지에 실제로 쓰도록 강제하는 최소 서로 다른 사진 수 */
export const MIN_AI_USED_IMAGES = 7;

function clampIndex(index: number, imageCount: number): number {
  return Number.isInteger(index) && index >= 0 && index < imageCount ? index : 0;
}

function collectUsedIndexes(sections: DetailSection[]): number[] {
  const used: number[] = [];
  const add = (i: number) => {
    if (!used.includes(i)) used.push(i);
  };
  for (const section of sections) {
    if (section.type === "hero" || section.type === "image_text") {
      add(section.imageIndex);
    } else if (section.type === "gallery") {
      section.imageIndexes.forEach(add);
    } else if (section.type === "color_variation") {
      section.options.forEach((o) => add(o.imageIndex));
    } else if (section.type === "step_card") {
      section.steps.forEach((s) => add(s.imageIndex));
    }
  }
  return used;
}

/**
 * 화장품처럼 성분/질감 전용 컷이 있으면 히어로는 첫 장(스튜디오 합성)을 고정한다.
 * 업로드가 7장 이상이면 서로 다른 사진을 최소 7장까지 섹션에 펼친다.
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
  const targetUnique = Math.min(Math.max(MIN_AI_USED_IMAGES, 1), imageCount);

  let mapped: DetailSection[] = sections.map((section) => {
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
      const wanted = Math.min(
        Math.max(section.imageIndexes?.length ?? 2, imageCount >= 7 ? 4 : 2),
        imageCount,
        6,
      );
      return {
        ...section,
        imageIndexes: fillDistinctIndexes(section.imageIndexes ?? [], imageCount, wanted),
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

    if (section.type === "step_card") {
      let stepCursor = 0;
      return {
        ...section,
        steps: section.steps.map((step) => {
          const imageIndex = (heroIndex + 1 + stepCursor) % imageCount;
          stepCursor += 1;
          return { ...step, imageIndex };
        }),
      };
    }

    return section;
  });

  // 최소 사용 장수 미달 시: image_text / step_card / gallery에 미사용 인덱스를 밀어 넣음
  let used = collectUsedIndexes(mapped);
  if (used.length < targetUnique) {
    const unused = Array.from({ length: imageCount }, (_, i) => i).filter((i) => !used.includes(i));
    mapped = mapped.map((section) => {
      if (unused.length === 0 || used.length >= targetUnique) return section;

      if (section.type === "image_text") {
        const next = unused.shift();
        if (next === undefined) return section;
        used.push(next);
        return { ...section, imageIndex: next };
      }

      if (section.type === "step_card") {
        return {
          ...section,
          steps: section.steps.map((step) => {
            if (unused.length === 0 || used.length >= targetUnique) return step;
            if (used.includes(step.imageIndex) && used.length >= targetUnique / 2) {
              const next = unused.shift();
              if (next === undefined) return step;
              used.push(next);
              return { ...step, imageIndex: next };
            }
            return step;
          }),
        };
      }

      if (section.type === "gallery" && section.imageIndexes.length < Math.min(6, imageCount)) {
        const nextIndexes = [...section.imageIndexes];
        while (
          nextIndexes.length < Math.min(6, imageCount) &&
          unused.length > 0 &&
          used.length < targetUnique
        ) {
          const next = unused.shift();
          if (next === undefined) break;
          nextIndexes.push(next);
          used.push(next);
        }
        return { ...section, imageIndexes: nextIndexes };
      }

      return section;
    });
  }

  return mapped;
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

/** 프롬프트/로그용: 실제로 몇 장이 쓰였는지 */
export function countDistinctSectionImages(sections: DetailSection[]): number {
  return collectUsedIndexes(sections).length;
}
