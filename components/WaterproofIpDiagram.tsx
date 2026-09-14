"use client";

import type { CategoryTheme } from "@/lib/category-theme";
import { getCategoryTheme } from "@/lib/category-theme";
import { buildWaterproofIpDiagramSvg } from "@/lib/waterproof-ip-diagram";

type WaterproofIpDiagramProps = {
  level: number;
  valueLabel: string;
  theme: CategoryTheme;
  category?: string;
};

/** 174차 — export 빌더와 동일 마크업(정적 Recraft 아이콘 포함) */
export default function WaterproofIpDiagram({
  level,
  valueLabel,
  theme,
  category,
}: WaterproofIpDiagramProps) {
  const stroke = category ? getCategoryTheme(category).accentText : theme.accentText;
  const html = buildWaterproofIpDiagramSvg(level, valueLabel, stroke, stroke);
  if (!html) return null;
  return (
    <div
      className="mx-auto mt-8 w-full max-w-[340px]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
