/**
 * 110차 — 사용 순서 흐름 SVG.
 * steps가 2개 이상일 때만 렌더. 라벨은 입력 텍스트만 사용 (날조·효능 금지).
 */

import { sanitizeText } from "@/lib/cosmetics-compliance";

const EFFICACY =
  /보습|속건|장벽|미백|주름|탄력|임상|개선|효과|치료|완치|처방|24\s*시간/i;

export function sanitizeUsageFlowSteps(steps: string[]): string[] {
  return steps
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const { text, replacements } = sanitizeText(s);
      if (replacements.length > 0) return "";
      if (EFFICACY.test(text)) return "";
      return text;
    })
    .filter(Boolean);
}

/** 입력 부족·컴플라이언스 탈락 시 null → 미렌더 */
export function prepareUsageFlowSteps(steps: string[]): string[] | null {
  const cleaned = sanitizeUsageFlowSteps(steps);
  if (cleaned.length < 2) return null;
  return cleaned.slice(0, 5);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncateLabel(s: string, max = 28): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/**
 * 원형 노드 + 화살표 흐름. 모바일 360px에서도 겹치지 않도록
 * 세로 스택(기본) SVG를 생성한다.
 */
export function buildUsageOrderFlowSvg(
  steps: string[],
  strokeColor: string,
  labelColor: string,
): string {
  const prepared = prepareUsageFlowSteps(steps);
  if (!prepared) return "";

  const nodeR = 14;
  const rowH = 56;
  const leftX = 28;
  const textX = 56;
  const width = 340;
  const height = prepared.length * rowH + 8;

  const nodes = prepared.map((step, i) => {
    const cy = 28 + i * rowH;
    const label = truncateLabel(step);
    const arrow =
      i < prepared.length - 1
        ? `<line x1="${leftX}" y1="${cy + nodeR + 2}" x2="${leftX}" y2="${cy + rowH - nodeR - 2}" stroke="${strokeColor}" stroke-width="1.5" opacity="0.45" marker-end="url(#usage-arrow)"/>`
        : "";
    return `
      <circle cx="${leftX}" cy="${cy}" r="${nodeR}" fill="none" stroke="${strokeColor}" stroke-width="1.8" opacity="0.8"/>
      <text x="${leftX}" y="${cy + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="${strokeColor}">${i + 1}</text>
      <text x="${textX}" y="${cy + 4}" text-anchor="start" font-size="12" fill="${labelColor}">${escapeXml(label)}</text>
      ${arrow}
    `;
  });

  return `<div style="max-width:360px;margin:24px auto 0" data-diagram="usage-order-flow">
    <svg viewBox="0 0 ${width} ${height}" width="100%" style="max-width:360px;height:auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="사용 순서 다이어그램">
      <defs>
        <marker id="usage-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="${strokeColor}" opacity="0.55"/>
        </marker>
      </defs>
      ${nodes.join("")}
    </svg>
  </div>`;
}
