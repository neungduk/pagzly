/** spec_table 크기 비교 다이어그램 — 57차 (패션 size_table과 분리) */

export type SizeComparisonDimension = {
  label: string;
  value: string;
  cm: number;
  kind: "height" | "width" | "diameter";
};

/** 500ml 음료수 캔 기준 (마켓컬리식 크기 비교) */
export const REFERENCE_CAN = {
  label: "500ml 캔",
  heightCm: 12.2,
  diameterCm: 6.6,
} as const;

const PLACEHOLDER_PATTERNS = [
  "판매자 확인 필요",
  "판매자에게 문의",
  "판매자 정책을 확인",
  "확인 필요",
];

const SIZE_LABEL_RULES: Array<{
  kind: SizeComparisonDimension["kind"];
  aliases: string[];
}> = [
  { kind: "height", aliases: ["높이", "세로", "height", "h"] },
  { kind: "width", aliases: ["가로", "너비", "폭", "길이", "width", "w", "깊이", "두께"] },
  { kind: "diameter", aliases: ["지름", "직경", "diameter", "ø"] },
  { kind: "width", aliases: ["사이즈", "크기", "size"] },
];

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, "");
}

function isPlaceholderValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_PATTERNS.some((p) => trimmed.includes(p));
}

/** "16.5cm", "65mm" 등에서 cm 숫자 추출 */
export function parseDimensionCm(value: string): number | null {
  const trimmed = value.trim();
  const match = trimmed.match(/([\d.]+)\s*(cm|mm|m)\b/i);
  if (match) {
    const n = parseFloat(match[1]);
    if (!Number.isFinite(n) || n <= 0) return null;
    const unit = match[2].toLowerCase();
    if (unit === "mm") return n / 10;
    if (unit === "m") return n * 100;
    return n;
  }
  const bare = trimmed.match(/^([\d.]+)$/);
  if (bare) {
    const n = parseFloat(bare[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

function rowMatchesKind(label: string, aliases: string[]): boolean {
  const n = normalizeLabel(label);
  return aliases.some((alias) => {
    const a = normalizeLabel(alias);
    return n === a || n.includes(a) || a.includes(n);
  });
}

/** spec_table rows에서 크기 치수 추출 (플레이스홀더·파싱 실패 제외) */
export function matchSizeComparisonRows(
  rows: { label: string; value: string }[],
): SizeComparisonDimension[] {
  const found: SizeComparisonDimension[] = [];
  const usedKinds = new Set<SizeComparisonDimension["kind"]>();

  for (const rule of SIZE_LABEL_RULES) {
    if (usedKinds.has(rule.kind)) continue;
    const row = rows.find((r) => rowMatchesKind(r.label, rule.aliases));
    if (!row || isPlaceholderValue(row.value)) continue;
    const cm = parseDimensionCm(row.value);
    if (cm == null) continue;
    found.push({
      label: row.label.trim(),
      value: row.value.trim(),
      cm,
      kind: rule.kind,
    });
    usedKinds.add(rule.kind);
  }

  return found;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function capLine(x1: number, y1: number, x2: number, y2: number, color: string): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const cap = 4;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1.4"/>
    <line x1="${x1 + px * cap}" y1="${y1 + py * cap}" x2="${x1 - px * cap}" y2="${y1 - py * cap}" stroke="${color}" stroke-width="1.4"/>
    <line x1="${x2 + px * cap}" y1="${y2 + py * cap}" x2="${x2 - px * cap}" y2="${y2 - py * cap}" stroke="${color}" stroke-width="1.4"/>`;
}

/** export HTML용 인라인 SVG */
export function buildSizeComparisonDiagramSvg(
  dimensions: SizeComparisonDimension[],
  strokeColor: string,
  labelColor: string,
): string {
  if (dimensions.length === 0) return "";

  const heightDim =
    dimensions.find((d) => d.kind === "height") ??
    dimensions.find((d) => d.kind === "width") ??
    dimensions[0]!;
  const widthDim =
    dimensions.find((d) => d.kind === "width" && d !== heightDim) ??
    dimensions.find((d) => d.kind === "diameter");

  const productH = heightDim.cm;
  const productW = widthDim?.kind === "diameter" ? widthDim.cm : (widthDim?.cm ?? productH * 0.55);

  const scale = 9;
  const canH = REFERENCE_CAN.heightCm * scale;
  const canW = REFERENCE_CAN.diameterCm * scale;
  const prodH = Math.min(productH * scale, canH * 1.35);
  const prodW = Math.min(productW * scale, canW * 2.2);

  const canX = 52;
  const canY = 40 + (canH - canH) / 2;
  const prodX = 200;
  const prodY = 40 + (canH - prodH) / 2;

  const arrows = [
    `${capLine(canX - 14, canY, canX - 14, canY + canH, strokeColor)}
     <text x="${canX - 20}" y="${canY + canH / 2}" text-anchor="end" font-size="9" fill="${labelColor}" transform="rotate(-90 ${canX - 20} ${canY + canH / 2})">${REFERENCE_CAN.heightCm}cm</text>`,
    `${capLine(canX, canY + canH + 12, canX + canW, canY + canH + 12, strokeColor)}
     <text x="${canX + canW / 2}" y="${canY + canH + 26}" text-anchor="middle" font-size="9" fill="${labelColor}">${REFERENCE_CAN.diameterCm}cm</text>`,
    `${capLine(prodX + prodW + 12, prodY, prodX + prodW + 12, prodY + prodH, strokeColor)}
     <text x="${prodX + prodW + 22}" y="${prodY + prodH / 2}" text-anchor="start" font-size="9" fill="${labelColor}">${escapeXml(heightDim.value)}</text>`,
  ];

  if (widthDim && widthDim !== heightDim) {
    arrows.push(
      `${capLine(prodX, prodY + prodH + 12, prodX + prodW, prodY + prodH + 12, strokeColor)}
       <text x="${prodX + prodW / 2}" y="${prodY + prodH + 26}" text-anchor="middle" font-size="9" fill="${labelColor}">${escapeXml(widthDim.value)}</text>`,
    );
  }

  return `<div style="max-width:340px;margin:28px auto 0;text-align:center">
    <p style="font-size:11px;letter-spacing:.12em;opacity:.65;margin:0 0 8px">크기 비교 (기준: ${REFERENCE_CAN.label})</p>
    <svg viewBox="0 0 340 200" width="340" height="200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="크기 비교 다이어그램">
      <text x="${canX + canW / 2}" y="24" text-anchor="middle" font-size="10" fill="${labelColor}" opacity="0.7">${REFERENCE_CAN.label}</text>
      <rect x="${canX}" y="${canY}" width="${canW}" height="${canH}" rx="${canW / 2}" fill="none" stroke="${strokeColor}" stroke-width="1.6" opacity="0.55"/>
      <text x="${prodX + prodW / 2}" y="24" text-anchor="middle" font-size="10" fill="${labelColor}" opacity="0.7">제품</text>
      <rect x="${prodX}" y="${prodY}" width="${prodW}" height="${prodH}" rx="6" fill="none" stroke="${strokeColor}" stroke-width="1.6" opacity="0.75"/>
      ${arrows.join("")}
    </svg>
  </div>`;
}
