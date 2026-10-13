import type { DetailSection } from "@/lib/types/generate";

/** 히어로에 쓰인 실제 상품 사진 — 비교·요약 인포그래픽에 상품을 보여 줄 때 공용 */
export function resolveProductThumbUrl(sections: DetailSection[], imageUrls: string[]): string | null {
  const hero = sections.find((s) => s.type === "hero");
  if (!hero || hero.type !== "hero") return null;
  const url = imageUrls[hero.imageIndex];
  return typeof url === "string" && url.trim() ? url : null;
}
