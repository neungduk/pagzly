/**
 * 110차 — 화장품 용량 비교 SVG (병 실루엣).
 * 판매자 입력 용량이 있을 때만 렌더. 효능·임상 수치 금지.
 */

import { sanitizeText } from "@/lib/cosmetics-compliance";

export type VolumeComparisonEntry = {
  label: string;
  ml: number;
  isProduct: boolean;
};

/** 일반 규격 참조 — 경쟁 브랜드명 금지, 고정 화이트리스트만 */
export const REFERENCE_VOLUME_ML = 100;

const VOLUME_LABEL_ALIASES = ["용량", "내용량", "규격", "용량ml", "volume", "net"];

const PLACEHOLDER_PATTERNS = [
  "판매자 확인 필요",
  "판매자에게 문의",
  "확인 필요",
];

function isPlaceholder(value: string): boolean {
  const t = value.trim();
  if (!t) return true;
  return PLACEHOLDER_PATTERNS.some((p) => t.includes(p));
}

/** "35mL", "35 ml", "35밀리리터" 등 */
export function parseVolumeMl(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || isPlaceholder(trimmed)) return null;

  const mlMatch = trimmed.match(/([\d.]+)\s*(ml|mℓ|밀리리터)\b/i);
  if (mlMatch) {
    const n = parseFloat(mlMatch[1]!);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  const lMatch = trimmed.match(/([\d.]+)\s*(l|리터)\b/i);
  if (lMatch) {
    const n = parseFloat(lMatch[1]!);
    return Number.isFinite(n) && n > 0 ? n * 1000 : null;
  }

  // "용량 35"처럼 숫자만 — 단위가 라벨에 있을 때 대비
  const bare = trimmed.match(/^([\d.]+)$/);
  if (bare) {
    const n = parseFloat(bare[1]!);
    return Number.isFinite(n) && n > 0 && n <= 2000 ? n : null;
  }
  return null;
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, "");
}

function rowLooksLikeVolume(label: string): boolean {
  const n = normalizeLabel(label);
  return VOLUME_LABEL_ALIASES.some((a) => {
    const alias = normalizeLabel(a);
    return n === alias || n.includes(alias) || alias.includes(n);
  });
}

/** productSizeHint 예: "35mL, 높이 약 9cm" */
export function parseVolumeMlFromSizeHint(hint: string | null | undefined): number | null {
  if (!hint?.trim()) return null;
  return parseVolumeMl(hint) ?? (() => {
    const m = hint.match(/([\d.]+)\s*(ml|mℓ)/i);
    if (!m) return null;
    const n = parseFloat(m[1]!);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();
}

/**
 * spec_table rows 또는 size hint에서 제품 용량 추출.
 * 없으면 null → 다이어그램 미렌더.
 */
export function matchProductVolumeMl(
  rows: { label: string; value: string }[],
  sizeHint?: string | null,
): number | null {
  for (const row of rows) {
    if (!rowLooksLikeVolume(row.label)) continue;
    const ml = parseVolumeMl(row.value);
    if (ml != null) return ml;
  }
  // 라벨이 애매해도 값에 ml이 있으면 채택
  for (const row of rows) {
    if (isPlaceholder(row.value)) continue;
    if (/ml|mℓ|밀리리터/i.test(row.value)) {
      const ml = parseVolumeMl(row.value);
      if (ml != null) return ml;
    }
  }
  return parseVolumeMlFromSizeHint(sizeHint);
}

/**
 * 용량 비교 엔트리 구성. 제품 용량이 없으면 null.
 * 참조는 항상 REFERENCE_VOLUME_ML (일반 규격).
 */
export function buildVolumeComparisonEntries(
  productMl: number | null,
  productLabel = "이 제품",
): VolumeComparisonEntry[] | null {
  if (productMl == null || productMl <= 0) return null;
  const productSafe = sanitizeText(`${productLabel} ${productMl}mL`).text;
  if (!productSafe.trim()) return null;

  return [
    {
      label: `일반 ${REFERENCE_VOLUME_ML}mL`,
      ml: REFERENCE_VOLUME_ML,
      isProduct: false,
    },
    {
      label: `${productLabel} ${productMl}mL`,
      ml: productMl,
      isProduct: true,
    },
  ];
}

/** 효능·임상 문구가 라벨에 섞이면 필터 (compliance + 휴리스틱) */
export function filterVolumeLabelsForCompliance(
  entries: VolumeComparisonEntry[],
): VolumeComparisonEntry[] | null {
  const cleaned: VolumeComparisonEntry[] = [];
  for (const e of entries) {
    const sanitized = sanitizeText(e.label).text.trim();
    if (!sanitized) continue;
    if (sanitizeText(e.label).replacements.length > 0) continue;
    if (/보습|미백|주름|임상|개선|효능|장벽|속건조|24시간/i.test(sanitized)) {
      continue;
    }
    cleaned.push({ ...e, label: sanitized });
  }
  return cleaned.length >= 2 ? cleaned : null;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 병 실루엣 path (단순 보틀) — viewBox 로컬 좌표 */
function bottlePath(x: number, y: number, w: number, h: number): string {
  const neckW = w * 0.32;
  const neckH = h * 0.14;
  const shoulder = h * 0.08;
  const cx = x + w / 2;
  const bodyTop = y + neckH + shoulder;
  const bodyH = h - neckH - shoulder;
  return [
    `M ${cx - neckW / 2} ${y}`,
    `h ${neckW}`,
    `v ${neckH}`,
    `L ${x + w} ${bodyTop}`,
    `v ${bodyH}`,
    `q 0 ${w * 0.12} ${-w / 2} ${w * 0.12}`,
    `q ${-w / 2} 0 ${-w / 2} ${-w * 0.12}`,
    `V ${bodyTop}`,
    `Z`,
  ].join(" ");
}

export function buildVolumeComparisonDiagramSvg(
  entries: VolumeComparisonEntry[],
  strokeColor: string,
  labelColor: string,
): string {
  const safe = filterVolumeLabelsForCompliance(entries);
  if (!safe || safe.length < 2) return "";

  const maxMl = Math.max(...safe.map((e) => e.ml));
  const maxH = 120;
  const bottleW = 44;
  const gap = 72;
  const startX = 48;
  const baseY = 160;

  const bottles = safe.map((e, i) => {
    const h = Math.max(28, (e.ml / maxMl) * maxH);
    const x = startX + i * (bottleW + gap);
    const y = baseY - h;
    const opacity = e.isProduct ? 0.85 : 0.45;
    const strokeW = e.isProduct ? 2 : 1.4;
    return `
      <text x="${x + bottleW / 2}" y="${y - 10}" text-anchor="middle" font-size="10" fill="${labelColor}" opacity="0.85">${escapeXml(e.label)}</text>
      <path d="${bottlePath(x, y, bottleW, h)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeW}" opacity="${opacity}"/>
      <text x="${x + bottleW / 2}" y="${baseY + 18}" text-anchor="middle" font-size="11" fill="${labelColor}" font-weight="${e.isProduct ? 700 : 500}">${e.ml}mL</text>
    `;
  });

  const width = startX * 2 + safe.length * bottleW + (safe.length - 1) * gap;

  return `<div style="max-width:360px;margin:28px auto 0;text-align:center" data-diagram="volume-comparison">
    <p style="font-size:11px;letter-spacing:.12em;opacity:.65;margin:0 0 8px">용량 비교 (기준: 일반 ${REFERENCE_VOLUME_ML}mL)</p>
    <svg viewBox="0 0 ${width} 190" width="100%" style="max-width:360px;height:auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="용량 비교 다이어그램">
      ${bottles.join("")}
    </svg>
  </div>`;
}
