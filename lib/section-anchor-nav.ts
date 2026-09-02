/** 섹션 앵커 내비게이션 (55차) */

import type { DetailSection } from "@/lib/types/generate";

export type SectionAnchor = {
  sectionIndex: number;
  id: string;
  label: string;
};

type AnchorRule = {
  id: string;
  label: string;
  match: (section: DetailSection) => boolean;
};

const ANCHOR_RULES: AnchorRule[] = [
  {
    id: "pagzly-info",
    label: "제품정보",
    match: (s) => s.type === "spec_table" && s.slot === "spec_table",
  },
  {
    id: "pagzly-size",
    label: "사이즈",
    match: (s) => s.type === "spec_table" && s.slot === "size_table",
  },
  {
    id: "pagzly-gallery",
    label: "구성",
    match: (s) => s.type === "gallery",
  },
  {
    id: "pagzly-usage",
    label: "사용법",
    match: (s) =>
      s.type === "usage_steps" ||
      s.type === "step_card" ||
      s.slot === "cooking_steps",
  },
  {
    id: "pagzly-review",
    label: "후기",
    match: (s) => s.type === "review_highlight",
  },
  {
    id: "pagzly-faq",
    label: "FAQ",
    match: (s) => s.type === "faq",
  },
  {
    id: "pagzly-shipping",
    label: "배송",
    match: (s) => s.type === "spec_table" && s.slot === "shipping_info",
  },
  {
    id: "pagzly-caution",
    label: "주의",
    match: (s) => s.type === "caution",
  },
];

/** 페이지에 실제 존재하는 섹션만 앵커로 반환 (id 중복 없음) */
export function buildSectionAnchors(sections: DetailSection[]): SectionAnchor[] {
  const anchors: SectionAnchor[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < sections.length; i += 1) {
    const section = sections[i]!;
    for (const rule of ANCHOR_RULES) {
      if (usedIds.has(rule.id)) continue;
      if (!rule.match(section)) continue;
      anchors.push({ sectionIndex: i, id: rule.id, label: rule.label });
      usedIds.add(rule.id);
      break;
    }
  }

  return anchors;
}

export function buildSectionAnchorIdMap(sections: DetailSection[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const anchor of buildSectionAnchors(sections)) {
    map.set(anchor.sectionIndex, anchor.id);
  }
  return map;
}

export function buildAnchorNavHtml(
  anchors: SectionAnchor[],
  theme: { accent: string; deepAccent: string; baseNeutral: string },
): string {
  if (anchors.length === 0) return "";
  const links = anchors
    .map(
      (a) =>
        `<a href="#${a.id}" style="flex:0 0 auto;padding:8px 14px;font-size:12px;font-weight:600;color:${theme.deepAccent};text-decoration:none;border-radius:999px;background:${theme.accent}1a">${a.label}</a>`,
    )
    .join("");
  return `<nav class="pagzly-anchor-nav" aria-label="섹션 이동" style="position:sticky;top:0;z-index:25;display:flex;gap:6px;overflow-x:auto;padding:10px 16px;border-bottom:1px solid ${theme.accent}33;background:${theme.baseNeutral}f2;backdrop-filter:blur(8px);-webkit-overflow-scrolling:touch">${links}</nav>`;
}
