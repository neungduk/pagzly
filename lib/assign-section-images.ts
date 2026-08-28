import type { DetailSection } from "@/lib/types/generate";
import {
  firstIndexWithRole,
  indexesWithRole,
  normalizeImageRoles,
  type ProductImageRole,
} from "@/lib/image-roles";
import { isLifestyleAiPath } from "@/lib/lifestyle-shot-planner";

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

export type AssignSectionImagesOptions = {
  category?: string;
  /** 업로드 순서와 동일한 길이의 역할 태그 */
  imageRoles?: ProductImageRole[] | unknown;
  /** storage path — AI 일상샷(lifestyle-ai) 인덱스 감지용 */
  imagePaths?: string[];
};

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

function preferForSlot(
  slot: string,
  category: string | undefined,
  roles: ProductImageRole[],
  imageCount: number,
  lifestyleAiIndexes: number[],
): number | undefined {
  const rolePrefer = (role: ProductImageRole, fallback?: number) => {
    const idx = firstIndexWithRole(roles, role);
    if (idx !== undefined) return idx;
    return fallback !== undefined && fallback < imageCount ? fallback : undefined;
  };

  const preferLifestyleAi = () => {
    if (lifestyleAiIndexes.length === 0) return undefined;
    const slotOffset =
      slot === "usage_scenario_extra" || slot === "customer_scenario" ? 1 : 0;
    const pick = lifestyleAiIndexes[Math.min(slotOffset, lifestyleAiIndexes.length - 1)];
    return pick < imageCount ? pick : lifestyleAiIndexes[0];
  };

  if (slot === "ingredient_highlight") {
    return rolePrefer("detail", imageCount > 1 ? 1 : undefined);
  }
  if (slot === "texture_feel") {
    const details = indexesWithRole(roles, "detail");
    if (details.length > 1) return details[1];
    return rolePrefer("detail", imageCount > 2 ? 2 : undefined);
  }

  if (slot === "detail_zoom" || slot === "fabric_composition" || slot === "quick_points") {
    return rolePrefer("detail", imageCount > 1 ? 1 : undefined);
  }
  if (slot === "coordination" || slot === "seasonal_styling" || slot === "fit_guide") {
    return preferLifestyleAi() ?? rolePrefer("lifestyle", imageCount > 2 ? 2 : undefined);
  }
  if (
    category === "의류/패션" &&
    (slot === "model_multicut" || slot === "hero")
  ) {
    return rolePrefer("hero", 0) ?? preferLifestyleAi();
  }
  if (slot === "packaging_design") {
    return rolePrefer("package", imageCount > 3 ? 3 : undefined);
  }

  if (slot === "ingredient_story" || slot === "macro_detail") {
    return rolePrefer("detail", imageCount > 1 ? 1 : undefined);
  }
  if (slot === "usage_scene" || slot === "lifestyle_shot") {
    return preferLifestyleAi() ?? rolePrefer("lifestyle", imageCount > 2 ? 2 : undefined);
  }

  if (
    slot === "usage_scenario" ||
    slot === "usage_scenario_extra" ||
    slot === "customer_scenario" ||
    slot === "serving_suggestion" ||
    slot === "model_multicut" ||
    slot === "install_scenario"
  ) {
    return preferLifestyleAi() ?? rolePrefer("lifestyle", imageCount > 2 ? 2 : undefined);
  }

  void category;
  return undefined;
}

/**
 * 전역 least-used 배정.
 * - 같은 컷이 quick_points + ingredient + step + gallery에 몰리는 문제 방지
 * - 업로드 장수를 최대한 고르게 사용 (MIN_AI_USED_IMAGES 이상 unique 유지)
 * - image_text / gallery / step는 가능하면 재사용 0회(장수가 충분할 때)
 * - 역할 태그(imageRoles)가 있으면 슬롯 prefer에 반영 (패션: 착장→hero, 디테일→zoom, 코디→coordination)
 */
export function assignDistinctSectionImages(
  sections: DetailSection[],
  imageCount: number,
  options?: AssignSectionImagesOptions,
): DetailSection[] {
  if (imageCount <= 0) return sections;
  if (imageCount === 1) return sections;

  const category = options?.category;
  const roles = normalizeImageRoles(options?.imageRoles, imageCount);
  const lifestyleAiIndexes =
    options?.imagePaths
      ?.map((p, i) => (isLifestyleAiPath(p) ? i : -1))
      .filter((i) => i >= 0) ?? [];

  const pinStudioHero = sections.some((section) => section.slot === "ingredient_highlight");
  const hero = sections.find((section) => section.type === "hero");
  const roleHero = firstIndexWithRole(roles, "hero");
  const heroIndex = pinStudioHero
    ? 0
    : roleHero !== undefined
      ? roleHero
      : hero && hero.type === "hero"
        ? clampIndex(hero.imageIndex, imageCount)
        : 0;

  const placementCount = Math.max(1, countPlacements(sections));
  const maxUses = Math.max(1, Math.ceil(placementCount / imageCount));
  const softCap = imageCount >= placementCount ? 1 : maxUses;
  const freq = Array.from({ length: imageCount }, () => 0);
  let lastPicked = -1;
  const imageTextUsed = new Set<number>();

  function pick(opts?: {
    prefer?: number;
    avoid?: number[];
    excludeHero?: boolean;
    uniqueAmongImageText?: boolean;
  }): number {
    const avoid = new Set(opts?.avoid ?? []);
    if (opts?.prefer !== undefined) {
      const p = clampIndex(opts.prefer, imageCount);
      const blockedByImageText =
        opts.uniqueAmongImageText === true && imageTextUsed.has(p) && imageTextUsed.size < imageCount;
      if (
        freq[p] < softCap &&
        !avoid.has(p) &&
        p !== lastPicked &&
        !(opts?.excludeHero && p === heroIndex && imageCount > 3) &&
        !blockedByImageText
      ) {
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
      const adjacencyPenalty = i === lastPicked ? 500 : 0;
      const unusedBonus = freq[i] === 0 ? -50 : 0;
      const overSoft = freq[i] >= softCap ? 2000 : 0;
      const overHard = freq[i] >= maxUses ? 8000 : 0;
      const imageTextPenalty =
        opts?.uniqueAmongImageText && imageTextUsed.has(i) ? 3000 : 0;
      const score =
        freq[i] * 20 + adjacencyPenalty + unusedBonus + overSoft + overHard + imageTextPenalty;
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best < 0) {
      best = 0;
      let minF = freq[0] ?? 0;
      for (let i = 1; i < imageCount; i += 1) {
        if (freq[i] < minF) {
          minF = freq[i];
          best = i;
        }
      }
    }
    freq[best] += 1;
    lastPicked = best;
    return best;
  }

  const placements: Placement[] = [];
  sections.forEach((section, sectionIndex) => {
    if (section.type === "hero") {
      placements.push({ kind: "hero" });
    } else if (section.type === "image_text") {
      const prefer = preferForSlot(section.slot, category, roles, imageCount, lifestyleAiIndexes);
      placements.push({ kind: "image_text", sectionIndex, prefer });
    } else if (section.type === "gallery") {
      const wanted = Math.min(
        Math.max(section.imageIndexes?.length ?? 2, imageCount >= 7 ? 4 : imageCount >= 4 ? 3 : 2),
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
      const idx = pick({
        prefer: placement.prefer,
        excludeHero: imageCount >= 3,
        uniqueAmongImageText: true,
      });
      imageTextUsed.add(idx);
      assigned.set(`it:${placement.sectionIndex}`, idx);
      continue;
    }
    if (placement.kind === "gallery_cell") {
      const bucket = galleryBuckets.get(placement.sectionIndex) ?? [];
      const lifestyle = indexesWithRole(roles, "lifestyle");
      const details = indexesWithRole(roles, "detail");
      const pool = [...lifestyleAiIndexes, ...lifestyle, ...details];
      const prefer = pool.find((i) => !bucket.includes(i) && i !== heroIndex);
      const idx = pick({
        prefer,
        avoid: bucket,
        excludeHero: imageCount >= 4,
      });
      bucket.push(idx);
      galleryBuckets.set(placement.sectionIndex, bucket);
      continue;
    }
    if (placement.kind === "step") {
      const idx = pick({ excludeHero: imageCount >= 4 });
      assigned.set(`step:${placement.sectionIndex}:${placement.stepIndex}`, idx);
      continue;
    }
    if (placement.kind === "color_option") {
      const idx = pick({ excludeHero: imageCount >= 3 });
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

  // unique 장수가 MIN 미만이면, *중복 사용 중인* image_text만 미사용 컷으로 교체.
  // 역할 prefer로 이미 unique하게 꽂힌 컷을 덮어쓰지 않는다.
  // 목표 unique는 실제 placement 수를 넘지 않음 (슬롯 4개인데 7장 강제 금지).
  const used = collectUsedIndexes(mapped);
  const placementN = countPlacements(mapped);
  const targetUnique = Math.min(MIN_AI_USED_IMAGES, imageCount, Math.max(1, placementN));
  if (used.length < targetUnique) {
    const unused = Array.from({ length: imageCount }, (_, i) => i).filter((i) => !used.includes(i));
    const freqMap = countImageIndexFrequency(mapped);
    let uniqueCount = used.length;
    return mapped.map((section) => {
      if (unused.length === 0 || uniqueCount >= targetUnique) return section;
      if (section.type !== "image_text") return section;
      if ((freqMap[section.imageIndex] ?? 0) <= 1) return section;
      const next = unused.shift();
      if (next === undefined) return section;
      freqMap[section.imageIndex] = (freqMap[section.imageIndex] ?? 1) - 1;
      freqMap[next] = (freqMap[next] ?? 0) + 1;
      uniqueCount += 1;
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

/** 연속 image_text가 같은 컷을 쓰는지 (QA용) */
export function countAdjacentDuplicateImageTexts(sections: DetailSection[]): number {
  let dupes = 0;
  let prev: number | null = null;
  for (const section of sections) {
    if (section.type !== "image_text") {
      prev = null;
      continue;
    }
    if (prev !== null && prev === section.imageIndex) dupes += 1;
    prev = section.imageIndex;
  }
  return dupes;
}