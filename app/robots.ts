import type { MetadataRoute } from "next";

/**
 * 425차 — 기본 robots. 공개 페이지(랜딩·약관·개인정보·로그인·가입)만 허용하고, 로그인 뒤 화면·API·내부 검증 화면은 막는다.
 * 사이트 주소는 환경 변수 NEXT_PUBLIC_SITE_URL(예: https://example.com)이 있을 때만 sitemap 줄을 넣는다(없으면 줄 생략).
 */
export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/terms", "/privacy", "/login", "/signup"],
      disallow: ["/api/", "/create", "/billing", "/onboarding", "/auth/", "/dev/", "/reset-password", "/forgot-password"],
    },
    ...(site ? { sitemap: `${site}/sitemap.xml` } : {}),
  };
}
