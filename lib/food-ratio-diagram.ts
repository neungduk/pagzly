/**
 * 113차 — 식품 원재료 구성 비율 (도넛 SVG).
 * 입력에 name+percent가 있을 때만. 예시 수치 채우기 금지.
 */
import { sanitizeText as sanitizeFoodText } from "@/lib/food-compliance";

export type FoodRatioSlice = {
  label: string;
  percent: number;
};

const EFFICACY =
  /치료|완치|예방|면역|항암|다이어트|체중\s*감량|효능|임상/i;

/** "귀리 40%, 견과 25%, 기타 35%" / "귀리:40%" 등 */
export function parseFoodRatioSlices(raw: string | null | undefined): FoodRatioSlice[] | null {
  if (!raw?.trim()) return null;
  const text = raw.trim();
  const slices: FoodRatioSlice[] = [];
  const re =
    /([가-힣A-Za-z0-9][가-힣A-Za-z0-9\s·-]{0,24}?)\s*[:：]?\s*([\d.]+)\s*%/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const label = m[1]!.trim().replace(/[,，、]$/, "");
    const percent = parseFloat(m[2]!);
    if (!label || !Number.isFinite(percent) || percent <= 0 || percent > 100) continue;
    if (EFFICACY.test(label)) continue;
    const cleaned = sanitizeFoodText(label).text.trim();
    if (!cleaned || sanitizeFoodText(label).replacements.length > 0) continue;
    slices.push({ label: cleaned, percent });
  }
  if (slices.length < 2) return null;
  const sum = slices.reduce((a, s) => a + s.percent, 0);
  if (sum < 50 || sum > 110) return null; // 합이 비현실적이면 미렌더
  return slices.slice(0, 6);
}

export function prepareFoodRatioSlices(
  ingredients?: string | null,
  keyFeatures?: string | null,
): FoodRatioSlice[] | null {
  return (
    parseFoodRatioSlices(ingredients) ?? parseFoodRatioSlices(keyFeatures) ?? null
  );
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 도넛 차트 — viewBox 360x200, 모바일 친화 */
export function buildFoodRatioDiagramSvg(
  slices: FoodRatioSlice[],
  strokeColor: string,
  labelColor: string,
): string {
  const prepared = slices.filter((s) => s.percent > 0 && s.label);
  if (prepared.length < 2) return "";

  const cx = 90;
  const cy = 100;
  const r = 62;
  const inner = 34;
  const sum = prepared.reduce((a, s) => a + s.percent, 0) || 1;

  let angle = -Math.PI / 2;
  const arcs: string[] = [];
  prepared.forEach((s, i) => {
    const sweep = (s.percent / sum) * Math.PI * 2;
    const a0 = angle;
    const a1 = angle + sweep;
    angle = a1;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const large = sweep > Math.PI ? 1 : 0;
    const opacity = 0.35 + (i / Math.max(1, prepared.length - 1)) * 0.5;
    arcs.push(
      `<path d="M ${cx + inner * Math.cos(a0)} ${cy + inner * Math.sin(a0)} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${cx + inner * Math.cos(a1)} ${cy + inner * Math.sin(a1)} A ${inner} ${inner} 0 ${large} 0 ${cx + inner * Math.cos(a0)} ${cy + inner * Math.sin(a0)} Z" fill="${strokeColor}" opacity="${opacity.toFixed(2)}"/>`,
    );
  });

  const legend = prepared
    .map((s, i) => {
      const y = 28 + i * 26;
      return `<rect x="190" y="${y - 10}" width="10" height="10" fill="${strokeColor}" opacity="${(0.35 + (i / Math.max(1, prepared.length - 1)) * 0.5).toFixed(2)}"/>
      <text x="208" y="${y}" font-size="12" fill="${labelColor}">${escapeXml(s.label)} ${Math.round(s.percent)}%</text>`;
    })
    .join("");

  return `<div style="max-width:360px;margin:28px auto 0;text-align:center" data-diagram="food-ratio">
    <p style="font-size:11px;letter-spacing:.12em;opacity:.65;margin:0 0 8px">원재료 구성 비율</p>
    <svg viewBox="0 0 360 200" width="100%" style="max-width:360px;height:auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="원재료 구성 비율">
      ${arcs.join("")}
      ${legend}
    </svg>
  </div>`;
}
