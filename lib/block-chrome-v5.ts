/**
 * 477차 B — 블록 크롬: 영문 라벨+표식 어휘, 여백 토큰, 시각 요소 수·대비 검사.
 * 새 카피 없음 — v5Label / 기존 섹션 번호만. designV5On에서만 사용.
 */
import type { ArchetypeId } from "@/lib/page-archetype-v5";
import { ARCHETYPE_IDS } from "@/lib/page-archetype-v5";
import { v5Label, type V5LabelKey } from "@/lib/v5-labels";
import { contrastRatioToken } from "@/lib/design-tokens";

export type MarkShape = "corners" | "dots" | "rule" | "none";
export type LabelPlace = "above" | "aside" | "vertical";

export type BlockChromeVocab = {
  labelKey: V5LabelKey;
  place: LabelPlace;
  mark: MarkShape;
  corner: "square" | "soft" | "none";
};

/** 아키타입별 라벨 위치·표식·모서리(일관 어휘) */
export const BLOCK_CHROME_V5: Record<ArchetypeId, BlockChromeVocab> = {
  editorial: { labelKey: "detail", place: "above", mark: "rule", corner: "square" },
  catalog: { labelKey: "spec", place: "aside", mark: "corners", corner: "square" },
  softlife: { labelKey: "note", place: "above", mark: "dots", corner: "soft" },
  impact: { labelKey: "point", place: "aside", mark: "none", corner: "square" },
  techsheet: { labelKey: "spec", place: "vertical", mark: "corners", corner: "square" },
  narrative: { labelKey: "story", place: "above", mark: "rule", corner: "none" },
  luxe: { labelKey: "detail", place: "above", mark: "none", corner: "none" },
  pop: { labelKey: "point", place: "aside", mark: "dots", corner: "soft" },
};

/** 블록 종류별 안전 여백(상·하·좌·우 px) — 사진 중심 계열 */
export const BLOCK_PAD_V5: Record<string, [number, number, number, number]> = {
  phototext: [28, 36, 0, 0],
  points: [40, 48, 24, 24],
  check: [40, 48, 24, 24],
  story: [48, 56, 24, 24],
  metrics: [36, 44, 24, 24],
  options: [36, 44, 24, 24],
  spec: [40, 48, 24, 24],
  reviews: [40, 48, 24, 24],
  faq: [40, 48, 24, 24],
  notice: [32, 40, 24, 24],
  purchase: [32, 40, 24, 24],
  hero: [0, 0, 0, 0],
};

export function blockPadCss(kind: string): string {
  const p = BLOCK_PAD_V5[kind] ?? [40, 48, 24, 24];
  return `padding:${p[0]}px ${p[2]}px ${p[1]}px ${p[3]}px`;
}

/** 가는 표식 HTML(장식만, 새 글자 없음) */
export function markHtml(mark: MarkShape, color: string): string {
  if (mark === "none") return "";
  if (mark === "dots") {
    return `<span data-pz-bmark="dots" aria-hidden="true" style="display:inline-flex;gap:4px;align-items:center"><i style="width:4px;height:4px;border-radius:50%;background:${color};display:block"></i><i style="width:4px;height:4px;border-radius:50%;background:${color};display:block"></i><i style="width:4px;height:4px;border-radius:50%;background:${color};display:block"></i></span>`;
  }
  if (mark === "rule") {
    return `<span data-pz-bmark="rule" aria-hidden="true" style="display:inline-block;width:28px;height:1px;background:${color};vertical-align:middle"></span>`;
  }
  // corners ┌ ┐
  return (
    `<span data-pz-bmark="corners" aria-hidden="true" style="display:inline-flex;gap:6px;align-items:center">` +
    `<i style="display:block;width:10px;height:10px;border-left:1.5px solid ${color};border-top:1.5px solid ${color}"></i>` +
    `<i style="display:block;width:10px;height:10px;border-right:1.5px solid ${color};border-top:1.5px solid ${color}"></i>` +
    `</span>`
  );
}

/** 라벨+표식 한 줄(기존 v5Label만) */
export function chromeLabelRow(id: ArchetypeId, color: string): string {
  const v = BLOCK_CHROME_V5[id];
  const lab = v5Label(v.labelKey);
  if (!lab) return markHtml(v.mark, color);
  const mark = markHtml(v.mark, color);
  if (v.place === "vertical") {
    return `<div data-pz-bchrome="vertical" style="display:flex;flex-direction:column;align-items:flex-start;gap:6px;margin:0 0 10px">${mark}<span style="writing-mode:vertical-rl;transform:rotate(180deg);letter-spacing:0.12em;font-size:11px;font-weight:700;color:${color}">${lab}</span></div>`;
  }
  if (v.place === "aside") {
    return `<div data-pz-bchrome="aside" style="display:flex;align-items:center;gap:8px;margin:0 0 10px">${mark}<span style="letter-spacing:0.08em;font-size:11px;font-weight:700;color:${color}">${lab}</span></div>`;
  }
  return `<div data-pz-bchrome="above" style="display:flex;align-items:center;gap:8px;margin:0 0 10px">${mark}<span style="letter-spacing:0.08em;font-size:11px;font-weight:700;color:${color}">${lab}</span></div>`;
}

/**
 * 마크업 시각 요소 수(카드/아이콘/장식/띠/배지).
 * 사진·제목·본문·라벨 1줄은 세지 않음 — 초과 장식만.
 */
export function countVisualExtras(html: string): number {
  const cards = (html.match(/border-radius:\s*(1[2-9]|[2-9]\d)px/g) ?? []).length;
  const icons = (html.match(/data-pz-icon|iconV4|numberMark|<svg[^>]*(?:width="2[0-9]"|viewBox="0 0 24)/g) ?? []).length;
  const deco = (html.match(/data-pz-bmark|data-pz-deco|motifHtml|ghostHtml|useDotsGrid|usePlusField|data-pz-dyn/g) ?? []).length;
  const bands = (html.match(/tickerBand|data-pz-marquee|repeating-linear/g) ?? []).length;
  const badges = (html.match(/border-radius:\s*50%|border-radius:\s*999px/g) ?? []).length;
  return cards + icons + deco + bands + Math.floor(badges / 2);
}

/** 사진 위 밝은 글 vs 스크림(근사 #1a1a1a) 대비 ≥ 4.5 */
export function scrimTextContrastOk(fg = "#FFFFFF", scrimApprox = "#1A1A1A"): boolean {
  return contrastRatioToken(fg, scrimApprox) >= 4.5;
}

/** 8종 표식·라벨 위치 다양성(자동 시험) */
export function chromeVocabSpread(ids: ArchetypeId[] = [...ARCHETYPE_IDS]): { places: number; marks: number } {
  return {
    places: new Set(ids.map((a) => BLOCK_CHROME_V5[a].place)).size,
    marks: new Set(ids.map((a) => BLOCK_CHROME_V5[a].mark)).size,
  };
}
