// 상세페이지 디자인 시스템 v1 (review/DESIGN_SYSTEM.md 참고)의 고정값 모음.
// AI(DeepSeek)는 색상/여백/이미지 비율을 임의로 만들지 않고, 이 파일이
// 정의하는 값만 참조한다. 섹션 컴포넌트는 반드시 이 토큰을 통해서만
// 배경색/여백/이미지 비율을 결정해야 한다.

import type { CategoryTheme } from "@/lib/category-theme";

// ---------------------------------------------------------------------------
// 1. 컬러 — 페이지 전체에서 accentColor / baseNeutral / deepAccent 3개만 순환.
// ---------------------------------------------------------------------------

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized,
    16,
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

// 섹션 배경은 패턴 A(baseNeutral 단색) / 패턴 B(accentColor 10~15% 옅은 단색)
// 두 가지만 허용. 그라데이션은 hero 전용.
export const SECTION_BG_PATTERN_B_ALPHA = 0.12; // 10~15% 범위 중간값

export type SectionColorPattern = "A" | "B";

// 1번째 섹션(hero 제외, 본문 섹션 기준)을 패턴 A로 두고 홀/짝 교차.
export function getSectionPattern(bodyIndexZeroBased: number): SectionColorPattern {
  return bodyIndexZeroBased % 2 === 0 ? "A" : "B";
}

export function getSectionBackground(theme: CategoryTheme, pattern: SectionColorPattern): string {
  return pattern === "A" ? theme.baseNeutral : hexToRgba(theme.accent, SECTION_BG_PATTERN_B_ALPHA);
}

// hero만 예외적으로 진→연 그라데이션 허용 (deepAccent → accent → transparent).
export function getHeroGradient(theme: CategoryTheme): string {
  return `linear-gradient(0deg, ${hexToRgba(theme.deepAccent, 0.85)} 0%, ${hexToRgba(theme.accent, 0.45)} 55%, transparent 100%)`;
}

// ---------------------------------------------------------------------------
// 2. 장식 요소 — hero 섹션에서만, accentColor 8~12% 투명도, 상품 이미지 뒤쪽.
// ---------------------------------------------------------------------------

export const DECORATION_OPACITY = 0.1; // 8~12% 범위 중간값
export const DECORATION_ALLOWED_SECTION_TYPES = ["hero"] as const;

export function getDecorationColor(theme: CategoryTheme): string {
  return hexToRgba(theme.accent, DECORATION_OPACITY);
}

// ---------------------------------------------------------------------------
// 3. 여백 — 섹션 간 상하 여백, 섹션 내부 좌우 패딩 고정값.
// ---------------------------------------------------------------------------

// 80px 데스크톱 / 48px 모바일 (tailwind: 20 = 80px, 12 = 48px)
export const SECTION_GAP_CLASS = "space-y-12 sm:space-y-20";
// 섹션 내부 좌우 패딩 고정값 (텍스트가 화면 끝까지 붙지 않도록)
export const SECTION_PADDING_CLASS = "p-6 sm:p-10";

// ---------------------------------------------------------------------------
// 4. 이미지 비율 — 슬롯별 고정, AI/crop 로직이 임의 비율을 쓰지 않는다.
// ---------------------------------------------------------------------------

export const IMAGE_RATIO = {
  hero: "aspect-[4/5]",
  square: "aspect-square", // 1:1 (성분/기능, 디테일 확대, 갤러리 등)
  portrait3x4: "aspect-[3/4]", // 3:4 (라이프스타일/다각도 컷)
  landscape4x5: "aspect-[4/5]", // 4:5 (실사용 장면, 코디 제안)
} as const;

// 슬롯(논리 이름) → 이미지 비율. section-templates.ts의 슬롯 정의와 1:1로 대응.
export const SLOT_IMAGE_RATIO: Record<string, string> = {
  hero: IMAGE_RATIO.hero,
  image_text: IMAGE_RATIO.square,
  detail_zoom: IMAGE_RATIO.square,
  ingredient_highlight: IMAGE_RATIO.square,
  texture_closeup: IMAGE_RATIO.square,
  texture_feel: IMAGE_RATIO.square,
  material_feature: IMAGE_RATIO.square,
  feature_detail: IMAGE_RATIO.square,
  package_contents: IMAGE_RATIO.square,
  color_variation: IMAGE_RATIO.square,
  gallery: IMAGE_RATIO.portrait3x4,
  model_multicut: IMAGE_RATIO.portrait3x4,
  packaging: IMAGE_RATIO.portrait3x4,
  usage_scenario: IMAGE_RATIO.landscape4x5,
  coordination: IMAGE_RATIO.landscape4x5,
};

// ---------------------------------------------------------------------------
// 5. 타이포그래피 — 헤드라인/본문 길이 제한 (자동 요약은 각 호출부 책임).
// ---------------------------------------------------------------------------

export const TYPOGRAPHY = {
  headlineMaxLines: 2,
  bodyMaxLines: 3,
};
