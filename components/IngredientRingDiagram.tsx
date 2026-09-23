"use client";

import type { CategoryTheme } from "@/lib/category-theme";
import { buildIngredientRingDiagramSvg } from "@/lib/ingredient-ring-diagram";

type Props = {
  labels: string[];
  theme: CategoryTheme;
};

export default function IngredientRingDiagram({ labels, theme }: Props) {
  const html = buildIngredientRingDiagramSvg(labels, theme.deepAccent, "#1B1B18");
  if (!html) return null;
  return (
    <div
      className="mx-auto mt-8 w-full max-w-[360px]"
      data-testid="ingredient-ring-diagram"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
