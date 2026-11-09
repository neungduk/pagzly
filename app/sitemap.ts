import type { MetadataRoute } from "next";

/**
 * 425차 — 기본 sitemap(공개 페이지만). 절대 주소가 필요하므로 NEXT_PUBLIC_SITE_URL이 없으면 빈 목록을 돌려준다(잘못된 주소를 만들지 않는다).
 * 489차 — /create·상세 관련 URL 제외 유지. 검수 경로는 noindex 유지로 sitemap 목록에도 넣지 않음(공개 시점은 사용자 결정).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (!site) return [];
  const now = new Date();
  return ["", "/terms", "/privacy", "/login", "/signup"].map((path) => ({
    url: `${site}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.4,
  }));
}
