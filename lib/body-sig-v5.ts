/**
 * 473차 V5 — 본문(두 번째 화면 이후) 시각 시그니처 6칸.
 * 지표 완화 금지: 8종 쌍마다 6칸 중 ≥3 달라야 한다.
 */
import type { ArchetypeId } from "@/lib/page-archetype-v5";

export type NumMark = "side" | "big" | "roman" | "badge" | "inline" | "top" | "ghost" | "step" | "box" | "circle";
export type ListShape = "number" | "check" | "stair" | "card" | "chip" | "timeline" | "bento" | "rows";
export type StatShape = "huge" | "inline" | "ring" | "bar" | "trio" | "flush" | "boxed" | "stack";
export type RuleVocab = "thin" | "thick" | "dash" | "dot" | "slant" | "wave" | "none" | "double";
export type RadiusBin = "0" | "sm" | "md" | "lg";
export type ShadowBin = "none" | "soft" | "hard" | "warm";

export type BodySig = {
  num: NumMark;
  list: ListShape;
  stat: StatShape;
  rule: RuleVocab;
  radius: RadiusBin;
  shadow: ShadowBin;
};

export const BODY_SIG_KEYS: Array<keyof BodySig> = ["num", "list", "stat", "rule", "radius", "shadow"];

/** 아키타입별 본문 시그니처 — POINT/SPEC/CHECK/STORY가 색만 다르지 않게 */
export const BODY_SIG: Record<ArchetypeId, BodySig> = {
  editorial: { num: "roman", list: "number", stat: "inline", rule: "thin", radius: "0", shadow: "none" },
  catalog: { num: "box", list: "rows", stat: "trio", rule: "thick", radius: "md", shadow: "hard" },
  softlife: { num: "circle", list: "chip", stat: "ring", rule: "wave", radius: "lg", shadow: "warm" },
  impact: { num: "big", list: "stair", stat: "huge", rule: "slant", radius: "sm", shadow: "hard" },
  techsheet: { num: "step", list: "check", stat: "bar", rule: "dash", radius: "0", shadow: "none" },
  narrative: { num: "side", list: "timeline", stat: "stack", rule: "dot", radius: "md", shadow: "soft" },
  // 474 C: list card→rows — 채워진 사각 카드 밀도 완화(시그니처 칸은 유지·쌍 차이 ≥3)
  luxe: { num: "top", list: "rows", stat: "flush", rule: "double", radius: "sm", shadow: "none" },
  pop: { num: "badge", list: "bento", stat: "boxed", rule: "thick", radius: "lg", shadow: "hard" },
};

export const bodySigDiff = (a: BodySig, b: BodySig): number => BODY_SIG_KEYS.filter((k) => a[k] !== b[k]).length;

export function recipeBodySigDiff(a: ArchetypeId, b: ArchetypeId): number {
  return bodySigDiff(BODY_SIG[a], BODY_SIG[b]);
}

/**
 * 본문 시그니처 CSS — 변수만(페이지 루트 data-pz-bsig). body-sig-473이 --pz-bs-* 를 읽는다.
 */
export function bodySigCssV5(scope: string, id: ArchetypeId): string {
  const s = BODY_SIG[id];
  // 따옴표 생략·짧은 키(지표는 --pz-bs-* 값만 읽음)
  return `${scope}[data-pz-bsig=${id}]{--pz-bs-num:${s.num};--pz-bs-list:${s.list};--pz-bs-stat:${s.stat};--pz-bs-rule:${s.rule};--pz-bs-r:${s.radius};--pz-bs-sh:${s.shadow}}`;
}
