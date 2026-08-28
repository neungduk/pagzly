import type { DetailSection, ReviewHighlightSection } from "@/lib/types/generate";

export function buildReviewHighlightSection(praises: string[]): ReviewHighlightSection {
  return {
    type: "review_highlight",
    slot: "review_highlight",
    heading: "실제 구매자들이 자주 남긴 이야기",
    praises: praises.filter(Boolean).slice(0, 6),
  };
}

/**
 * 판매자가 올린 리뷰 파일에서 뽑은 실제 후기 요약을, ai_disclosure(있으면
 * 그 앞) 또는 cta_price 바로 앞에 삽입한다.
 */
export function insertReviewHighlightSection(
  sections: DetailSection[],
  praises: string[],
): DetailSection[] {
  const filtered = praises.filter(Boolean);
  if (filtered.length === 0) return sections;
  if (sections.some((s) => s.type === "review_highlight" || s.slot === "review_highlight")) {
    return sections;
  }

  const without = sections.filter(
    (s) => s.slot !== "review_highlight" && s.type !== "review_highlight",
  );
  const anchorIdx = without.findIndex(
    (s) => s.type === "ai_disclosure" || s.slot === "cta_price" || s.type === "cta_price",
  );
  const insertAt = anchorIdx >= 0 ? anchorIdx : without.length;
  return [
    ...without.slice(0, insertAt),
    buildReviewHighlightSection(filtered),
    ...without.slice(insertAt),
  ];
}
