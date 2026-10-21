import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  display: "swap",
});

const notoSerifKr = Noto_Serif_KR({
  variable: "--font-noto-serif-kr",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

/** 426차 W11: 절대 주소가 필요한 OG 이미지 경로의 기준. NEXT_PUBLIC_SITE_URL이 없거나 잘못되면 설정하지 않는다(잘못된 주소를 만들지 않음) */
function siteBase(): URL | undefined {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return undefined;
  try {
    return new URL(raw);
  } catch {
    return undefined;
  }
}

const DESCRIPTION = "상품 사진과 정보만 넣으면 AI가 한국 이커머스 상세페이지를 만들어 드립니다. 팩즐리(Pagzly)";

export const metadata: Metadata = {
  metadataBase: siteBase(),
  title: { default: "Pagzly(팩즐리) — AI 상세페이지 생성", template: "%s | Pagzly" },
  description: DESCRIPTION,
  applicationName: "Pagzly",
  openGraph: {
    type: "website",
    siteName: "Pagzly",
    locale: "ko_KR",
    title: "Pagzly(팩즐리) — AI 상세페이지 생성",
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: "Pagzly(팩즐리) — AI 상세페이지 생성", description: DESCRIPTION },
  icons: {
    icon: "/pagzly-icon.svg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${notoSansKr.variable} ${notoSerifKr.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
