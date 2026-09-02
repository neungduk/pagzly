import type { DetailSection, ImageTextSection } from "@/lib/types/generate";
import { fetchFileBuffer } from "@/lib/fetch-file-buffer";
import { analyzeProductAnnotations } from "@/lib/analyze-product-annotations";

const ELECTRONICS_CATEGORY = "전자제품";

/** 59차 — 전자제품 feature_detail 1곳에 Vision 주석 레이아웃 주입 (실패 시 변경 없음) */
export async function applyElectronicsAnnotatedSections(
  sections: DetailSection[],
  category: string,
  imageUrls: string[],
): Promise<{ sections: DetailSection[]; annotationCost: number; applied: boolean }> {
  if (category !== ELECTRONICS_CATEGORY) {
    return { sections, annotationCost: 0, applied: false };
  }

  const targetIndex = sections.findIndex(
    (s) => s.type === "image_text" && s.slot === "feature_detail",
  );
  if (targetIndex < 0) {
    return { sections, annotationCost: 0, applied: false };
  }

  const target = sections[targetIndex] as ImageTextSection;
  const imageUrl = imageUrls[target.imageIndex] ?? imageUrls[0];
  if (!imageUrl) {
    return { sections, annotationCost: 0, applied: false };
  }

  try {
    const buffer = await fetchFileBuffer(imageUrl);
    const hints = [target.heading, target.body.split(/[.。\n]/)[0] ?? ""].filter(Boolean);
    const { annotations, reliable, cost } = await analyzeProductAnnotations(buffer, hints);
    if (!reliable || annotations.length === 0) {
      console.log("[annotations] 신뢰도 낮음 — annotated 레이아웃 생략");
      return { sections, annotationCost: cost, applied: false };
    }

    const next = [...sections];
    next[targetIndex] = {
      ...target,
      layout: "annotated",
      annotations,
    };
    console.log(`[annotations] feature_detail → annotated (${annotations.length}개)`);
    return { sections: next, annotationCost: cost, applied: true };
  } catch (error) {
    console.warn("[annotations] 적용 실패 — full 레이아웃 유지", error);
    return { sections, annotationCost: 0, applied: false };
  }
}
