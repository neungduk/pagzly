/**
 * 474차 D — 아키타입별 미세 장식 어휘(섹션당 1~2). 새 카피 없음 — 기존 decorHtml·V5_LABELS·순번만.
 */
import type { ArchetypeId, DecorKind } from "@/lib/page-archetype-v5";
import { ARCHETYPES } from "@/lib/page-archetype-v5";
import { v5Label } from "@/lib/v5-labels";

export type DetailDecoVocab = {
  head: DecorKind;
  alt: DecorKind[];
  /** 섹션 머리 라벨(닫힌 표지) */
  label: string;
  badge: string;
};

export function detailDecoOf(id: ArchetypeId): DetailDecoVocab {
  const t = ARCHETYPES[id];
  return {
    head: t.decor,
    alt: t.decorAlt,
    label: t.eyebrow === "enlabel" ? v5Label("detail") : t.eyebrow === "pill" ? v5Label("note") : v5Label("point"),
    badge: t.badge,
  };
}

/** 8종이 head 장식을 ≥4종 서로 다르게(자동 시험) */
export function detailHeadDistinct(ids: ArchetypeId[] = Object.keys(ARCHETYPES) as ArchetypeId[]): number {
  return new Set(ids.map((a) => ARCHETYPES[a].decor)).size;
}
