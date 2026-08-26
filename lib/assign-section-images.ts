import type { DetailSection } from "@/lib/types/generate";

/** 업로드·생성 공통 한도 */
export const MAX_PRODUCT_IMAGES = 10;
/** AI가 상세페이지에 실제로 쓰도록 강제하는 최소 서로 다른 사진 수 */
export const MIN_AI_USED_IMAGES = 7;

function clampIndex(index: number, imageCount: number): number {
  return Number.isInteger(index) && index >= 0 && index < imageCount ? index : 0;
}

type Placement =
  | { kind: "hero" }
  | { kind: "image_text"; sectionIndex: number; prefer?: number }
  | { kind: "gallery_cell"; sectionIndex: number; cell: number }
  | { kind: "step"; sectionIndex: number; stepIndex: number }
  | { kind: "color_option"; sectionIndex: number; optionIndex: number };

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

function countPlacements(sections: DetailSection[]): number {
  let n = 0;
  for (const section of sections) {
    if (section.type === "hero" || section.type === "image_text") n += 1;
    else if (section.type === "gallery") n += Math.max(section.imageIndexes?.length ?? 0, 2);
    else if (section.type === "step_card") n += section.steps.length;
    else if (section.type === "color_variation") n += section.options.length;
  }
  return n;
}

/**
 * 전역 least-used 배정.
 * - 같은 컷이 quick_points + ingredient + step + gallery에 몰리는 문제 방지
 * - 업로드 장수를 최대한 고르게 사용 (MIN_AI_USED_IMAGES 이상 unique 유지)
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

  const placementCount = Math.max(1, countPlacements(sections));
  const maxUses = Math.max(1, Math.ceil(placementCount / imageCount));
  const freq = Array.from({ length: imageCount }, () => 0);
  let lastPicked = -1;

  function pick(opts?: { prefer?: number; avoid?: number[]; excludeHero?: boolean }): number {
    const avoid = new Set(opts?.avoid ?? []);
    if (opts?.prefer !== undefined) {
      const p = clampIndex(opts.prefer, imageCount);
      if (freq[p] < maxUses && !avoid.has(p) && p !== lastPicked) {
        freq[p] += 1;
        lastPicked = p;
        return p;
      }
    }

    let best = -1;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let i = 0; i < imageCount; i += 1) {
      if (opts?.excludeHero && i === heroIndex && imageCount > 3) continue;
      if (avoid.has(i)) continue;
      // 직전 섹션과 같은 컷 금지(가능하면)
      const adjacencyPenalty = i === lastPicked ? 100 : 0;
      const unusedBonus = freq[i] === 0 ? -10 : 0;
      const overCap = freq[i] >= maxUses ? 1000 : 0;
      const score = freq[i] * 10 + adjacencyPenalty + unusedBonus + overCap;
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best < 0) best = 0;
    freq[best] += 1;
    lastPicked = best;
    return best;
  }

  const placements: Placement[] = [];
  sections.forEach((section, sectionIndex) => {
    if (section.type === "hero") {
      placements.push({ kind: "hero" });
    } else if (section.type === "image_text") {
      let prefer: number | undefined;
      if (section.slot === "ingredient_highlight" && imageCount > 1) prefer = 1;
      if (section.slot === "texture_feel" && imageCount > 2) prefer = 2;
      placements.push({ kind: "image_text", sectionIndex, prefer });
    } else if (section.type === "gallery") {
      const wanted = Math.min(
        Math.max(section.imageIndexes?.length ?? 2, imageCount >= 7 ? 4 : 2),
        imageCount,
        6,
      );
      for (let cell = 0; cell < wanted; cell += 1) {
        placements.push({ kind: "gallery_cell", sectionIndex, cell });
      }
    } else if (section.type === "step_card") {
      section.steps.forEach((_, stepIndex) => {
        placements.push({ kind: "step", sectionIndex, stepIndex });
      });
    } else if (section.type === "color_variation") {
      section.options.forEach((_, optionIndex) => {
        placements.push({ kind: "color_option", sectionIndex, optionIndex });
      });
    }
  });

  const assigned = new Map<string, number>();
  const galleryBuckets = new Map<number, number[]>();

  for (const placement of placements) {
    if (placement.kind === "hero") {
      freq[heroIndex] += 1;
      lastPicked = heroIndex;
      assigned.set("hero", heroIndex);
      continue;
    }
    if (placement.kind === "image_text") {
      const idx = pick({ prefer: placement.prefer });
      assigned.set(`it:${placement.sectionIndex}`, idx);
      continue;
    }
    if (placement.kind === "gallery_cell") {
      const bucket = galleryBuckets.get(placement.sectionIndex) ?? [];
      const idx = pick({
        avoid: bucket,
        excludeHero: imageCount >= 4,
      });
      bucket.push(idx);
      galleryBuckets.set(placement.sectionIndex, bucket);
      continue;
    }
    if (placement.kind === "step") {
      const idx = pick();
      assigned.set(`step:${placement.sectionIndex}:${placement.stepIndex}`, idx);
      continue;
    }
    if (placement.kind === "color_option") {
      const idx = pick();
      assigned.set(`opt:${placement.sectionIndex}:${placement.optionIndex}`, idx);
    }
  }

  const mapped = sections.map((section, sectionIndex) => {
    if (section.type === "hero") {
      return { ...section, imageIndex: assigned.get("hero") ?? heroIndex };
    }
    if (section.type === "image_text") {
      return {
        ...section,
        imageIndex: assigned.get(`it:${sectionIndex}`) ?? section.imageIndex,
      };
    }
    if (section.type === "gallery") {
      const indexes = galleryBuckets.get(sectionIndex) ?? section.imageIndexes;
      return { ...section, imageIndexes: indexes };
    }
    if (section.type === "step_card") {
      return {
        ...section,
        steps: section.steps.map((step, stepIndex) => ({
          ...step,
          imageIndex:
            assigned.get(`step:${sectionIndex}:${stepIndex}`) ?? step.imageIndex,
        })),
      };
    }
    if (section.type === "color_variation") {
      return {
        ...section,
        options: section.options.map((option, optionIndex) => ({
          ...option,
          imageIndex:
            assigned.get(`opt:${sectionIndex}:${optionIndex}`) ?? option.imageIndex,
        })),
      };
    }
    return section;
  });

  // unique 장수가 MIN 미만이면(극단적으로 슬롯이 적을 때) 미사용 컷을 image_text에 추가 주입
  const used = collectUsedIndexes(mapped);
  const targetUnique = Math.min(Math.max(MIN_AI_USED_IMAGES, 1), imageCount);
  if (used.length < targetUnique) {
    const unused = Array.from({ length: imageCount }, (_, i) => i).filter((i) => !used.includes(i));
    return mapped.map((section) => {
      if (unused.length === 0 || used.length >= targetUnique) return section;
      if (section.type !== "image_text") return section;
      const next = unused.shift();
      if (next === undefined) return section;
      used.push(next);
      return { ...section, imageIndex: next };
    });
  }

  return mapped;
}

/** 프롬프트/로그용: 실제로 몇 장이 쓰였는지 */
export function countDistinctSectionImages(sections: DetailSection[]): number {
  return collectUsedIndexes(sections).length;
}

/** 진단용: 인덱스별 사용 횟수 */
export function countImageIndexFrequency(sections: DetailSection[]): Record<number, number> {
  const freq: Record<number, number> = {};
  const add = (i: number) => {
    freq[i] = (freq[i] ?? 0) + 1;
  };
  for (const section of sections) {
    if (section.type === "hero" || section.type === "image_text") add(section.imageIndex);
    else if (section.type === "gallery") section.imageIndexes.forEach(add);
    else if (section.type === "step_card") section.steps.forEach((s) => add(s.imageIndex));
    else if (section.type === "color_variation") section.options.forEach((o) => add(o.imageIndex));
  }
  return freq;
}
