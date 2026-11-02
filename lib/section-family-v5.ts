/**
 * 475차 A — 일반 섹션 종류 × 아키타입 시각 시그니처.
 * 자동 시험: 종류별로 8종 쌍마다 layout/card/align/emphasis 중 ≥3 상이.
 * designV5On()일 때만 호출.
 */
import type { ArchetypeId } from "@/lib/page-archetype-v5";
import { ARCHETYPE_IDS } from "@/lib/page-archetype-v5";

export type FamilyVisualSig = {
  layout: string;
  card: "none" | "soft" | "fill" | "hair" | "pill" | "hard";
  align: "left" | "center" | "split";
  emphasis: string;
};

/** 변형 대상 일반 섹션 종류(잠금 제외) */
export const FAMILY_SECTION_KINDS = [
  "highlight_box",
  "image_text",
  "checklist",
  "spec_table",
  "usage_steps",
  "brand_story",
  "target_persona",
  "gallery",
] as const;

export type FamilySectionKind = (typeof FAMILY_SECTION_KINDS)[number];

const HL: Record<ArchetypeId, FamilyVisualSig> = {
  editorial: { layout: "table", card: "none", align: "left", emphasis: "rule" },
  catalog: { layout: "grid", card: "fill", align: "left", emphasis: "border" },
  softlife: { layout: "scroll", card: "pill", align: "center", emphasis: "soft" },
  impact: { layout: "bignum", card: "hard", align: "center", emphasis: "size" },
  techsheet: { layout: "rows", card: "hair", align: "split", emphasis: "mono" },
  narrative: { layout: "timeline", card: "soft", align: "left", emphasis: "line" },
  luxe: { layout: "stack", card: "hair", align: "center", emphasis: "space" },
  pop: { layout: "bento", card: "hard", align: "left", emphasis: "tilt" },
};

const IT: Record<ArchetypeId, FamilyVisualSig> = {
  editorial: { layout: "split", card: "none", align: "left", emphasis: "dropcap" },
  catalog: { layout: "card-grid", card: "fill", align: "left", emphasis: "thumb" },
  softlife: { layout: "overlap", card: "pill", align: "center", emphasis: "pastel" },
  impact: { layout: "fullbleed", card: "hard", align: "center", emphasis: "poster" },
  techsheet: { layout: "spec-row", card: "hair", align: "split", emphasis: "mono" },
  narrative: { layout: "essay", card: "soft", align: "left", emphasis: "pull" },
  luxe: { layout: "asym", card: "none", align: "center", emphasis: "serif" },
  pop: { layout: "stack-tilt", card: "hard", align: "left", emphasis: "block" },
};

const CL: Record<ArchetypeId, FamilyVisualSig> = {
  editorial: { layout: "lined", card: "none", align: "left", emphasis: "rule" },
  catalog: { layout: "cards2", card: "fill", align: "center", emphasis: "icon" },
  softlife: { layout: "chips", card: "pill", align: "center", emphasis: "soft" },
  impact: { layout: "stair", card: "hard", align: "center", emphasis: "size" },
  techsheet: { layout: "kv", card: "hair", align: "split", emphasis: "mono" },
  narrative: { layout: "timeline", card: "soft", align: "left", emphasis: "line" },
  luxe: { layout: "sparse", card: "none", align: "center", emphasis: "space" },
  pop: { layout: "chips", card: "hard", align: "left", emphasis: "tilt" },
};

const SPEC: Record<ArchetypeId, FamilyVisualSig> = {
  editorial: { layout: "lined", card: "none", align: "left", emphasis: "rule" },
  catalog: { layout: "cells", card: "fill", align: "left", emphasis: "border" },
  softlife: { layout: "soft-cells", card: "pill", align: "center", emphasis: "pastel" },
  impact: { layout: "poster-kv", card: "hard", align: "center", emphasis: "size" },
  techsheet: { layout: "mono-table", card: "hair", align: "split", emphasis: "mono" },
  narrative: { layout: "story-kv", card: "soft", align: "left", emphasis: "line" },
  luxe: { layout: "sparse-kv", card: "none", align: "center", emphasis: "space" },
  pop: { layout: "block-kv", card: "hard", align: "left", emphasis: "block" },
};

const USAGE: Record<ArchetypeId, FamilyVisualSig> = {
  editorial: { layout: "numbered", card: "none", align: "left", emphasis: "rule" },
  catalog: { layout: "thumb-steps", card: "fill", align: "left", emphasis: "thumb" },
  softlife: { layout: "round-steps", card: "pill", align: "center", emphasis: "soft" },
  impact: { layout: "giant-num", card: "hard", align: "center", emphasis: "size" },
  techsheet: { layout: "proc", card: "hair", align: "split", emphasis: "mono" },
  narrative: { layout: "timeline", card: "soft", align: "left", emphasis: "line" },
  luxe: { layout: "sparse-steps", card: "hair", align: "center", emphasis: "space" },
  pop: { layout: "zigzag", card: "hard", align: "left", emphasis: "tilt" },
};

const STORY: Record<ArchetypeId, FamilyVisualSig> = {
  editorial: { layout: "column", card: "none", align: "left", emphasis: "dropcap" },
  catalog: { layout: "media-first", card: "fill", align: "left", emphasis: "thumb" },
  softlife: { layout: "bubble", card: "pill", align: "center", emphasis: "pastel" },
  impact: { layout: "billboard", card: "hard", align: "center", emphasis: "poster" },
  techsheet: { layout: "fact", card: "hair", align: "split", emphasis: "mono" },
  narrative: { layout: "chapter", card: "soft", align: "left", emphasis: "pull" },
  luxe: { layout: "wide-margin", card: "none", align: "center", emphasis: "serif" },
  pop: { layout: "punch", card: "hard", align: "left", emphasis: "block" },
};

const PERSONA: Record<ArchetypeId, FamilyVisualSig> = {
  editorial: { layout: "quote", card: "none", align: "left", emphasis: "rule" },
  catalog: { layout: "tag-grid", card: "fill", align: "left", emphasis: "border" },
  softlife: { layout: "pills", card: "pill", align: "center", emphasis: "soft" },
  impact: { layout: "banner", card: "hard", align: "center", emphasis: "size" },
  techsheet: { layout: "checklist", card: "hair", align: "split", emphasis: "mono" },
  narrative: { layout: "scene", card: "soft", align: "left", emphasis: "line" },
  luxe: { layout: "aside", card: "none", align: "center", emphasis: "space" },
  pop: { layout: "badge", card: "hard", align: "left", emphasis: "tilt" },
};

const GAL: Record<ArchetypeId, FamilyVisualSig> = {
  editorial: { layout: "strip", card: "none", align: "left", emphasis: "rule" },
  catalog: { layout: "masonry", card: "fill", align: "left", emphasis: "thumb" },
  softlife: { layout: "circle-row", card: "pill", align: "center", emphasis: "pastel" },
  impact: { layout: "hero-rail", card: "hard", align: "center", emphasis: "poster" },
  techsheet: { layout: "index", card: "hair", align: "split", emphasis: "mono" },
  narrative: { layout: "film", card: "soft", align: "left", emphasis: "line" },
  luxe: { layout: "sparse", card: "hair", align: "center", emphasis: "space" },
  pop: { layout: "clash", card: "hard", align: "left", emphasis: "tilt" },
};

const TABLES: Record<FamilySectionKind, Record<ArchetypeId, FamilyVisualSig>> = {
  highlight_box: HL,
  image_text: IT,
  checklist: CL,
  spec_table: SPEC,
  usage_steps: USAGE,
  brand_story: STORY,
  target_persona: PERSONA,
  gallery: GAL,
};

export function familySigV5(kind: FamilySectionKind, id: ArchetypeId): FamilyVisualSig {
  return TABLES[kind][id];
}

/** export 표식용 짧은 값(layout만 — 전체 시그니처는 모듈 표에서 검사) */
export function familyModeAttr(kind: FamilySectionKind, id: ArchetypeId): string {
  return familySigV5(kind, id).layout;
}

/** 쌍마다 시그니처 키 상이 개수(4개 중) */
export function familySigDiffCount(a: FamilyVisualSig, b: FamilyVisualSig): number {
  let n = 0;
  if (a.layout !== b.layout) n++;
  if (a.card !== b.card) n++;
  if (a.align !== b.align) n++;
  if (a.emphasis !== b.emphasis) n++;
  return n;
}

export function assertFamilyPairDiffs(minDiff = 3): string[] {
  const fails: string[] = [];
  for (const kind of FAMILY_SECTION_KINDS) {
    for (let i = 0; i < ARCHETYPE_IDS.length; i++) {
      for (let j = i + 1; j < ARCHETYPE_IDS.length; j++) {
        const a = ARCHETYPE_IDS[i]!;
        const b = ARCHETYPE_IDS[j]!;
        const d = familySigDiffCount(familySigV5(kind, a), familySigV5(kind, b));
        if (d < minDiff) fails.push(`${kind}:${a}↔${b}=${d}`);
      }
    }
  }
  return fails;
}

/** highlight_box DOM 모드(시그니처 layout과 1:1) */
export type HighlightFamilyMode =
  | "table"
  | "grid"
  | "scroll"
  | "bignum"
  | "rows"
  | "timeline"
  | "stack"
  | "bento";

export function highlightFamilyMode(id: ArchetypeId): HighlightFamilyMode {
  return HL[id].layout as HighlightFamilyMode;
}

/** image_text / 기타 — 표식 기반 초단 CSS(아키타입당 1~2규칙, export 다이어트) */
export function sectionFamilyCssV5(scope: string, id: ArchetypeId): string {
  const s = `${scope}[data-pz-bsig="${id}"]`;
  const it = familySigV5("image_text", id);
  if (it.card === "pill") return `${s} section[data-pz-it] .pagzly-compact-thumb{border-radius:999px!important}`;
  if (it.card === "hard") return `${s} section[data-pz-it] .pagzly-compact-thumb{border-radius:0!important;box-shadow:3px 3px 0 var(--pz-v5-point,#c45)}`;
  if (it.card === "hair" || it.card === "none") return `${s} section[data-pz-it] .pagzly-compact-thumb{border-radius:2px!important}`;
  if (it.emphasis === "mono") return `${s} section[data-pz-sf^="spec_table"]{font-variant-numeric:tabular-nums}`;
  if (it.layout === "wide-margin" || it.emphasis === "serif") return `${s} section[data-pz-sf^="brand_story"]{padding-left:10%;padding-right:10%}`;
  return `${s} section[data-pz-it] .pagzly-compact-thumb{border-radius:10px!important}`;
}

/** 섹션 type → family kind (잠금은 null) */
export function familyKindOf(type: string): FamilySectionKind | null {
  return (FAMILY_SECTION_KINDS as readonly string[]).includes(type) ? (type as FamilySectionKind) : null;
}
