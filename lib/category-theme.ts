// 카테고리별 상세페이지 테마. DetailSectionRenderer가 category를 받아
// 이 테이블에서 팔레트/아이콘을 찾아 적용한다. 매핑에 없는 카테고리는
// DEFAULT_THEME으로 폴백.
//
// 팔레트는 DESIGN_SYSTEM 브랜드 토큰(ink / paper / slate-blue /
// registration-red / mustard)만 사용한다.

import { BRAND, BRAND_SOFT } from "@/lib/design-tokens";

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

export const DEFAULT_THEME: CategoryTheme = theme(
  BRAND.slateBlue,
  BRAND_SOFT.slate,
  BRAND.slateBlue,
  "rgba(47,72,88,0.75)",
  BRAND.paper,
  "#1F3340",
  "Sparkles",
);

export const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  "의류/패션": theme(
    BRAND.ink,
    "#F0EEEA",
    BRAND.ink,
    "rgba(27,27,24,0.72)",
    BRAND.paper,
    BRAND.ink,
    "Shirt",
  ),
  "화장품/뷰티": theme(
    BRAND.slateBlue,
    BRAND_SOFT.slate,
    BRAND.slateBlue,
    "rgba(47,72,88,0.7)",
    BRAND.paper,
    "#1F3340",
    "Sparkles",
  ),
  "식품/건강기능식품": theme(
    BRAND.mustard,
    BRAND_SOFT.mustard,
    "#92400E",
    "rgba(179,120,30,0.72)",
    BRAND.paper,
    "#B8871F",
    "Leaf",
  ),
  "전자제품": theme(
    BRAND.slateBlue,
    BRAND_SOFT.slate,
    BRAND.slateBlue,
    "rgba(31,51,64,0.78)",
    "#F5F7F8",
    "#1F3340",
    "Cpu",
  ),
  "생활용품": theme(
    BRAND.slateBlue,
    BRAND_SOFT.slate,
    BRAND.slateBlue,
    "rgba(47,72,88,0.68)",
    BRAND.paper,
    "#243845",
    "Leaf",
  ),
  "반려동물": theme(
    BRAND.registrationRed,
    BRAND_SOFT.red,
    BRAND.registrationRed,
    "rgba(193,39,45,0.68)",
    BRAND.paper,
    "#9A1F24",
    "PawPrint",
  ),
  "기타": DEFAULT_THEME,
};

export function getCategoryTheme(category: string): CategoryTheme {
  return CATEGORY_THEMES[category] ?? DEFAULT_THEME;
}
