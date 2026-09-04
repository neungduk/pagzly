"use client";

import type { CategoryTheme } from "@/lib/category-theme";
import {
  buildVolumeComparisonDiagramSvg,
  type VolumeComparisonEntry,
} from "@/lib/volume-comparison-diagram";

type Props = {
  entries: VolumeComparisonEntry[];
  theme: CategoryTheme;
};

/** 110차 — 용량 비교 (인라인 SVG, export와 동일 빌더) */
export default function VolumeComparisonDiagram({ entries, theme }: Props) {
  const html = buildVolumeComparisonDiagramSvg(
    entries,
    theme.deepAccent,
    theme.deepAccent,
  );
  if (!html) return null;
  return (
    <div
      className="mx-auto mt-8 w-full max-w-[360px]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
