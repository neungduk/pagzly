import type { DetailSection } from "@/lib/types/generate";
import { orderSectionsForFlow } from "@/lib/section-flow-order";
import { limitBoldBlocks } from "@/lib/detail-visual-rhythm";
import { enforceImageSourceCapIndexed } from "@/lib/image-source-cap";
import { assignPersonaStrip } from "@/lib/persona-strip";
import { imageSourceGroups } from "@/lib/gallery-dedupe";

export type DisplaySections = {
  sections: DetailSection[];
  /** sourceIndexes[i] = 표시 i번째 섹션의 입력 인덱스 (편집 콜백을 원본 위치로 되돌릴 때) */
  sourceIndexes: number[];
};

const DANGLING_TAIL = /[\s,，、·;:\-–—]+$/u;

/** 말풍선은 긴 문구를 잘라 만든 경우가 많아 끝에 쉼표·가운뎃점이 남는다 — 표시할 때만 떼어낸다 */
function trimCalloutTail(section: DetailSection): DetailSection {
  if (section.type !== "image_text" || !section.callout || !DANGLING_TAIL.test(section.callout)) return section;
  const callout = section.callout.replace(DANGLING_TAIL, "");
  return callout ? { ...section, callout } : section;
}

/**
 * 표시 단계 공용 규칙 — 라이브(DetailSectionRenderer)와 export(buildDetailPageHtml)가 같은 입력으로 부른다.
 * 저장 데이터는 바꾸지 않는다: 흐름 순서 → 굵은 블록 1개 → 같은 소스 사진 상한(같은 URL·파생본은 한 소스) → 말풍선 끝 문장부호 → 고민 사진 띠.
 * 옛 세션(생성 당시 규칙이 없던 것)도 열 때 같은 결과가 된다. 새 세션에는 결과가 그대로다(멱등).
 * 편집 중에는 섹션 내용이 원본과 같아야 저장이 안전하므로 순서만 맞춘다.
 */
export function applyDisplayRules(
  sections: DetailSection[],
  imageUrls: readonly string[],
  opts: { editing?: boolean } = {},
): DisplaySections {
  const ordered = orderSectionsForFlow(sections);
  const orderIndexes = ordered.map((s) => sections.indexOf(s));
  if (opts.editing) return { sections: ordered, sourceIndexes: orderIndexes };
  const sourceOf = imageSourceGroups(imageUrls);
  const capped = enforceImageSourceCapIndexed(limitBoldBlocks(ordered), imageUrls.length, undefined, sourceOf);
  return {
    sections: assignPersonaStrip(capped.sections.map(trimCalloutTail), imageUrls.length, sourceOf),
    sourceIndexes: capped.sourceIndexes.map((i) => orderIndexes[i]!),
  };
}
