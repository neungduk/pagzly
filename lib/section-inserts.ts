import type { DetailSection, HighlightBoxSection, ReviewHighlightSection, CanvasSection } from "@/lib/types/generate";

/** 판매자가 직접 입력한 판매·랭킹 근거 — AI 미생성, 입력 없으면 섹션 생략 */
export function insertSellerTrustEvidence(
  sections: DetailSection[],
  evidence: string | null | undefined,
): DetailSection[] {
  const text = evidence?.trim();
  if (!text) return sections;
  if (sections.some((s) => s.slot === "seller_trust_evidence")) return sections;

  const heroIdx = sections.findIndex((s) => s.type === "hero");
  let insertAt = heroIdx >= 0 ? heroIdx + 1 : 0;
  if (sections[insertAt]?.type === "custom_gif") insertAt += 1;

  const section: HighlightBoxSection = {
    type: "highlight_box",
    slot: "seller_trust_evidence",
    heading: "",
    boldBlock: true,
    cards: [{ title: text, body: "" }],
  };

  return [...sections.slice(0, insertAt), section, ...sections.slice(insertAt)];
}

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

export function insertEmptyCanvasSection(
  sections: DetailSection[],
  baseNeutral: string,
): DetailSection[] {
  const canvasCount = sections.filter((s) => s.type === "canvas").length;
  const section: CanvasSection = {
    type: "canvas",
    slot: `canvas_${canvasCount + 1}`,
    frameWidth: 1080,
    frameHeight: 720,
    background: { color: baseNeutral },
    elements: [],
  };

  const anchorIdx = sections.findIndex(
    (s) => s.type === "cta_price" || s.slot === "cta_price",
  );
  const insertAt = anchorIdx >= 0 ? anchorIdx : sections.length;
  return [...sections.slice(0, insertAt), section, ...sections.slice(insertAt)];
}
