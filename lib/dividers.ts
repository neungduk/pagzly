/**
 * 441차 1-4 — 섹션 경계 구분선 6종(DESIGN_V4, 라이브·export 같은 마크업). SVG·border·gradient만(clip-path·mask 없음).
 * 면 색은 바꾸지 않고 섹션 위 가장자리 띠(높이 ≤24px, 섹션 안쪽 — 위 여백 56px 안이라 글과 겹치지 않음)에만 그린다 → 428 명암 반전 예산 영향 없음.
 * mood가 기본 2종을 고르고 블록마다 번갈아 쓴다. 교차 모티프가 걸치는 경계에는 두지 않는다(같은 경계에 장식 둘 금지).
 */
import { hexToRgba } from "@/lib/design-tokens";
import { DIVIDER_ALPHA } from "@/lib/design-tokens-v4";

export const DIVIDER_KINDS = ["wave", "slant", "zigzag", "dotted", "double", "fade"] as const;
export type DividerKind = (typeof DIVIDER_KINDS)[number];

/** 465차 V5 — 추가 구분선 6종(아키타입 토큰이 고른다). 기존 6종 목록·mood 기본값은 그대로 */
export const DIVIDER_KINDS_V5 = ["wave2", "stripe", "stitch", "thin2", "dotwave", "tape"] as const;
export type DividerKindV5 = (typeof DIVIDER_KINDS_V5)[number];
export type DividerKindAny = DividerKind | DividerKindV5;

const MOOD_DIVIDERS: Record<string, [DividerKind, DividerKind]> = {
  "minimal-luxe": ["double", "dotted"],
  clinic: ["dotted", "fade"],
  natural: ["wave", "fade"],
  playful: ["zigzag", "wave"],
  street: ["slant", "zigzag"],
  warm: ["wave", "dotted"],
};
export const dividerFor = (mood: string | null | undefined, n: number): DividerKind => (MOOD_DIVIDERS[mood ?? ""] ?? ["fade", "dotted"])[n % 2]!;

/** 선 색: 잉크 18% — 면 위 비텍스트 장식(대비 요구 없음), 너무 진하면 섹션이 잘려 보인다 */
export function dividerHtml(kind: DividerKindAny, ink: string): string {
  const c = hexToRgba(ink, DIVIDER_ALPHA);
  const strip = (h: number, inner: string, extra = "") => `<span aria-hidden="true" data-pz-divider="${kind}" style="position:absolute;left:0;right:0;top:0;height:${h}px;pointer-events:none;${extra}">${inner}</span>`;
  const svg = (d: string) => `<svg viewBox="0 0 384 12" width="100%" height="12" preserveAspectRatio="none" style="display:block" aria-hidden="true"><path d="${d}" fill="none" stroke="${c}" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`;
  switch (kind) {
    case "wave": {
      let d = "M0 6";
      for (let x = 0; x < 384; x += 24) d += ` Q${x + 6} 0 ${x + 12} 6 T${x + 24} 6`;
      return strip(12, svg(d), "top:10px");
    }
    case "zigzag": {
      let d = "M0 9";
      for (let x = 0; x < 384; x += 16) d += ` L${x + 8} 3 L${x + 16} 9`;
      return strip(12, svg(d), "top:10px");
    }
    case "slant":
      return strip(6, "", `top:12px;left:24px;right:24px;background:repeating-linear-gradient(135deg,${c} 0 1.5px,transparent 1.5px 8px)`);
    case "dotted":
      return strip(2, "", `top:16px;left:24px;right:24px;border-top:2px dotted ${c}`);
    case "double":
      return strip(5, "", `top:14px;left:24px;right:24px;border-top:1px solid ${c};border-bottom:1px solid ${c}`);
    // ── 465차 V5 추가 6종(SVG·border·gradient만)
    case "wave2": {
      let d = "M0 6";
      for (let x = 0; x < 384; x += 48) d += ` Q${x + 12} 0 ${x + 24} 6 T${x + 48} 6`;
      return strip(12, svg(d), "top:10px");
    }
    case "stripe":
      return strip(8, "", `top:12px;left:0;right:0;background:repeating-linear-gradient(90deg,${c} 0 12px,transparent 12px 24px)`);
    case "stitch":
      return strip(2, "", `top:16px;left:16px;right:16px;border-top:2px dashed ${c}`);
    case "thin2":
      return strip(9, "", `top:12px;left:24px;right:24px;border-top:1px solid ${c};border-bottom:1px solid ${c};height:3px`);
    case "dotwave": {
      let d = "M0 6";
      for (let x = 0; x < 384; x += 16) d += ` Q${x + 4} 2 ${x + 8} 6 T${x + 16} 6`;
      return strip(12, svg(d).replace("fill=\"none\"", "fill=\"none\" stroke-dasharray=\"1 5\""), "top:10px");
    }
    case "tape":
      return strip(14, "", `top:9px;left:50%;width:84px;margin-left:-42px;height:14px;background:${hexToRgba(ink, 0.1)};transform:rotate(-2deg)`);
    case "fade":
    default:
      return strip(24, "", `background:linear-gradient(180deg,${hexToRgba(ink, 0.06)},${hexToRgba(ink, 0)})`);
  }
}
