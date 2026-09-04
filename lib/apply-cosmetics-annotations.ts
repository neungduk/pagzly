import type { DetailSection, ImageTextSection } from "@/lib/types/generate";
import { fetchFileBuffer } from "@/lib/fetch-file-buffer";
import { analyzeProductAnnotations } from "@/lib/analyze-product-annotations";
import { areAnnotationsReliable } from "@/lib/product-annotations";
import { filterPhysicalCosmeticAnnotations } from "@/lib/cosmetics-annotation-labels";
import { COSMETICS_CATEGORY } from "@/lib/cosmetics-compliance";

/** 콜아웃과 잘 맞는 슬롯 — 우선순위 순, 페이지당 최대 2개 */
export const COSMETICS_ANNOTATION_SLOTS = [
  "packaging_design",
  "texture_feel",
  "feature_detail",
  "size_options",
] as const;

export const MAX_COSMETICS_ANNOTATED_SECTIONS = 2;

/** 픽스처/단위 테스트용 — Vision 없이 대상 섹션 인덱스만 고른다 */
export function pickCosmeticsAnnotationTargetIndexes(
  sections: DetailSection[],
  maxSections = MAX_COSMETICS_ANNOTATED_SECTIONS,
): number[] {
  const picked: number[] = [];
  for (const slot of COSMETICS_ANNOTATION_SLOTS) {
    if (picked.length >= maxSections) break;
    const idx = sections.findIndex(
      (s) => s.type === "image_text" && s.slot === slot && s.layout !== "text_only",
    );
    if (idx >= 0 && !picked.includes(idx)) picked.push(idx);
  }
  return picked;
}

/**
 * 107차 — 화장품/뷰티 annotated 레이아웃 (최대 2섹션).
 * 라벨은 물리 특징만; cosmetics-compliance·효능 필터 통과 필수.
 */
export async function applyCosmeticsAnnotatedSections(
  sections: DetailSection[],
  category: string,
  imageUrls: string[],
): Promise<{ sections: DetailSection[]; annotationCost: number; applied: boolean }> {
  if (category !== COSMETICS_CATEGORY) {
    return { sections, annotationCost: 0, applied: false };
  }

  const targets = pickCosmeticsAnnotationTargetIndexes(sections);
  if (targets.length === 0) {
    return { sections, annotationCost: 0, applied: false };
  }

  let totalCost = 0;
  let appliedCount = 0;
  const next = [...sections];

  for (const targetIndex of targets) {
    const target = next[targetIndex] as ImageTextSection;
    const imageUrl = imageUrls[target.imageIndex] ?? imageUrls[0];
    if (!imageUrl) continue;

    try {
      const buffer = await fetchFileBuffer(imageUrl);
      const hints = [target.heading, target.body.split(/[.。\n]/)[0] ?? ""].filter(Boolean);
      const { annotations, reliable, cost } = await analyzeProductAnnotations(buffer, hints, {
        domain: "cosmetics",
      });
      totalCost += cost;

      const physical = filterPhysicalCosmeticAnnotations(annotations);
      if (!reliable || !areAnnotationsReliable(physical)) {
        console.log(
          `[annotations:cosmetics] ${target.slot} skip — reliable=${reliable} physical=${physical.length}`,
        );
        continue;
      }

      next[targetIndex] = {
        ...target,
        layout: "annotated",
        annotations: physical,
      };
      appliedCount += 1;
      console.log(
        `[annotations:cosmetics] ${target.slot} → annotated (${physical.length}개)`,
      );
    } catch (error) {
      console.warn(`[annotations:cosmetics] ${target.slot} 실패 — 유지`, error);
    }
  }

  return {
    sections: next,
    annotationCost: totalCost,
    applied: appliedCount > 0,
  };
}
