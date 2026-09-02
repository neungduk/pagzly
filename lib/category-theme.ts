// 카테고리별 상세페이지 테마. DetailSectionRenderer가 category를 받아
// 이 테이블에서 팔레트/아이콘을 찾아 적용한다. 매핑에 없는 카테고리는
// DEFAULT_THEME으로 폴백.
//
// 팔레트는 DESIGN_SYSTEM 브랜드 토큰(ink / paper / slate-blue /
// registration-red / mustard)만 사용한다.

import { BRAND, BRAND_SOFT, mixHex } from "@/lib/design-tokens";

export type CategoryTheme = {
  accent: string;
  accentSoft: string;
  accentText: string;
  heroScrimFrom: string;
  baseNeutral: string;
  deepAccent: string;
  icon: string;
};

function theme(
  accent: string,
  accentSoft: string,
  accentText: string,
  heroScrimFrom: string,
  baseNeutral: string,
  deepAccent: string,
  icon: string,
): CategoryTheme {
  return { accent, accentSoft, accentText, heroScrimFrom, baseNeutral, deepAccent, icon };
}

/** 58차 — 카테고리별 옅은 바탕색 (BRAND.paper + accent 4~7% 혼합, slateBlue 공유 카테고리는 틴트 방향 분리) */
const BASE_NEUTRAL = {
  fashion: mixHex(BRAND.paper, BRAND.ink, 0.08),
  cosmetics: mixHex(BRAND.paper, BRAND.slateBlue, 0.07),
  food: mixHex(BRAND.paper, BRAND.mustard, 0.07),
  /** 화장품보다 차갑고 밝은 쿨 그레이 — accent는 동일 slateBlue 유지 */
  electronics: mixHex("#F7FAFC", "#8FAFC4", 0.14),
  /** 세이지 그레이 — 화장품·전자와 구분 */
  living: mixHex(BRAND.paper, "#5A8A72", 0.07),
  pet: mixHex(BRAND.paper, BRAND.registrationRed, 0.06),
  default: mixHex(BRAND.paper, BRAND.slateBlue, 0.05),
} as const;

export const DEFAULT_THEME: CategoryTheme = theme(
  BRAND.slateBlue,
  BRAND_SOFT.slate,
  BRAND.slateBlue,
  "rgba(47,72,88,0.75)",
  BASE_NEUTRAL.default,
  "#1F3340",
  "Sparkles",
);

export const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  "의류/패션": theme(
    BRAND.ink,
    "#F0EEEA",
    BRAND.ink,
    "rgba(27,27,24,0.72)",
    BASE_NEUTRAL.fashion,
    BRAND.ink,
    "Shirt",
  ),
  "화장품/뷰티": theme(
    BRAND.slateBlue,
    BRAND_SOFT.slate,
    BRAND.slateBlue,
    "rgba(47,72,88,0.7)",
    BASE_NEUTRAL.cosmetics,
    "#1F3340",
    "Sparkles",
  ),
  "식품/건강기능식품": theme(
    BRAND.mustard,
    BRAND_SOFT.mustard,
    "#92400E",
    "rgba(179,120,30,0.72)",
    BASE_NEUTRAL.food,
    "#B8871F",
    "Leaf",
  ),
  "전자제품": theme(
    BRAND.slateBlue,
    BRAND_SOFT.slate,
    BRAND.slateBlue,
    "rgba(31,51,64,0.78)",
    BASE_NEUTRAL.electronics,
    "#1F3340",
    "Cpu",
  ),
  "생활용품": theme(
    BRAND.slateBlue,
    BRAND_SOFT.slate,
    BRAND.slateBlue,
    "rgba(47,72,88,0.68)",
    BASE_NEUTRAL.living,
    "#243845",
    "Leaf",
  ),
  "반려동물": theme(
    BRAND.registrationRed,
    BRAND_SOFT.red,
    BRAND.registrationRed,
    "rgba(193,39,45,0.68)",
    BASE_NEUTRAL.pet,
    "#9A1F24",
    "PawPrint",
  ),
  "기타": DEFAULT_THEME,
};

export function getCategoryTheme(category: string): CategoryTheme {
  return CATEGORY_THEMES[category] ?? DEFAULT_THEME;
}
