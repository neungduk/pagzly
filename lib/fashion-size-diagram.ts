/** 패션 size_table — 상의 실루엣 SVG 다이어그램 (55차) */

export type SizeDiagramMatch = {
  key: "shoulder" | "chest" | "length" | "sleeve";
  label: string;
  value: string;
};

const PLACEHOLDER_PATTERNS = [
  "판매자 확인 필요",
  "판매자에게 문의",
  "판매자 정책을 확인",
  "확인 필요",
];

const LABEL_ALIASES: Record<SizeDiagramMatch["key"], string[]> = {
  shoulder: ["어깨너비", "어깨", "shoulder", "shoulderwidth"],
  chest: ["가슴단면", "가슴", "흉단면", "가슴둘레", "chest", "bust"],
  length: ["총장", "기장", "총기장", "bodylength", "length"],
  sleeve: ["소매길이", "소매", "sleeve", "sleevelength"],
};

type ArrowGeom = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lx: number;
  ly: number;
};

const ARROW_GEOM: Record<SizeDiagramMatch["key"], ArrowGeom> = {
  shoulder: { x1: 68, y1: 82, x2: 152, y2: 82, lx: 110, ly: 68 },
  chest: { x1: 64, y1: 118, x2: 156, y2: 118, lx: 110, ly: 104 },
  length: { x1: 110, y1: 78, x2: 110, y2: 252, lx: 128, ly: 165 },
  sleeve: { x1: 58, y1: 118, x2: 38, y2: 86, lx: 24, ly: 100 },
};

export function isFashionCategory(category: string): boolean {
  return category === "의류/패션" || category.includes("패션") || category.includes("의류");
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, "");
}

function isPlaceholderValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_PATTERNS.some((p) => trimmed.includes(p));
}

function rowMatchesKey(label: string, key: SizeDiagramMatch["key"]): boolean {
  const n = normalizeLabel(label);
  return LABEL_ALIASES[key].some((alias) => {
    const a = normalizeLabel(alias);
    return n === a || n.includes(a) || a.includes(n);
  });
}

/** size_table rows에서 다이어그램에 표시할 치수만 추출 (매칭 실패·플레이스홀더 제외) */
export function matchSizeDiagramRows(
  rows: { label: string; value: string }[],
): SizeDiagramMatch[] {
  const matches: SizeDiagramMatch[] = [];
  for (const key of Object.keys(LABEL_ALIASES) as SizeDiagramMatch["key"][]) {
    const row = rows.find((r) => rowMatchesKey(r.label, key));
    if (!row || isPlaceholderValue(row.value)) continue;
    matches.push({ key, label: row.label.trim(), value: row.value.trim() });
  }
  return matches;
}

function capLine(x1: number, y1: number, x2: number, y2: number, color: string): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const cap = 5;
  const c1x = x1 + px * cap;
  const c1y = y1 + py * cap;
  const c2x = x1 - px * cap;
  const c2y = y1 - py * cap;
  const c3x = x2 + px * cap;
  const c3y = y2 + py * cap;
  const c4x = x2 - px * cap;
  const c4y = y2 - py * cap;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1.5"/>
    <line x1="${c1x}" y1="${c1y}" x2="${c2x}" y2="${c2y}" stroke="${color}" stroke-width="1.5"/>
    <line x1="${c3x}" y1="${c3y}" x2="${c4x}" y2="${c4y}" stroke="${color}" stroke-width="1.5"/>`;
}

/** export HTML용 인라인 SVG */
export function buildFashionSizeDiagramSvg(
  matches: SizeDiagramMatch[],
  strokeColor: string,
  labelColor: string,
): string {
  if (matches.length === 0) return "";

  const arrows = matches
    .map((m) => {
      const g = ARROW_GEOM[m.key];
      return `${capLine(g.x1, g.y1, g.x2, g.y2, strokeColor)}
        <text x="${g.lx}" y="${g.ly}" text-anchor="middle" font-size="9" fill="${labelColor}" font-family="system-ui,sans-serif">${escapeXml(m.label)}</text>
        <text x="${g.lx}" y="${g.ly + 11}" text-anchor="middle" font-size="10" font-weight="600" fill="${labelColor}" font-family="system-ui,sans-serif">${escapeXml(m.value)}</text>`;
    })
    .join("");

  return `<div style="max-width:280px;margin:28px auto 0;text-align:center">
    <svg viewBox="0 0 220 300" width="220" height="300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="사이즈 실측 다이어그램">
      <path d="M72 64 L52 84 L36 78 L54 118 L54 258 L166 258 L166 118 L184 78 L168 62 L142 76 L110 68 L78 76 Z" fill="none" stroke="${strokeColor}" stroke-width="1.6" opacity="0.55"/>
      <path d="M52 84 L36 78 L28 72 L38 58 L54 64 Z" fill="none" stroke="${strokeColor}" stroke-width="1.2" opacity="0.4"/>
      <path d="M168 62 L184 78 L192 72 L182 58 L166 64 Z" fill="none" stroke="${strokeColor}" stroke-width="1.2" opacity="0.4"/>
      ${arrows}
    </svg>
  </div>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export { ARROW_GEOM };
