/**
 * 158차 — 소음(dB) 비교 다이어그램.
 * 코웨이 공기청정기 등 실사이트 상세페이지에서 확인된 "익숙한 소리 기준점(나뭇잎
 * 스치는 소리 20dB, 속삭임 30dB, 도서관 40dB, 대화 50dB …) 사이에 제품의 실제
 * 소음 수치를 배치해 체감시키는" 패턴을 카테고리 무관 spec_table 공통 기능으로 일반화.
 * REFERENCE_CAN(용기)·REFERENCE_VOLUME_ML과 같은 성격 — 기준점은 상품별 조사가
 * 아니라 공개적으로 널리 쓰이는 일반 소음 참고표를 고정값으로 사용한다(지어내기 아님).
 * spec_table에 실제 dB 값이 있을 때만 렌더, 없으면 완전히 생략.
 */

export type NoiseReferencePoint = { label: string; db: number };

/** 공개적으로 통용되는 일반 소음 참고표 — 상품·판매자 입력과 무관하게 고정 사용 */
export const NOISE_REFERENCE_POINTS: NoiseReferencePoint[] = [
  { label: "나뭇잎 스치는 소리", db: 20 },
  { label: "속삭이는 소리", db: 30 },
  { label: "조용한 사무실", db: 40 },
  { label: "일상 대화 소리", db: 50 },
  { label: "진공청소기 소음", db: 70 },
  { label: "지하철 소음", db: 80 },
];

const NOISE_LABEL_ALIASES = ["소음", "소음도", "소음레벨", "소음수준", "데시벨", "db", "noise"];

const PLACEHOLDER_PATTERNS = [
  "판매자 확인 필요",
  "판매자에게 문의",
  "확인 필요",
];

function isPlaceholderValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_PATTERNS.some((p) => trimmed.includes(p));
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, "");
}

function rowLooksLikeNoise(label: string): boolean {
  const n = normalizeLabel(label);
  return NOISE_LABEL_ALIASES.some((alias) => {
    const a = normalizeLabel(alias);
    return n === a || n.includes(a) || a.includes(n);
  });
}

/** "45dB", "38 db", "23~47dB 이하" 등에서 첫 숫자를 dB 값으로 추출 */
export function parseNoiseDb(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || isPlaceholderValue(trimmed)) return null;
  const match = trimmed.match(/([\d.]+)\s*(db|데시벨)\b/i);
  if (!match) return null;
  const n = parseFloat(match[1]!);
  if (!Number.isFinite(n) || n <= 0 || n > 120) return null;
  return n;
}

export type NoiseComparisonMatch = { label: string; value: string; db: number };

/** spec_table rows에서 소음 스펙 행을 찾는다. 없으면 null(다이어그램 생략). */
export function matchNoiseComparisonRow(
  rows: { label: string; value: string }[],
): NoiseComparisonMatch | null {
  for (const row of rows) {
    if (!rowLooksLikeNoise(row.label)) continue;
    const db = parseNoiseDb(row.value);
    if (db == null) continue;
    return { label: row.label.trim(), value: row.value.trim(), db };
  }
  return null;
}

/**
 * productDb를 사이에 두는 기준점을 아래·위 하나씩 선택(3dB 미만 차이는 라벨이
 * 겹치므로 제외). 양쪽 다 없으면(범위 밖) 최근접 기준점 최대 2개로 대체.
 */
export function selectNearbyReferencePoints(productDb: number): NoiseReferencePoint[] {
  const MIN_GAP = 3;
  const below = [...NOISE_REFERENCE_POINTS]
    .filter((r) => r.db <= productDb - MIN_GAP)
    .sort((a, b) => b.db - a.db)[0];
  const above = [...NOISE_REFERENCE_POINTS]
    .filter((r) => r.db >= productDb + MIN_GAP)
    .sort((a, b) => a.db - b.db)[0];
  const picked = [below, above].filter((r): r is NoiseReferencePoint => Boolean(r));
  if (picked.length > 0) return picked;

  return [...NOISE_REFERENCE_POINTS]
    .filter((r) => Math.abs(r.db - productDb) >= MIN_GAP)
    .sort((a, b) => Math.abs(a.db - productDb) - Math.abs(b.db - productDb))
    .slice(0, 2)
    .sort((a, b) => a.db - b.db);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** export HTML용 인라인 SVG — 가로 눈금 위에 기준점 + 제품 수치를 함께 표시 */
export function buildNoiseComparisonDiagramSvg(
  productDb: number,
  productValueLabel: string,
  strokeColor: string,
  labelColor: string,
): string {
  const refs = selectNearbyReferencePoints(productDb);
  if (refs.length === 0) return "";

  const allDb = [...refs.map((r) => r.db), productDb];
  const min = Math.min(...allDb);
  const max = Math.max(...allDb);
  const pad = Math.max((max - min) * 0.22, 5);
  const scaleMin = Math.max(0, min - pad);
  const scaleMax = max + pad;

  const width = 340;
  const trackX1 = 30;
  const trackX2 = width - 30;
  const trackY = 96;
  const span = Math.max(scaleMax - scaleMin, 1);
  const toX = (db: number) => trackX1 + ((db - scaleMin) / span) * (trackX2 - trackX1);

  const refMarks = refs
    .map(
      (r) => `
      <line x1="${toX(r.db)}" y1="${trackY - 6}" x2="${toX(r.db)}" y2="${trackY + 6}" stroke="${strokeColor}" stroke-width="1.2" opacity="0.5"/>
      <text x="${toX(r.db)}" y="${trackY - 14}" text-anchor="middle" font-size="9" fill="${labelColor}" opacity="0.72">${r.db}dB</text>
      <text x="${toX(r.db)}" y="${trackY + 24}" text-anchor="middle" font-size="9" fill="${labelColor}" opacity="0.72">${escapeXml(r.label)}</text>
    `,
    )
    .join("");

  const prodX = toX(productDb);
  const safeLabel =
    productValueLabel.length > 16 ? `${productValueLabel.slice(0, 15)}…` : productValueLabel;

  return `<div style="max-width:340px;margin:28px auto 0;text-align:center">
    <p style="font-size:11px;letter-spacing:.12em;opacity:.85;margin:0 0 12px;color:${labelColor}">소음 비교</p>
    <svg viewBox="0 0 ${width} 130" width="100%" style="max-width:340px;height:auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="소음 비교 다이어그램">
      <line x1="${trackX1}" y1="${trackY}" x2="${trackX2}" y2="${trackY}" stroke="${strokeColor}" stroke-width="1.2" opacity="0.32"/>
      ${refMarks}
      <circle cx="${prodX}" cy="${trackY}" r="5" fill="${strokeColor}"/>
      <text x="${prodX}" y="${trackY - 14}" text-anchor="middle" font-size="10" font-weight="700" fill="${strokeColor}">${productDb}dB</text>
      <text x="${prodX}" y="${trackY + 24}" text-anchor="middle" font-size="10" font-weight="700" fill="${strokeColor}">${escapeXml(safeLabel)}</text>
    </svg>
  </div>`;
}
