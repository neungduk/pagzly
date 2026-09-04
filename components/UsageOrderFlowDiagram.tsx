"use client";

import type { CategoryTheme } from "@/lib/category-theme";
import { buildUsageOrderFlowSvg } from "@/lib/usage-order-diagram";

type Props = {
  steps: string[];
  theme: CategoryTheme;
};

/** 110차 — 사용 순서 흐름 (인라인 SVG) */
export default function UsageOrderFlowDiagram({ steps, theme }: Props) {
  const html = buildUsageOrderFlowSvg(steps, theme.deepAccent, "#1B1B18");
  if (!html) return null;
  return (
    <div
      className="mx-auto mt-10 w-full max-w-[360px]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
