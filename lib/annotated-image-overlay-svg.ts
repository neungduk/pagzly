/**
 * 223차 — export HTML에서 layout:"annotated" 섹션의 부품/기능 포인트 라벨
 * (components/AnnotatedImageOverlay.tsx, Vision API 생성 유료 콘텐츠)이 완전히
 * 누락돼 있던 것을 발견·추가. 기하 로직(clampPct/leaderEnd)은 원본과 100% 동일.
 */

export type ExportImageAnnotation = { label: string; xPct: number; yPct: number };

export function clampPct(n: number): number {
  return Math.min(100, Math.max(0, n));
}

export function leaderEnd(
  xPct: number,
  yPct: number,
): { x: number; y: number; side: "left" | "right" } {
  const toLeft = xPct;
  const toRight = 100 - xPct;
  if (toLeft >= toRight) {
    return { x: clampPct(xPct - Math.min(18, toLeft * 0.35)), y: yPct, side: "left" };
  }
  return { x: clampPct(xPct + Math.min(18, toRight * 0.35)), y: yPct, side: "right" };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** layout:"annotated" 섹션의 이미지 위 부품/기능 포인트 라벨 오버레이 (export용 정적 버전) */
export function buildAnnotatedImageOverlaySvg(
  annotations: ExportImageAnnotation[],
  strokeColor: string,
): string {
  if (!Array.isArray(annotations) || annotations.length === 0) return "";

  const dots = annotations
    .map((ann) => {
      const end = leaderEnd(ann.xPct, ann.yPct);
      return `<g>
        <circle cx="${ann.xPct}" cy="${ann.yPct}" r="1.1" fill="${strokeColor}" opacity="0.9"/>
        <circle cx="${ann.xPct}" cy="${ann.yPct}" r="2.2" fill="none" stroke="${strokeColor}" stroke-width="0.35" opacity="0.55"/>
        <line x1="${ann.xPct}" y1="${ann.yPct}" x2="${end.x}" y2="${end.y}" stroke="${strokeColor}" stroke-width="0.35" opacity="0.75"/>
      </g>`;
    })
    .join("");

  const labels = annotations
    .map((ann) => {
      const end = leaderEnd(ann.xPct, ann.yPct);
      const labelX = end.side === "left" ? end.x - 1 : end.x + 1;
      const transform =
        end.side === "left" ? "translate(-100%, -50%)" : "translate(0, -50%)";
      return `<span style="position:absolute;left:${labelX}%;top:${end.y}%;transform:${transform};max-width:38%;border-radius:9999px;padding:5px 10px;font-size:11px;font-weight:600;line-height:1.25;color:#FAF8F3;background:${strokeColor};box-shadow:0 1px 3px rgba(0,0,0,.15);white-space:normal">${escapeXml(ann.label)}</span>`;
    })
    .join("");

  return `<div style="position:absolute;inset:0;pointer-events:none" aria-hidden="true">
    <svg style="position:absolute;inset:0;width:100%;height:100%" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="제품 부품 주석">
      ${dots}
    </svg>
    ${labels}
  </div>`;
}
