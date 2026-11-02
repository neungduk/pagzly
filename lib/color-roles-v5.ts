/**
 * 475차 B — 색 4역할(surface / surface-alt / ink / point).
 * 주조 hue=상품, 포인트·배경 hue=아키타입 이동. CSS 토큰만.
 */
import type { ArchetypeId } from "@/lib/page-archetype-v5";
import { hueShift } from "@/lib/color-extract";
import { contrastRatioToken, mixHex } from "@/lib/design-tokens";

export type ColorRolesV5 = {
  surface: string;
  surfaceAlt: string;
  ink: string;
  point: string;
  /** 포인트 면적 목표 % (5~15) */
  pointPct: number;
  /** 잉크 면 비율 힌트(아키타입) */
  inkFace: number;
};

/** 아키타입별 포인트 hue 이동(주조 대비) + 면 비율 */
const ROLE_BIAS: Record<
  ArchetypeId,
  { pointShift: number; altShift: number; pointPct: number; inkFace: number }
> = {
  editorial: { pointShift: 150, altShift: 8, pointPct: 8, inkFace: 35 },
  catalog: { pointShift: 180, altShift: 12, pointPct: 10, inkFace: 25 },
  softlife: { pointShift: 160, altShift: 20, pointPct: 12, inkFace: 15 },
  impact: { pointShift: 160, altShift: 200, pointPct: 14, inkFace: 55 },
  techsheet: { pointShift: 200, altShift: 175, pointPct: 7, inkFace: 40 },
  narrative: { pointShift: 130, altShift: 90, pointPct: 9, inkFace: 45 },
  luxe: { pointShift: 210, altShift: 15, pointPct: 5, inkFace: 70 },
  pop: { pointShift: 90, altShift: 50, pointPct: 15, inkFace: 20 },
};

function ensureInk(fg: string, bg: string): string {
  if (contrastRatioToken(fg, bg) >= 4.5) return fg;
  // 어두워 보이게 검정 섞기
  let x = fg;
  for (let i = 0; i < 6; i++) {
    x = mixHex(x, "#0A0A0A", 0.18);
    if (contrastRatioToken(x, bg) >= 4.5) return x;
  }
  return "#1B1B18";
}

/** 상품 accent(+ paper) → 4역할. ink는 대비 4.5:1 보장. */
export function colorRolesV5(
  id: ArchetypeId,
  productAccent: string,
  paper = "#FAF8F3",
): ColorRolesV5 {
  const b = ROLE_BIAS[id];
  const surface = mixHex(paper, productAccent, 0.08);
  const surfaceAlt = mixHex(paper, hueShift(productAccent, b.altShift), 0.14);
  const point = hueShift(productAccent, b.pointShift);
  const ink = ensureInk("#1B1B18", surface);
  return { surface, surfaceAlt, ink, point, pointPct: b.pointPct, inkFace: b.inkFace };
}

/** wrap 인라인 변수(짧음). point-pct는 시험이 모듈에서 읽고 CSS엔 안 넣음(export 다이어트) */
export function colorRolesStyleAttr(r: ColorRolesV5): string {
  // 짧은 키(--pz-s/a/i/p) — highlight 인라인·CSS와 공유
  return `--pz-s:${r.surface};--pz-a:${r.surfaceAlt};--pz-i:${r.ink};--pz-p:${r.point}`;
}

/**
 * 면 비율·포인트 띠 — 초단 CSS.
 * C: impact/pop/narrative 어두운 면 질감 + 밝은 반전 카드.
 */
export function colorRolesCssV5(scope: string, id: ArchetypeId): string {
  const b = ROLE_BIAS[id];
  const s = `${scope}[data-pz-bsig=${id}]`;
  const rules: string[] = [];
  // 포인트·D·C — catalog은 변수만(export living 135% 여유). 다른 종만 짧은 규칙
  if (id === "catalog") return "";
  if (b.pointPct >= 12) rules.push(`${s} section[data-pz-ax$=".5"]{box-shadow:inset 5px 0 0 var(--pz-p)}`);
  else if (b.inkFace >= 60) rules.push(`${s}{background:color-mix(in srgb,var(--pz-i) 18%,var(--pz-s))}`);
  else rules.push(`${s} section[data-pz-ax$=".5"]{border-top:2px solid var(--pz-p)}`);
  if (id === "luxe") rules.push(`${s} section[data-pz-it]{padding:0 10%}${s} .pagzly-compact-thumb{border-radius:2px!important}`);
  else if (id === "softlife") rules.push(`${s} .pagzly-compact-thumb{border-radius:999px!important}`);
  else if (id === "techsheet") rules.push(`${s} [data-pz-it]{font-variant-numeric:tabular-nums}`);
  if (id === "impact" || id === "pop" || id === "narrative") {
    const tex =
      id === "impact"
        ? `repeating-linear-gradient(135deg,#fff1 0 1px,#0000 1px 9px)`
        : id === "pop"
          ? `repeating-linear-gradient(0deg,#fff2 0 1px,#0000 1px 12px)`
          : `repeating-linear-gradient(-18deg,#fff1 0 2px,#0000 2px 11px)`;
    rules.push(`${s} section[data-pz-ax$=".4"],${s} section[data-pz-ax$=".5"]{background-image:${tex}}`);
    rules.push(`${s} [data-pz-hl-c="0"]{background:#FAF8F3!important;color:var(--pz-i)!important}`);
  }
  return rules.join("");
}

/** hue 계열 버킷 0~5 (60°) — 주조≠포인트 검증용 */
export function hueBin(hex: string): number {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  if (!Number.isFinite(n)) return 0;
  const r = ((n >> 16) & 255) / 255,
    g = ((n >> 8) & 255) / 255,
    b = (n & 255) / 255;
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b);
  if (mx === mn) return 0;
  const d = mx - mn;
  let h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return Math.min(5, Math.floor((((h % 360) + 360) % 360) / 60));
}
