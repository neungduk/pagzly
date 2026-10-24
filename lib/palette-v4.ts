/**
 * 439차 2-5 — 컬러 시스템 v4. 임팩트 팔레트(대표색·진한색·잉크)에서
 *  - 톤 사다리: tint 5단(흰색 쪽 0.92~0.40 섞기) · shade 3단(검정 쪽 0.25~0.65 섞기)
 *  - 세컨더리·터셔리·포인트 3색(색상환 이동, 채도 상한 — 430차 조화 규칙과 같은 방식)
 *  - 면 역할 테이블: 배경 A(흰)·배경 B(따뜻한 중립)·강조 면(틴트)·반전 면(진한 면)·카드 면(흰+테두리)
 *  - 역할별 글자색(대비 ≥4.5 자동 보정), mood별 그라데이션 프리셋 2종(선형·방사, 2색)
 * 를 만든다. 순수 함수라 라이브·export가 같은 입력(같은 팔레트)으로 같은 값을 얻는다(패리티 0).
 * 섹션은 색을 직접 쓰지 않고 면 역할(FaceRole)을 고른다 — 반전 면은 페이지당 예산(428 명암 반전 ≤6)을 레이아웃 계획이 센다.
 */
import { contrastRatioToken, mixHex, tokenHslToRgb, tokenRgbToHex, tokenRgbToHsl } from "@/lib/design-tokens";
import { DESIGN_V4_ENABLED } from "@/lib/design-v4";
import { depthShadowOf, hairlineOf, type DepthLevel } from "@/lib/design-tokens-v4";

export type FaceRole = "bgA" | "bgB" | "emphasis" | "invert" | "card";
export const FACE_ROLES: readonly FaceRole[] = ["bgA", "bgB", "emphasis", "invert", "card"];

export type V4Palette = {
  ink: string;
  accent: string;
  deep: string;
  /** tint[0] 가장 옅음(0.92 흰색) → tint[4] 가장 진함(0.40 흰색) */
  tints: [string, string, string, string, string];
  /** shade[0] 약간 어둡게 → shade[2] 가장 어둡게 */
  shades: [string, string, string];
  secondary: string;
  tertiary: string;
  point: string;
  faces: Record<FaceRole, string>;
  /** 면 역할별 본문·제목 글자색(대비 ≥4.5) */
  onFace: Record<FaceRole, { text: string; sub: string; strong: string }>;
  /** mood별 그라데이션 2종(면 배경 옵션) */
  gradients: [string, string];
};

const INK = "#1B1B18";
const WHITE = "#FFFFFF";
export const MIN_TEXT_CONTRAST = 4.5;
/** 보조색 색상 이동 상한(도) — lib/palette-harmony.ts V4_MAX_SECONDARY_SHIFT와 같은 값 */
export const V4_SECONDARY_MAX_SHIFT = 40;

function hsl(hex: string): { h: number; s: number; l: number } {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  return tokenRgbToHsl((n >> 16) & 255, (n >> 8) & 255, n & 255);
}
function fromHsl(h: number, s: number, l: number): string {
  const [r, g, b] = tokenHslToRgb(((h % 360) + 360) % 360, Math.max(0, Math.min(1, s)), Math.max(0, Math.min(1, l)));
  return tokenRgbToHex(r, g, b).toUpperCase();
}

/** fg가 bg 위에서 min 대비가 될 때까지 fg를 어둡게(밝은 면) 또는 밝게(어두운 면) 민다 */
export function ensureContrast(fg: string, bg: string, min = MIN_TEXT_CONTRAST): string {
  if (contrastRatioToken(fg, bg) >= min) return fg;
  const darkBg = contrastRatioToken(WHITE, bg) > contrastRatioToken(INK, bg);
  for (let t = 0.1; t <= 1.0001; t += 0.1) {
    const c = mixHex(fg, darkBg ? WHITE : INK, t);
    if (contrastRatioToken(c, bg) >= min) return c;
  }
  return darkBg ? WHITE : INK;
}

/**
 * 439차 2-7 린트 3회전 — 옅은 색 면 위 작은 라벨(STEP 등) 글자를 그 면 기준 4.5:1로(DESIGN_V4). 라이브·export 공용.
 * 이전 차수 라벨색은 종이(#FAF8F3) 기준이라 틴트 면에서 3.9 안팎으로 떨어졌다. 면이 단색 헥스가 아니면(그라데이션) 그대로.
 */
export function v4TextOn(fg: string, bg: string | undefined): string {
  return DESIGN_V4_ENABLED && bg && /^#[0-9a-f]{6}$/i.test(bg) ? ensureContrast(fg, bg) : fg;
}

/**
 * 446차 1 — 테마 전경색 자동 보정(DESIGN_V4). 노랑~초록(약 30~180°)은 팔레트 곡선이 밝은 색을 줘서 deepAccent·accentText가 옅은 면 위에서 4.1 안팎,
 * accent 면 위 종이색 글자(POINT 칩·말풍선·카드 머리)가 4.1~4.4로 4.5:1에 못 미쳤다(색상환 전수 197건, 합성 픽스처를 이 색상대로 바꿔 재현).
 * 색상·채도는 유지하고 명도만 낮춘다: deepAccent·accentText는 가장 어두운 옅은 면(LIGHT_TINT_FLOOR) 위 글자로, accent는 종이색 글자를 올리는 면으로.
 * 라이브·export가 테마를 처음 받는 자리(applyPackTone 직후)에서 같은 함수를 쓴다. v4 off면 그대로.
 */
export const LIGHT_TINT_FLOOR = "#EDEDE4";
const PAPER_INK = "#FAF8F3";
function darkenKeepHue(hex: string, ok: (c: string) => boolean): string {
  if (ok(hex)) return hex;
  const { h, s, l } = hsl(hex);
  for (let L = l - 0.01; L >= 0.06; L -= 0.01) {
    const c = fromHsl(h, s, L);
    if (ok(c)) return c;
  }
  return fromHsl(h, s, 0.06);
}
export function v4SafeTheme<T extends { accent: string; deepAccent: string; accentText: string }>(theme: T): T {
  if (!DESIGN_V4_ENABLED) return theme;
  const text = (c: string) => contrastRatioToken(c, LIGHT_TINT_FLOOR) >= MIN_TEXT_CONTRAST + 0.1;
  const fill = (c: string) => contrastRatioToken(PAPER_INK, c) >= MIN_TEXT_CONTRAST + 0.1;
  const accentText = darkenKeepHue(theme.accentText, text);
  const deepAccent = darkenKeepHue(theme.deepAccent, (c) => text(c) && fill(c));
  const accent = darkenKeepHue(theme.accent, fill);
  return accent === theme.accent && deepAccent === theme.deepAccent && accentText === theme.accentText ? theme : { ...theme, accent, deepAccent, accentText };
}

/** 흰 글자가 min 대비가 될 때까지 면을 어둡게(색상 유지) */
function darkFace(hex: string, min = MIN_TEXT_CONTRAST): string {
  const { h, s, l } = hsl(hex);
  for (let L = Math.min(l, 0.42); L >= 0.06; L -= 0.02) {
    const c = fromHsl(h, Math.max(s, 0.35), L);
    if (contrastRatioToken(WHITE, c) >= min) return c;
  }
  return fromHsl(h, s, 0.08);
}

/** mood → 색상환 이동(세컨더리·터셔리·포인트)과 채도 상한 */
const MOOD_HARMONY: Record<string, { sec: number; ter: number; pt: number; cap: number }> = {
  "minimal-luxe": { sec: 0, ter: 0, pt: 30, cap: 0.18 },
  natural: { sec: 30, ter: -30, pt: 150, cap: 0.45 },
  clinic: { sec: 24, ter: -24, pt: 180, cap: 0.5 },
  playful: { sec: 120, ter: -120, pt: 60, cap: 0.72 },
  street: { sec: 180, ter: 0, pt: 60, cap: 0.75 },
  warm: { sec: 28, ter: -18, pt: 180, cap: 0.5 },
};
const DEFAULT_HARMONY = { sec: 28, ter: -28, pt: 180, cap: 0.55 };

export function v4Palette(base: { ink?: string; accent: string; deep: string }, mood?: string | null): V4Palette {
  const accent = base.accent;
  const deep = base.deep;
  const ink = base.ink ?? INK;
  const tints = [0.92, 0.84, 0.72, 0.56, 0.4].map((w) => mixHex(accent, WHITE, w)) as V4Palette["tints"];
  const shades = [0.25, 0.45, 0.65].map((k) => mixHex(deep, "#000000", k)) as V4Palette["shades"];
  const hm = (mood && MOOD_HARMONY[mood]) || DEFAULT_HARMONY;
  const a = hsl(accent);
  const s = Math.min(hm.cap, Math.max(0.2, a.s));
  // 446차 2 — 보조 색상 이동은 ±40° 안(페이지 면 색상군 ≤3: 대표색 계열 + 보조 계열 + 중립). 팝(120°)·스트리트(180°) 무드도 그라데이션 두 번째 색이 다른 색상군으로 튀지 않게
  const secShift = Math.max(-V4_SECONDARY_MAX_SHIFT, Math.min(V4_SECONDARY_MAX_SHIFT, hm.sec));
  const secondary = fromHsl(a.h + secShift, hm.sec === 0 ? s * 0.5 : s, Math.min(0.62, Math.max(0.38, a.l)));
  const tertiary = fromHsl(a.h + hm.ter, hm.ter === 0 ? s * 0.4 : s * 0.85, Math.min(0.66, Math.max(0.42, a.l + 0.06)));
  const point = fromHsl(a.h + hm.pt, Math.min(0.85, s + 0.15), 0.5);
  const faces: Record<FaceRole, string> = {
    bgA: WHITE,
    bgB: mixHex("#F6F1EA", accent, 0.04),
    emphasis: tints[1],
    invert: darkFace(shades[0]),
    card: WHITE,
  };
  const onFace = Object.fromEntries(
    FACE_ROLES.map((r) => {
      const bg = faces[r];
      const dark = r === "invert";
      const text = dark ? WHITE : ensureContrast(ink, bg);
      const sub = dark ? ensureContrast("#E9E6E1", bg) : ensureContrast(mixHex(ink, WHITE, 0.25), bg);
      const strong = dark ? ensureContrast(tints[2], bg) : ensureContrast(deep, bg);
      return [r, { text, sub, strong }];
    }),
  ) as V4Palette["onFace"];
  const gradients = gradientPresets(mood, tints, secondary);
  return { ink, accent, deep, tints, shades, secondary, tertiary, point, faces, onFace, gradients };
}

/**
 * mood별 그라데이션 2종(2색). 글자가 올라가는 면이므로 두 색 모두 옅은 틴트 영역(잉크 대비 ≥4.5)만 쓴다.
 * 미니멀=같은 색 미세 선형, 클리닉=쿨 선형, 내추럴=방사, 팝=대각 2색, 스트리트=날카로운 선형, 따뜻함=부드러운 방사.
 */
function gradientPresets(mood: string | null | undefined, t: V4Palette["tints"], secondary: string): [string, string] {
  const sec = mixHex(secondary, WHITE, 0.82);
  switch (mood) {
    case "minimal-luxe": return [`linear-gradient(180deg,${t[0]} 0%,#FFFFFF 100%)`, `linear-gradient(90deg,#FFFFFF 0%,${t[0]} 100%)`];
    case "clinic": return [`linear-gradient(180deg,${t[0]} 0%,${sec} 100%)`, `linear-gradient(135deg,#FFFFFF 0%,${t[1]} 100%)`];
    case "natural": return [`radial-gradient(120% 80% at 20% 0%,${t[1]} 0%,#FFFFFF 70%)`, `linear-gradient(160deg,${t[0]} 0%,${sec} 100%)`];
    case "playful": return [`linear-gradient(135deg,${t[1]} 0%,${sec} 100%)`, `radial-gradient(90% 70% at 80% 10%,${sec} 0%,${t[0]} 75%)`];
    case "street": return [`linear-gradient(100deg,${t[1]} 0%,${t[1]} 48%,${t[0]} 48%,${t[0]} 100%)`, `linear-gradient(180deg,${t[0]} 0%,#FFFFFF 100%)`];
    case "warm": return [`radial-gradient(110% 80% at 50% 0%,${mixHex("#F6EADB", t[1], 0.4)} 0%,#FFFFFF 75%)`, `linear-gradient(180deg,${t[0]} 0%,${mixHex("#F6F1EA", t[0], 0.5)} 100%)`];
    default: return [`linear-gradient(180deg,${t[0]} 0%,#FFFFFF 100%)`, `linear-gradient(135deg,#FFFFFF 0%,${t[1]} 100%)`];
  }
}

/** 그라데이션 문자열 안의 색(헥스)들 — 대비 검사용 */
export function gradientStops(g: string): string[] {
  return g.match(/#[0-9A-Fa-f]{6}/g) ?? [];
}

// ── 카드 깊이 토큰(441차 1-4) ──────────────────────────────────────────────────
/**
 * v4 카드 그림자 3단계 + hairline 테두리. 이전엔 v4 마크업에 그림자 7종(0 6px 16px … 0 14px 30px, 알파 0.06~0.14)이 섞여 있었다.
 * none: 면만 / soft: 목록 속 카드(번호 카드 등) / float: 사진·겹침 카드처럼 면 위에 떠 있는 것. mood(applyMood)가 알파를 다시 두 단계로 곱한다.
 */
export type { DepthLevel };
export const depthShadow = depthShadowOf; // 값의 원천은 lib/design-tokens-v4.ts(SHADOW_V4) 한 곳
/** 카드 테두리 한 가지(잉크 10%) */
export const hairline = hairlineOf;

/**
 * 442차 1 — 일러스트 배너 배경 스크림(DESIGN_V4, 그라데이션 오버레이만, filter 없음). 이전 스크림은 가운데 띠(28~55%)가 투명해
 * 배경 사진 속 제품 라벨 글자("Glow")가 제목 카드 옆으로 읽혔다. 가운데도 deep 62%로 눌러 배경 글자가 읽히지 않게 한다.
 * 제목은 어두운 카드(잉크 90%) 위 글자라 대비는 그대로(4.5 이상).
 */
export const bannerScrimV4 = (deepHex: string): string =>
  `linear-gradient(180deg, ${hexToRgbaLocal(deepHex, 0.78)} 0%, ${hexToRgbaLocal(deepHex, 0.62)} 35%, ${hexToRgbaLocal(deepHex, 0.62)} 55%, ${hexToRgbaLocal(deepHex, 0.86)} 100%)`;
function hexToRgbaLocal(hex: string, a: number): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
