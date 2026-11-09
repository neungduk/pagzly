import type { Metadata } from "next";
import { INTRO_ONE_LINE_486 } from "@/lib/label-check/types";

/** 488 — 탭 제목·설명. 486 noindex 유지. 사이트맵·내비 링크 추가하지 않음. */
export const metadata: Metadata = {
  title: "화장품 표시사항 PDF 검수 | Pagzly",
  description: INTRO_ONE_LINE_486,
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function LabelCheckLayout({ children }: { children: React.ReactNode }) {
  return children;
}
