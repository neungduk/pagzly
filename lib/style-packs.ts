/**
 * 408차 — 스타일 팩(디자이너가 정한 값 묶음). 지금은 의류/패션만, 3종.
 *  classic = 지금 디자인(값 없음 → 기존 코드 경로 그대로), mono-minimal, editorial.
 * 팩은 "표시 단계"에서만 적용된다 — 생성·저장된 섹션 문구·사진·theme(hue)은 바뀌지 않는다.
 * 라이브(DetailSectionRenderer)와 export(buildDetailPageHtml)는 같은 팩 객체·같은 함수를 쓴다.
 * 서체는 기존 Noto Sans/Serif 2종 안에서 굵기·자간만 바꾼다(새 웹폰트 없음).
 */
import type { CategoryTheme } from "@/lib/category-theme";
import type { TitleScaleOverrides } from "@/lib/design-tokens";
import { isHeroKeptOriginal } from "@/lib/fashion-composite-policy";

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

/** 409차 — 구조 변형(열거값/숫자). classic 값 = 지금 화면과 같은 동작 */
export type HeroVariant = "bleed-bottom" | "caption-below" | "caption-above";
export type FlowVariant = "default" | "photo-first" | "story-after-photo";
export type GalleryVariant = "duo-grid" | "lookbook-stack" | "lead-plus-two";
export type SummaryVariant = "icon-grid" | "spec-list" | "inline-strip";
export type ChecklistVariant = "cards" | "plain-list";
export type HeadingVariant = "center-stack" | "left-eyebrow" | "center-rule";
export type PackLayout = {
  hero: HeroVariant;
  flow: FlowVariant;
  gallery: GalleryVariant;
  summary: SummaryVariant;
  /** 410차 — 요약 띠 위치: 히어로 바로 뒤(classic) / 첫 갤러리 뒤(사진이 먼저 오게). 갤러리가 히어로 바로 뒤가 아니면 앞에 둔다 */
  summaryPlacement: "after-hero" | "after-gallery";
  /** 410차 — 앵커 내비: 알약(classic) / 밑줄 탭(글자 + 가는 선 구분) */
  anchor: "pills" | "tabs";
  checklist: ChecklistVariant;
  heading: HeadingVariant;
  /** 알약·카드·칩·갤러리·표 모서리 px. null = 지금 값 그대로(classic) */
  radius: number | null;
  rule: "none" | "hairline";
  density: "full" | "compact";
  /** 본문 글자 크기(px)·줄 높이. null = 지금 값 그대로 */
  body: { sizePx: number; line: number } | null;
};

export const CLASSIC_LAYOUT: PackLayout = {
  hero: "bleed-bottom",
  flow: "default",
  gallery: "duo-grid",
  summary: "icon-grid",
  summaryPlacement: "after-hero",
  anchor: "pills",
  checklist: "cards",
  heading: "center-stack",
  radius: null,
  rule: "none",
  density: "full",
  body: null,
};

export type StylePack = {
  layout: PackLayout;
  /** 프리셋 id(StylePackId) 또는 조합 스펙 코드("x:{...}", 413차) */
  id: string;
  label: string;
  blurb: string;
  /** 409차 — 선택칸 한 줄 설명(15자 안쪽, UI 라벨) */
  short: string;
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
  short: "지금 기본 디자인",
  headline: null,
  titleScale: {},
  padYScale: 1,
  heroGradientStrength: 1,
  layout: CLASSIC_LAYOUT,
  tone: null,
};

const MONO_MINIMAL: StylePack = {
  id: "mono-minimal",
  label: "모노 미니멀",
  blurb: "차분한 톤 · 가는 고딕 제목 · 넉넉한 여백",
  short: "사진 먼저, 작은 제목",
  headline: { kind: "sans-display", weight: 600, letterSpacing: "-0.03em" },
  titleScale: {
    hero: { base: "2.5rem", wide: "4rem" },
    section: { base: "1.625rem", wide: "2.25rem" },
    subtitle: { base: "1.125rem", wide: "1.25rem" },
  },
  padYScale: 1.25,
  heroGradientStrength: 0.6,
  layout: {
    hero: "caption-above",
    flow: "story-after-photo",
    gallery: "lookbook-stack",
    summary: "inline-strip",
    summaryPlacement: "after-hero",
    anchor: "tabs",
    checklist: "plain-list",
    heading: "left-eyebrow",
    radius: 0,
    rule: "hairline",
    density: "compact",
    body: { sizePx: 15, line: 1.7 },
  },
  tone: { satMul: 0.3, accentL: 0.24, deepL: 0.11, softL: 0.94, softSatMul: 0.25, baseL: 0.955, baseSatMul: 0.3 },
};

const EDITORIAL: StylePack = {
  id: "editorial",
  label: "에디토리얼",
  blurb: "큰 명조 제목 · 아이보리 톤 · 넉넉한 여백",
  short: "큰 제목, 사진 아래 글",
  headline: { kind: "serif", weight: 600, letterSpacing: "-0.015em" },
  titleScale: {
    hero: { base: "2.75rem", wide: "4.5rem" },
    section: { base: "2.125rem", wide: "2.75rem" },
    subtitle: { base: "1.25rem", wide: "1.5rem" },
  },
  padYScale: 1.3,
  heroGradientStrength: 0.85,
  layout: {
    hero: "caption-below",
    flow: "default",
    gallery: "lead-plus-two",
    summary: "spec-list",
    summaryPlacement: "after-gallery",
    anchor: "tabs",
    checklist: "plain-list",
    heading: "center-rule",
    radius: 0,
    rule: "hairline",
    density: "full",
    body: { sizePx: 16, line: 1.8 },
  },
  tone: { satMul: 0.55, accentL: 0.3, deepL: 0.15, softL: 0.92, softSatMul: 0.45, baseL: 0.945, baseSatMul: 0.35, baseHue: 40, baseSat: 0.45 },
};

const FASHION_PACKS: StylePack[] = [CLASSIC_PACK, MONO_MINIMAL, EDITORIAL];

/** 팩을 고를 수 있는 카테고리(지금은 패션만) */
const PACK_CATEGORY = "의류/패션";

/** 선택칸에 보여 줄 팩 목록 — 패션이 아니면 빈 배열(선택칸을 두지 않는다) */
export function stylePackOptions(category: string): StylePack[] {
  return category === PACK_CATEGORY ? FASHION_PACKS : [];
}

/** 없거나 모르는 id, 패션이 아닌 카테고리는 항상 classic. 프리셋 id 또는 413차 조합 스펙 코드("x:…")를 받는다 */
export function resolveStylePack(category: string, id?: string | null): StylePack {
  if (category !== PACK_CATEGORY || !id) return CLASSIC_PACK;
  const preset = FASHION_PACKS.find((p) => p.id === id);
  if (preset) return preset;
  if (id.startsWith(SPEC_PREFIX)) return packFromCode(id) ?? CLASSIC_PACK;
  return CLASSIC_PACK;
}
/** 413차 — resolveStylePack의 새 이름(같은 함수). 프리셋 id/스펙 코드를 해석된 스펙으로 푼다 */
export const resolveStyleSpec = resolveStylePack;

/** 라이브·export가 같은 곳에서 구조 변형 값을 받는다. 팩 없음 = classic */
export function getPackLayout(pack: StylePack | undefined | null): PackLayout {
  return pack?.layout ?? CLASSIC_LAYOUT;
}

/**
 * 폴백 규칙 — 변형이 요구하는 입력이 없으면 classic 방식으로 되돌린다.
 *  히어로: 사진이 없으면 bleed-bottom / 갤러리: 사진 2장 미만이면 duo-grid, lead-plus-two는 3장 미만이면 duo-grid
 *  소제목: 라벨(STEP/POINT/번호)이 없으면 left-eyebrow도 center-stack
 */
export function resolveHeroVariant(layout: PackLayout, hasPhoto: boolean): HeroVariant {
  return hasPhoto ? layout.hero : "bleed-bottom";
}
export function resolveGalleryVariant(layout: PackLayout, photoCount: number): GalleryVariant {
  if (photoCount < 2) return "duo-grid";
  if (layout.gallery === "lead-plus-two" && photoCount < 3) return "duo-grid";
  return layout.gallery;
}
export function resolveHeadingVariant(layout: PackLayout, hasLabel: boolean): HeadingVariant {
  if (layout.heading === "left-eyebrow" && !hasLabel) return "center-stack";
  return layout.heading;
}

/** 409차 — 세로 여백 배율. density compact는 글만 있는 반복 카드·구분 여백이 길어 보이지 않게 0.85배로 조인다(섹션을 감추지는 않는다) */
export function packPadScale(pack: StylePack | undefined | null): number {
  return (pack?.padYScale ?? 1) * (pack?.layout.density === "compact" ? 0.85 : 1);
}

/**
 * 409차 — 패션 classic 히어로(원본 인물 사진)의 하단 그라데이션 세기. 푸른 그라데이션이 청바지·흰 티를 탁하게 덮는 문제(408차 6절)를 줄인다.
 * 패션이 아니거나, 팩이 있거나, 히어로가 원본 인물 사진이 아니면 undefined(= 지금 값 그대로).
 */
export const CLASSIC_FASHION_HERO_STRENGTH = 0.7;
export function classicFashionHeroStrength(
  category: string,
  pack: StylePack | undefined | null,
  roles: readonly unknown[] | undefined,
): number | undefined {
  if (category !== PACK_CATEGORY || !isClassicPack(pack) || !isHeroKeptOriginal(category, roles)) return undefined;
  return CLASSIC_FASHION_HERO_STRENGTH;
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
  // 409차 — 팩의 본문 글자 크기(layout.body)는 제목 크기와 같은 변수 경로(--pz-t-body-*)로 덮는다. 줄 높이는 지금 값 그대로
  const base = pack?.titleScale ?? {};
  const body = pack?.layout.body;
  if (!body) return base;
  const rem = `${body.sizePx / 16}rem`;
  return { ...base, body: { base: rem, wide: rem } };
}

// ---------------------------------------------------------------------------
// 413차 — 조합형 스타일 스펙. 팩 = 축 값의 조합(SpecAxes). 기존 3팩은 프리셋이고, 조합은 문자열 코드("x:{…}")로
// 같은 prop(stylePackId)에 실려 라이브·export·저장(sessionStorage)을 그대로 지난다. DB·서버에 저장하지 않는다.
// 같은 축 값이면 같은 코드·같은 StylePack이다(프리셋과 같은 조합이면 프리셋 객체 그대로 돌려줘 바이트까지 같다).
// ---------------------------------------------------------------------------

export const SPEC_PREFIX = "x:";

/** 제목 크기 묶음(이름으로 코드에 싣는다). base = 덮어쓰기 없음 */
export const TITLE_SCALES: Record<string, TitleScaleOverrides> = {
  base: {},
  mono: {
    hero: { base: "2.5rem", wide: "4rem" },
    section: { base: "1.625rem", wide: "2.25rem" },
    subtitle: { base: "1.125rem", wide: "1.25rem" },
  },
  editorial: {
    hero: { base: "2.75rem", wide: "4.5rem" },
    section: { base: "2.125rem", wide: "2.75rem" },
    subtitle: { base: "1.25rem", wide: "1.5rem" },
  },
};
export type TitleScaleName = string;

export type SpecAxes = {
  hero: HeroVariant;
  flow: FlowVariant;
  gallery: GalleryVariant;
  summary: SummaryVariant;
  summaryPlacement: PackLayout["summaryPlacement"];
  anchor: PackLayout["anchor"];
  checklist: ChecklistVariant;
  heading: HeadingVariant;
  radius: number | null;
  rule: PackLayout["rule"];
  density: PackLayout["density"];
  body: PackLayout["body"];
  /** 제목 서체: Noto Serif/Sans 2종 안의 굵기·자간(em). null = 지금 값 */
  headline: { kind: "serif" | "sans-display"; weight: number; ls: number } | null;
  scale: TitleScaleName;
  padY: number;
  heroGrad: number;
  tone: ToneSpec | null;
};

export const SPEC_ENUMS = {
  hero: ["bleed-bottom", "caption-below", "caption-above"],
  flow: ["default", "photo-first", "story-after-photo"],
  gallery: ["duo-grid", "lookbook-stack", "lead-plus-two"],
  summary: ["icon-grid", "spec-list", "inline-strip"],
  summaryPlacement: ["after-hero", "after-gallery"],
  anchor: ["pills", "tabs"],
  checklist: ["cards", "plain-list"],
  heading: ["center-stack", "left-eyebrow", "center-rule"],
  rule: ["none", "hairline"],
  density: ["full", "compact"],
} as const;

/** 스펙 → StylePack(id는 코드). 프리셋과 같은 조합이면 프리셋 객체를 그대로 돌려준다 */
export function packFromSpec(axes: SpecAxes): StylePack {
  const code = encodeSpec(axes);
  for (const p of FASHION_PACKS) if (encodeSpec(specOfPack(p)) === code) return p;
  const layout: PackLayout = {
    hero: axes.hero,
    flow: axes.flow,
    gallery: axes.gallery,
    summary: axes.summary,
    summaryPlacement: axes.summaryPlacement,
    anchor: axes.anchor,
    checklist: axes.checklist,
    heading: axes.heading,
    radius: axes.radius,
    rule: axes.rule,
    density: axes.density,
    body: axes.body,
  };
  const label = specLabel(axes);
  return {
    id: code,
    label,
    blurb: label,
    short: label,
    headline: axes.headline ? { kind: axes.headline.kind, weight: axes.headline.weight, letterSpacing: `${axes.headline.ls}em` } : null,
    titleScale: TITLE_SCALES[axes.scale] ?? {},
    padYScale: axes.padY,
    heroGradientStrength: axes.heroGrad,
    layout,
    tone: axes.tone,
  };
}

/** StylePack(프리셋) → 축 값. 프리셋의 titleScale은 이름 표에서 같은 값을 찾는다 */
export function specOfPack(pack: StylePack): SpecAxes {
  const l = pack.layout;
  const scale = Object.keys(TITLE_SCALES).find((k) => JSON.stringify(TITLE_SCALES[k]) === JSON.stringify(pack.titleScale)) ?? "base";
  return {
    hero: l.hero,
    flow: l.flow,
    gallery: l.gallery,
    summary: l.summary,
    summaryPlacement: l.summaryPlacement,
    anchor: l.anchor,
    checklist: l.checklist,
    heading: l.heading,
    radius: l.radius,
    rule: l.rule,
    density: l.density,
    body: l.body,
    headline: pack.headline ? { kind: pack.headline.kind, weight: pack.headline.weight, ls: parseFloat(pack.headline.letterSpacing) } : null,
    scale,
    padY: pack.padYScale,
    heroGrad: pack.heroGradientStrength,
    tone: pack.tone,
  };
}

const KEYS: Array<keyof SpecAxes> = [
  "hero", "flow", "gallery", "summary", "summaryPlacement", "anchor", "checklist", "heading",
  "radius", "rule", "density", "body", "headline", "scale", "padY", "heroGrad", "tone",
];
/** 키 순서가 고정된 JSON → 같은 축 값이면 같은 문자열 */
export function encodeSpec(axes: SpecAxes): string {
  const o: Record<string, unknown> = {};
  for (const k of KEYS) o[k] = axes[k];
  return SPEC_PREFIX + JSON.stringify(o);
}

const num = (v: unknown, lo: number, hi: number): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null);
const oneOf = <T extends string>(list: readonly T[], v: unknown): T | null => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null);

/** 코드 → 축 값. 하나라도 열거값/숫자 범위를 벗어나면 null(호출부가 classic으로 폴백) */
export function decodeSpec(code: string): SpecAxes | null {
  if (!code.startsWith(SPEC_PREFIX) || code.length > 1200) return null;
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(code.slice(SPEC_PREFIX.length));
  } catch {
    return null;
  }
  if (!o || typeof o !== "object") return null;
  const hero = oneOf(SPEC_ENUMS.hero, o.hero);
  const flow = oneOf(SPEC_ENUMS.flow, o.flow);
  const gallery = oneOf(SPEC_ENUMS.gallery, o.gallery);
  const summary = oneOf(SPEC_ENUMS.summary, o.summary);
  const summaryPlacement = oneOf(SPEC_ENUMS.summaryPlacement, o.summaryPlacement);
  const anchor = oneOf(SPEC_ENUMS.anchor, o.anchor);
  const checklist = oneOf(SPEC_ENUMS.checklist, o.checklist);
  const heading = oneOf(SPEC_ENUMS.heading, o.heading);
  const rule = oneOf(SPEC_ENUMS.rule, o.rule);
  const density = oneOf(SPEC_ENUMS.density, o.density);
  const scale = typeof o.scale === "string" && o.scale in TITLE_SCALES ? o.scale : null;
  const padY = num(o.padY, 0.8, 1.6);
  const heroGrad = num(o.heroGrad, 0, 1.2);
  const radius = o.radius === null ? null : num(o.radius, 0, 24);
  if (!hero || !flow || !gallery || !summary || !summaryPlacement || !anchor || !checklist || !heading || !rule || !density || !scale || padY === null || heroGrad === null) return null;
  if (o.radius !== null && radius === null) return null;
  let body: SpecAxes["body"] = null;
  if (o.body !== null) {
    const b = o.body as { sizePx?: unknown; line?: unknown } | undefined;
    const sizePx = num(b?.sizePx, 14, 18);
    const line = num(b?.line, 1.5, 2);
    if (sizePx === null || line === null) return null;
    body = { sizePx, line };
  }
  let headline: SpecAxes["headline"] = null;
  if (o.headline !== null) {
    const h = o.headline as { kind?: unknown; weight?: unknown; ls?: unknown } | undefined;
    const kind = oneOf(["serif", "sans-display"] as const, h?.kind);
    const weight = num(h?.weight, 400, 900);
    const ls = num(h?.ls, -0.06, 0.04);
    if (!kind || weight === null || ls === null) return null;
    headline = { kind, weight, ls };
  }
  let tone: ToneSpec | null = null;
  if (o.tone !== null) {
    const t = o.tone as Record<string, unknown> | undefined;
    const satMul = num(t?.satMul, 0, 1.4);
    const accentL = num(t?.accentL, 0.15, 0.5);
    const deepL = num(t?.deepL, 0.06, 0.3);
    const softL = num(t?.softL, 0.85, 0.98);
    const softSatMul = num(t?.softSatMul, 0, 1);
    const baseL = num(t?.baseL, 0.9, 0.99);
    const baseSatMul = num(t?.baseSatMul, 0, 1);
    if (satMul === null || accentL === null || deepL === null || softL === null || softSatMul === null || baseL === null || baseSatMul === null) return null;
    tone = { satMul, accentL, deepL, softL, softSatMul, baseL, baseSatMul };
    if (t?.baseHue !== undefined || t?.baseSat !== undefined) {
      const bh = num(t?.baseHue, 0, 360);
      const bs = num(t?.baseSat, 0, 1);
      if (bh === null || bs === null) return null;
      tone.baseHue = bh;
      tone.baseSat = bs;
    }
  }
  return { hero, flow, gallery, summary, summaryPlacement, anchor, checklist, heading, radius, rule, density, body, headline, scale, padY, heroGrad, tone };
}

export function packFromCode(code: string): StylePack | null {
  const axes = decodeSpec(code);
  return axes ? packFromSpec(axes) : null;
}

const HERO_LABEL: Record<string, string> = { "bleed-bottom": "사진 위 제목", "caption-below": "사진 아래 제목", "caption-above": "제목 먼저" };
const FLOW_LABEL: Record<string, string> = { "photo-first": "사진 먼저", "story-after-photo": "사진 먼저" };
const GALLERY_LABEL: Record<string, string> = { "lookbook-stack": "룩북", "lead-plus-two": "큰 컷+2열" };
/** 축 값으로 자동 서술하는 짧은 UI 라벨(새 문구가 아니라 축 이름의 조합) */
export function specLabel(axes: SpecAxes): string {
  const face = axes.headline ? (axes.headline.kind === "serif" ? "명조" : "고딕") : "기본";
  return [HERO_LABEL[axes.hero] ?? axes.hero, FLOW_LABEL[axes.flow], GALLERY_LABEL[axes.gallery], face].filter(Boolean).join(" · ");
}
