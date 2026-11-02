/**
 * 474차 V5 — 간격·정렬 토큰. 허용 스케일만(4/8/12/16/24/40/64/96). V5 켜짐에서만.
 */
import type { ArchetypeId } from "@/lib/page-archetype-v5";
import { ARCHETYPES } from "@/lib/page-archetype-v5";

/** 고정 스케일 — 임의 px 금지 검사의 허용 목록 */
export const SPACE_SCALE_V5 = [4, 8, 12, 16, 24, 40, 64, 96] as const;
export type SpaceTokenV5 = (typeof SPACE_SCALE_V5)[number];

/** 본문 열 폭 상한(px) — wrap max-width와 맞춤 */
export const COL_MAX_V5 = 576;

/** 390×700 한 화면에 허용하는 채워진 사각 카드 상한 */
export const CARD_CAP_VIEW_V5 = 2;

export function snapSpaceV5(px: number): SpaceTokenV5 {
  let best: SpaceTokenV5 = SPACE_SCALE_V5[0]!;
  let dist = Math.abs(px - best);
  for (const s of SPACE_SCALE_V5) {
    const d = Math.abs(px - s);
    if (d < dist) {
      best = s;
      dist = d;
    }
  }
  return best;
}

/** 아키타입 pad 3단을 스케일에 스냅 */
export function snapPadTripleV5(pad: [number, number, number]): [SpaceTokenV5, SpaceTokenV5, SpaceTokenV5] {
  return [snapSpaceV5(pad[0]), snapSpaceV5(pad[1]), snapSpaceV5(pad[2])];
}

export function alignOfV5(id: ArchetypeId): "left" | "center" {
  return ARCHETYPES[id].titleAlign === "center" ? "center" : "left";
}

/** 짧은 CSS: 아키타입 정렬선 통일(부품 간격은 snapSpaceV5) */
export function spacingCssV5(scope: string, id: ArchetypeId): string {
  return `${scope}[data-pz-bsig=${id}]{--pz-align:${alignOfV5(id)}}${scope} :is([data-pz-eyebrow],[data-pz-title]){text-align:var(--pz-align)}`;
}

/** 소스 문자열에서 허용 목록 밖 padding/margin px 탐지(회귀용) */
export function findRogueSpacingPx(src: string): string[] {
  const allow = new Set(SPACE_SCALE_V5.map(String));
  const out: string[] = [];
  const re = /(?:padding|margin)(?:-(?:top|right|bottom|left))?\s*:\s*([^;}"`]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const vals = m[1]!.match(/-?\d+(?:\.\d+)?(?=px)/g) || [];
    for (const v of vals) {
      const n = Math.abs(Number(v));
      if (n === 0) continue;
      if (!allow.has(String(n))) out.push(`${m[0]}`.slice(0, 48));
    }
  }
  return out;
}
