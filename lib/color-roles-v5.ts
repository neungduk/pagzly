/**
 * 476차 A — 색 분리를 **렌더 배경**에 보이게.
 * 아키타입마다 면 hue를 ±60~180° 이동(채도만 바꾸지 않음). 대비 4.5:1.
 * 종이군(editorial·catalog·luxe)은 bin 0을 최대 3칸 점유 → 나머지 면은 bin 0 금지·동일 bin ≤3.
 */
import type { ArchetypeId } from "@/lib/page-archetype-v5";
import { hueShift } from "@/lib/hue-shift";
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

/** 478 B — 면 위 글자색 단일 결정(제목/본문/라벨/번호/링크/배지 공통) */
export function ensureInk(fg: string, bg: string): string {
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

/** 면 명도 기준 — 어두운 면이면 밝은 글자 후보를 우선 */
export function inkOnSurface(surface: string, preferLight: boolean): string {
  return ensureInk(preferLight ? "#FAF8F3" : "#1B1B18", surface);
}

function expandHex(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length === 3) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  return `#${h.slice(0, 6)}`;
}

/** 밝은 면(카드·틴트)이면 true — 어두운 면 위에 얹힌 섬 표식용 */
export function isLightSurface(hex: string): boolean {
  const full = expandHex(hex);
  return contrastRatioToken("#000000", full) >= contrastRatioToken("#FFFFFF", full);
}

/**
 * 478 B — 섹션이 아닌 요소의 밝은 background:#hex 에 `data-pz-on-light`를 붙여
 * 면 강제 밝은 글자가 카드 위에서 뒤집히지 않게 한다(섹션 인라인 paper는 제외).
 */
export function markLightIslandsV5(html: string): string {
  return html.replace(/<(?!\/|section\b|img\b|svg\b|path\b|br\b|hr\b|source\b|meta\b|link\b)([a-zA-Z][\w-]*)(\s[^>]*?)>/g, (full, tag: string, rest: string) => {
    if (/\bdata-pz-on-light\b/.test(rest) || /\bdata-pz-face\b/.test(rest)) return full;
    const m = /background:\s*(#[0-9A-Fa-f]{3,8})\b/i.exec(rest);
    if (!m?.[1] || !isLightSurface(m[1])) return full;
    return `<${tag} data-pz-on-light="1"${rest}>`;
  });
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
  // 478 B — 면과 글자색을 같은 경로에서 확정(밝은 면=잉크, 어두운 면=밝은 글자)
  const ink = inkOnSurface(surface, r.dark || contrastRatioToken("#1B1B18", surface) < 4.5);
  return {
    surface,
    surfaceAlt,
    ink,
    point: pointOut,
    pointPct: r.pointPct,
    inkFace: r.dark ? 70 : r.faceMix * 100,
  };
}

export type ChipPairV5 = { chip: string; onChip: string; border: string };

/**
 * 479 A — 자기 배경을 가진 알약/배지/칩 쌍.
 * 부모 면과 명도 대비가 큰 쪽을 칩 배경으로, 글자는 칩 배경 기준으로 같은 함수에서 확정.
 */
export function chipPair(parentSurface: string): ChipPairV5 {
  const light = "#FAF8F3";
  const dark = "#0A0A0A";
  const lightVs = contrastRatioToken(light, parentSurface);
  const darkVs = contrastRatioToken(dark, parentSurface);
  if (lightVs >= darkVs) {
    // 어두운 부모 → 밝은 칩 + 어두운 글자
    return { chip: light, onChip: ensureInk("#1B1B18", light), border: "none" };
  }
  // 밝은 부모 → 어두운 칩 + 밝은 글자(대비가 약하면 얇은 밝은 테두리)
  const onChip = ensureInk(light, dark);
  const border = darkVs < 3 ? "1px solid rgba(250,248,243,0.55)" : "none";
  return { chip: dark, onChip, border };
}

export function colorRolesStyleAttr(roles: ColorRolesV5): string {
  // 478 B — 면/글자 쌍 변수(--pz-s/--pz-i 별칭 유지)
  // 479 A — 칩 쌍(--pz-chip/--pz-on-chip)
  const chip = chipPair(roles.surface);
  return `--pz-s:${roles.surface};--pz-a:${roles.surfaceAlt};--pz-i:${roles.ink};--pz-p:${roles.point};--pz-surface:${roles.surface};--pz-on-surface:${roles.ink};--pz-chip:${chip.chip};--pz-on-chip:${chip.onChip};--pz-chip-bd:${chip.border}`;
}

/** 칩·알약·배지 — forceInk보다 뒤에 두어 자기 배경 기준 글자를 확정 */
function chipCss(s: string, text: string): string {
  return (
    `${s} [data-pz-chip]{background:var(--pz-chip)!important;color:var(--pz-on-chip)!important;border:var(--pz-chip-bd,none)!important;--pz-on-surface:var(--pz-on-chip)}` +
    `${s} [data-pz-chip] ${text}{color:var(--pz-on-chip)!important}` +
    `${s} [data-pz-chip][data-pz-s],${s} [data-pz-chip] [data-pz-s]{color:var(--pz-on-chip)!important}`
  );
}

/** 인라인 color를 덮어 실제 면 위 글자로 통일. 어두운 면 아키타입에만 강제(밝은 면은 변수만). */
function onSurfaceCss(s: string, forceInk: boolean): string {
  const text = ":is(p,h1,h2,h3,h4,li,td,th,label,a,span,strong,em,b,small)";
  let css =
    `${s}{background:var(--pz-s);color:var(--pz-i);--pz-surface:var(--pz-s);--pz-on-surface:var(--pz-i)}` +
    `${s} section[data-pz-face]{position:relative;z-index:1!important;background:var(--pz-surface)!important;color:var(--pz-on-surface)!important}` +
    `${s} [data-info]{background:var(--pz-surface)!important;color:var(--pz-on-surface)!important}` +
    `${s} section[data-pz-face][data-pz-ax$=".5"],${s} [data-info=stat],${s} [data-info=points]{background:var(--pz-a)!important}` +
    // 사진 스크림 위 = 항상 밝은 글자
    `${s} [data-pz-pb="band"] [style*="z-index:2"],${s} [data-pz-pb="scrim"] [style*="z-index:2"]{--pz-on-surface:#FAF8F3;color:#FAF8F3!important}` +
    `${s} [data-pz-pb="band"] [style*="z-index:2"] ${text},${s} [data-pz-pb="scrim"] [style*="z-index:2"] ${text}{color:#FAF8F3!important}` +
    `${s} .pagzly-seo-text{background:#FAF8F3!important;color:#1B1B18!important;--pz-on-surface:#1B1B18;--pz-surface:#FAF8F3}` +
    `${s} .pagzly-seo-text ${text}{color:#1B1B18!important}` +
    `${s} footer{color:var(--pz-i)!important}`;
  if (forceInk) {
    css +=
      `${s} section[data-pz-face] ${text},${s} [data-info] ${text}{color:var(--pz-on-surface)!important}` +
      `${s} section[data-pz-face] [data-pz-s],${s} [data-info] [data-pz-s]{color:var(--pz-on-surface)!important}` +
      `${s} [data-pz-hl-c="0"],${s} [data-pz-on-light]{--pz-on-surface:#1B1B18;color:#1B1B18!important;background:#FAF8F3!important}` +
      `${s} [data-pz-hl-c="0"] ${text},${s} [data-pz-on-light] ${text}{color:#1B1B18!important}` +
      `${s} :not(section)[style*="background:#FFF"],${s} :not(section)[style*="background:#fff"],${s} :not(section)[style*="background:#FFFFFF"],${s} :not(section)[style*="background:#ffffff"],${s} :not(section)[style*="background:#FAF8F3"],${s} :not(section)[style*="background:#FAF7F1"]{--pz-on-surface:#1B1B18}` +
      `${s} :not(section)[style*="background:#FFF"] ${text},${s} :not(section)[style*="background:#fff"] ${text},${s} :not(section)[style*="background:#FFFFFF"] ${text},${s} :not(section)[style*="background:#ffffff"] ${text},${s} :not(section)[style*="background:#FAF8F3"] ${text},${s} :not(section)[style*="background:#FAF7F1"] ${text}{color:#1B1B18!important}` +
      `${s} [style*="color:#FFF"],${s} [style*="color:#fff"],${s} [style*="color:#FFFFFF"],${s} [style*="color:#ffffff"],${s} [style*="color:#FAF8F3"],${s} [style*="color:#faf8f3"]{color:#FAF8F3!important}` +
      `${s} .pagzly-stacked,${s} .pagzly-stacked-body,${s} [data-diagram]{--pz-on-surface:#1B1B18;color:#1B1B18!important}` +
      `${s} .pagzly-stacked ${text},${s} .pagzly-stacked-body ${text},${s} .pagzly-stacked [data-pz-s],${s} .pagzly-stacked-body [data-pz-s],${s} [data-diagram] ${text}{color:#1B1B18!important}`;
  }
  // 479 A — 칩 규칙은 면 강제·밝은 섬보다 뒤(자기 배경 기준)
  return css + chipCss(s, text);
}

/**
 * 실제 면 칠하기 — `data-pz-face` 섹션·래퍼만(가격·고지 제외는 표식 단계에서).
 * 476 B: repeating-linear-gradient 질감 제거(단색·테두리만).
 * 478 B: 면+글자 CSS 변수 쌍으로 인라인 ink 잔존 제거.
 */
export function colorRolesCssV5(scope: string, id: ArchetypeId): string {
  const s = `${scope}[data-pz-bsig=${id}]`;
  let extra = "";
  // 476 E — 쌍 골격(초단). living≤135 여유
  if (id === "luxe") extra = `${s} section[data-pz-face]{padding:0 11%!important}${s} [data-pz-sf^=brand_story]{border-left:1px solid #0002;padding-left:8%!important}`;
  else if (id === "softlife")
    extra =
      `${s} .pagzly-compact-thumb,${s} [data-pz-cl-v5] li{border-radius:999px!important;padding:12px 16px!important;background:var(--pz-chip)!important;color:var(--pz-on-chip)!important;--pz-on-surface:var(--pz-on-chip)}` +
      `${s} [data-pz-cl-v5] li :is(p,span,strong){color:var(--pz-on-chip)!important}`;
  else if (id === "catalog") extra = `${s} [data-pz-it] .pagzly-compact-row{display:grid!important;grid-template-columns:96px 1fr}`;
  else if (id === "techsheet") extra = `${s} [data-pz-face]{font-variant-numeric:tabular-nums}${s} [data-pz-hl-g]{display:grid!important;grid-template-columns:1fr 1fr}`;
  else if (id === "impact" || id === "pop" || id === "narrative")
    extra = `${s} [data-pz-hl-c="0"]{background:#FAF8F3!important;color:#1B1B18!important;--pz-on-surface:#1B1B18}`;
  // 어두운 면(impact/narrative) + pop(면이 어두워질 수 있음)만 인라인 잉크 강제
  const forceInk = FACE[id].dark || id === "pop";
  return onSurfaceCss(s, forceInk) + extra;
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
