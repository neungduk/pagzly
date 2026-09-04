/**
 * 113차 — 전자제품 구성품 배치도 (심플 SVG 도형 + 라벨).
 * AI 아이콘 생성 없음. 구성품 목록이 파싱될 때만 렌더.
 */
export type PackageItem = { label: string };

const PLACEHOLDER = /판매자\s*확인|문의|확인\s*필요|미정/;

/**
 * "구성품: 본체, 케이블, 설명서" / bullet / comma 목록 파싱.
 * 2개 미만이면 null.
 */
export function parsePackageContentsList(
  raw: string | null | undefined,
): PackageItem[] | null {
  if (!raw?.trim()) return null;
  let text = raw.trim();
  text = text.replace(/^구성품\s*[:：]?\s*/i, "");
  text = text.replace(/^포함\s*[:：]?\s*/i, "");

  const parts = text
    .split(/[,，、·/|;|\n•·]+/)
    .map((p) => p.replace(/^\d+[.)]\s*/, "").trim())
    .filter((p) => p.length >= 1 && p.length <= 28 && !PLACEHOLDER.test(p));

  const seen = new Set<string>();
  const items: PackageItem[] = [];
  for (const label of parts) {
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ label });
  }
  if (items.length < 2) return null;
  return items.slice(0, 8);
}

export function preparePackageContentsItems(
  sectionBody?: string | null,
  keyFeatures?: string | null,
): PackageItem[] | null {
  return (
    parsePackageContentsList(sectionBody) ??
    parsePackageContentsList(keyFeatures) ??
    null
  );
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 2열 그리드 — 원형 + 라벨 */
export function buildPackageContentsDiagramSvg(
  items: PackageItem[],
  strokeColor: string,
  labelColor: string,
): string {
  if (items.length < 2) return "";

  const cols = 2;
  const cellW = 160;
  const cellH = 72;
  const rows = Math.ceil(items.length / cols);
  const width = cols * cellW + 20;
  const height = rows * cellH + 16;

  const nodes = items
    .map((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = 40 + col * cellW;
      const cy = 36 + row * cellH;
      const label = item.label.length > 14 ? `${item.label.slice(0, 13)}…` : item.label;
      return `
      <circle cx="${cx}" cy="${cy}" r="16" fill="none" stroke="${strokeColor}" stroke-width="1.6" opacity="0.75"/>
      <rect x="${cx - 10}" y="${cy - 10}" width="20" height="20" rx="3" fill="none" stroke="${strokeColor}" stroke-width="1.2" opacity="0.55"/>
      <text x="${cx + 28}" y="${cy + 5}" font-size="12" fill="${labelColor}">${escapeXml(label)}</text>
    `;
    })
    .join("");

  return `<div style="max-width:360px;margin:28px auto 0" data-diagram="package-contents">
    <p style="font-size:11px;letter-spacing:.12em;opacity:.65;margin:0 0 8px;text-align:center">구성품</p>
    <svg viewBox="0 0 ${width} ${height}" width="100%" style="max-width:360px;height:auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="구성품 배치도">
      ${nodes}
    </svg>
  </div>`;
}
