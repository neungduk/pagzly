/**
 * 482 D — 페이지 중간 주조색 계열 어두운 면 구간 정확히 1개.
 * 기존 가장 긴 문장을 큰 글씨로(새 카피 금지). 아키타입별 35~60% 지점.
 */
import type { ArchetypeId } from "@/lib/page-archetype-v5";
import type { ProductPalette482 } from "@/lib/palette-from-product-482";
import { contrastRatioToken, mixHex } from "@/lib/design-tokens";
import { designV5On } from "@/lib/design-v4";

/** 아키타입별 삽입 비율(0~1, 본문 섹션 기준) */
export const DARK_BAND_AT_482: Record<ArchetypeId, number> = {
  editorial: 0.4,
  catalog: 0.45,
  softlife: 0.38,
  impact: 0.5,
  techsheet: 0.55,
  narrative: 0.42,
  luxe: 0.48,
  pop: 0.35,
};

export function darkBandIndex482(sectionCount: number, id: ArchetypeId): number {
  if (sectionCount < 3) return -1;
  const at = DARK_BAND_AT_482[id];
  const i = Math.round(sectionCount * at);
  return Math.max(1, Math.min(sectionCount - 2, i));
}

export function longestSentence482(texts: string[]): string | null {
  let best: string | null = null;
  for (const t of texts) {
    const parts = t.split(/(?<=[.!?。…]|\n)/).map((s) => s.trim()).filter(Boolean);
    for (const p of parts.length ? parts : [t.trim()]) {
      if (!p) continue;
      if (!best || [...p].length > [...best].length) best = p;
    }
  }
  return best && [...best].length >= 8 ? best : null;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function darkBandHtml482(text: string, palette: ProductPalette482): string {
  const bg = mixHex(palette.dark, palette.primary, 0.12);
  const ink = contrastRatioToken("#FAF8F3", bg) >= 4.5 ? "#FAF8F3" : "#1B1B18";
  // --pz-surface/--pz-on-surface 규칙
  return (
    `<section data-pz-darkband-482="1" data-pz-on-dark="1" style="--pz-surface:${esc(bg)};--pz-on-surface:${esc(ink)};background:var(--pz-surface);color:var(--pz-on-surface);padding:56px 24px;text-align:center">` +
    `<p style="margin:0 auto;max-width:28rem;font-size:clamp(22px,5.2vw,34px);font-weight:800;letter-spacing:-0.03em;line-height:1.35;color:var(--pz-on-surface)">${esc(text)}</p>` +
    `</section>`
  );
}

export function collectBodyTexts482(
  sections: Array<{ type: string; body?: string; heading?: string; headline?: string; subheadline?: string; description?: string }>,
): string[] {
  const out: string[] = [];
  for (const s of sections) {
    if (s.type === "hero" || s.type === "cta_price" || s.type === "ai_disclosure") continue;
    for (const k of [s.body, s.heading, s.headline, s.subheadline, s.description] as const) {
      if (k && k.trim()) out.push(k.trim());
    }
  }
  return out;
}

/** bodyParts 배열에 어두운 면 1개 삽입. 이미 있으면 스킵. */
export function insertDarkBand482(
  parts: string[],
  opts: {
    archetype: ArchetypeId;
    palette: ProductPalette482;
    sections: Array<{ type: string; body?: string; heading?: string; headline?: string; subheadline?: string }>;
  },
): string[] {
  if (!designV5On()) return parts;
  if (parts.some((p) => /data-pz-darkband-482=/.test(p))) return parts;
  const text = longestSentence482(collectBodyTexts482(opts.sections));
  if (!text) return parts;
  const idx = darkBandIndex482(parts.length, opts.archetype);
  if (idx < 0) return parts;
  const band = darkBandHtml482(text, opts.palette);
  const next = parts.slice();
  next.splice(idx, 0, band);
  return next;
}
