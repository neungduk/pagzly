/**
 * 475차 A — highlight_box 8종 DOM/레이아웃 변형.
 * 카드 카피·가격·고지 불변. designV5On()에서만.
 */
import type { ArchetypeId } from "@/lib/page-archetype-v5";
import { highlightFamilyMode, type HighlightFamilyMode } from "@/lib/section-family-v5";

export type { HighlightFamilyMode };
export { highlightFamilyMode };

export type HlCell = {
  titleHtml: string;
  bodyHtml: string;
  em: boolean;
};

function num(i: number): string {
  return `<div style="font-size:11px;letter-spacing:.18em;opacity:.65;margin-bottom:8px">${String(i + 1).padStart(2, "0")}</div>`;
}

/** 모드별 래퍼+셀. 시각 차이는 DOM 구조(+짧은 CSS). */
export function highlightFamilyInnerHtml(mode: HighlightFamilyMode, cells: HlCell[]): string {
  const n = cells.length;
  if (mode === "scroll") {
    return `<div class="pagzly-hl-grid" data-pz-hl-g="scroll" style="display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:12px;margin-top:28px;padding-bottom:8px">${cells
      .map((c, i) => `<div data-pz-hl-c="${i}" style="flex:0 0 min(78%,280px);scroll-snap-align:start;padding:24px 18px;text-align:center;border-radius:999px 999px 28px 28px;background:color-mix(in srgb,var(--pz-v5-surface-alt,#f6f2ef) 88%,transparent)">${num(i)}${c.titleHtml}${c.bodyHtml}</div>`)
      .join("")}</div>`;
  }
  if (mode === "stack") {
    return `<div class="pagzly-hl-grid" data-pz-hl-g="stack" style="display:flex;flex-direction:column;align-items:center;gap:0;margin-top:28px;max-width:420px;margin-left:auto;margin-right:auto">${cells
      .map((c, i) => `<div data-pz-hl-c="${i}" style="width:100%;padding:28px 22px;text-align:center;margin-top:${i ? -12 : 0}px;position:relative;z-index:${n - i};border:1px solid color-mix(in srgb,var(--pz-v5-ink,#1B1B18) 12%,transparent);border-radius:2px;background:color-mix(in srgb,var(--pz-v5-surface,#fff) 92%,var(--pz-v5-point,#c45))">${c.titleHtml}${c.bodyHtml}</div>`)
      .join("")}</div>`;
  }
  if (mode === "bignum") {
    return `<div class="pagzly-hl-grid" data-pz-hl-g="bignum" style="display:grid;grid-template-columns:1fr;gap:20px;margin-top:28px;max-width:640px;margin-left:auto;margin-right:auto">${cells
      .map((c, i) => `<div data-pz-hl-c="${i}" style="display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:start;padding:8px 0;text-align:left"><span aria-hidden="true" style="font-size:clamp(2.5rem,10vw,3.5rem);font-weight:900;line-height:.9;letter-spacing:-.06em;color:var(--pz-v5-point,#c45)">${String(i + 1).padStart(2, "0")}</span><div>${c.titleHtml}${c.bodyHtml}</div></div>`)
      .join("")}</div>`;
  }
  if (mode === "timeline") {
    return `<div class="pagzly-hl-grid" data-pz-hl-g="timeline" style="display:flex;flex-direction:column;gap:0;margin-top:28px;max-width:560px;margin-left:auto;margin-right:auto;padding-left:8px;border-left:2px solid color-mix(in srgb,var(--pz-v5-point,#c45) 55%,transparent)">${cells
      .map((c, i) => `<div data-pz-hl-c="${i}" style="display:grid;grid-template-columns:20px 1fr;gap:14px;padding:16px 0;text-align:left"><span aria-hidden="true" style="width:10px;height:10px;border-radius:50%;margin-top:8px;justify-self:center;background:var(--pz-v5-point,#c45)"></span><div>${c.titleHtml}${c.bodyHtml}</div></div>`)
      .join("")}</div>`;
  }
  if (mode === "table") {
    return `<div class="pagzly-hl-grid" data-pz-hl-g="table" style="display:flex;flex-direction:column;gap:0;margin-top:28px;max-width:640px;margin-left:auto;margin-right:auto">${cells
      .map((c, i) => `<div data-pz-hl-c="${i}" style="display:grid;grid-template-columns:1fr;gap:6px;padding:18px 4px;text-align:left;border-bottom:1px solid color-mix(in srgb,var(--pz-v5-ink,#1B1B18) 18%,transparent)">${c.titleHtml}${c.bodyHtml}</div>`)
      .join("")}</div>`;
  }
  if (mode === "rows") {
    return `<div class="pagzly-hl-grid" data-pz-hl-g="rows" style="display:flex;flex-direction:column;gap:0;margin-top:28px;max-width:640px;margin-left:auto;margin-right:auto;font-variant-numeric:tabular-nums">${cells
      .map((c, i) => `<div data-pz-hl-c="${i}" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr);gap:16px;align-items:baseline;padding:14px 0;text-align:left;border-bottom:1px dashed color-mix(in srgb,var(--pz-v5-ink,#1B1B18) 22%,transparent)">${c.titleHtml}${c.bodyHtml}</div>`)
      .join("")}</div>`;
  }
  if (mode === "bento") {
    return `<div class="pagzly-hl-grid" data-pz-hl-g="bento" style="display:grid;grid-template-columns:1.2fr 1fr;gap:12px;margin-top:28px">${cells
      .map((c, i) => `<div data-pz-hl-c="${i}" style="padding:24px 18px;text-align:left;border:2px solid var(--pz-v5-ink,#1B1B18);border-radius:4px;box-shadow:4px 4px 0 var(--pz-v5-point,#c45);${i === 0 && n > 1 ? "grid-row:span 2;background:var(--pz-v5-ink,#1B1B18);color:#faf8f3;" : "background:color-mix(in srgb,var(--pz-v5-surface,#fff) 85%,var(--pz-v5-point,#c45));"}">${num(i)}${c.titleHtml}${c.bodyHtml}</div>`)
      .join("")}</div>`;
  }
  const cols = n === 4 ? 2 : 1;
  return `<div class="pagzly-hl-grid" data-pz-hl-g="grid" style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:16px;margin-top:28px">${cells
    .map((c, i) => `<div data-pz-hl-c="${i}" style="padding:28px 20px;text-align:center;background:var(--pz-v5-surface,#fff);border:1px solid color-mix(in srgb,var(--pz-v5-ink,#1B1B18) 14%,transparent);border-radius:12px">${num(i)}${c.titleHtml}${c.bodyHtml}</div>`)
    .join("")}</div>`;
}

/** 인라인으로 대부분 처리 — CSS는 최소(export 다이어트) */
export function highlightFamilyCssV5(_scope: string, _id: ArchetypeId): string {
  return "";
}
