import type { DetailSection } from "@/lib/types/generate";

/** circle-pair 유효성 — 라이브 렌더러·export 공용 */
export function isCirclePairSection(section: DetailSection): boolean {
  return (
    section.type === "image_text" &&
    section.layout === "circle-pair" &&
    Array.isArray(section.circlePair) &&
    section.circlePair.length === 2 &&
    section.circlePair.every((item) => item.imageUrl?.trim() && item.label?.trim())
  );
}

/** circle-solo 유효성 — 라이브 렌더러·export 공용 */
export function isCircleSoloSection(section: DetailSection): boolean {
  return (
    section.type === "image_text" &&
    section.layout === "circle-solo" &&
    Boolean(section.circleSolo?.imageUrl?.trim() && section.circleSolo?.label?.trim())
  );
}

export function isIngredientCircleSection(section: DetailSection): boolean {
  return isCirclePairSection(section) || isCircleSoloSection(section);
}

export function isComparisonChartWithMetrics(section: DetailSection): boolean {
  return (
    section.type === "comparison_chart" &&
    Array.isArray(section.metrics) &&
    section.metrics.length > 0
  );
}

/**
 * sections 배열은 건드리지 않고, 인접한 circle↔comparison_chart 쌍만 감지.
 * key: circle 섹션 index, value: 바로 옆 comparison_chart index.
 * 한 인덱스는 최대 하나의 쌍에만 속함(좌→우 스캔, 사용 인덱스 제외).
 */
export function findCircleComparisonComboIndices(sections: DetailSection[]): Map<number, number> {
  const map = new Map<number, number>();
  const used = new Set<number>();
  for (let i = 0; i < sections.length - 1; i += 1) {
    if (used.has(i) || used.has(i + 1)) continue;
    const a = sections[i]!;
    const b = sections[i + 1]!;
    if (isIngredientCircleSection(a) && isComparisonChartWithMetrics(b)) {
      map.set(i, i + 1);
      used.add(i);
      used.add(i + 1);
    } else if (isComparisonChartWithMetrics(a) && isIngredientCircleSection(b)) {
      map.set(i + 1, i);
      used.add(i);
      used.add(i + 1);
    }
  }
  return map;
}
