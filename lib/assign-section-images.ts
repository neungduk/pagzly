import type { DetailSection } from "@/lib/types/generate";
import {
  firstIndexWithRole,
  indexesWithRole,
  normalizeImageRoles,
  type ProductImageRole,
} from "@/lib/image-roles";
import { isLifestyleAiPath, isLifestyleCompositePath } from "@/lib/lifestyle-shot-planner";
import { AHASH_SIMILAR_THRESHOLD, hammingDistanceHex } from "@/lib/image-ahash-bits";
import { scoreImageForCopy, sectionCopyText } from "@/lib/copy-image-match";

/** 업로드·생성 공통 한도 */
export const MAX_PRODUCT_IMAGES = 10;
/** AI가 상세페이지에 실제로 쓰도록 강제하는 최소 서로 다른 사진 수 */
export const MIN_AI_USED_IMAGES = 7;

function clampIndex(index: number, imageCount: number): number {
  return Number.isInteger(index) && index >= 0 && index < imageCount ? index : 0;
}

/** 잘못된 인덱스를 무조건 0으로 몰지 않고, 미사용·저빈도 컷을 고른다. */
function resolveIndexPreferUnused(
  index: number | undefined,
  imageCount: number,
  freq: number[],
): number {
  if (
    typeof index === "number" &&
    Number.isInteger(index) &&
    index >= 0 &&
    index < imageCount
  ) {
    return index;
  }
  let best = 0;
  let bestFreq = freq[0] ?? 0;
  for (let i = 1; i < imageCount; i += 1) {
    const f = freq[i] ?? 0;
    if (f < bestFreq) {
      best = i;
      bestFreq = f;
    }
  }
  return best;
}

type Placement =
  | { kind: "hero" }
  | { kind: "image_text"; sectionIndex: number; prefer?: number; slot?: string }
  | { kind: "gallery_cell"; sectionIndex: number; cell: number }
  | { kind: "step"; sectionIndex: number; stepIndex: number }
  | { kind: "color_option"; sectionIndex: number; optionIndex: number }
  | { kind: "spec_thumb"; sectionIndex: number; cell: number };

export type AssignSectionImagesOptions = {
  category?: string;
  /** 업로드 순서와 동일한 길이의 역할 태그 */
  imageRoles?: ProductImageRole[] | unknown;
  /** storage path — AI 일상샷(lifestyle-ai) 인덱스 감지용 (origins 없을 때 폴백) */
  imagePaths?: string[];
  /** 106차 — 출처 플래그. 있으면 path 접미사보다 우선 */
  imageOrigins?: import("@/lib/image-origins").ProductImageOrigin[];
  /** 이미지별 aHash hex. 있으면 인접 유사도 페널티 (104차 A-3) */
  imageHashes?: Array<string | null | undefined>;
  /** 역할 부족으로 텍스트 전용으로 돌릴 슬롯 (104차 C) */
  textOnlySlots?: string[];
  /** 114차 — 이미지 index → Vision tags */
  imageTags?: string[][];
  /** 114차 — 이미지 index → Vision reason */
  imageReasons?: Array<string | undefined>;
};

/** detail 역할 경쟁 슬롯 — 앞일수록 우선 배정 (104차 B) */
const DETAIL_SLOT_PRIORITY = [
  "ingredient_highlight",
  "texture_feel",
  "detail_zoom",
  "macro_detail",
  "ingredient_story",
  "fabric_composition",
  "material_detail",
  "design_detail",
  "feature_callout",
  "how_it_works",
  "size_options",
] as const;

function collectUsedIndexes(sections: DetailSection[]): number[] {
  const used: number[] = [];
  const add = (i: number) => {
    if (!used.includes(i)) used.push(i);
  };
  for (const section of sections) {
    if (section.type === "image_text" && section.layout === "text_only") continue;
    if (section.type === "hero" || section.type === "image_text") {
      add(section.imageIndex);
    } else if (section.type === "gallery") {
      section.imageIndexes.forEach(add);
    } else if (section.type === "color_variation") {
      section.options.forEach((o) => add(o.imageIndex));
    } else if (section.type === "step_card") {
      section.steps.forEach((s) => add(s.imageIndex));
    } else if (section.type === "spec_table" && section.slot === "spec_table") {
      section.imageIndexes?.forEach(add);
    } else if (section.type === "brand_story") {
      section.imageIndexes?.forEach(add);
    }
  }
  return used;
}

export function countPlacements(sections: DetailSection[]): number {
  let n = 0;
  for (const section of sections) {
    if (section.type === "image_text" && section.layout === "text_only") continue;
    if (section.type === "hero" || section.type === "image_text") n += 1;
    else if (section.type === "gallery") n += Math.max(section.imageIndexes?.length ?? 0, 2);
    else if (section.type === "step_card") n += section.steps.length;
    else if (section.type === "color_variation") n += section.options.length;
    else if (section.type === "spec_table" && section.slot === "spec_table") {
      n += Math.max(section.imageIndexes?.length ?? 0, 0);
    }
  }
  return n;
}

/** 고유 사진이 슬롯 대비 너무 적을 때 결과 화면 안내 노출 여부 */
export function shouldWarnSparseProductImages(
  uniqueImageCount: number,
  placementCount: number,
): boolean {
  if (uniqueImageCount <= 0) return false;
  if (uniqueImageCount > 3) return false;
  return placementCount >= Math.max(8, uniqueImageCount * 4);
}

function preferForSlot(
  slot: string,
  category: string | undefined,
  roles: ProductImageRole[],
  imageCount: number,
  lifestyleAiIndexes: number[],
  lifestyleCompositeIndexes: number[],
): number | undefined {
  const rolePrefer = (role: ProductImageRole, fallback?: number) => {
    const idx = firstIndexWithRole(roles, role);
    if (idx !== undefined) return idx;
    return fallback !== undefined && fallback < imageCount ? fallback : undefined;
  };

  const preferLifestyleComposite = () => {
    if (lifestyleCompositeIndexes.length === 0) return undefined;
    const pick =
      lifestyleCompositeIndexes[Math.min(0, lifestyleCompositeIndexes.length - 1)];
    return pick < imageCount ? pick : lifestyleCompositeIndexes[0];
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

  if (slot === "detail_zoom" || slot === "fabric_composition") {
    return rolePrefer("detail", imageCount > 1 ? 1 : undefined);
  }
  // compact 96px — 낱개 매크로 detail보다 단일 피사체 package/hero 우선 (54차)
  if (slot === "quick_points") {
    return (
      rolePrefer("package") ??
      rolePrefer("hero") ??
      rolePrefer("detail", imageCount > 1 ? 1 : undefined)
    );
  }
  if (slot === "coordination" || slot === "seasonal_styling" || slot === "fit_guide") {
    return (
      preferLifestyleComposite() ??
      preferLifestyleAi() ??
      rolePrefer("lifestyle", imageCount > 2 ? 2 : undefined)
    );
  }
  if (
    category === "의류/패션" &&
    (slot === "model_multicut" || slot === "hero")
  ) {
    return rolePrefer("hero", 0) ?? preferLifestyleAi();
  }
  if (category === "의류/패션") {
    if (
      slot === "fabric_composition" ||
      slot === "detail_zoom" ||
      slot === "material_detail" ||
      slot === "design_detail" ||
      slot === "texture_feel"
    ) {
      const details = indexesWithRole(roles, "detail");
      if (details.length > 0) return details[0];
      return rolePrefer("detail", imageCount > 1 ? 1 : undefined);
    }
    if (slot === "coordination" || slot === "seasonal_styling" || slot === "fit_guide") {
      return (
        preferLifestyleComposite() ??
        rolePrefer("lifestyle", imageCount > 2 ? 2 : undefined) ??
        preferLifestyleAi()
      );
    }
    if (slot === "packaging_design") {
      return rolePrefer("package", imageCount > 3 ? 3 : undefined);
    }
  }
  if (slot === "packaging_design") {
    return rolePrefer("package", imageCount > 3 ? 3 : undefined);
  }

  if (slot === "ingredient_story" || slot === "macro_detail") {
    return rolePrefer("detail", imageCount > 1 ? 1 : undefined);
  }
  if (slot === "feature_callout" || slot === "how_it_works") {
    return rolePrefer("detail", imageCount > 1 ? 1 : undefined);
  }
  if (slot === "size_options") {
    return (
      rolePrefer("package") ??
      rolePrefer("hero", 0) ??
      rolePrefer("detail", imageCount > 1 ? 1 : undefined)
    );
  }
  if (slot === "usage_scene" || slot === "lifestyle_shot") {
    return (
      preferLifestyleComposite() ??
      preferLifestyleAi() ??
      rolePrefer("lifestyle", imageCount > 2 ? 2 : undefined)
    );
  }

  if (
    slot === "usage_scenario" ||
    slot === "usage_scenario_extra" ||
    slot === "customer_scenario" ||
    slot === "serving_suggestion" ||
    slot === "model_multicut" ||
    slot === "install_scenario"
  ) {
    return (
      preferLifestyleComposite() ??
      preferLifestyleAi() ??
      rolePrefer("lifestyle", imageCount > 2 ? 2 : undefined)
    );
  }

  void category;
  return undefined;
}

/**
 * detail/package 후보를 슬롯 우선순위로 선분배.
 * 후보 고갈 시 "text_only" — 임의 병 사진 대신 카피만.
 */
export function allocatePreferQueue(params: {
  sections: DetailSection[];
  roles: ProductImageRole[];
  imageCount: number;
  textOnlySlots?: string[];
  imageTags?: string[][];
  imageReasons?: Array<string | undefined>;
}): Map<number, number | "text_only"> {
  const {
    sections,
    roles,
    imageCount,
    textOnlySlots = [],
    imageTags = [],
    imageReasons = [],
  } = params;
  const textOnly = new Set(textOnlySlots);
  const allocation = new Map<number, number | "text_only">();

  const detailPool = [
    ...indexesWithRole(roles, "detail"),
  ].filter((i) => i >= 0 && i < imageCount);
  const packagePool = indexesWithRole(roles, "package").filter(
    (i) => i >= 0 && i < imageCount,
  );

  const detailClaimed = new Set<number>();
  const packageClaimed = new Set<number>();

  // packaging_design이 package 풀을 먼저 선점 (size_options보다 우선)
  sections.forEach((section, sectionIndex) => {
    if (section.type !== "image_text" || section.slot !== "packaging_design") return;
    if (textOnly.has(section.slot)) {
      allocation.set(sectionIndex, "text_only");
      return;
    }
    const pkg = packagePool.find((i) => !packageClaimed.has(i));
    if (pkg !== undefined) {
      packageClaimed.add(pkg);
      allocation.set(sectionIndex, pkg);
    } else {
      allocation.set(sectionIndex, "text_only");
    }
  });

  const detailCandidates = sections
    .map((section, sectionIndex) => ({ section, sectionIndex }))
    .filter(
      ({ section }) =>
        section.type === "image_text" &&
        (DETAIL_SLOT_PRIORITY as readonly string[]).includes(section.slot),
    )
    .sort((a, b) => {
      const ai = DETAIL_SLOT_PRIORITY.indexOf(
        a.section.slot as (typeof DETAIL_SLOT_PRIORITY)[number],
      );
      const bi = DETAIL_SLOT_PRIORITY.indexOf(
        b.section.slot as (typeof DETAIL_SLOT_PRIORITY)[number],
      );
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });

  for (const { section, sectionIndex } of detailCandidates) {
    if (section.type !== "image_text") continue;
    if (allocation.has(sectionIndex)) continue;
    if (textOnly.has(section.slot)) {
      allocation.set(sectionIndex, "text_only");
      continue;
    }
    // size_options: 남은 package가 있으면 우선, 없으면 detail 풀
    if (section.slot === "size_options" && packagePool.length > 0) {
      const pkg = packagePool.find((i) => !packageClaimed.has(i) && !detailClaimed.has(i));
      if (pkg !== undefined) {
        packageClaimed.add(pkg);
        allocation.set(sectionIndex, pkg);
        continue;
      }
    }
    const remaining = detailPool.filter(
      (i) => !detailClaimed.has(i) && !packageClaimed.has(i),
    );
    if (remaining.length === 0) {
      allocation.set(sectionIndex, "text_only");
      continue;
    }
    // 114차 — role 후보 안에서 카피 매칭 타이브레이커 (점수 전부 DETAIL_SLOT_PRIORITY 순서 유지)
    let next = remaining[0]!;
    if (remaining.length > 1) {
      const copy = sectionCopyText(section);
      let bestScore = -1;
      for (const i of remaining) {
        const s = scoreImageForCopy({
          sectionText: copy,
          candidateTags: imageTags[i] ?? [],
          candidateReason: imageReasons[i],
        });
        if (s > bestScore) {
          bestScore = s;
          next = i;
        }
      }
      if (bestScore <= 0) {
        next = remaining[0]!;
      }
    }
    detailClaimed.add(next);
    allocation.set(sectionIndex, next);
  }

  return allocation;
}

function logAssignResult(sections: DetailSection[], imageCount: number) {
  const freq = countImageIndexFrequency(sections);
  const slots = countPlacements(sections);
  const unique = Object.keys(freq).length;
  const maxRepeat = Math.max(0, ...Object.values(freq), 0);
  console.log(
    `[assign-images] unique=${unique} slots=${slots} maxRepeat=${maxRepeat} imageCount=${imageCount} freq=${JSON.stringify(freq)}`,
  );
}

/**
 * 전역 least-used 배정.
 * - 같은 컷이 quick_points + ingredient + step + gallery에 몰리는 문제 방지
 * - 업로드 장수를 최대한 고르게 사용 (MIN_AI_USED_IMAGES 이상 unique 유지)
 * - 99차: 한 장이 슬롯의 절반을 넘지 않도록 hard cap + 연속 섹션 동일 컷 회피
 * - 역할 태그(imageRoles)가 있으면 슬롯 prefer에 반영
 */
export function assignDistinctSectionImages(
  sections: DetailSection[],
  imageCount: number,
  options?: AssignSectionImagesOptions,
): DetailSection[] {
  if (imageCount <= 0) {
    console.log(`[assign-images] unique=0 slots=${countPlacements(sections)} maxRepeat=0 imageCount=0`);
    return sections;
  }

  // 1장뿐이면 인덱스 재배정 여지는 없지만, 연속 배치·로그는 남긴다.
  if (imageCount === 1) {
    const mapped = sections.map((section) => {
      if (section.type === "hero" || section.type === "image_text") {
        return { ...section, imageIndex: 0 };
      }
      if (section.type === "gallery") {
        return {
          ...section,
          imageIndexes: (section.imageIndexes?.length ? section.imageIndexes : [0, 0]).map(
            () => 0,
          ),
        };
      }
      if (section.type === "step_card") {
        return {
          ...section,
          steps: section.steps.map((step) => ({ ...step, imageIndex: 0 })),
        };
      }
      if (section.type === "color_variation") {
        return {
          ...section,
          options: section.options.map((option) => ({ ...option, imageIndex: 0 })),
        };
      }
      if (section.type === "spec_table" && section.slot === "spec_table") {
        return {
          ...section,
          imageIndexes: (section.imageIndexes ?? []).map(() => 0),
        };
      }
      return section;
    });
    logAssignResult(mapped, imageCount);
    return mapped;
  }

  const category = options?.category;
  const roles = normalizeImageRoles(options?.imageRoles, imageCount);
  const lifestyleAiIndexes =
    options?.imageOrigins && options.imageOrigins.length > 0
      ? options.imageOrigins
          .map((o, i) => (o === "ai-lifestyle" ? i : -1))
          .filter((i) => i >= 0)
      : options?.imagePaths
          ?.map((p, i) => (isLifestyleAiPath(p) ? i : -1))
          .filter((i) => i >= 0) ?? [];
  const lifestyleCompositeIndexes =
    options?.imageOrigins && options.imageOrigins.length > 0
      ? options.imageOrigins
          .map((o, i) => (o === "composite" ? i : -1))
          .filter((i) => i >= 0)
      : options?.imagePaths
          ?.map((p, i) => (isLifestyleCompositePath(p) ? i : -1))
          .filter((i) => i >= 0) ?? [];
  const imageHashes = options?.imageHashes ?? [];
  const preferAllocation = allocatePreferQueue({
    sections,
    roles,
    imageCount,
    textOnlySlots: options?.textOnlySlots,
    imageTags: options?.imageTags,
    imageReasons: options?.imageReasons,
  });
  const reservedPreferIndexes = new Set<number>();
  for (const v of preferAllocation.values()) {
    if (typeof v === "number") reservedPreferIndexes.add(v);
  }

  // text_only로 빠질 슬롯은 캡 계산에서 제외
  const placementCount = Math.max(
    1,
    countPlacements(sections) -
      [...preferAllocation.values()].filter((v) => v === "text_only").length,
  );

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
  // 균등 분배 목표 + 절반 상한 (N>=2일 때 한 장이 slots/2 초과 금지)
  const fairShare = Math.max(1, Math.ceil(placementCount / imageCount));
  const halfCap = Math.max(1, Math.floor(placementCount / 2));
  const maxUses = Math.min(fairShare, halfCap);
  const softCap = imageCount >= placementCount ? 1 : maxUses;
  const freq = Array.from({ length: imageCount }, () => 0);
  let lastPicked = -1;
  const imageTextUsed = new Set<number>();
  const stepUsed = new Set<number>();
  let rrCursor = 0;

  function visualSimilarityPenalty(candidate: number): number {
    if (lastPicked < 0) return 0;
    const a = imageHashes[lastPicked];
    const b = imageHashes[candidate];
    if (!a || !b) return 0;
    const dist = hammingDistanceHex(a, b);
    if (dist <= AHASH_SIMILAR_THRESHOLD) {
      // 비슷할수록 큰 페널티 (거리 0 → 8000)
      return 8000 - dist * 400;
    }
    if (dist <= AHASH_SIMILAR_THRESHOLD + 6) {
      return 2000 - (dist - AHASH_SIMILAR_THRESHOLD) * 200;
    }
    return 0;
  }

  function pick(opts?: {
    prefer?: number;
    avoid?: number[];
    excludeHero?: boolean;
    uniqueAmongImageText?: boolean;
    uniqueAmongSteps?: boolean;
  }): number {
    const avoid = new Set(opts?.avoid ?? []);

    const isBlocked = (i: number) => {
      if (avoid.has(i)) return true;
      if (opts?.excludeHero && i === heroIndex && imageCount > 3) return true;
      if (opts?.uniqueAmongImageText === true && imageTextUsed.has(i) && imageTextUsed.size < imageCount) {
        return true;
      }
      if (opts?.uniqueAmongSteps === true && stepUsed.has(i) && stepUsed.size < imageCount) {
        return true;
      }
      // prefer 큐 예약 컷: 소유 슬롯(prefer===i)이 아니면 회피
      if (
        reservedPreferIndexes.has(i) &&
        opts?.prefer !== i &&
        Array.from({ length: imageCount }, (_, j) => j).some(
          (j) =>
            j !== i &&
            !avoid.has(j) &&
            (!reservedPreferIndexes.has(j) || opts?.prefer === j),
        )
      ) {
        return true;
      }
      // halfCap 하드: 대안이 있으면 halfCap 이상은 배제
      if (
        imageCount >= 2 &&
        freq[i] >= halfCap &&
        Array.from({ length: imageCount }, (_, j) => j).some(
          (j) => j !== i && !avoid.has(j) && freq[j] < halfCap,
        )
      ) {
        return true;
      }
      return false;
    };

    // 연속 동일 컷 하드 회피: 대안이 있으면 lastPicked 제외
    const hardAvoidAdjacent = new Set<number>();
    if (lastPicked >= 0 && imageCount >= 2) {
      const hasAlt = Array.from({ length: imageCount }, (_, i) => i).some(
        (i) => i !== lastPicked && !isBlocked(i) && freq[i] < maxUses,
      );
      if (hasAlt) hardAvoidAdjacent.add(lastPicked);
    }

    if (opts?.prefer !== undefined) {
      const p = resolveIndexPreferUnused(opts.prefer, imageCount, freq);
      if (
        freq[p] < softCap &&
        !isBlocked(p) &&
        !hardAvoidAdjacent.has(p) &&
        p !== lastPicked &&
        visualSimilarityPenalty(p) < 5000
      ) {
        freq[p] += 1;
        lastPicked = p;
        return p;
      }
    }

    // round-robin: 미사용 컷을 우선 스캔
    for (let offset = 0; offset < imageCount; offset += 1) {
      const i = (rrCursor + offset) % imageCount;
      if (isBlocked(i) || hardAvoidAdjacent.has(i)) continue;
      if (freq[i] === 0 && visualSimilarityPenalty(i) < 5000) {
        freq[i] += 1;
        lastPicked = i;
        rrCursor = (i + 1) % imageCount;
        return i;
      }
    }

    let best = -1;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let i = 0; i < imageCount; i += 1) {
      if (isBlocked(i)) continue;
      if (hardAvoidAdjacent.has(i)) continue;
      const adjacencyPenalty = i === lastPicked ? 5000 : 0;
      const unusedBonus = freq[i] === 0 ? -80 : 0;
      const overSoft = freq[i] >= softCap ? 2000 : 0;
      const overHard = freq[i] >= maxUses ? 12000 : 0;
      const halfPenalty = freq[i] >= halfCap ? 20000 : 0;
      const imageTextPenalty =
        opts?.uniqueAmongImageText && imageTextUsed.has(i) ? 3000 : 0;
      const stepPenalty = opts?.uniqueAmongSteps && stepUsed.has(i) ? 2500 : 0;
      const score =
        freq[i] * 25 +
        adjacencyPenalty +
        unusedBonus +
        overSoft +
        overHard +
        halfPenalty +
        imageTextPenalty +
        stepPenalty +
        visualSimilarityPenalty(i);
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best < 0) {
      // 전부 막힌 최후 수단: 빈도 최소 (0 고정 폴백 금지)
      best = 0;
      let minF = freq[0] ?? 0;
      for (let i = 1; i < imageCount; i += 1) {
        if (freq[i] < minF || (freq[i] === minF && i !== lastPicked)) {
          minF = freq[i];
          best = i;
        }
      }
      if (best === lastPicked && imageCount >= 2) {
        best = (lastPicked + 1) % imageCount;
      }
    }
    freq[best] += 1;
    lastPicked = best;
    rrCursor = (best + 1) % imageCount;
    return best;
  }

  const placements: Placement[] = [];
  sections.forEach((section, sectionIndex) => {
    if (section.type === "hero") {
      placements.push({ kind: "hero" });
    } else if (section.type === "image_text") {
      const queued = preferAllocation.get(sectionIndex);
      if (queued === "text_only") {
        // pick 루프에서 textOnlySections로 처리 — placement 생략
        return;
      }
      let prefer =
        typeof queued === "number"
          ? queued
          : preferForSlot(
              section.slot,
              category,
              roles,
              imageCount,
              lifestyleAiIndexes,
              lifestyleCompositeIndexes,
            );
      // prefer 큐가 선점한 인덱스는 다른 슬롯이 가로채지 않음
      if (
        typeof prefer === "number" &&
        reservedPreferIndexes.has(prefer) &&
        preferAllocation.get(sectionIndex) !== prefer
      ) {
        prefer = undefined;
      }
      placements.push({ kind: "image_text", sectionIndex, prefer, slot: section.slot });
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
    } else if (section.type === "spec_table" && section.slot === "spec_table") {
      const detailLifestyle = [
        ...new Set([
          ...indexesWithRole(roles, "detail"),
          ...indexesWithRole(roles, "lifestyle"),
        ]),
      ].filter((i) => i >= 0 && i < imageCount);
      const wanted =
        detailLifestyle.length >= 2
          ? Math.min(3, detailLifestyle.length, imageCount)
          : 1;
      for (let cell = 0; cell < wanted; cell += 1) {
        placements.push({ kind: "spec_thumb", sectionIndex, cell });
      }
    }
  });

  const assigned = new Map<string, number>();
  const galleryBuckets = new Map<number, number[]>();
  const specThumbBuckets = new Map<number, number[]>();

  for (const placement of placements) {
    if (placement.kind === "hero") {
      freq[heroIndex] += 1;
      lastPicked = heroIndex;
      assigned.set("hero", heroIndex);
      continue;
    }
    if (placement.kind === "image_text") {
      const isQuickPoints = placement.slot === "quick_points";
      const idx = pick({
        prefer: placement.prefer,
        excludeHero: isQuickPoints ? false : imageCount >= 3,
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
      const pool = [
        ...lifestyleCompositeIndexes,
        ...lifestyleAiIndexes,
        ...lifestyle,
        ...details,
      ];
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
      const idx = pick({
        excludeHero: imageCount >= 4,
        uniqueAmongSteps: imageCount >= 3,
      });
      stepUsed.add(idx);
      assigned.set(`step:${placement.sectionIndex}:${placement.stepIndex}`, idx);
      continue;
    }
    if (placement.kind === "color_option") {
      const idx = pick({ excludeHero: imageCount >= 3 });
      assigned.set(`opt:${placement.sectionIndex}:${placement.optionIndex}`, idx);
      continue;
    }
    if (placement.kind === "spec_thumb") {
      const bucket = specThumbBuckets.get(placement.sectionIndex) ?? [];
      const detailLifestyle = [
        ...new Set([
          ...indexesWithRole(roles, "detail"),
          ...indexesWithRole(roles, "lifestyle"),
        ]),
      ].filter((i) => i >= 0 && i < imageCount);
      const pool = detailLifestyle.length > 0 ? detailLifestyle : undefined;
      const idx = pick({
        prefer: pool?.find((i) => !bucket.includes(i)),
        avoid: bucket,
        excludeHero: imageCount >= 4,
      });
      bucket.push(idx);
      specThumbBuckets.set(placement.sectionIndex, bucket);
    }
  }

  let mapped = sections.map((section, sectionIndex) => {
    if (section.type === "hero") {
      return { ...section, imageIndex: assigned.get("hero") ?? heroIndex };
    }
    if (section.type === "image_text") {
      if (preferAllocation.get(sectionIndex) === "text_only") {
        return {
          ...section,
          layout: "text_only" as const,
          imageIndex: section.imageIndex,
        };
      }
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
    if (section.type === "spec_table" && section.slot === "spec_table") {
      const indexes = specThumbBuckets.get(sectionIndex);
      if (!indexes || indexes.length === 0) return section;
      return { ...section, imageIndexes: indexes };
    }
    return section;
  });

  // unique 장수가 MIN 미만이면, *중복 사용 중인* image_text만 미사용 컷으로 교체.
  const used = collectUsedIndexes(mapped);
  const placementN = countPlacements(mapped);
  const targetUnique = Math.min(MIN_AI_USED_IMAGES, imageCount, Math.max(1, placementN));
  if (used.length < targetUnique) {
    const unused = Array.from({ length: imageCount }, (_, i) => i).filter((i) => !used.includes(i));
    const freqMap = countImageIndexFrequency(mapped);
    let uniqueCount = used.length;
    mapped = mapped.map((section) => {
      if (unused.length === 0 || uniqueCount >= targetUnique) return section;
      if (section.type !== "image_text" || section.layout === "text_only") return section;
      if ((freqMap[section.imageIndex] ?? 0) <= 1) return section;
      const next = unused.shift();
      if (next === undefined) return section;
      freqMap[section.imageIndex] = (freqMap[section.imageIndex] ?? 1) - 1;
      freqMap[next] = (freqMap[next] ?? 0) + 1;
      uniqueCount += 1;
      return { ...section, imageIndex: next };
    });
  }

  // 연속 image_text 동일 컷 후처리 (1~2장에서도 티 나는 반복 완화)
  if (imageCount >= 2) {
    let prevIt: number | null = null;
    const freqMap = countImageIndexFrequency(mapped);
    mapped = mapped.map((section) => {
      if (section.type !== "image_text" || section.layout === "text_only") {
        if (section.type !== "image_text") prevIt = null;
        return section;
      }
      if (prevIt !== null && prevIt === section.imageIndex) {
        let alt = -1;
        let altFreq = Number.POSITIVE_INFINITY;
        for (let i = 0; i < imageCount; i += 1) {
          if (i === section.imageIndex) continue;
          const f = freqMap[i] ?? 0;
          if (f < altFreq) {
            altFreq = f;
            alt = i;
          }
        }
        if (alt >= 0) {
          freqMap[section.imageIndex] = (freqMap[section.imageIndex] ?? 1) - 1;
          freqMap[alt] = (freqMap[alt] ?? 0) + 1;
          prevIt = alt;
          return { ...section, imageIndex: alt };
        }
      }
      prevIt = section.imageIndex;
      return section;
    });
  }

  // 107차 — brand_story는 다른 슬롯 배정 후 미사용 컷만 최대 2장
  {
    const usedSet = new Set(collectUsedIndexes(mapped));
    const unused = Array.from({ length: imageCount }, (_, i) => i).filter(
      (i) => !usedSet.has(i),
    );
    mapped = mapped.map((section) => {
      if (section.type !== "brand_story") return section;
      if (unused.length === 0) {
        const { imageIndexes: _drop, ...rest } = section;
        void _drop;
        return rest;
      }
      const take = unused.splice(0, Math.min(2, unused.length));
      return { ...section, imageIndexes: take };
    });
  }

  logAssignResult(mapped, imageCount);
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
    if (section.type === "image_text" && section.layout === "text_only") continue;
    if (section.type === "hero" || section.type === "image_text") add(section.imageIndex);
    else if (section.type === "gallery") section.imageIndexes.forEach(add);
    else if (section.type === "step_card") section.steps.forEach((s) => add(s.imageIndex));
    else if (section.type === "color_variation") section.options.forEach((o) => add(o.imageIndex));
    else if (section.type === "spec_table" && section.slot === "spec_table") {
      section.imageIndexes?.forEach(add);
    } else if (section.type === "brand_story") {
      section.imageIndexes?.forEach(add);
    }
  }
  return freq;
}

/** 연속 image_text가 같은 컷을 쓰는지 (QA용) */
export function countAdjacentDuplicateImageTexts(sections: DetailSection[]): number {
  let dupes = 0;
  let prev: number | null = null;
  for (const section of sections) {
    if (section.type !== "image_text" || section.layout === "text_only") {
      if (section.type !== "image_text") prev = null;
      continue;
    }
    if (prev !== null && prev === section.imageIndex) dupes += 1;
    prev = section.imageIndex;
  }
  return dupes;
}
