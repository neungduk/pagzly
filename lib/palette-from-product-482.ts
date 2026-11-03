/**
 * 482차 — 상품 지배색 3색(주조·보조·어두운 면) + 포인트 1색.
 * V5 면·알약·구분선이 이 계열(hue ±25°)만 쓰도록 color-roles 입력으로 쓴다.
 * sharp/네트워크는 extract 경로에서만; 이 파일의 순수 함수는 클라이언트 가능.
 */
import { hueShift } from "@/lib/hue-shift";
import { mixHex } from "@/lib/design-tokens";

export type ProductPalette482 = {
  /** 주조(상품 지배 유채색) */
  primary: string;
  /** 보조(밝은 면·크림) */
  secondary: string;
  /** 어두운 전환 면 */
  dark: string;
  /** 포인트(강조) */
  point: string;
  primaryHue: number;
};

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

export function hexHue(hex: string): number {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h.slice(0, 6);
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return 0;
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let hue = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return ((hue * 60) % 360 + 360) % 360;
}

export function hueDist(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return Math.min(d, 360 - d);
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn),
    min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const to = (v: number) => Math.max(0, Math.min(255, Math.round((v + m) * 255))).toString(16).padStart(2, "0");
  return `#${to(rgb[0])}${to(rgb[1])}${to(rgb[2])}`.toUpperCase();
}

/** 기존 추출 theme에서 3+1 팔레트(폴백·동기 경로) */
export function paletteFromTheme482(theme: {
  accent?: string | null;
  deepAccent?: string | null;
  baseNeutral?: string | null;
  accentSoft?: string | null;
}): ProductPalette482 {
  const primary = (theme.accent || "#B8860B").toUpperCase();
  const hue = hexHue(primary);
  const secondary = (theme.accentSoft || theme.baseNeutral || hslToHex(hue, 0.22, 0.92)).toUpperCase();
  const dark = (theme.deepAccent || hslToHex(hue, 0.35, 0.18)).toUpperCase();
  const point = hueShift(primary, 20);
  return { primary, secondary, dark, point, primaryHue: hue };
}

/** 주조 hue + 선택적 보조 후보로 고정 팔레트 */
export function paletteFromPrimaryHue482(primaryHue: number, opts?: { secondaryHex?: string }): ProductPalette482 {
  const h = ((primaryHue % 360) + 360) % 360;
  const primary = hslToHex(h, 0.55, 0.42);
  const secondary = opts?.secondaryHex?.toUpperCase() || hslToHex(h, 0.18, 0.93);
  const dark = hslToHex(h, 0.4, 0.16);
  const point = hslToHex((h + 20) % 360, 0.62, 0.38);
  return { primary, secondary, dark, point, primaryHue: h };
}

/**
 * K≈3 채도 가중 군집 결과(상위 hue)로 팔레트.
 * clusters[0]=주조 후보. chromaBoosted이면 무채 병에서 내용물 색을 올린 경우.
 */
export function paletteFromHueClusters482(
  clusters: Array<{ h: number; weight: number; meanSat?: number }>,
  neutralHex?: string | null,
  /** extract가 고른 주조(없으면 weight·채도로 재선정) */
  primary?: { h: number; weight: number; meanSat?: number } | null,
): ProductPalette482 {
  const top = [...clusters].sort((a, b) => b.weight - a.weight);
  if (!top.length && !primary) return paletteFromPrimaryHue482(45); // 웜 골드 폴백
  // 482: 단순 weight 1위가 스튜디오 면일 수 있어 primary 인자·채도 경쟁을 존중
  let primaryHue = primary?.h ?? top[0]!.h;
  if (!primary && top.length >= 2) {
    const leader = top[0]!;
    const contenders = top.filter((c) => c.weight >= leader.weight * 0.22);
    let best = leader;
    for (const c of contenders) {
      const ms = c.meanSat ?? 0;
      const bs = best.meanSat ?? 0;
      if (ms > bs + 0.04) best = c;
    }
    primaryHue = best.h;
  }
  const secondaryHue = top.find((c) => Math.abs(c.h - primaryHue) > 12)?.h ?? primaryHue;
  const secondary = neutralHex
    ? mixHex(neutralHex, hslToHex(secondaryHue, 0.25, 0.9), 0.35)
    : hslToHex(secondaryHue, 0.2, 0.92);
  return paletteFromPrimaryHue482(primaryHue, { secondaryHex: secondary });
}

/** 임의 hex의 hue를 팔레트 주조 ±maxDeg 안으로 끌어당김(채도·명도 유지에 가깝게) */
export function clampHexToPaletteHue482(hex: string, palette: ProductPalette482, maxDeg = 25): string {
  const h = hexHue(hex);
  const d = hueDist(h, palette.primaryHue);
  if (d <= maxDeg) return hex.toUpperCase();
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  const { s, l } = rgbToHsl(r, g, b);
  // 더 가까운 ±maxDeg 경계
  const sign = ((h - palette.primaryHue + 540) % 360) - 180;
  // 경계보다 1° 안쪽에 고정해 양자화 후에도 ±maxDeg를 넘지 않게
  const span = Math.max(0, maxDeg - 1);
  const target = (palette.primaryHue + (sign >= 0 ? span : -span) + 360) % 360;
  return hslToHex(target, clamp(s, 0.05, 0.85), clamp(l, 0.08, 0.96));
}

/** 면/포인트가 팔레트 안에 있는지(시험용) */
export function facesWithinPaletteHue482(hexes: string[], palette: ProductPalette482, maxDeg = 25): boolean {
  return hexes.every((hx) => {
    const h = hexHue(hx);
    // 거의 무채(종이)는 허용
    const n = parseInt(hx.replace("#", "").slice(0, 6), 16);
    const r = ((n >> 16) & 255) / 255,
      g = ((n >> 8) & 255) / 255,
      b = (n & 255) / 255;
    if (Math.max(r, g, b) - Math.min(r, g, b) < 0.06) return true;
    return hueDist(h, palette.primaryHue) <= maxDeg + 0.5;
  });
}

/** 주조가 노랑 계열(대략 35~75°)인지 — live-481 미스트 오일 기대 */
export function isWarmYellowHue482(h: number): boolean {
  return h >= 30 && h <= 85;
}
