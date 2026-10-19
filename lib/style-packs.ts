/**
 * 408차 — 스타일 팩(디자이너가 정한 값 묶음). 지금은 의류/패션만, 3종.
 *  classic = 지금 디자인(값 없음 → 기존 코드 경로 그대로), mono-minimal, editorial.
 * 팩은 "표시 단계"에서만 적용된다 — 생성·저장된 섹션 문구·사진·theme(hue)은 바뀌지 않는다.
 * 라이브(DetailSectionRenderer)와 export(buildDetailPageHtml)는 같은 팩 객체·같은 함수를 쓴다.
 * 서체는 기존 Noto Sans/Serif 2종 안에서 굵기·자간만 바꾼다(새 웹폰트 없음).
 */
import type { CategoryTheme } from "@/lib/category-theme";
import type { TitleScaleOverrides } from "@/lib/design-tokens";

export type StylePackId = "classic" | "mono-minimal" | "editorial";

/** 색 톤 곡선 — hue는 세션 theme의 것을 그대로 쓰고 채도·밝기만 바꾼다 */
type ToneSpec = {
  /** accent·accentText·deepAccent 채도 배율 */
  satMul: number;
  accentL: number;
  deepL: number;
  softL: number;
  softSatMul: number;
  baseL: number;
  baseSatMul: number;
  /** 있으면 baseNeutral만 이 색상(hue)·채도로 고정(에디토리얼 아이보리). 상품 hue와 무관한 중립 띠 색 */
  baseHue?: number;
  baseSat?: number;
};

export type StylePack = {
  id: StylePackId;
  label: string;
  blurb: string;
  headline: { kind: "serif" | "sans-display"; weight: number; letterSpacing: string } | null;
  titleScale: TitleScaleOverrides;
  /** 섹션 위·아래 여백 배율(1 = 기존) */
  padYScale: number;
  /** 히어로 하단 그라데이션 세기 배율(1 = 기존) */
  heroGradientStrength: number;
  tone: ToneSpec | null;
};

export const CLASSIC_PACK: StylePack = {
  id: "classic",
  label: "클래식",
  blurb: "지금 기본 디자인",
  headline: null,
  titleScale: {},
  padYScale: 1,
  heroGradientStrength: 1,
  tone: null,
};

const MONO_MINIMAL: StylePack = {
  id: "mono-minimal",
  label: "모노 미니멀",
  blurb: "차분한 톤 · 가는 고딕 제목 · 넉넉한 여백",
  headline: { kind: "sans-display", weight: 600, letterSpacing: "-0.03em" },
  titleScale: {
    hero: { base: "2.5rem", wide: "4rem" },
    section: { base: "1.625rem", wide: "2.25rem" },
    subtitle: { base: "1.125rem", wide: "1.25rem" },
  },
  padYScale: 1.25,
  heroGradientStrength: 0.6,
  tone: { satMul: 0.3, accentL: 0.24, deepL: 0.11, softL: 0.94, softSatMul: 0.25, baseL: 0.955, baseSatMul: 0.3 },
};

const EDITORIAL: StylePack = {
  id: "editorial",
  label: "에디토리얼",
  blurb: "큰 명조 제목 · 아이보리 톤 · 넉넉한 여백",
  headline: { kind: "serif", weight: 600, letterSpacing: "-0.015em" },
  titleScale: {
    hero: { base: "3.25rem", wide: "5rem" },
    section: { base: "2.125rem", wide: "2.75rem" },
    subtitle: { base: "1.25rem", wide: "1.5rem" },
  },
  padYScale: 1.3,
  heroGradientStrength: 0.85,
  tone: { satMul: 0.55, accentL: 0.3, deepL: 0.15, softL: 0.92, softSatMul: 0.45, baseL: 0.945, baseSatMul: 0.35, baseHue: 40, baseSat: 0.45 },
};

const FASHION_PACKS: StylePack[] = [CLASSIC_PACK, MONO_MINIMAL, EDITORIAL];

/** 팩을 고를 수 있는 카테고리(지금은 패션만) */
const PACK_CATEGORY = "의류/패션";

/** 선택칸에 보여 줄 팩 목록 — 패션이 아니면 빈 배열(선택칸을 두지 않는다) */
export function stylePackOptions(category: string): StylePack[] {
  return category === PACK_CATEGORY ? FASHION_PACKS : [];
}

/** 없거나 모르는 id, 패션이 아닌 카테고리는 항상 classic */
export function resolveStylePack(category: string, id?: string | null): StylePack {
  if (category !== PACK_CATEGORY || !id) return CLASSIC_PACK;
  return FASHION_PACKS.find((p) => p.id === id) ?? CLASSIC_PACK;
}

export function isClassicPack(pack: StylePack | undefined | null): boolean {
  return !pack || pack.id === "classic";
}

// ---------------------------------------------------------------------------
// 색 톤 — hex ↔ HSL (순수 계산, design-tokens와 순환하지 않게 이 파일에 둔다)
// ---------------------------------------------------------------------------

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) => Math.max(0, Math.min(255, Math.round((v + m) * 255))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

function retone(hex: string, satMul: number, light: number, hueOverride?: number): string {
  const { h, s } = hexToHsl(hex);
  return hslToHex(hueOverride ?? h, Math.min(1, s * satMul), light);
}

/**
 * 세션 theme(사진 hue → getPaletteCurve 고정 곡선 결과)을 팩의 톤 곡선으로 다시 칠한다.
 * hue는 그대로, 채도·밝기만 교체. 기본 팩은 같은 객체를 돌려준다(값 불변).
 */
export function applyPackTone<T extends Omit<CategoryTheme, "icon"> & { icon?: string }>(theme: T, pack: StylePack | undefined | null): T {
  const strength = pack?.heroGradientStrength ?? 1;
  const tone = pack?.tone;
  if (!tone) return strength === 1 ? theme : { ...theme, heroGradientStrength: strength };
  const deepAccent = retone(theme.deepAccent, tone.satMul, tone.deepL);
  return {
    ...theme,
    accent: retone(theme.accent, tone.satMul, tone.accentL),
    accentText: retone(theme.accentText, tone.satMul, tone.accentL),
    accentSoft: retone(theme.accentSoft, tone.softSatMul, tone.softL),
    baseNeutral:
      tone.baseHue != null && tone.baseSat != null
        ? hslToHex(tone.baseHue, tone.baseSat, tone.baseL)
        : retone(theme.baseNeutral, tone.baseSatMul, tone.baseL, tone.baseHue),
    deepAccent,
    ...(strength === 1 ? {} : { heroGradientStrength: strength }),
    heroScrimFrom: `rgba(${parseInt(deepAccent.slice(1, 3), 16)},${parseInt(deepAccent.slice(3, 5), 16)},${parseInt(deepAccent.slice(5, 7), 16)},0.6)`,
  };
}

/** 팩의 제목 크기 덮어쓰기 — 라이브 루트 style(-b/-w)과 export :root(--pz-t-*) 양쪽이 같은 값을 쓴다 */
export function packTitleScaleOverrides(pack: StylePack | undefined | null): TitleScaleOverrides {
  return pack?.titleScale ?? {};
}
