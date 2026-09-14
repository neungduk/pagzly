"use client";

import type { CategoryTheme } from "@/lib/category-theme";
import {
  buildFashionSizeDiagramSvg,
  type SizeDiagramMatch,
} from "@/lib/fashion-size-diagram";

type FashionSizeDiagramProps = {
  matches: SizeDiagramMatch[];
  theme: CategoryTheme;
};

/** 175차 — export 빌더와 동일 마크업(정적 Recraft 아이콘 포함) */
export default function FashionSizeDiagram({ matches, theme }: FashionSizeDiagramProps) {
  const html = buildFashionSizeDiagramSvg(matches, theme.accentText, theme.accentText);
  if (!html) return null;
  return (
    <div
      className="mx-auto mt-8 w-full max-w-[280px]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
