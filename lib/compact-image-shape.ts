import type { ImageTextSection } from "@/lib/types/generate";

/** 60차 — compact 썸네일 모서리 (명시 imageShape 또는 2개 이상일 때 index 기반 교차) */
export function resolveCompactImageShape(
  section: ImageTextSection,
  compactIndex: number,
  totalCompactCount: number,
): "square" | "circle" {
  if (section.imageShape) return section.imageShape;
  if (totalCompactCount < 2) return "square";
  return compactIndex % 2 === 0 ? "square" : "circle";
}
