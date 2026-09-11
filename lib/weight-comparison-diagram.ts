/**
 * 162차 — 무게(g/kg) 비교 다이어그램.
 * 158차 소음(dB), 160차 방수(IP) 다이어그램과 같은 "고정 공개 기준표 vs 실측값"
 * 패밀리를 무게 단위로 확장. 무게는 전자/가전·식품·반려동물·생활용품 스펙 표에
 * 가장 흔하게 등장하는 값인데도 이 패턴이 아직 없었음(크롤링으로 확인 — 신용카드
 * ·스마트폰·사과 같은 "체감 무게"를 나란히 놓는 방식은 실제 상세페이지에서 널리 쓰임).
 * 기준점은 상품별 조사가 아니라 널리 통용되는 일반 물건의 평균 무게를 고정값으로
 * 사용한다(지어내기 아님). spec_table에 실제 무게 값이 있을 때만 렌더, 없으면 생략.
 */

export type WeightReferencePoint = { label: string; g: number };

/** 공개적으로 통용되는 일반 무게 참고표 — 상품·판매자 입력과 무관하게 고정 사용 */
export const WEIGHT_REFERENCE_POINTS: WeightReferencePoint[] = [
  { label: "신용카드 1장", g: 5 },
  { label: "계란 1개", g: 60 },
  { label: "사과 1개", g: 200 },
  { label: "우유 1L", g: 1000 },
  { label: "노트북 1대", g: 1500 },
  { label: "쌀 5kg", g: 5000 },
];

const WEIGHT_LABEL_ALIASES = [
  "무게",
  "중량",
  "제품중량",
  "제품무게",
  "본체무게",
  "총중량",
  "순중량",
  "weight",
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

function rowLooksLikeWeight(label: string): boolean {
  const n = normalizeLabel(label);
  return WEIGHT_LABEL_ALIASES.some((alias) => {
    const a = normalizeLabel(alias);
    return n === a || n.includes(a) || a.includes(n);
  });
}

/** "150g", "1.5kg", "1,500g", "500 g 내외" 등에서 첫 숫자를 g 단위로 추출 */
export function parseWeightG(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || isPlaceholderValue(trimmed)) return null;

  const kgMatch = trimmed.match(/([\d,.]+)\s*kg\b/i);
  if (kgMatch) {
    const n = parseFloat(kgMatch[1]!.replace(/,/g, ""));
    return Number.isFinite(n) && n > 0 && n <= 200 ? n * 1000 : null;
  }

  const gMatch = trimmed.match(/([\d,.]+)\s*g\b/i);
  if (gMatch) {
    const n = parseFloat(gMatch[1]!.replace(/,/g, ""));
    return Number.isFinite(n) && n > 0 && n <= 200000 ? n : null;
  }

  return null;
}

export type WeightComparisonMatch = { label: string; value: string; g: number };

/** spec_table rows에서 무게 스펙 행을 찾는다. 없으면 null(다이어그램 생략). */
export function matchWeightComparisonRow(
  rows: { label: string; value: string }[],
): WeightComparisonMatch | null {
  for (const row of rows) {
    if (!rowLooksLikeWeight(row.label)) continue;
    const g = parseWeightG(row.value);
    if (g == null) continue;
    return { label: row.label.trim(), value: row.value.trim(), g };
  }
  return null;
}

/**
 * productG를 사이에 두는 기준점을 아래·위 하나씩 선택. 무게는 수십 g~수 kg까지
 * 범위가 넓어 절대값 차이가 아니라 "비율" 기준으로 최소 간격을 둔다(라벨 겹침 방지).
 * 양쪽 다 없으면(범위 밖) 최근접 기준점 최대 2개로 대체.
 */
export function selectNearbyReferencePoints(productG: number): WeightReferencePoint[] {
  const MIN_RATIO = 1.4;
  const below = [...WEIGHT_REFERENCE_POINTS]
    .filter((r) => r.g <= productG / MIN_RATIO)
    .sort((a, b) => b.g - a.g)[0];
  const above = [...WEIGHT_REFERENCE_POINTS]
    .filter((r) => r.g >= productG * MIN_RATIO)
    .sort((a, b) => a.g - b.g)[0];
  const picked = [below, above].filter((r): r is WeightReferencePoint => Boolean(r));
  if (picked.length > 0) return picked;

  return [...WEIGHT_REFERENCE_POINTS]
    .filter((r) => Math.max(r.g, productG) / Math.min(r.g, productG) >= MIN_RATIO)
    .sort((a, b) => {
      const da = Math.max(a.g, productG) / Math.min(a.g, productG);
      const db = Math.max(b.g, productG) / Math.min(b.g, productG);
      return da - db;
    })
    .slice(0, 2)
    .sort((a, b) => a.g - b.g);
}

/** 300g 미만은 g로, 이상은 kg 1자리로 표기 (예: 1500g → 1.5kg) */
export function formatWeightLabel(g: number): string {
  if (g < 1000) return `${Math.round(g)}g`;
  const kg = g / 1000;
  return `${kg % 1 === 0 ? kg.toFixed(0) : kg.toFixed(1)}kg`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** export HTML용 인라인 SVG — 가로 눈금 위에 기준점 + 제품 무게를 함께 표시 */
export function buildWeightComparisonDiagramSvg(
  productG: number,
  productValueLabel: string,
  strokeColor: string,
  labelColor: string,
): string {
  const refs = selectNearbyReferencePoints(productG);
  if (refs.length === 0) return "";

  const allG = [...refs.map((r) => r.g), productG];
  const min = Math.min(...allG);
  const max = Math.max(...allG);
  const pad = Math.max((max - min) * 0.22, Math.max(min * 0.08, 3));
  const scaleMin = Math.max(0, min - pad);
  const scaleMax = max + pad;

  const width = 340;
  const trackX1 = 30;
  const trackX2 = width - 30;
  const trackY = 96;
  const span = Math.max(scaleMax - scaleMin, 1);
  const toX = (g: number) => trackX1 + ((g - scaleMin) / span) * (trackX2 - trackX1);

  const refMarks = refs
    .map(
      (r) => `
      <line x1="${toX(r.g)}" y1="${trackY - 6}" x2="${toX(r.g)}" y2="${trackY + 6}" stroke="${strokeColor}" stroke-width="1.2" opacity="0.5"/>
      <text x="${toX(r.g)}" y="${trackY - 14}" text-anchor="middle" font-size="9" fill="${labelColor}" opacity="0.72">${escapeXml(formatWeightLabel(r.g))}</text>
      <text x="${toX(r.g)}" y="${trackY + 24}" text-anchor="middle" font-size="9" fill="${labelColor}" opacity="0.72">${escapeXml(r.label)}</text>
    `,
    )
    .join("");

  const prodX = toX(productG);
  const safeLabel =
    productValueLabel.length > 16 ? `${productValueLabel.slice(0, 15)}…` : productValueLabel;

  return `<div style="max-width:340px;margin:28px auto 0;text-align:center">
    <p style="font-size:11px;letter-spacing:.12em;opacity:.85;margin:0 0 12px;color:${labelColor}">무게 비교</p>
    <svg viewBox="0 0 ${width} 130" width="100%" style="max-width:340px;height:auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="무게 비교 다이어그램">
      <line x1="${trackX1}" y1="${trackY}" x2="${trackX2}" y2="${trackY}" stroke="${strokeColor}" stroke-width="1.2" opacity="0.32"/>
      ${refMarks}
      <circle cx="${prodX}" cy="${trackY}" r="5" fill="${strokeColor}"/>
      <text x="${prodX}" y="${trackY - 14}" text-anchor="middle" font-size="10" font-weight="700" fill="${strokeColor}">${escapeXml(formatWeightLabel(productG))}</text>
      <text x="${prodX}" y="${trackY + 24}" text-anchor="middle" font-size="10" font-weight="700" fill="${strokeColor}">${escapeXml(safeLabel)}</text>
    </svg>
  </div>`;
}
