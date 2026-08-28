import type { Metadata } from "next";
import { Geist, JetBrains_Mono, Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

/** 상세페이지 미리보기·export용 — Gmarket Sans 대신 세리프 헤드라인 + 산세리프 본문 */
const notoSansKr = Noto_Sans_KR({
  variable: "--font-detail-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const notoSerifKr = Noto_Serif_KR({
  variable: "--font-detail-heading",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pagzly",
  description: "눈부시게 팔리는 페이지, Pagzly",
  icons: {
    icon: "/pagzly-icon.svg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${jetbrainsMono.variable} ${notoSansKr.variable} ${notoSerifKr.variable} h-full antialiased`}
    >
      <head>
        {/* 헤드라인용 GmarketSans, 본문용 Pretendard — 둘 다 next/font(google)에 없어 CDN으로 로드.
            GmarketSans는 커밋 해시로 고정(fonts-archive/GmarketSans) — 최초 지정했던
            webfontworld/gmarket 경로는 파일이 비어 있어(방치된 링크) 이 저장소로 교체함. */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/fonts-archive/GmarketSans@6e540c26aa0aef8a3316eff984d614647cd7340f/GmarketSans.css"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@latest/dist/web/static/pretendard.css"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
