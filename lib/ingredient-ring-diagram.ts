/**
 * 185차 — 성분/균주 원형 곡선 텍스트 다이어그램.
 * 판매자 ingredients 라벨만 사용(새 AI 추출 없음). 3~8개일 때만 렌더.
 * Behance 벤치마크(159차)에서 후보로만 남겼던 원 둘레 배치를 lib/*-diagram.ts 패턴으로 구현.
 */
import { parseIngredientLabels } from "@/lib/ingredient-labels";
import { diagramTitleWithIconHtml } from "@/lib/diagram-icons";

export const INGREDIENT_RING_MIN = 3;
export const INGREDIENT_RING_MAX = 8;

const NOISE =
  /전성분|표기\s*있음|확인\s*필요|판매자|문의|미정|기타|etc\.?|조단백질|조지방|조회분/i;

function normalizeRingLabel(raw: string): string {
  return raw
    .replace(/\.$/, "")
    .replace(/[.。]\s*(조단백질|조지방|수분).*$/i, "")
    .trim();
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 화장품·반려동물 등 성분/소재 링이 의미 있는 카테고리 */
export function isIngredientRingCategory(category: string): boolean {
  return category === "화장품/뷰티" || category === "반려동물";
}

/**
 * ingredients 문자열 → 링용 라벨.
 * 3~8개 밖이면 null (조용히 생략).
 */
export function prepareIngredientRingLabels(
  ingredients: string | null | undefined,
): string[] | null {
  const parsed = parseIngredientLabels(ingredients);
  if (!parsed) return null;
  const labels = parsed
    .map(normalizeRingLabel)
    .filter((l) => {
      if (l.length < 2 || l.length > 28) return false;
      if (NOISE.test(l)) return false;
      // 영양 %만 있는 조각 제외 (예: "수분 10%")
      if (/^(수분|조단백질|조지방)/.test(l) && /%/.test(l)) return false;
      if (/^\d+$/.test(l)) return false;
      return true;
    });
  if (labels.length < INGREDIENT_RING_MIN || labels.length > INGREDIENT_RING_MAX) {
    return null;
  }
  return labels;
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** startDeg→endDeg 호 (deg는 12시=0, 시계방향). reverse면 같은 짧은 호를 반대 방향으로. */
function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
  reverse: boolean,
): string {
  const span = ((endDeg - startDeg + 360) % 360) || 360;
  const large = span > 180 ? 1 : 0;
  if (!reverse) {
    const s = polar(cx, cy, r, startDeg);
    const e = polar(cx, cy, r, endDeg);
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  }
  // 하단: end→start 반시계(짧은 호)로 그려 글자가 바로 읽히게
  const s = polar(cx, cy, r, endDeg);
  const e = polar(cx, cy, r, startDeg);
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 0 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

function estimateCharWidth(fontSize: number): number {
  return fontSize * 0.62;
}

function fitLabel(label: string, maxChars: number): string {
  if (label.length <= maxChars) return label;
  return `${label.slice(0, Math.max(1, maxChars - 1))}…`;
}

/**
 * viewBox 360×360 — 원 둘레 textPath.
 * strokeColor=accent/deepAccent, labelColor=ink.
 */
export function buildIngredientRingDiagramSvg(
  labels: string[],
  strokeColor: string,
  labelColor: string,
): string {
  if (labels.length < INGREDIENT_RING_MIN || labels.length > INGREDIENT_RING_MAX) {
    return "";
  }

  const n = labels.length;
  const cx = 180;
  const cy = 180;
  const ringR = 118;
  const textR = 132;
  // 개수↑ → 글자↓ (174 diagram-icons 자동 조정과 같은 취지)
  const fontSize = n <= 3 ? 13 : n <= 5 ? 11 : 9.5;
  const slotDeg = 360 / n;
  const title = diagramTitleWithIconHtml("주요 성분", "volume-bottle", strokeColor);

  const defs: string[] = [];
  const texts: string[] = [];
  const ticks: string[] = [];

  labels.forEach((raw, i) => {
    const mid = i * slotDeg;
    const half = Math.min(slotDeg * 0.42, 48);
    let start = mid - half;
    let end = mid + half;
    // 하단(90~270°)은 경로를 뒤집어 글자가 바로 읽히게
    const midNorm = ((mid % 360) + 360) % 360;
    const reverse = midNorm > 90 && midNorm < 270;

    const arcLen = ((end - start) * Math.PI * textR) / 180;
    const maxChars = Math.max(4, Math.floor(arcLen / estimateCharWidth(fontSize)));
    const label = fitLabel(raw, maxChars);

    const id = `ing-ring-${i}`;
    defs.push(
      `<path id="${id}" fill="none" d="${arcPath(cx, cy, textR, start, end, reverse)}"/>`,
    );
    texts.push(
      `<text fill="${escapeXml(labelColor)}" font-size="${fontSize}" font-family="Noto Sans KR, system-ui, sans-serif" font-weight="600" letter-spacing="0.02em"><textPath href="#${id}" xlink:href="#${id}" startOffset="50%" text-anchor="middle">${escapeXml(label)}</textPath></text>`,
    );

    const outer = polar(cx, cy, ringR + 6, mid);
    const inner = polar(cx, cy, ringR - 6, mid);
    ticks.push(
      `<line x1="${inner.x.toFixed(1)}" y1="${inner.y.toFixed(1)}" x2="${outer.x.toFixed(1)}" y2="${outer.y.toFixed(1)}" stroke="${escapeXml(strokeColor)}" stroke-width="1.5" stroke-opacity="0.45"/>`,
    );
  });

  return `<div style="width:100%;max-width:360px;margin:24px auto 0">${title}
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 360 360" width="100%" height="auto" role="img" aria-label="성분 원형 배치" overflow="visible">
  <defs>${defs.join("")}</defs>
  <circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="${escapeXml(strokeColor)}" stroke-width="1.25" stroke-opacity="0.35"/>
  <circle cx="${cx}" cy="${cy}" r="${ringR - 28}" fill="none" stroke="${escapeXml(strokeColor)}" stroke-width="0.75" stroke-opacity="0.18" stroke-dasharray="3 5"/>
  ${ticks.join("")}
  ${texts.join("")}
</svg></div>`;
}
