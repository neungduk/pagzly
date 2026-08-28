import type { DetailSection } from "@/lib/types/generate";

export type ExportScoreItem = {
  id: string;
  label: string;
  passed: boolean;
  weight: number;
};

export type DetailExportScoreResult = {
  score: number;
  maxScore: number;
  percent: number;
  items: ExportScoreItem[];
};

function sectionTypes(sections: DetailSection[]): Set<string> {
  return new Set(sections.map((s) => s.type));
}

/**
 * HTML export가 렌더러·마켓 업로드 요건을 얼마나 충족하는지 (API 없음).
 */
export function scoreDetailPageExport(
  html: string,
  sections: DetailSection[],
): DetailExportScoreResult {
  const types = sectionTypes(sections);
  const hasSlot = (slot: string) => sections.some((s) => s.slot === slot);

  const items: ExportScoreItem[] = [
    { id: "jsonld", label: "JSON-LD", passed: html.includes("application/ld+json"), weight: 6 },
    { id: "seo", label: "SEO 텍스트 블록", passed: html.includes("pagzly-seo-text"), weight: 5 },
    { id: "trust", label: "TRUST 스트립", passed: html.includes("TRUST"), weight: 5 },
    { id: "review_highlight", label: "리뷰 하이라이트 export", passed: !types.has("review_highlight") || html.includes("pagzly-review-highlight"), weight: 4 },
    { id: "sticky_cta", label: "Sticky CTA", passed: /pagzly-cta[\s\S]*sticky/.test(html), weight: 4 },
    { id: "callout", label: "말풍선 callout", passed: !hasSlot("feature_callout") || html.includes("pagzly-callout"), weight: 4 },
    { id: "gallery", label: "갤러리 export", passed: !types.has("gallery") || html.includes("pagzly-gallery"), weight: 4 },
    { id: "brand_story", label: "브랜드 스토리", passed: !types.has("brand_story") || html.includes("pagzly-brand-story"), weight: 3 },
    { id: "persona", label: "추천 대상", passed: !types.has("target_persona") || html.includes("pagzly-persona"), weight: 3 },
    { id: "faq_cards", label: "FAQ 카드형", passed: !types.has("faq") || html.includes("pagzly-faq-card"), weight: 4 },
    { id: "shipping_card", label: "배송 카드 테두리", passed: !hasSlot("shipping_info") || html.includes("pagzly-shipping"), weight: 3 },
    { id: "width", label: "750px 래퍼", passed: html.includes("max-width:750px"), weight: 3 },
    { id: "motion_safe", label: "모션 안전 CSS", passed: html.includes("prefers-reduced-motion"), weight: 2 },
  ];

  const maxScore = items.reduce((s, i) => s + i.weight, 0);
  const score = items.reduce((s, i) => s + (i.passed ? i.weight : 0), 0);
  const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return { score, maxScore, percent, items };
}
