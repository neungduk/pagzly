import type { DetailSection } from "@/lib/types/generate";

/** 미리보기 기본 노출 본문 섹션 수 (히어로 제외) */
export const PREVIEW_COLLAPSED_BODY_COUNT = 2;

/**
 * 결과 페이지 미리보기 — 히어로 + 직후 custom_gif + 본문 N개만 기본 노출.
 * @returns collapsedAfterIndex — 이 인덱스까지(inclusive) 보이고, 이후는 접힘.
 */
export function computePreviewCollapseEnd(sections: DetailSection[]): {
  collapsedAfterIndex: number;
  hasMore: boolean;
} {
  if (sections.length <= 3) {
    return { collapsedAfterIndex: sections.length - 1, hasMore: false };
  }

  const heroIdx = sections.findIndex((s) => s.type === "hero");
  let endIdx = heroIdx >= 0 ? heroIdx + 1 : 0;

  if (sections[endIdx]?.type === "custom_gif") {
    endIdx += 1;
  }

  let bodyShown = 0;
  while (endIdx < sections.length && bodyShown < PREVIEW_COLLAPSED_BODY_COUNT) {
    endIdx += 1;
    bodyShown += 1;
  }

  const collapsedAfterIndex = Math.max(0, endIdx - 1);
  return {
    collapsedAfterIndex,
    hasMore: endIdx < sections.length,
  };
}
