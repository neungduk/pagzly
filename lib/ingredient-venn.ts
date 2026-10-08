/**
 * 298차 — 성분 원형(circle-pair/solo)의 플랫 톤 대체: 사진 없이 겹친 원 + 성분명(벤 다이어그램).
 * circlePair 이미지는 상품 사진을 순번으로 재사용해 성분과 무관한 사진에 성분명이 붙는 문제가 있어,
 * 성분명만으로 조합을 보여준다. 라이브·export가 같은 문자열을 쓴다.
 */

import { isBaseSolventIngredient } from "@/lib/ingredient-labels";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const D = 148;
const OVERLAP = 28;

/** 화장품 성분 표준 한글명(전성분 표기명) — 확실한 것만. 없으면 원문 그대로 표시 */
const KOREAN_INCI: Record<string, string> = {
  niacinamide: "나이아신아마이드",
  "sodium hyaluronate": "히알루론산나트륨",
  "hyaluronic acid": "히알루론산",
  panthenol: "판테놀",
  glycerin: "글리세린",
  adenosine: "아데노신",
  retinol: "레티놀",
  "centella asiatica extract": "병풀추출물",
  madecassoside: "마데카소사이드",
  tocopherol: "토코페롤",
  squalane: "스쿠알란",
  allantoin: "알란토인",
  betaine: "베타인",
  "ceramide np": "세라마이드엔피",
  "ascorbic acid": "아스코빅애씨드",
  "salicylic acid": "살리실릭애씨드",
};

/** keep-all이라 가장 긴 어절이 한 줄에 들어가야 한다 — 한글 1자 ≈ 1em 기준 */
function fitFontPx(text: string, boxPx: number, maxPx: number): number {
  const longest = Math.max(1, ...text.split(/\s+/).map((t) => t.length));
  return Math.max(11, Math.min(maxPx, Math.floor(boxPx / longest)));
}

/** "Niacinamide 5%" → { main: "나이아신아마이드 5%", sub: "Niacinamide" } */
export function koreanIngredientLabel(label: string): { main: string; sub: string | null } {
  const m = label.trim().match(/^(.*?)(\s*\d+(?:\.\d+)?\s*%)?$/);
  const base = (m?.[1] ?? label).trim();
  const pct = (m?.[2] ?? "").trim();
  const ko = KOREAN_INCI[base.toLowerCase()];
  if (!ko) return { main: label.trim(), sub: null };
  return { main: pct ? `${ko} ${pct}` : ko, sub: base };
}

/** 스펙 표 값 표시용 — 성분 행만 한글 표준명으로 */
export function displaySpecValue(label: string, value: string): string {
  return /성분/.test(label) ? koreanizeIngredientList(value) : value;
}

/** 334차 — 성분·원료 행 값을 칩 목록으로(라이브·export 공용). 입력에 있는 이름만 쓰고 역할 태그는 붙이지 않는다. */
export function specIngredientChips(label: string, value: string): string[] | null {
  if (!/성분|원료/.test(label)) return null;
  const items = displaySpecValue(label, value)
    .split(/[,·/\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length < 2 || items.length > 6 || items.some((s) => s.length > 18)) return null;
  return items;
}

/** "나이아신아마이드 5%, Sodium Hyaluronate, Panthenol" → 사전에 있는 영문 성분명만 한글 표준명으로 */
export function koreanizeIngredientList(text: string): string {
  return text.replace(/[^,·/\n]+/g, (token) => {
    const lead = token.match(/^\s*/)?.[0] ?? "";
    const trail = token.match(/\s*$/)?.[0] ?? "";
    const core = token.trim();
    if (!core) return token;
    const { main, sub } = koreanIngredientLabel(core);
    return sub ? `${lead}${main}${trail}` : token;
  });
}

function vennNames(labels: string[]): string[] {
  const trimmed = labels.map((l) => l.trim()).filter(Boolean);
  const actives = trimmed.filter((l) => !isBaseSolventIngredient(l));
  return (actives.length > 0 ? actives : trimmed).slice(0, 2);
}

/**
 * 제목·본문 없이 성분 하나만 그리는 원은 히어로 배지·요약·포인트에 이미 나온 성분명을
 * 맥락 없이 한 번 더 반복할 뿐이다.
 */
export function isRedundantSoloVenn(labels: string[], heading?: string, body?: string): boolean {
  return vennNames(labels).length <= 1 && !heading?.trim() && !body?.trim();
}

export function ingredientVennHtml(labels: string[], color: string, fontFamily: string): string {
  const names = vennNames(labels);
  if (names.length === 0) return "";
  const subHtml = (sub: string | null) =>
    sub
      ? `<span style="display:block;margin-top:4px;font-size:10px;font-weight:500;letter-spacing:0;opacity:.6">${esc(sub)}</span>`
      : "";
  const label = (text: string, left: number, width: number) => {
    const { main, sub } = koreanIngredientLabel(text);
    return `<span style="position:absolute;top:0;left:${left}px;width:${width}px;height:${D}px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 10px;box-sizing:border-box;text-align:center;font-family:${fontFamily};color:${color};word-break:keep-all;overflow-wrap:normal"><span style="font-size:${sub ? fitFontPx(main, width - 24, 15) : main.length > 9 ? 13 : 15}px;font-weight:700;line-height:1.3;letter-spacing:-0.02em">${esc(main)}</span>${subHtml(sub)}</span>`;
  };
  if (names.length === 1) {
    const { main, sub } = koreanIngredientLabel(names[0]!);
    return `<div style="position:relative;width:${D}px;height:${D}px;margin:0 auto" role="img" aria-label="${esc(main)}">
      <span style="position:absolute;inset:0;border:1.5px solid ${color};border-radius:9999px"></span>
      <span style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:0 16px;box-sizing:border-box;text-align:center;font-family:${fontFamily};color:${color}">
        <span style="font-size:11px;font-weight:600;letter-spacing:.08em;opacity:.6">핵심 성분</span>
        <span style="font-size:${sub ? fitFontPx(main, D - 36, 18) : main.length > 14 ? 15 : 18}px;font-weight:700;line-height:1.25;letter-spacing:-0.02em;word-break:keep-all;overflow-wrap:normal">${esc(main)}${subHtml(sub)}</span>
      </span>
    </div>`;
  }
  const W = D * 2 - OVERLAP;
  const plus = 24;
  return `<div style="position:relative;width:${W}px;height:${D}px;margin:0 auto" role="img" aria-label="${esc(names.map((n) => koreanIngredientLabel(n).main).join(" + "))}">
    <span style="position:absolute;top:0;left:0;width:${D}px;height:${D}px;border:1.5px solid ${color};border-radius:9999px;box-sizing:border-box"></span>
    <span style="position:absolute;top:0;left:${D - OVERLAP}px;width:${D}px;height:${D}px;border:1.5px dashed ${color};border-radius:9999px;box-sizing:border-box"></span>
    ${label(names[0]!, 0, D - OVERLAP)}
    ${label(names[1]!, D, D - OVERLAP)}
    <span aria-hidden="true" style="position:absolute;top:${(D - plus) / 2}px;left:${(W - plus) / 2}px;width:${plus}px;height:${plus}px;border-radius:9999px;background:#FFFFFF;border:1.5px solid ${color};box-sizing:border-box;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;line-height:1;color:${color}">+</span>
  </div>`;
}
