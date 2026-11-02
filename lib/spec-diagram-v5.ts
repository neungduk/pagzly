/**
 * 477차 D — 도식형 스펙: 카테고리 윤곽 5종(옷/가방/병/박스/가전) + 치수선.
 * 숫자는 입력값만. 구조화 수치 없으면 null → 기존 표/카드 폴백. SVG는 스프라이트 `<use>`.
 */
import { useOutline } from "@/lib/svg-sprite-v5";

export type OutlineKind = "garment" | "bag" | "bottle" | "box" | "appliance";

export type DimRow = { label: string; value: string };

const DIM_KEYS = [
  { re: /길이|length|기장|높이|height|총장/i, slot: "h" as const },
  { re: /폭|너비|width|가로|지름|직경/i, slot: "w" as const },
  { re: /무게|weight|용량|용량|ml|g\b|kg/i, slot: "m" as const },
];

export function outlineOfCategory(category: string): OutlineKind {
  const c = category.toLowerCase();
  if (/패션|의류|옷|dress|shirt|wear/.test(c)) return "garment";
  if (/가방|백|bag|pouch/.test(c)) return "bag";
  if (/뷰티|화장품|병|bottle|세럼|스킨|음료|식품|snack|food/.test(c)) return "bottle";
  if (/가전|전자|키보드|tech|전자제품|appliance/.test(c)) return "appliance";
  return "box";
}

/** 구조화 치수 행 추출(입력 라벨·값만). 2개 미만이면 도식 불가 */
export function matchDimRows(rows: DimRow[]): Array<DimRow & { slot: "h" | "w" | "m" }> {
  const out: Array<DimRow & { slot: "h" | "w" | "m" }> = [];
  const used = new Set<string>();
  for (const { re, slot } of DIM_KEYS) {
    const row = rows.find((r) => re.test(r.label) && r.value.trim() && !/확인|문의|필요/.test(r.value));
    if (!row || used.has(slot)) continue;
    used.add(slot);
    out.push({ label: row.label.trim(), value: row.value.trim(), slot });
  }
  return out;
}

const SLOT_GEOM: Record<"h" | "w" | "m", { x1: number; y1: number; x2: number; y2: number; lx: number; ly: number }> = {
  h: { x1: 118, y1: 28, x2: 118, y2: 172, lx: 128, ly: 100 },
  w: { x1: 42, y1: 168, x2: 118, y2: 168, lx: 80, ly: 158 },
  m: { x1: 24, y1: 48, x2: 24, y2: 48, lx: 28, ly: 40 },
};

function dimLine(
  g: { x1: number; y1: number; x2: number; y2: number; lx: number; ly: number },
  value: string,
  color: string,
): string {
  const isPoint = g.x1 === g.x2 && g.y1 === g.y2;
  const line = isPoint
    ? ""
    : `<line x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}" stroke="${color}" stroke-width="1.4"/>` +
      `<line x1="${g.x1 - 4}" y1="${g.y1}" x2="${g.x1 + 4}" y2="${g.y1}" stroke="${color}" stroke-width="1.4"/>` +
      `<line x1="${g.x2 - 4}" y1="${g.y2}" x2="${g.x2 + 4}" y2="${g.y2}" stroke="${color}" stroke-width="1.4"/>`;
  return `${line}<text x="${g.lx}" y="${g.ly}" fill="${color}" font-size="11" font-weight="700">${escapeXml(value)}</text>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * 도식 HTML. dims < 2 이면 null.
 * outline은 스프라이트 use — 페이지당 윤곽 path 1회만 선언.
 */
export function buildSpecDiagramV5(
  category: string,
  rows: DimRow[],
  ink: string,
): string | null {
  const dims = matchDimRows(rows);
  if (dims.length < 2) return null;
  const kind = outlineOfCategory(category);
  const lines = dims.map((d) => dimLine(SLOT_GEOM[d.slot], d.value, ink)).join("");
  return (
    `<div data-pz-specdiag="${kind}" style="display:flex;justify-content:center;padding:8px 0 4px">` +
    `<svg viewBox="0 0 160 190" width="200" height="238" role="img" aria-label="dimensions">` +
    `<g fill="none" stroke="${ink}" stroke-width="1.6">${useOutline(kind)}</g>` +
    lines +
    `</svg></div>`
  );
}
