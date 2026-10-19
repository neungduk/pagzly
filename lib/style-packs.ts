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
  id: StylePackId;
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

/** 없거나 모르는 id, 패션이 아닌 카테고리는 항상 classic */
export function resolveStylePack(category: string, id?: string | null): StylePack {
  if (category !== PACK_CATEGORY || !id) return CLASSIC_PACK;
  return FASHION_PACKS.find((p) => p.id === id) ?? CLASSIC_PACK;
}

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
