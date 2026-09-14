/**
 * 174차 — 다이어그램 정적 아이콘 헬퍼.
 * Recraft는 개발 시점 1회만; 런타임 호출 없음.
 */
import {
  DIAGRAM_ICON_SVGS,
  type DiagramIconId,
} from "@/lib/diagram-icon-assets";

export type { DiagramIconId };

/** currentColor → 실제 토큰 색으로 치환한 SVG 마크업 */
export function tintDiagramIconSvg(id: DiagramIconId, color: string): string {
  const raw = DIAGRAM_ICON_SVGS[id];
  if (!raw) return "";
  return raw
    .replace(/currentColor/g, color)
    .replace(/\bfill-opacity="[^"]*"/gi, "")
    .replace(/\bstroke-opacity="[^"]*"/gi, "");
}

/**
 * 인라인 SVG를 지정 크기·위치로 감싼 `<g>` (다이어그램 내부용).
 * viewBox는 원본 유지, 스케일은 size 기준.
 */
export function diagramIconGroup(
  id: DiagramIconId,
  color: string,
  opts: { x: number; y: number; size: number },
): string {
  const tinted = tintDiagramIconSvg(id, color);
  if (!tinted) return "";
  const viewBoxMatch = tinted.match(/viewBox=["']([^"']+)["']/i);
  const vb = viewBoxMatch?.[1] ?? "0 0 100 100";
  const parts = vb.trim().split(/[\s,]+/).map(Number);
  const vbW = parts[2] || 100;
  const vbH = parts[3] || 100;
  const scale = opts.size / Math.max(vbW, vbH);
  const inner = tinted
    .replace(/^[\s\S]*?<svg\b[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "");
  return `<g transform="translate(${opts.x},${opts.y}) scale(${scale.toFixed(4)})" aria-hidden="true">${inner}</g>`;
}

/** 제목 옆 장식용 작은 인라인 SVG (HTML 래퍼용) */
export function diagramIconImgHtml(
  id: DiagramIconId,
  color: string,
  sizePx = 28,
): string {
  const tinted = tintDiagramIconSvg(id, color);
  if (!tinted) return "";
  // 170차 교훈 — style/url에 넣을 땐 encodeURIComponent. 여기선 인라인 SVG.
  const sized = tinted.replace(
    /<svg\b([^>]*)>/i,
    `<svg$1 width="${sizePx}" height="${sizePx}" style="display:block;flex-shrink:0" aria-hidden="true">`,
  );
  return sized;
}

export function diagramTitleWithIconHtml(
  title: string,
  id: DiagramIconId,
  color: string,
): string {
  const icon = diagramIconImgHtml(id, color, 22);
  return `<p style="font-size:11px;letter-spacing:.12em;opacity:.85;margin:0 0 8px;color:${color};display:flex;align-items:center;justify-content:center;gap:8px">${icon}<span>${title}</span></p>`;
}
