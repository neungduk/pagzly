import type { Metadata } from "next";

/** 486 — 파일럿 경로. 정식 공개 전 검색 제외. 사이트맵·내비 링크 추가하지 않음. */
export const metadata: Metadata = {
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
