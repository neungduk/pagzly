"use client";

import type { CategoryTheme } from "@/lib/category-theme";
import {
  buildPackageContentsDiagramSvg,
  type PackageItem,
} from "@/lib/package-contents-diagram";

type Props = {
  items: PackageItem[];
  theme: CategoryTheme;
};

export default function PackageContentsDiagram({ items, theme }: Props) {
  const html = buildPackageContentsDiagramSvg(items, theme.deepAccent, "#1B1B18");
  if (!html) return null;
  return (
    <div
      className="mx-auto mt-8 w-full max-w-[360px]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
