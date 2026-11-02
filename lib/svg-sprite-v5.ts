/**
 * 475차 F — 반복 장식 SVG를 한 번만 선언하고 `<use>`로 재사용(export 다이어트).
 * 477차 D — 윤곽 경로는 페이지 전역 스프라이트에 넣지 않고 `spec-diagram-v5` 로컬 defs+`<use>`(미사용 페이지 용량 방지).
 * designV5On()에서만 스프라이트를 붙인다.
 */

export type OutlineId = "garment" | "bag" | "bottle" | "box" | "appliance";

/** 카테고리 윤곽 path(도식 모듈·회귀가 공유) */
export const OUTLINE_PATHS: Record<OutlineId, string> = {
  garment: `<path d="M55 40 L80 28 L105 40 L118 58 L105 62 L105 160 L55 160 L55 62 L42 58 Z"/>`,
  bag: `<path d="M50 70 H110 V155 H50 Z"/><path d="M62 70 C62 48 98 48 98 70"/>`,
  bottle: `<path d="M70 28 H90 V48 H100 V160 H60 V48 H70 Z"/>`,
  box: `<path d="M45 55 H115 V155 H45 Z"/><path d="M45 55 L80 35 L115 55"/>`,
  appliance: `<rect x="48" y="40" width="64" height="120" rx="4"/><rect x="58" y="55" width="44" height="28" rx="2"/><circle cx="80" cy="120" r="10"/>`,
};

/** 페이지당 1회 — 숨김 스프라이트(점격자·플러스필드) */
export function svgSpriteV5(): string {
  // dots-grid: 3×5 점. plus-field: 세 십자.
  let dots = "";
  for (let r = 0; r < 3; r += 1) for (let k = 0; k < 5; k += 1) dots += `<circle cx="${6 + k * 12}" cy="${5 + r * 8}" r="1.6"/>`;
  const plus =
    `<path d="M4 8 H12 M8 4 V12" stroke-width="1.5" stroke-linecap="round"/>` +
    `<path d="M26 14 H34 M30 10 V18" stroke-width="1.5" stroke-linecap="round"/>` +
    `<path d="M48 6 H56 M52 2 V10" stroke-width="1.5" stroke-linecap="round"/>`;
  // xmlns 생략(HTML5 inline SVG). 숨김은 0크기만
  return `<svg aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden"><defs><g id="pzD">${dots}</g><g id="pzP" fill="none">${plus}</g></defs></svg>`;
}

export function useDotsGrid(fill: string): string {
  return `<svg viewBox="0 0 64 26" width="64" height="26" aria-hidden="true"><use href="#pzD" fill="${fill}"/></svg>`;
}

export function usePlusField(stroke: string): string {
  return `<svg viewBox="0 0 60 22" width="60" height="22" aria-hidden="true"><use href="#pzP" stroke="${stroke}"/></svg>`;
}

/** 로컬 defs용 `<use>` (도식 SVG 안에서만) */
export function useOutline(kind: OutlineId): string {
  return `<use href="#pzO-${kind}"/>`;
}
