"use client";

import type { CategoryTheme } from "@/lib/category-theme";
import { getCategoryTheme } from "@/lib/category-theme";
import { buildWeightComparisonDiagramSvg } from "@/lib/weight-comparison-diagram";

type WeightComparisonDiagramProps = {
  g: number;
  valueLabel: string;
  theme: CategoryTheme;
  /** 있으면 hue-shift 없는 카테고리 기본 accentText로 스트로크 (크림 배경 대비) */
  category?: string;
};

/** 175차 — export 빌더와 동일 마크업(정적 Recraft 아이콘 포함) */
export default function WeightComparisonDiagram({
  g,
  valueLabel,
  theme,
  category,
}: WeightComparisonDiagramProps) {
  const stroke = category ? getCategoryTheme(category).accentText : theme.accentText;
  const html = buildWeightComparisonDiagramSvg(g, valueLabel, stroke, stroke);
  if (!html) return null;
  return (
    <div
      className="mx-auto mt-8 w-full max-w-[340px]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
