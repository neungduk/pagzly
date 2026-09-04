"use client";

import type { CategoryTheme } from "@/lib/category-theme";
import {
  buildFoodRatioDiagramSvg,
  type FoodRatioSlice,
} from "@/lib/food-ratio-diagram";

type Props = {
  slices: FoodRatioSlice[];
  theme: CategoryTheme;
};

export default function FoodRatioDiagram({ slices, theme }: Props) {
  const html = buildFoodRatioDiagramSvg(slices, theme.deepAccent, "#1B1B18");
  if (!html) return null;
  return (
    <div
      className="mx-auto mt-8 w-full max-w-[360px]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
