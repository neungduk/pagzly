import type { Metadata } from "next";

/** 496 — 내 결과: 검색 비노출 */
export const metadata: Metadata = {
  title: "내 결과 | Pagzly",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
