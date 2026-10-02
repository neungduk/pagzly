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

export function ingredientVennHtml(labels: string[], color: string, fontFamily: string): string {
  const trimmed = labels.map((l) => l.trim()).filter(Boolean);
  const actives = trimmed.filter((l) => !isBaseSolventIngredient(l));
  const names = (actives.length > 0 ? actives : trimmed).slice(0, 2);
  if (names.length === 0) return "";
  const label = (text: string, left: number, width: number) =>
    `<span style="position:absolute;top:0;left:${left}px;width:${width}px;height:${D}px;display:flex;align-items:center;justify-content:center;padding:0 10px;box-sizing:border-box;text-align:center;font-family:${fontFamily};font-size:${text.length > 9 ? 13 : 15}px;font-weight:700;line-height:1.3;letter-spacing:-0.02em;color:${color};word-break:keep-all;overflow-wrap:normal">${esc(text)}</span>`;
  if (names.length === 1) {
    const name = names[0]!;
    return `<div style="position:relative;width:${D}px;height:${D}px;margin:0 auto" role="img" aria-label="${esc(name)}">
      <span style="position:absolute;inset:0;border:1.5px solid ${color};border-radius:9999px"></span>
      <span style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:0 16px;box-sizing:border-box;text-align:center;font-family:${fontFamily};color:${color}">
        <span style="font-size:11px;font-weight:600;letter-spacing:.08em;opacity:.6">핵심 성분</span>
        <span style="font-size:${name.length > 14 ? 15 : 18}px;font-weight:700;line-height:1.25;letter-spacing:-0.02em;word-break:keep-all;overflow-wrap:normal">${esc(name)}</span>
      </span>
    </div>`;
  }
  const W = D * 2 - OVERLAP;
  const plus = 24;
  return `<div style="position:relative;width:${W}px;height:${D}px;margin:0 auto" role="img" aria-label="${esc(names.join(" + "))}">
    <span style="position:absolute;top:0;left:0;width:${D}px;height:${D}px;border:1.5px solid ${color};border-radius:9999px;box-sizing:border-box"></span>
    <span style="position:absolute;top:0;left:${D - OVERLAP}px;width:${D}px;height:${D}px;border:1.5px dashed ${color};border-radius:9999px;box-sizing:border-box"></span>
    ${label(names[0]!, 0, D - OVERLAP)}
    ${label(names[1]!, D, D - OVERLAP)}
    <span aria-hidden="true" style="position:absolute;top:${(D - plus) / 2}px;left:${(W - plus) / 2}px;width:${plus}px;height:${plus}px;border-radius:9999px;background:#FFFFFF;border:1.5px solid ${color};box-sizing:border-box;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;line-height:1;color:${color}">+</span>
  </div>`;
}
