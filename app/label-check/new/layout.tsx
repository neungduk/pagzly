import type { Metadata } from "next";

/** 496 — 회원 검수 신청: 검색 비노출 */
export const metadata: Metadata = {
  title: "검수 신청 | Pagzly",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
