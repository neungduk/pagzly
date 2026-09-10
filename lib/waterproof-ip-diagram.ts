/**
 * 160차 — 방수등급(IP/IPX) 비교 다이어그램.
 * 소음(dB)·용량(mL)·크기(cm)와 같은 "공개 기준표 + 판매자 실측값 + null 폴백" 패턴.
 * 기준점은 IEC 60529 물 침투 보호 등급의 통용 해석(IPX0~IPX8) — 상품별 조사 아님.
 * spec_table에 IP/IPX 값이 파싱될 때만 렌더, 없으면 완전히 생략.
 */

export type WaterproofReferencePoint = { label: string; level: number };

/** IEC 60529 물 보호 등급의 공개 참고 사다리 (고정값) */
export const WATERPROOF_REFERENCE_POINTS: WaterproofReferencePoint[] = [
  { label: "보호 없음", level: 0 },
  { label: "물방울", level: 1 },
  { label: "생활 물튀김", level: 4 },
  { label: "분사수", level: 5 },
  { label: "단기 침수", level: 7 },
  { label: "연속 침수", level: 8 },
];

const WATERPROOF_LABEL_ALIASES = [
  "방수",
  "방수등급",
  "생활방수",
  "ip",
  "ipx",
  "waterproof",
];

const PLACEHOLDER_PATTERNS = ["판매자 확인 필요", "판매자에게 문의", "확인 필요"];

function isPlaceholderValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_PATTERNS.some((p) => trimmed.includes(p));
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, "");
}

function rowLooksLikeWaterproof(label: string): boolean {
  const n = normalizeLabel(label);
  return WATERPROOF_LABEL_ALIASES.some((alias) => {
    const a = normalizeLabel(alias);
    return n === a || n.includes(a) || a.includes(n);
  });
}

/** "IPX5", "IP67", "IPX7 생활방수" 등에서 물 보호 숫자(0~8) 추출 */
export function parseWaterproofIpLevel(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || isPlaceholderValue(trimmed)) return null;
  const ipxy = trimmed.match(/\bip\s*x\s*([0-8])\b/i);
  if (ipxy) {
    const n = Number(ipxy[1]);
    return Number.isFinite(n) ? n : null;
  }
  const ipnn = trimmed.match(/\bip\s*([0-6])\s*([0-8])\b/i);
  if (ipnn) {
    const n = Number(ipnn[2]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export type WaterproofIpMatch = { label: string; value: string; level: number };

export function matchWaterproofIpRow(
  rows: { label: string; value: string }[],
): WaterproofIpMatch | null {
  for (const row of rows) {
    const level = parseWaterproofIpLevel(row.value);
    if (level == null) continue;
    if (rowLooksLikeWaterproof(row.label) || /\bipx?\s*\d/i.test(row.value)) {
      return { label: row.label.trim(), value: row.value.trim(), level };
    }
  }
  return null;
}

export function selectNearbyWaterproofPoints(level: number): WaterproofReferencePoint[] {
  const MIN_GAP = 1;
  const below = [...WATERPROOF_REFERENCE_POINTS]
    .filter((r) => r.level <= level - MIN_GAP)
    .sort((a, b) => b.level - a.level)[0];
  const above = [...WATERPROOF_REFERENCE_POINTS]
    .filter((r) => r.level >= level + MIN_GAP)
    .sort((a, b) => a.level - b.level)[0];
  const picked = [below, above].filter((r): r is WaterproofReferencePoint => Boolean(r));
  if (picked.length > 0) return picked;
  return [...WATERPROOF_REFERENCE_POINTS]
    .filter((r) => Math.abs(r.level - level) >= MIN_GAP)
    .sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level))
    .slice(0, 2)
    .sort((a, b) => a.level - b.level);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildWaterproofIpDiagramSvg(
  level: number,
  productValueLabel: string,
  strokeColor: string,
  labelColor: string,
): string {
  const refs = selectNearbyWaterproofPoints(level);
  if (refs.length === 0) return "";

  const all = [...refs.map((r) => r.level), level];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const pad = Math.max((max - min) * 0.35, 0.8);
  const scaleMin = Math.max(0, min - pad);
  const scaleMax = Math.min(8, max + pad);
  const width = 340;
  const trackX1 = 30;
  const trackX2 = width - 30;
  const trackY = 96;
  const span = Math.max(scaleMax - scaleMin, 1);
  const toX = (v: number) => trackX1 + ((v - scaleMin) / span) * (trackX2 - trackX1);
  const prodX = toX(level);
  const safeLabel =
    productValueLabel.length > 16 ? `${productValueLabel.slice(0, 15)}…` : productValueLabel;

  const refMarks = refs
    .map((r) => {
      const x = toX(r.level);
      return `<g>
        <line x1="${x}" y1="${trackY - 6}" x2="${x}" y2="${trackY + 6}" stroke="${strokeColor}" stroke-width="1.2" opacity="0.5"/>
        <text x="${x}" y="${trackY - 14}" text-anchor="middle" font-size="9" fill="${labelColor}" opacity="0.72">IPX${r.level}</text>
        <text x="${x}" y="${trackY + 24}" text-anchor="middle" font-size="9" fill="${labelColor}" opacity="0.72">${escapeXml(r.label)}</text>
      </g>`;
    })
    .join("");

  return `<div style="margin:32px auto 0;max-width:340px;text-align:center">
    <p style="font-size:11px;letter-spacing:.12em;opacity:.85;margin:0 0 8px;color:${labelColor}">방수 등급 비교</p>
    <svg viewBox="0 0 ${width} 130" width="${width}" height="130" role="img" aria-label="방수 등급 비교 다이어그램">
      <line x1="${trackX1}" y1="${trackY}" x2="${trackX2}" y2="${trackY}" stroke="${strokeColor}" stroke-width="1.2" opacity="0.32"/>
      ${refMarks}
      <circle cx="${prodX}" cy="${trackY}" r="5" fill="${strokeColor}"/>
      <text x="${prodX}" y="${trackY - 14}" text-anchor="middle" font-size="10" font-weight="700" fill="${strokeColor}">IPX${level}</text>
      <text x="${prodX}" y="${trackY + 24}" text-anchor="middle" font-size="10" font-weight="700" fill="${strokeColor}">${escapeXml(safeLabel)}</text>
    </svg>
  </div>`;
}
