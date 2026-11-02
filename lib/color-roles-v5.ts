/**
 * 476차 A — 색 분리를 **렌더 배경**에 보이게.
 * 아키타입마다 면 hue를 ±60~180° 이동(채도만 바꾸지 않음). 대비 4.5:1.
 * 종이군(editorial·catalog·luxe)은 bin 0을 최대 3칸 점유 → 나머지 면은 bin 0 금지·동일 bin ≤3.
 */
import type { ArchetypeId } from "@/lib/page-archetype-v5";
import { hueShift } from "@/lib/color-extract";
import { contrastRatioToken, mixHex } from "@/lib/design-tokens";

export type ColorRolesV5 = {
  surface: string;
  surfaceAlt: string;
  ink: string;
  point: string;
  pointPct: number;
  inkFace: number;
};

type FaceRecipe = {
  faceShift: number;
  faceMix: number;
  dark: boolean;
  pointShift: number;
  pointPct: number;
  neutral?: boolean;
  base?: string;
  /** 종이/흰 면 — hue bin 0 고정(무채에 가깝게) */
  paper?: boolean;
};

const FACE: Record<ArchetypeId, FaceRecipe> = {
  editorial: { faceShift: 0, faceMix: 0.02, dark: false, pointShift: 150, pointPct: 8, base: "#FAF7F1", paper: true },
  catalog: { faceShift: 0, faceMix: 0, dark: false, pointShift: 180, pointPct: 10, base: "#FFFFFF", paper: true },
  softlife: { faceShift: 0, faceMix: 0.38, dark: false, pointShift: 160, pointPct: 12, base: "#FFFBF6" },
  impact: { faceShift: 180, faceMix: 0.55, dark: true, pointShift: 90, pointPct: 14, base: "#0C1014" },
  techsheet: { faceShift: 200, faceMix: 0, dark: false, pointShift: 90, pointPct: 9, neutral: true, base: "#E8EEF4" },
  narrative: { faceShift: 90, faceMix: 0.52, dark: true, pointShift: 40, pointPct: 9, base: "#0E1218" },
  luxe: { faceShift: 25, faceMix: 0.04, dark: false, pointShift: 200, pointPct: 5, base: "#F7F3EA", paper: true },
  pop: { faceShift: 240, faceMix: 0.5, dark: false, pointShift: 150, pointPct: 15, base: "#FFF8E6" },
};

/** accent별 후보 이동량 — 첫 통과가 bin 규칙을 만족하면 채택 */
const SHIFT_CANDIDATES: Partial<Record<ArchetypeId, number[]>> = {
  softlife: [0, 60, -60, 90, 120, -90],
  impact: [180, 165, 195, 150, 210],
  narrative: [90, 105, 75, 120, 60],
  pop: [240, 220, 255, 200, 270, 150],
};

function ensureInk(fg: string, bg: string): string {
  if (contrastRatioToken(fg, bg) >= 4.5) return fg;
  const light = "#FAF8F3";
  const dark = "#0A0A0A";
  if (contrastRatioToken(light, bg) >= 4.5) return light;
  if (contrastRatioToken(dark, bg) >= 4.5) return dark;
  // 중간 톤 면: 더 극단으로
  let best = dark;
  let bestR = contrastRatioToken(dark, bg);
  for (const c of [light, "#FFFFFF", "#000000", mixHex(dark, bg, 0.15)]) {
    const r = contrastRatioToken(c, bg);
    if (r > bestR) {
      best = c;
      bestR = r;
    }
  }
  return best;
}

function vividPoint(accent: string, shift: number): string {
  const shifted = hueShift(accent, shift);
  return mixHex(shifted, "#FFE566", 0.35);
}

/** 면색 — 어두운 면도 채도를 남겨 hue bin이 무채(0)로 붕괴하지 않게 */
function mixFace(base: string, accent: string, shift: number, mix: number, dark: boolean): string {
  const shifted = hueShift(accent, shift);
  // 어두운 면: 채도 있는 액을 어두운 base에 섞되 명도를 낮게 유지(대비·hue bin 동시)
  const chroma = dark ? mixHex(shifted, "#000000", 0.42) : mixHex(shifted, "#FFFFFF", 0.18);
  return mixHex(base, chroma, mix);
}

function previewSurface(id: ArchetypeId, accent: string, shift: number): string {
  const r = FACE[id];
  if (r.paper || r.neutral || r.faceMix <= 0) return r.base ?? "#FAF8F3";
  return mixFace(r.base ?? "#FAF8F3", accent, shift, r.faceMix, r.dark);
}

/** 종이 3종이 bin0을 채운 뒤, 나머지 면이 bin0에 끼거나 한 bin이 4 넘지 않게 shift 확정 */
function resolveFaceShift(id: ArchetypeId, accent: string): number {
  const r = FACE[id];
  if (r.paper || r.neutral || r.faceMix <= 0) return r.faceShift;
  const cands = SHIFT_CANDIDATES[id] ?? [r.faceShift];
  const counts = new Map<number, number>([
    [0, 3], // editorial·catalog·luxe
    [hueBin("#E8EEF4"), 1], // techsheet 고정 쿨그레이
  ]);
  // softlife→impact→narrative→pop 순으로 재계산(호출 단건이어도 동일 accent면 동일 결과)
  const order: ArchetypeId[] = ["softlife", "impact", "narrative", "pop"];
  const chosen: Partial<Record<ArchetypeId, number>> = {};
  for (const aid of order) {
    const list = SHIFT_CANDIDATES[aid] ?? [FACE[aid].faceShift];
    let pick = list[0]!;
    for (const sh of list) {
      const b = hueBin(previewSurface(aid, accent, sh));
      if (b === 0) continue;
      if ((counts.get(b) ?? 0) >= 3) continue;
      pick = sh;
      counts.set(b, (counts.get(b) ?? 0) + 1);
      break;
    }
    // 후보가 전부 막히면 채도 높은 이동으로 bin0만 피함
    if (hueBin(previewSurface(aid, accent, pick)) === 0) {
      for (let sh = 30; sh < 360; sh += 30) {
        if (hueBin(previewSurface(aid, accent, sh)) !== 0) {
          pick = sh;
          break;
        }
      }
    }
    chosen[aid] = pick;
  }
  return chosen[id] ?? r.faceShift;
}

export function colorRolesV5(id: ArchetypeId, productAccent: string, paper = "#FAF8F3"): ColorRolesV5 {
  const r = FACE[id];
  const base = r.base ?? paper;
  const faceShift = resolveFaceShift(id, productAccent);
  let surface: string;
  if (r.neutral || r.paper) {
    // 종이·무채: 상품 accent를 거의 안 섞어 bin 붕괴·분홍 일색 방지
    surface = r.faceMix <= 0 ? base : mixHex(base, productAccent, Math.min(0.04, r.faceMix));
  } else {
    surface = mixFace(base, productAccent, faceShift, r.faceMix, r.dark);
  }
  const altAccent = hueShift(productAccent, faceShift + (r.dark ? 20 : 40));
  const surfaceAlt = r.neutral || r.paper ? mixHex(surface, "#1B1B18", 0.05) : mixHex(surface, altAccent, r.dark ? 0.14 : 0.12);
  const point = r.neutral ? vividPoint(productAccent, r.pointShift) : hueShift(productAccent, r.pointShift);
  // point가 surface와 같은 bin이면 추가 이동
  let pointOut = point;
  if (hueBin(pointOut) === hueBin(surface)) {
    pointOut = hueShift(productAccent, r.pointShift + 90);
    if (hueBin(pointOut) === hueBin(surface)) pointOut = vividPoint(productAccent, r.pointShift + 120);
  }
  const ink = ensureInk(r.dark ? "#FAF8F3" : "#1B1B18", surface);
  return {
    surface,
    surfaceAlt,
    ink,
    point: pointOut,
    pointPct: r.pointPct,
    inkFace: r.dark ? 70 : r.faceMix * 100,
  };
}

export function colorRolesStyleAttr(roles: ColorRolesV5): string {
  return `--pz-s:${roles.surface};--pz-a:${roles.surfaceAlt};--pz-i:${roles.ink};--pz-p:${roles.point}`;
}

/**
 * 실제 면 칠하기 — `data-pz-face` 섹션·래퍼만(가격·고지 제외는 표식 단계에서).
 * 476 B: repeating-linear-gradient 질감 제거(단색·테두리만).
 */
export function colorRolesCssV5(scope: string, id: ArchetypeId): string {
  const s = `${scope}[data-pz-bsig=${id}]`;
  let extra = "";
  // 476 E — 쌍 골격(초단). living≤135 여유
  if (id === "luxe") extra = `${s} section[data-pz-face]{padding:0 11%!important}${s} [data-pz-sf^=brand_story]{border-left:1px solid #0002;padding-left:8%!important}`;
  else if (id === "softlife") extra = `${s} .pagzly-compact-thumb,${s} [data-pz-cl-v5] li{border-radius:999px!important;padding:12px 16px!important;background:var(--pz-a)}`;
  else if (id === "catalog") extra = `${s} [data-pz-it] .pagzly-compact-row{display:grid!important;grid-template-columns:96px 1fr}`;
  else if (id === "techsheet") extra = `${s} [data-pz-face]{font-variant-numeric:tabular-nums}${s} [data-pz-hl-g]{display:grid!important;grid-template-columns:1fr 1fr}`;
  else if (id === "impact" || id === "pop" || id === "narrative") extra = `${s} [data-pz-hl-c="0"]{background:#FAF8F3!important;color:#1B1B18!important}`;
  // 476 F 루프2 — info soft 분홍을 --pz-*로 덮음
  return (
    `${s}{background:var(--pz-s);color:var(--pz-i)}` +
    `${s} section[data-pz-face],${s} [data-info]{background:var(--pz-s)!important}` +
    `${s} section[data-pz-face][data-pz-ax$=".5"],${s} [data-info=stat],${s} [data-info=points]{background:var(--pz-a)!important}` +
    extra
  );
}

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
  // 채도 매우 낮은 종이·회색도 bin 0(무채 구간)
  if (d < 0.04) return 0;
  let h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return Math.min(5, Math.floor((((h % 360) + 360) % 360) / 60));
}

export function hueBucket30(hex: string): number {
  return hueBin(hex);
}

/**
 * export HTML 면 hue — **토큰 --pz-s만**(인라인 상품 accent 노이즈 제외).
 */
export function dominantFaceHueBinFromHtml(html: string): number {
  const styleAttr = html.match(/data-pz-bsig="[^"]*"\s+style="([^"]*)"/);
  const m = styleAttr?.[1]?.match(/--pz-s:\s*(#[0-9A-Fa-f]{6})/);
  if (m?.[1]) return hueBin(m[1]);
  return 0;
}

/** 같은 상품 8종: 동일 hue bin 아키타입 수 최대치(목표 ≤3) */
export function maxSameFaceHueCount(bins: number[]): number {
  const c = new Map<number, number>();
  for (const b of bins) c.set(b, (c.get(b) ?? 0) + 1);
  return Math.max(0, ...c.values());
}
