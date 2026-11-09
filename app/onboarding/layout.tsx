import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { isDetailPageEnabled } from "@/lib/feature-flags";

/** 489 — 상세페이지 꺼짐 시 온보딩(상세 전용) → 검수 */
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  if (!isDetailPageEnabled()) {
    redirect("/label-check");
  }
  return children;
}
