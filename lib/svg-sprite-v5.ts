/**
 * 475차 F — 반복 장식 SVG를 한 번만 선언하고 `<use>`로 재사용(export 다이어트).
 * designV5On()에서만 스프라이트를 붙인다.
 */

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
