/**
 * 473차 V5 — 본문(두 번째 화면 이후) 시각 시그니처 6칸.
 * 지표 완화 금지: 8종 쌍마다 6칸 중 ≥3 달라야 한다.
 */
import type { ArchetypeId } from "@/lib/page-archetype-v5";

export type NumMark = "side" | "big" | "roman" | "badge" | "inline" | "top" | "ghost" | "step";
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
  luxe: { num: "top", list: "card", stat: "flush", rule: "double", radius: "sm", shadow: "none" },
  pop: { num: "badge", list: "bento", stat: "boxed", rule: "thick", radius: "lg", shadow: "hard" },
};

export const bodySigDiff = (a: BodySig, b: BodySig): number => BODY_SIG_KEYS.filter((k) => a[k] !== b[k]).length;

export function recipeBodySigDiff(a: ArchetypeId, b: ArchetypeId): number {
  return bodySigDiff(BODY_SIG[a], BODY_SIG[b]);
}

const IMP = "!important";
const rule = (sel: string, decl: string): string => `${sel}{${decl.split(";").filter(Boolean).map((d) => `${d}${IMP}`).join(";")}}`;

/** 본문 시그니처 CSS — 섹션 표식 data-pz-bsig / data-pz-ax-done */
export function bodySigCssV5(scope: string, id: ArchetypeId): string {
  const s = BODY_SIG[id];
  const root = `${scope} [data-pz-bsig="${id}"]`;
  const out: string[] = [];
  out.push(`${root}:not([data-pz-bs="meta"]){--pz-bs-num:${s.num};--pz-bs-list:${s.list};--pz-bs-stat:${s.stat};--pz-bs-rule:${s.rule};--pz-bs-r:${s.radius};--pz-bs-sh:${s.shadow}}`);
  // 구분선 어휘
  switch (s.rule) {
    case "thin": out.push(rule(`${root} [data-pz-v4^="benefits"],${root}[data-pz-v4^="benefits"]`, "border-bottom:1px solid rgba(27,27,24,0.12)")); break;
    case "thick": out.push(rule(`${root}[data-pz-v4^="benefits"],${root}[data-pz-v4^="spec"]`, "border-top:3px solid currentColor")); break;
    case "dash": out.push(rule(`${root}[data-pz-v4^="benefits"]`, "border-bottom:2px dashed rgba(27,27,24,0.25)")); break;
    case "dot": out.push(rule(`${root}[data-pz-v4^="story"],${root}[data-pz-v4^="concern"]`, "border-bottom:2px dotted rgba(27,27,24,0.3)")); break;
    case "slant": out.push(rule(`${root}[data-pz-v4^="benefits"]`, "border-top:3px solid currentColor;transform:none")); break;
    case "wave": out.push(rule(`${root}[data-pz-v4^="benefits"]`, "border-bottom:2px solid rgba(27,27,24,0.15)")); break;
    case "double": out.push(rule(`${root}[data-pz-v4^="story"],${root}[data-pz-v4^="benefits"]`, "border-top:1px solid rgba(27,27,24,0.2);border-bottom:1px solid rgba(27,27,24,0.2)")); break;
    default: break;
  }
  // 목록 모양 힌트(카드 패딩·정렬) — 렌더 분기와 맞춤
  switch (s.list) {
    case "stair": out.push(rule(`${root}[data-pz-v4^="benefits"] [data-pz-bs-list]>*`, "margin-left:calc(var(--i,0)*12px)")); break;
    case "chip": out.push(rule(`${root}[data-pz-v4^="benefits"] [data-pz-bs-list]`, "display:flex;flex-wrap:wrap;gap:8px")); break;
    case "card": out.push(rule(`${root}[data-pz-v4^="benefits"] [data-pz-bs-list]>*`, "padding:16px;border-radius:16px;background:#FFFFFF")); break;
    case "rows": out.push(rule(`${root}[data-pz-v4^="benefits"] [data-pz-bs-list]`, "display:grid;grid-template-columns:1fr 1fr;gap:10px")); break;
    case "bento": out.push(rule(`${root}[data-pz-v4^="benefits"] [data-pz-bs-list]>*:first-child`, "grid-column:1/-1")); break;
    case "check": out.push(rule(`${root}[data-pz-v4^="concern"] [data-pz-bs-list]>*,${root}[data-pz-v4^="benefits"] [data-pz-bs-list]>*`, "padding-left:8px")); break;
    case "timeline": out.push(rule(`${root}[data-pz-v4^="benefits"] [data-pz-bs-list]`, "border-left:2px solid currentColor;padding-left:16px")); break;
    default: break;
  }
  // 큰 수치
  switch (s.stat) {
    case "huge": out.push(rule(`${root}[data-pz-v4^="spec"] [data-pz-bs-stat]`, "font-size:40px;font-weight:900;letter-spacing:-0.04em")); break;
    case "trio": out.push(rule(`${root}[data-pz-v4^="spec"] [data-pz-bs-stat]`, "font-size:28px;font-weight:900;text-align:center")); break;
    case "bar": out.push(rule(`${root}[data-pz-v4^="spec"] [data-pz-bs-stat]`, "font-size:22px;font-weight:800;border-bottom:2px solid currentColor")); break;
    case "ring": out.push(rule(`${root}[data-pz-v4^="spec"] [data-pz-bs-stat]`, "font-size:26px;font-weight:900;text-align:center")); break;
    case "boxed": out.push(rule(`${root}[data-pz-v4^="spec"] [data-pz-bs-stat]`, "font-size:30px;font-weight:900;padding:8px 12px;border:2px solid currentColor")); break;
    case "flush": out.push(rule(`${root}[data-pz-v4^="spec"] [data-pz-bs-stat]`, "font-size:24px;font-weight:600;letter-spacing:0.04em")); break;
    case "stack": out.push(rule(`${root}[data-pz-v4^="spec"] [data-pz-bs-stat]`, "font-size:32px;font-weight:900;display:block")); break;
    default: out.push(rule(`${root}[data-pz-v4^="spec"] [data-pz-bs-stat]`, "font-size:20px;font-weight:700")); break;
  }
  return out.join("");
}
