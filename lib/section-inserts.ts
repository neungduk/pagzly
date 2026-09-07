import type { DetailSection, HighlightBoxSection, ReviewHighlightSection, CanvasSection, ComparisonChartSection } from "@/lib/types/generate";
import type { ReviewAxisComparison } from "@/lib/review-insights";

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

export function buildReviewHighlightSection(
  praises: string[],
  complaints: string[] = [],
  sourceReviewCount?: number,
  praiseMatchCounts?: number[],
  complaintMatchCounts?: number[],
): ReviewHighlightSection {
  const praisePairs = praises
    .map((text, i) => ({
      text,
      matchCount: praiseMatchCounts?.[i] ?? 0,
    }))
    .filter((p) => Boolean(p.text))
    .slice(0, 6);
  const concernPairs = complaints
    .map((text, i) => ({
      text,
      matchCount: complaintMatchCounts?.[i] ?? 0,
    }))
    .filter((p) => Boolean(p.text))
    .slice(0, 3);
  const count =
    typeof sourceReviewCount === "number" && sourceReviewCount > 0
      ? sourceReviewCount
      : undefined;
  return {
    type: "review_highlight",
    slot: "review_highlight",
    heading: "실제 구매자들이 자주 남긴 이야기",
    praises: praisePairs.map((p) => p.text),
    ...(praiseMatchCounts != null
      ? { praiseMatchCounts: praisePairs.map((p) => p.matchCount) }
      : {}),
    ...(concernPairs.length > 0
      ? {
          concerns: concernPairs.map((p) => p.text),
          ...(complaintMatchCounts != null
            ? { complaintMatchCounts: concernPairs.map((p) => p.matchCount) }
            : {}),
        }
      : {}),
    ...(count != null ? { sourceReviewCount: count } : {}),
  };
}

/**
 * 판매자가 올린 리뷰 파일에서 뽑은 실제 후기 요약을, ai_disclosure(있으면
 * 그 앞) 또는 cta_price 바로 앞에 삽입한다.
 * praises가 0개면 섹션 생략 (complaints만 있는 경우도 기존과 동일하게 생략).
 */
export function insertReviewHighlightSection(
  sections: DetailSection[],
  praises: string[],
  complaints: string[] = [],
  sourceReviewCount?: number,
  praiseMatchCounts?: number[],
  complaintMatchCounts?: number[],
): DetailSection[] {
  const praisePairs = praises
    .map((text, i) => ({
      text,
      matchCount: praiseMatchCounts?.[i] ?? 0,
    }))
    .filter((p) => Boolean(p.text));
  if (praisePairs.length === 0) return sections;
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
    buildReviewHighlightSection(
      praisePairs.map((p) => p.text),
      complaints,
      sourceReviewCount,
      praiseMatchCounts != null ? praisePairs.map((p) => p.matchCount) : undefined,
      complaintMatchCounts,
    ),
    ...without.slice(insertAt),
  ];
}

/**
 * 137차 — 리뷰 축 매칭 비율로 comparison_chart를 서버가 직접 삽입.
 * DeepSeek가 이미 comparison_chart를 만든 경우 중복 삽입하지 않음.
 * 삽입 위치: review_highlight 바로 앞(없으면 ai_disclosure/cta_price 직전).
 */
export function insertReviewAxisComparisonSection(
  sections: DetailSection[],
  axisComparison: ReviewAxisComparison[] | undefined,
  brandName?: string | null,
): DetailSection[] {
  if (!axisComparison || axisComparison.length < 2) return sections;
  if (sections.some((s) => s.type === "comparison_chart" || s.slot === "comparison_chart")) {
    return sections;
  }

  const ourLabel = brandName?.trim() || "우리 제품";
  const chart: ComparisonChartSection = {
    type: "comparison_chart",
    slot: "comparison_chart",
    heading: "실제 후기에서 자주 언급된 점",
    ourLabel,
    baselineLabel: "일반 제품",
    unit: "%",
    basis: "measured",
    basisNote: "실제 업로드 리뷰 텍스트 기반 언급 비율(가정 기준선 50 대비)",
    metrics: axisComparison.map((a) => ({
      label: a.label,
      ourValue: a.ourValue,
      baselineValue: 50,
    })),
    evidenceQuotes: axisComparison.map((a) => ({
      label: a.label,
      quotes: a.quotes,
    })),
  };

  const without = sections.filter(
    (s) => s.slot !== "comparison_chart" && s.type !== "comparison_chart",
  );
  const reviewHighlightIdx = without.findIndex(
    (s) => s.type === "review_highlight" || s.slot === "review_highlight",
  );
  const anchorIdx = without.findIndex(
    (s) => s.type === "ai_disclosure" || s.slot === "cta_price" || s.type === "cta_price",
  );
  const insertAt =
    reviewHighlightIdx >= 0
      ? reviewHighlightIdx
      : anchorIdx >= 0
        ? anchorIdx
        : without.length;

  return [...without.slice(0, insertAt), chart, ...without.slice(insertAt)];
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
