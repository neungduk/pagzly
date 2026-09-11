/**
 * 163차 — 소비전력(W) 비교 다이어그램.
 * 158차 소음(dB), 160차 방수(IP), 162차 무게(g/kg)와 같은
 * "고정 공개 기준표 vs 실측값" 패밀리를 소비전력 단위로 확장.
 * 크롤링 근거: 다나와 DPG("가전제품별 소비전력 알아보기"), catchgam.com
 * ("가전제품별 전력소비량 비교표") 등 국내 소비자 콘텐츠에서 "이 가전이 헤어드라이어
 * ·전자레인지·에어컨과 비교해 전력을 얼마나 쓰는가"를 나란히 놓는 방식이 이미
 * 널리 쓰이는 소비자 교육 포맷임을 확인 — spec_table에 "소비전력/정격전력" 값이
 * 있는데도 비교 시각화가 전혀 없는 것이 전자/가전 카테고리의 구체적 공백이었음.
 * 기준점은 상품별 조사가 아니라 널리 알려진 일반 가전의 평균 소비전력을 고정값으로
 * 사용한다(지어내기 아님). spec_table에 실제 소비전력 값이 있을 때만 렌더, 없으면 생략.
 */

export type PowerReferencePoint = { label: string; w: number };

/** 공개적으로 통용되는 일반 가전 소비전력 참고표 — 상품·판매자 입력과 무관하게 고정 사용 */
export const POWER_REFERENCE_POINTS: PowerReferencePoint[] = [
  { label: "LED 전구 1개", w: 10 },
  { label: "스마트폰 충전기", w: 20 },
  { label: "노트북 어댑터", w: 65 },
  { label: "전자레인지", w: 700 },
  { label: "헤어드라이어", w: 1200 },
  { label: "에어컨(냉방 시)", w: 1500 },
];

const POWER_LABEL_ALIASES = [
  "소비전력",
  "정격소비전력",
  "전력소비",
  "소비전력량",
  "정격전력",
  "정격입력",
  "전력",
  "출력",
  "wattage",
  "power consumption",
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

function rowLooksLikePower(label: string): boolean {
  const n = normalizeLabel(label);
  return POWER_LABEL_ALIASES.some((alias) => {
    const a = normalizeLabel(alias);
    return n === a || n.includes(a) || a.includes(n);
  });
}

/** "1200W", "1.2kW", "1,200W", "700W(고출력 시 1000W)" 등에서 첫 숫자를 W 단위로 추출 */
export function parsePowerW(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || isPlaceholderValue(trimmed)) return null;

  const kwMatch = trimmed.match(/([\d,.]+)\s*kw\b/i);
  if (kwMatch) {
    const n = parseFloat(kwMatch[1]!.replace(/,/g, ""));
    return Number.isFinite(n) && n > 0 && n <= 30 ? n * 1000 : null;
  }

  const wMatch = trimmed.match(/([\d,.]+)\s*w\b/i);
  if (wMatch) {
    const n = parseFloat(wMatch[1]!.replace(/,/g, ""));
    return Number.isFinite(n) && n > 0 && n <= 30000 ? n : null;
  }

  return null;
}

export type PowerComparisonMatch = { label: string; value: string; w: number };

/** spec_table rows에서 소비전력 스펙 행을 찾는다. 없으면 null(다이어그램 생략). */
export function matchPowerComparisonRow(
  rows: { label: string; value: string }[],
): PowerComparisonMatch | null {
  for (const row of rows) {
    if (!rowLooksLikePower(row.label)) continue;
    const w = parsePowerW(row.value);
    if (w == null) continue;
    return { label: row.label.trim(), value: row.value.trim(), w };
  }
  return null;
}

/**
 * productW를 사이에 두는 기준점을 아래·위 하나씩 선택. 소비전력은 10W~수천W까지
 * 범위가 넓어(무게와 동일한 이유) 절대값 차이가 아니라 "비율" 기준으로 최소 간격을 둔다.
 * 양쪽 다 없으면(범위 밖) 최근접 기준점 최대 2개로 대체.
 */
export function selectNearbyPowerReferencePoints(productW: number): PowerReferencePoint[] {
  const MIN_RATIO = 1.4;
  const below = [...POWER_REFERENCE_POINTS]
    .filter((r) => r.w <= productW / MIN_RATIO)
    .sort((a, b) => b.w - a.w)[0];
  const above = [...POWER_REFERENCE_POINTS]
    .filter((r) => r.w >= productW * MIN_RATIO)
    .sort((a, b) => a.w - b.w)[0];
  const picked = [below, above].filter((r): r is PowerReferencePoint => Boolean(r));
  if (picked.length > 0) return picked;

  return [...POWER_REFERENCE_POINTS]
    .filter((r) => Math.max(r.w, productW) / Math.min(r.w, productW) >= MIN_RATIO)
    .sort((a, b) => {
      const da = Math.max(a.w, productW) / Math.min(a.w, productW);
      const db = Math.max(b.w, productW) / Math.min(b.w, productW);
      return da - db;
    })
    .slice(0, 2)
    .sort((a, b) => a.w - b.w);
}

/** 1000W 미만은 W로, 이상은 kW 1자리로 표기 (예: 1500W → 1.5kW) */
export function formatPowerLabel(w: number): string {
  if (w < 1000) return `${Math.round(w)}W`;
  const kw = w / 1000;
  return `${kw % 1 === 0 ? kw.toFixed(0) : kw.toFixed(1)}kW`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** export HTML용 인라인 SVG — 가로 눈금 위에 기준점 + 제품 소비전력을 함께 표시 */
export function buildPowerConsumptionDiagramSvg(
  productW: number,
  productValueLabel: string,
  strokeColor: string,
  labelColor: string,
): string {
  const refs = selectNearbyPowerReferencePoints(productW);
  if (refs.length === 0) return "";

  const allW = [...refs.map((r) => r.w), productW];
  const min = Math.min(...allW);
  const max = Math.max(...allW);
  const pad = Math.max((max - min) * 0.22, Math.max(min * 0.08, 3));
  const scaleMin = Math.max(0, min - pad);
  const scaleMax = max + pad;

  const width = 340;
  const trackX1 = 30;
  const trackX2 = width - 30;
  const trackY = 96;
  const span = Math.max(scaleMax - scaleMin, 1);
  const toX = (w: number) => trackX1 + ((w - scaleMin) / span) * (trackX2 - trackX1);

  const refMarks = refs
    .map(
      (r) => `
      <line x1="${toX(r.w)}" y1="${trackY - 6}" x2="${toX(r.w)}" y2="${trackY + 6}" stroke="${strokeColor}" stroke-width="1.2" opacity="0.5"/>
      <text x="${toX(r.w)}" y="${trackY - 14}" text-anchor="middle" font-size="9" fill="${labelColor}" opacity="0.72">${escapeXml(formatPowerLabel(r.w))}</text>
      <text x="${toX(r.w)}" y="${trackY + 24}" text-anchor="middle" font-size="9" fill="${labelColor}" opacity="0.72">${escapeXml(r.label)}</text>
    `,
    )
    .join("");

  const prodX = toX(productW);
  const safeLabel =
    productValueLabel.length > 16 ? `${productValueLabel.slice(0, 15)}…` : productValueLabel;

  return `<div style="max-width:340px;margin:28px auto 0;text-align:center">
    <p style="font-size:11px;letter-spacing:.12em;opacity:.85;margin:0 0 12px;color:${labelColor}">소비전력 비교</p>
    <svg viewBox="0 0 ${width} 130" width="100%" style="max-width:340px;height:auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="소비전력 비교 다이어그램">
      <line x1="${trackX1}" y1="${trackY}" x2="${trackX2}" y2="${trackY}" stroke="${strokeColor}" stroke-width="1.2" opacity="0.32"/>
      ${refMarks}
      <circle cx="${prodX}" cy="${trackY}" r="5" fill="${strokeColor}"/>
      <text x="${prodX}" y="${trackY - 14}" text-anchor="middle" font-size="10" font-weight="700" fill="${strokeColor}">${escapeXml(formatPowerLabel(productW))}</text>
      <text x="${prodX}" y="${trackY + 24}" text-anchor="middle" font-size="10" font-weight="700" fill="${strokeColor}">${escapeXml(safeLabel)}</text>
    </svg>
  </div>`;
}
