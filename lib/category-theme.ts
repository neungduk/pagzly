// 카테고리별 상세페이지 테마. DetailSectionRenderer가 category를 받아
// 이 테이블에서 팔레트/아이콘을 찾아 적용한다. 매핑에 없는 카테고리는
// DEFAULT_THEME으로 폴백.

export type CategoryTheme = {
  accent: string; // 헤드라인 강조색, 버튼, 가격 등
  accentSoft: string; // 카드/배지 배경 (연한 틴트)
  accentText: string; // accentSoft 위에 올라가는 텍스트 (충분한 대비)
  heroScrimFrom: string; // 히어로 그라데이션 시작색 (accent 기반, half-opacity)
  icon: string; // lucide-react 아이콘 이름 (checklist bullet에 사용)
};

export const DEFAULT_THEME: CategoryTheme = {
  accent: "#6366F1",
  accentSoft: "#EEF2FF",
  accentText: "#3730A3",
  heroScrimFrom: "rgba(55,48,163,0.75)",
  icon: "Sparkles",
};

export const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  "의류/패션": {
    accent: "#57534E",
    accentSoft: "#F5F5F4",
    accentText: "#44403C",
    heroScrimFrom: "rgba(41,37,36,0.75)",
    icon: "Shirt",
  },
  "화장품/뷰티": {
    accent: "#0E7490",
    accentSoft: "#ECFEFF",
    accentText: "#155E75",
    heroScrimFrom: "rgba(14,116,144,0.7)",
    icon: "Sparkles",
  },
  "식품/건강기능식품": {
    accent: "#B45309",
    accentSoft: "#FFFBEB",
    accentText: "#92400E",
    heroScrimFrom: "rgba(180,83,9,0.7)",
    icon: "Leaf",
  },
  "전자제품": {
    accent: "#3730A3",
    accentSoft: "#EEF2FF",
    accentText: "#3730A3",
    heroScrimFrom: "rgba(30,27,75,0.75)",
    icon: "Cpu",
  },
  "생활용품": {
    accent: "#15803D",
    accentSoft: "#F0FDF4",
    accentText: "#166534",
    heroScrimFrom: "rgba(21,128,61,0.7)",
    icon: "Leaf",
  },
  "반려동물": {
    accent: "#C2410C",
    accentSoft: "#FFF7ED",
    accentText: "#9A3412",
    heroScrimFrom: "rgba(194,65,12,0.7)",
    icon: "PawPrint",
  },
  "기타": DEFAULT_THEME,
};

export function getCategoryTheme(category: string): CategoryTheme {
  return CATEGORY_THEMES[category] ?? DEFAULT_THEME;
}
