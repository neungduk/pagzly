// 상세페이지 디자인 시스템 v1 (review/DESIGN_SYSTEM.md 참고)의 고정값 모음.
// AI(DeepSeek)는 색상/여백/이미지 비율을 임의로 만들지 않고, 이 파일이
// 정의하는 값만 참조한다. 섹션 컴포넌트는 반드시 이 토큰을 통해서만
// 배경색/여백/이미지 비율을 결정해야 한다.

import type { CategoryTheme } from "@/lib/category-theme";

// ---------------------------------------------------------------------------
// 0. 브랜드 팔레트 — globals.css @theme 와 1:1 대응
// ---------------------------------------------------------------------------

export const BRAND = {
  ink: "#1B1B18",
  paper: "#FAF8F3",
  registrationRed: "#C1272D",
  slateBlue: "#2F4858",
  mustard: "#E3A72E",
  line: "#DAD5C9",
} as const;

export const BRAND_SOFT = {
  slate: "#E8EDF0",
  mustard: "#FBF3E0",
  red: "#F5DEDE",
} as const;

// ---------------------------------------------------------------------------
// 1. 컬러 — 페이지 전체에서 accentColor / baseNeutral / deepAccent 3개만 순환.
// ---------------------------------------------------------------------------

function parseHexRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const bigint = parseInt(expanded, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = parseHexRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** BRAND.paper 등 바탕색에 accent를 tintRatio(0~1)만큼 섞어 hex 반환 — 58차 baseNeutral */
export function mixHex(base: string, tint: string, tintRatio: number): string {
  const ratio = Math.min(1, Math.max(0, tintRatio));
  const b = parseHexRgb(base);
  const t = parseHexRgb(tint);
  const r = Math.round(b.r * (1 - ratio) + t.r * ratio);
  const g = Math.round(b.g * (1 - ratio) + t.g * ratio);
  const bl = Math.round(b.b * (1 - ratio) + t.b * ratio);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

// 섹션 배경은 패턴 A(baseNeutral 단색) / 패턴 B(accentColor 10~15% 옅은 단색) / 패턴 C(deepAccent
// 거의 솔리드 강조 블록, 19차 Part B 신규 — 페이지당 1곳만, ChecklistSection.boldBlock으로만 켜짐)
// 세 가지만 허용. 그라데이션은 hero 전용.
export const SECTION_BG_PATTERN_C_ALPHA = 0.92; // 거의 솔리드 — 페이지메이커의 강조 색면 블록 참고

export type SectionColorPattern = "A" | "B" | "C" | "D" | "E";

const SECTION_PATTERN_CYCLE: SectionColorPattern[] = ["A", "B", "D", "E"];

/** 섹션 타입별 패턴 시작점 — 같은 순번이라도 타입에 따라 다른 면이 나오게 한다. */
const SECTION_PATTERN_OFFSET: Partial<Record<string, number>> = {
  checklist: 0,
  brand_story: 1,
  image_text: 0,
  highlight_box: 2,
  gallery: 1,
  step_card: 3,
  stat_infographic: 2,
  spec_table: 1,
  faq: 3,
  target_persona: 2,
  comparison_chart: 1,
  comparison_table: 2,
  usage_steps: 3,
  caution: 1,
  review_highlight: 2,
};

// 본문 섹션은 A→B→D→E 4단계 순환. 패턴 C는 checklist 렌더러가 boldBlock일 때만 쓴다.
export function getSectionPattern(
  bodyIndexZeroBased: number,
  sectionType?: string,
): SectionColorPattern {
  const offset = sectionType ? (SECTION_PATTERN_OFFSET[sectionType] ?? 0) : 0;
  return SECTION_PATTERN_CYCLE[(bodyIndexZeroBased + offset) % SECTION_PATTERN_CYCLE.length]!;
}

/** 섹션 배경 — baseNeutral은 고정, accent 계열만 은은한 그라데이션으로 리듬을 만든다. */
export function getSectionBackground(
  theme: CategoryTheme,
  pattern: SectionColorPattern,
  category?: string,
): string {
  const fashionMinimal = category === "의류/패션";
  const accentSoftA = fashionMinimal ? 0.21 : 0.42;
  const accentB = fashionMinimal ? 0.05 : 0.1;
  const accentSoftB = fashionMinimal ? 0.275 : 0.55;
  const accentSoftD = fashionMinimal ? 0.39 : 0.78;
  const accentD = fashionMinimal ? 0.07 : 0.14;
  const accentE = fashionMinimal ? 0.04 : 0.12;
  const deepAccentE = fashionMinimal ? 0.035 : 0.1;

  if (pattern === "C") {
    // 148차 — deepAccent를 그대로 쓰면 A/B/D/E와 같은 색상군의 "더 진한 버전"일 뿐이라 눈에
    // 익어 후커블의 인증/임팩트 블록(HACCP 배지, 큰 숫자 통계) 같은 진짜 "정지 신호" 대비가
    // 안 남는다는 실사 진단(147차 후속) 결과 반영. BRAND.ink를 큰 비중으로 섞어 실제 잉크에
    // 가까운 다크 블록으로 만들되, accent 계열을 완전히 지우지 않아 브랜드 색과의 연결은
    // 유지한다 — "accentColor/baseNeutral/deepAccent 3색만 순환" 원칙은 그대로, ink는 그
    // 3색을 어둡게 눌러주는 혼합 재료일 뿐 새 색상을 도입하는 게 아니다.
    const inkDeep = mixHex(theme.deepAccent, BRAND.ink, 0.6);
    const inkAccent = mixHex(theme.accent, BRAND.ink, 0.42);
    return `linear-gradient(145deg, ${hexToRgba(inkDeep, 0.97)} 0%, ${hexToRgba(inkAccent, 0.93)} 100%)`;
  }
  if (pattern === "A") {
    return `linear-gradient(168deg, ${theme.baseNeutral} 0%, ${hexToRgba(theme.accentSoft, accentSoftA)} 100%)`;
  }
  if (pattern === "B") {
    return `linear-gradient(168deg, ${hexToRgba(theme.accent, accentB)} 0%, ${hexToRgba(theme.accentSoft, accentSoftB)} 52%, ${theme.baseNeutral} 100%)`;
  }
  if (pattern === "D") {
    return `linear-gradient(175deg, ${hexToRgba(theme.accentSoft, accentSoftD)} 0%, ${hexToRgba(theme.accent, accentD)} 45%, ${theme.baseNeutral} 100%)`;
  }
  return `linear-gradient(180deg, ${theme.baseNeutral} 0%, ${hexToRgba(theme.accent, accentE)} 42%, ${hexToRgba(theme.deepAccent, deepAccentE)} 100%)`;
}

/** 51차 — 카테고리별 은은한 SVG 반복 패턴 (AI 이미지 없음, opt-in) */
const CATEGORY_PATTERN_SVG: Partial<Record<string, string>> = {
  "화장품/뷰티": `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><circle cx="16" cy="16" r="6" fill="%231B1B18" fill-opacity="0.05"/><circle cx="56" cy="28" r="9" fill="%231B1B18" fill-opacity="0.04"/><circle cx="32" cy="58" r="5" fill="%231B1B18" fill-opacity="0.045"/></svg>`,
  "식품/건강기능식품": `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><path d="M8 72 Q24 48 40 72 T72 72" fill="none" stroke="%231B1B18" stroke-opacity="0.05" stroke-width="3"/><path d="M20 24 Q36 8 52 24 T84 24" fill="none" stroke="%231B1B18" stroke-opacity="0.04" stroke-width="2.5"/></svg>`,
  "반려동물": `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72"><ellipse cx="24" cy="20" rx="5" ry="7" fill="%231B1B18" fill-opacity="0.05"/><ellipse cx="48" cy="20" rx="5" ry="7" fill="%231B1B18" fill-opacity="0.05"/><ellipse cx="16" cy="38" rx="4" ry="6" fill="%231B1B18" fill-opacity="0.04"/><ellipse cx="56" cy="38" rx="4" ry="6" fill="%231B1B18" fill-opacity="0.04"/><ellipse cx="36" cy="48" rx="10" ry="8" fill="%231B1B18" fill-opacity="0.045"/></svg>`,
  "전자제품": `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="12" cy="12" r="1.5" fill="%231B1B18" fill-opacity="0.06"/><circle cx="32" cy="12" r="1.5" fill="%231B1B18" fill-opacity="0.06"/><circle cx="52" cy="12" r="1.5" fill="%231B1B18" fill-opacity="0.06"/><circle cx="12" cy="32" r="1.5" fill="%231B1B18" fill-opacity="0.05"/><circle cx="32" cy="32" r="1.5" fill="%231B1B18" fill-opacity="0.05"/><circle cx="52" cy="32" r="1.5" fill="%231B1B18" fill-opacity="0.05"/></svg>`,
  "의류/패션": `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><path d="M0 20 L80 0" stroke="%231B1B18" stroke-opacity="0.04" stroke-width="1"/><path d="M0 50 L80 30" stroke="%231B1B18" stroke-opacity="0.035" stroke-width="1"/><path d="M0 80 L80 60" stroke="%231B1B18" stroke-opacity="0.04" stroke-width="1"/></svg>`,
  /** 119차 — 108차 맵 누락분. 생활용품: 둥근 사각(식기·타일 리듬), opacity 4~5% */
  "생활용품": `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect x="10" y="12" width="16" height="16" rx="3" fill="%231B1B18" fill-opacity="0.05"/><rect x="48" y="18" width="12" height="12" rx="2.5" fill="%231B1B18" fill-opacity="0.04"/><rect x="22" y="48" width="20" height="14" rx="3" fill="%231B1B18" fill-opacity="0.045"/><rect x="54" y="52" width="10" height="10" rx="2" fill="%231B1B18" fill-opacity="0.04"/></svg>`,
};

export function getCategoryPatternBackground(category?: string): string | undefined {
  if (!category) return undefined;
  const svg = CATEGORY_PATTERN_SVG[category];
  if (!svg) return undefined;
  // 단일 따옴표로 감싸 SVG 내부 xmlns="..." 와 충돌하지 않게 함 (119차 — 생활용품 키 추가와 함께 실제 페인트 확인)
  return `url('data:image/svg+xml,${svg}')`;
}

/** 그radient 위에 카테고리 패턴을 은은하게 합성 */
export function composeSectionBackground(gradient: string, category?: string): string {
  const pattern = getCategoryPatternBackground(category);
  if (!pattern) return gradient;
  return `${pattern}, ${gradient}`;
}

/** 미리보기/익스port 공통 — 패턴 repeat + gradient */
export function getComposedSectionBackgroundStyle(
  theme: CategoryTheme,
  pattern: SectionColorPattern,
  category?: string,
): { background: string; backgroundRepeat?: string; backgroundSize?: string } {
  const gradient = getSectionBackground(theme, pattern, category);
  const patternUrl = getCategoryPatternBackground(category);
  if (!patternUrl) return { background: gradient };
  return {
    background: `${patternUrl}, ${gradient}`,
    backgroundRepeat: "repeat, no-repeat",
    backgroundSize: "auto, 100% 100%",
  };
}

/** 패턴별 상·하단 액센트 라인 — 스크롤 시 섹션 경계가 읽히도록. */
export function getSectionInsetShadow(
  theme: CategoryTheme,
  pattern: SectionColorPattern,
  category?: string,
): string | undefined {
  const fashionMinimal = category === "의류/패션";
  const accentLine = fashionMinimal ? 0.13 : 0.26;
  const accentLineA = fashionMinimal ? 0.07 : 0.14;
  const deepLineE = fashionMinimal ? 0.05 : 0.1;

  if (pattern === "C") return undefined;
  if (pattern === "B" || pattern === "D") {
    return `inset 0 3px 0 ${hexToRgba(theme.accent, accentLine)}`;
  }
  if (pattern === "E") {
    return `inset 0 -3px 0 ${hexToRgba(theme.deepAccent, deepLineE)}`;
  }
  return `inset 0 2px 0 ${hexToRgba(theme.accent, accentLineA)}`;
}

/** 텍스트 전용 카드 패널 — 단순 배경 위에 올리는 포인트 박스 */
export function getTextPanelSurface(theme: CategoryTheme): {
  background: string;
  borderColor: string;
  boxShadow: string;
} {
  return {
    background: `linear-gradient(148deg, ${hexToRgba(BRAND.paper, 0.97)} 0%, ${hexToRgba(theme.accentSoft, 0.5)} 58%, ${hexToRgba(theme.accent, 0.1)} 100%)`,
    borderColor: hexToRgba(theme.accent, 0.2),
    boxShadow: `0 12px 40px ${hexToRgba(theme.deepAccent, 0.08)}`,
  };
}

// hero만 예외적으로 진→연 그라데이션 허용 (deepAccent → accent → transparent).
export function getHeroGradient(theme: CategoryTheme): string {
  return `linear-gradient(0deg, ${hexToRgba(theme.deepAccent, 0.85)} 0%, ${hexToRgba(theme.accent, 0.45)} 55%, transparent 100%)`;
}

// ---------------------------------------------------------------------------
// 1.5. 섹션별 보조 색조 — 20차. accent 하나로만 페이지 전체를 우려내던 단조로움을
//    깨기 위해, 섹션 타입/등장 순서에 따라 accent/accentSoft/accentText/baseNeutral/
//    deepAccent를 포함한 팔레트 전체를 hue만 다르게 재계산한 "보조 팔레트" 3종을
//    만든다. lib/color-extract.ts의 hueShift()와 수학적으로 동일한 로직(같은 s/l,
//    hue만 회전)이지만, 그 파일은 sharp(Node 전용 네이티브 모듈)에 의존하고
//    DetailSectionRenderer/result 페이지는 "use client"라 클라이언트 번들에
//    sharp를 끌어들이면 안 되므로 순수 색상 변환만 이 파일에 독립적으로 둔다.
// ---------------------------------------------------------------------------

function tokenRgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
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

function tokenHslToRgb(h: number, s: number, l: number): [number, number, number] {
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
  return [
    Math.round((rgb[0] + m) * 255),
    Math.round((rgb[1] + m) * 255),
    Math.round((rgb[2] + m) * 255),
  ];
}

function tokenRgbToHex(r: number, g: number, b: number) {
  const toHex = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// hex 색상의 hue만 degrees만큼 회전 (채도/명도는 유지). color-extract.ts의
// hueShift()와 동일한 로직 — 의도적으로 별도 구현(위 블록 설명 참고, sharp 의존성 회피).
function tokenHueShift(hex: string, degrees: number): string {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const { h, s, l } = tokenRgbToHsl(r, g, b);
  const shifted = (((h + degrees) % 360) + 360) % 360;
  const [nr, ng, nb] = tokenHslToRgb(shifted, s, l);
  return tokenRgbToHex(nr, ng, nb);
}

export type ThemeVariantKey = "base" | "warm" | "cool" | "bold";

// 149차 — "사진 톤이 파란색이면 페이지 전체가 다 파랗게만 나온다" 실사 신고 대응.
// 기존에는 warm/cool/bold를 추출된 단일 hue에서 고정 각도(+28/-34/+52)만큼
// "상대 회전"시켰다. 상품 사진의 스튜디오 배경이 이미 진하게 채도 높은
// 파란색(실측 hue≈205~210°)일 때는 세 변형이 전부 195~262° 구간(청록~인디고)
// 안에 갇혀 사실상 "다른 톤의 파랑"일 뿐이라 실제로는 시각적 변화가 거의 없었다
// (색상 이름 기준: cyan-blue → blue → indigo, 전부 "파랑" 계열).
//
// 대신 warm/cool은 고정된 "절대 앵커 색상"(호박색/청록색)을 향해 끌어당기고,
// bold는 base/warm/cool 세 색과 원형 색상환 거리가 최대가 되는 방향으로 계산해
// 상품 hue가 무엇이든 최소 두 계열(따뜻한 계열/차가운 계열)이 실제로 갈라지도록
// 보장한다. 상품이 이미 그 계열(예: 이미 주황)이면 해당 변형은 base와 거의
// 같아지는데, 그건 원래 그 계열이 이미 확보돼 있다는 뜻이라 자연스럽다.
const WARM_ANCHOR_HUE = 35; // 호박/골드 계열(BRAND.mustard와 같은 방향)
const COOL_ANCHOR_HUE = 205; // 청록/블루 계열(BRAND.slateBlue와 같은 방향)
const ANCHOR_PULL = 0.82; // 앵커 쪽으로 끌어당기는 비율(1=완전히 앵커 색상, 0=변화 없음)
const BOLD_SWING_DEGREES = 140; // base/warm/cool과 확실히 다른 "세 번째 색상대"를 만들기 위한 회전폭

/** hue A→B로 가는 "최단 방향" 각도차 (범위 (-180, 180]) */
function circularHueDelta(fromHue: number, toHue: number): number {
  return (((toHue - fromHue + 540) % 360) + 360) % 360 - 180;
}

function circularHueDistance(a: number, b: number): number {
  return Math.abs(circularHueDelta(a, b));
}

function extractHueFromHex(hex: string): number {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return tokenRgbToHsl(r, g, b).h;
}

function relativeLuminanceToken(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatioToken(fg: string, bg: string): number {
  const l1 = relativeLuminanceToken(fg);
  const l2 = relativeLuminanceToken(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// baseNeutral의 hue만 targetHue로 바꾸면서, ink 텍스트 대비 4.5:1을 계속
// 만족하도록 필요하면 명도를 조금씩 올린다(색상-extract.ts의
// ensureReadableBaseNeutral()과 동일한 안전장치를 sharp 의존성 없이 재구현).
function ensureReadableNeutralHue(hex: string, targetHue: number): string {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const { s, l } = tokenRgbToHsl(r, g, b);
  let light = l;
  for (let i = 0; i < 12; i += 1) {
    const [nr, ng, nb] = tokenHslToRgb(targetHue, s, light);
    const candidate = tokenRgbToHex(nr, ng, nb);
    if (contrastRatioToken(BRAND.ink, candidate) >= 4.5) return candidate;
    light = Math.min(0.95, light + 0.02);
  }
  const [nr, ng, nb] = tokenHslToRgb(targetHue, s, 0.95);
  return tokenRgbToHex(nr, ng, nb);
}

export type ExtendedTheme = Record<ThemeVariantKey, CategoryTheme>;

// 149차: baseNeutral도 함께 회전시킨다. 기존엔 accent 계열만 회전하고
// baseNeutral은 ...base로 그대로 복사돼, warm/cool/bold 어떤 변형이든
// 배경 그라데이션의 절반(패턴 A/B/D/E 전부 baseNeutral을 포함)은 항상 같은
// 추출 hue를 유지했다 — "포인트 색만 바뀌고 배경은 계속 파랗다"의 실제 원인.
function hueShiftTheme(base: CategoryTheme, degrees: number): CategoryTheme {
  const deepShift = Math.round(degrees * 0.55);
  const baseNeutralHue = extractHueFromHex(base.baseNeutral);
  const shiftedNeutralHue = ((baseNeutralHue + degrees) % 360 + 360) % 360;
  return {
    ...base,
    accent: tokenHueShift(base.accent, degrees),
    accentSoft: tokenHueShift(base.accentSoft, degrees),
    accentText: tokenHueShift(base.accentText, degrees),
    deepAccent: tokenHueShift(base.deepAccent, deepShift),
    baseNeutral: ensureReadableNeutralHue(base.baseNeutral, shiftedNeutralHue),
  };
}

/**
 * 페이지 진입 시 1회, 기본 테마(상품 사진 추출 or 카테고리 고정 폴백)로부터
 * 보조 팔레트 3종을 파생시킨다. heroScrimFrom/icon 필드는 base 값 그대로
 * 유지(hero는 항상 base 팔레트만 쓰므로 변형이 필요 없음 — 아래
 * getSectionTheme() 참고).
 */
export function extendTheme(base: CategoryTheme): ExtendedTheme {
  const referenceHue = extractHueFromHex(base.accent);

  const warmDelta = circularHueDelta(referenceHue, WARM_ANCHOR_HUE) * ANCHOR_PULL;
  const coolDelta = circularHueDelta(referenceHue, COOL_ANCHOR_HUE) * ANCHOR_PULL;
  const warmHue = ((referenceHue + warmDelta) % 360 + 360) % 360;
  const coolHue = ((referenceHue + coolDelta) % 360 + 360) % 360;

  // bold: +140 / -140 두 후보 중, base·warm·cool 세 색 모두와 색상환 거리가
  // 가장 먼(=가장 구별되는) 방향을 고른다. 안 그러면 base가 이미 warm 또는
  // cool 쪽에 가까울 때 bold가 그 변형과 거의 겹쳐버린다.
  const boldCandidates = [
    ((referenceHue + BOLD_SWING_DEGREES) % 360 + 360) % 360,
    ((referenceHue - BOLD_SWING_DEGREES) % 360 + 360) % 360,
  ];
  const scoreOf = (hue: number) =>
    Math.min(
      circularHueDistance(hue, referenceHue),
      circularHueDistance(hue, warmHue),
      circularHueDistance(hue, coolHue),
    );
  const boldHue = boldCandidates.reduce((best, candidate) =>
    scoreOf(candidate) > scoreOf(best) ? candidate : best,
  );
  const boldDelta = circularHueDelta(referenceHue, boldHue);

  return {
    base,
    warm: hueShiftTheme(base, warmDelta),
    cool: hueShiftTheme(base, coolDelta),
    bold: hueShiftTheme(base, boldDelta),
  };
}

// hero(상품 사진과 직접 겹치는 그라데이션)와 cta_price(구매 버튼 — 페이지
// 전체에서 신뢰감 있게 일관된 색이어야 하는 지점)는 보조색 순환에서 제외하고
// 항상 base 팔레트를 쓴다.
const THEME_VARIANT_LOCKED_SECTION_TYPES = new Set(["hero", "cta_price"]);
const THEME_VARIANT_CYCLE: ThemeVariantKey[] = ["base", "warm", "cool", "bold", "warm", "cool"];

/**
 * bodyIndex(0-based, hero 제외 본문 섹션 순번 — getSectionPattern()이 쓰는
 * 값과 동일한 값을 그대로 재사용)를 4단계로 순환시켜, 스크롤 흐름상 인접
 * 섹션끼리 색상이 눈에 띄게 달라지게 한다. 반환값은 기존 CategoryTheme과
 * 100% 동일한 모양이라, 호출부(렌더러)는 이 결과를 기존 theme 자리에 그대로
 * 꽂아 넣기만 하면 된다 — 개별 섹션 렌더링 코드는 변경 불필요.
 */
export function getSectionTheme(
  extended: ExtendedTheme,
  sectionType: string,
  bodyIndexZeroBased: number,
): CategoryTheme {
  if (THEME_VARIANT_LOCKED_SECTION_TYPES.has(sectionType)) return extended.base;
  const key = THEME_VARIANT_CYCLE[bodyIndexZeroBased % THEME_VARIANT_CYCLE.length];
  return extended[key];
}

export type ResolvedSectionSurface = {
  theme: CategoryTheme;
  pattern: SectionColorPattern;
  background: string;
  insetShadow?: string;
};

/** 렌더러·HTML export 공통 — 섹션별 테마·패턴·배경을 한 번에 결정한다. */
export function resolveSectionSurface(
  extended: ExtendedTheme,
  sectionType: string,
  bodyIndexZeroBased: number,
  category?: string,
): ResolvedSectionSurface {
  const pattern = getSectionPattern(bodyIndexZeroBased, sectionType);
  const theme = getSectionTheme(extended, sectionType, bodyIndexZeroBased);
  const background = composeSectionBackground(
    getSectionBackground(theme, pattern, category),
    category,
  );
  const insetShadow = getSectionInsetShadow(theme, pattern, category);
  return { theme, pattern, background, insetShadow };
}

// ---------------------------------------------------------------------------
// 2. 장식 요소 — hero 섹션에서만, accentColor 8~12% 투명도, 상품 이미지 뒤쪽.
// ---------------------------------------------------------------------------

export const DECORATION_OPACITY = 0.1; // 8~12% 범위 중간값

export function getDecorationColor(theme: CategoryTheme): string {
  return hexToRgba(theme.accent, DECORATION_OPACITY);
}

// ---------------------------------------------------------------------------
// 3. 여백 — 섹션 간 상하 여백, 섹션 내부 좌우 패딩 고정값.
// ---------------------------------------------------------------------------

/** 렌더러 전용 — 레퍼런스급 여백 리듬(넉넉한 본문 / 타이트한 갤러리 헤더). */
export const SECTION_BLOCK_PAD = {
  generous: "px-6 py-16 sm:px-10 sm:py-28",
  compact: "px-6 py-14 sm:px-10 sm:py-24",
  pointText: "px-6 pt-10 pb-16 sm:px-10 sm:pt-12 sm:pb-24",
  galleryTitle: "px-6 pt-9 pb-0 text-center sm:px-10 sm:pt-11 sm:pb-0",
  cta: "px-6 py-24 sm:px-10 sm:py-36",
  trust: "px-6 py-16 sm:px-10 sm:py-24",
} as const;

/** CTA 마감 밴드 — deepAccent 3색 안에서만 (별도 네이비/신규 색 금지). */
export function getCtaBandBackground(theme: CategoryTheme): string {
  return hexToRgba(theme.deepAccent, 0.14);
}

// ---------------------------------------------------------------------------
// 3.5. hero→본문 전환 각(角) — hero 바로 다음 섹션 1곳에만 적용 (design-brief 제안 A).
//    나머지 섹션은 전부 SECTION_BLOCK_PAD의 직사각형을 그대로 유지한다. 전체
//    섹션에 적용하면 산만해지므로, 렌더러는 이 값을 hero 바로 다음 섹션에만 써야 한다.
// ---------------------------------------------------------------------------

/** hero 바로 다음 섹션 상단에만 쓰는 미세한 대각선 클립. */
export const HERO_TRANSITION_CLIP_PATH =
  "polygon(0 0, 100% 0, 100% 100%, 0 calc(100% - 44px))";
/** 위 클립과 짝을 이루는 음수 마진 — hero 하단 사진 위로 살짝 겹쳐 올라간다. */
export const HERO_TRANSITION_OVERLAP_CLASS = "-mt-4 sm:-mt-6";

/**
 * 156차 — 154차가 "다음 라운드 후보"로 남겨둔 "섹션 전환부 다양성"(북엔드) 구현.
 * 히어로 직후 대각선 컷(위)과 짝을 이루도록, 페이지를 마감하는 cta_price 밴드
 * 상단에도 미세한 대각선 컷을 준다 — 방향을 반대로(좌상단을 아래로 44px 내림)
 * 줘서 "열고 닫는" 북엔드 느낌을 만든다. 다이슨코리아 등 벤치마크(152차)에서
 * 확인한 "페이지 시작/끝에 의도적인 각(角) 마감을 준다"는 패턴 참고.
 */
export const CTA_TRANSITION_CLIP_PATH =
  "polygon(0 44px, 100% 0, 100% 100%, 0 100%)";
/** 위 클립과 짝을 이루는 음수 마진 — CTA 밴드가 직전 섹션 위로 살짝 겹쳐 올라간다. */
export const CTA_TRANSITION_OVERLAP_CLASS = "-mt-4 sm:-mt-6";

/** 카테고리별 리듬 — 슬롯/3색은 유지하고 여백·그리드·CTA 모서리만 조절 */
export type CategoryRhythm = {
  heroMinClass: string;
  heroOverlayClass: string;
  heroTitleExtra: string;
  checklistGridFour: string;
  checklistGapClass: string;
  ctaButtonClass: string;
  galleryGapClass: string;
  galleryTitlePadClass: string;
  generousPadClass: string;
  pointTextPadClass: string;
  trustPadClass: string;
  ctaPadClass: string;
  /** hero 바로 다음 섹션 1곳에만 적용하는 미세한 대각선 클립 (design-brief 제안 A) */
  heroTransitionClip: string;
  /** 156차 — 마지막 cta_price 밴드 상단에만 적용하는 미세한 대각선 클립(북엔드 마감) */
  ctaTransitionClip: string;
};

const DEFAULT_RHYTHM: CategoryRhythm = {
  heroMinClass: "min-h-[85svh] sm:min-h-[760px]",
  heroOverlayClass:
    "absolute inset-0 z-20 flex flex-col items-center justify-end px-6 pb-14 text-center sm:px-10 sm:pb-20",
  heroTitleExtra: "",
  checklistGridFour: "grid-cols-4",
  checklistGapClass: "gap-x-4 gap-y-8",
  ctaButtonClass:
    "inline-flex h-12 min-w-[11rem] items-center justify-center rounded-full px-8 text-sm font-semibold text-paper shadow-sm",
  galleryGapClass: "gap-px",
  galleryTitlePadClass: SECTION_BLOCK_PAD.galleryTitle,
  generousPadClass: SECTION_BLOCK_PAD.generous,
  pointTextPadClass: SECTION_BLOCK_PAD.pointText,
  trustPadClass: SECTION_BLOCK_PAD.trust,
  ctaPadClass: SECTION_BLOCK_PAD.cta,
  heroTransitionClip: HERO_TRANSITION_CLIP_PATH,
  ctaTransitionClip: CTA_TRANSITION_CLIP_PATH,
};

export function getCategoryRhythm(category: string): CategoryRhythm {
  // 150차 — 6개 카테고리 중 의류/패션·생활용품·전자제품 3개만 고유 리듬이 있고
  // 화장품/뷰티·식품/건강기능식품·반려동물 3개는 전부 DEFAULT_RHYTHM으로 뭉뚱그려져
  // 있었다(색상은 category-theme.ts에서 6개 다 구분되는데 레이아웃 리듬만 절반이
  // 미구현). 후커블/실제 마켓 카테고리별 크롤링(claude/hookable_category_examples_
  // 2026-09-09.md) 근거로 나머지 3개도 채운다.
  if (category === "식품/건강기능식품") {
    // 후커블 식품 예시(스키야키 밀키트): 히어로 대형 타이포 + 풀블리드 사진,
    // 재료/비교 섹션이 사진 중심으로 여유 있게 배치됨 — 카드형 카테고리(전자제품)
    // 보다 넉넉하고, 미니멀 카테고리(패션)보다 사진 프레임이 큼.
    return {
      ...DEFAULT_RHYTHM,
      heroMinClass: "min-h-[86svh] sm:min-h-[780px]",
      heroOverlayClass:
        "absolute inset-0 z-20 flex flex-col items-center justify-end px-6 pb-20 text-center sm:px-10 sm:pb-32",
      heroTitleExtra: "tracking-[-0.02em]",
      checklistGridFour: "grid-cols-2 sm:grid-cols-4",
      checklistGapClass: "gap-x-6 gap-y-10",
      generousPadClass: "px-6 py-20 sm:px-10 sm:py-32",
      pointTextPadClass: "px-6 pt-12 pb-16 sm:px-10 sm:pt-14 sm:pb-24",
      trustPadClass: "px-6 py-16 sm:px-10 sm:py-24",
      ctaPadClass: "px-6 py-24 sm:px-10 sm:py-36",
      ctaButtonClass:
        "inline-flex h-12 min-w-[13rem] items-center justify-center rounded-full px-10 text-sm font-semibold text-paper shadow-sm",
      galleryGapClass: "gap-1",
      galleryTitlePadClass: "px-6 pt-10 pb-0 text-center sm:px-10 sm:pt-12 sm:pb-0",
    };
  }
  if (category === "화장품/뷰티") {
    // 기존 색상(slateBlue, 클리니컬)에 맞춰 리듬도 더 타이트하고 정제된 쪽으로 —
    // 식품/반려동물의 "넉넉하고 따뜻한" 톤과 대비되게 의도적으로 좁힌다.
    return {
      ...DEFAULT_RHYTHM,
      heroMinClass: "min-h-[82svh] sm:min-h-[720px]",
      heroTitleExtra: "tracking-[-0.03em]",
      checklistGridFour: "grid-cols-4",
      checklistGapClass: "gap-x-4 gap-y-8",
      generousPadClass: "px-6 py-14 sm:px-10 sm:py-24",
      pointTextPadClass: "px-6 pt-8 pb-12 sm:px-10 sm:pt-10 sm:pb-16",
      trustPadClass: "px-6 py-14 sm:px-10 sm:py-20",
      ctaPadClass: "px-6 py-20 sm:px-10 sm:py-32",
      ctaButtonClass:
        "inline-flex h-12 min-w-[11rem] items-center justify-center rounded-full px-8 text-sm font-semibold text-paper shadow-sm",
      galleryGapClass: "gap-px",
      galleryTitlePadClass: "px-6 pt-9 pb-0 text-center sm:px-10 sm:pt-11 sm:pb-0",
    };
  }
  if (category === "반려동물") {
    // 후커블엔 반려동물 카테고리 자체가 없고 실제 마켓 예시도 반려동물 실사가
    // 전무한 저품질 페이지였음(149cha/hookable_category_examples 조사) — 벤치마크가
    // 약한 카테고리라 오히려 기회다. 실제 반려동물 사진(라이프스타일컷)이 잘
    // 드러나도록 사진 프레임을 넉넉하게, 톤은 딱딱하지 않게 둥근 형태 위주로.
    return {
      ...DEFAULT_RHYTHM,
      heroMinClass: "min-h-[85svh] sm:min-h-[740px]",
      heroOverlayClass:
        "absolute inset-0 z-20 flex flex-col items-center justify-end px-7 pb-16 text-center sm:px-12 sm:pb-28",
      checklistGridFour: "grid-cols-2 sm:grid-cols-4",
      checklistGapClass: "gap-x-6 gap-y-10",
      generousPadClass: "px-6 py-16 sm:px-10 sm:py-28",
      pointTextPadClass: "px-6 pt-10 pb-16 sm:px-10 sm:pt-12 sm:pb-20",
      trustPadClass: "px-6 py-16 sm:px-10 sm:py-24",
      ctaPadClass: "px-6 py-24 sm:px-10 sm:py-36",
      ctaButtonClass:
        "inline-flex h-12 min-w-[13rem] items-center justify-center rounded-full px-10 text-sm font-semibold tracking-[0.02em] text-paper shadow-sm",
      galleryGapClass: "gap-1",
      galleryTitlePadClass: "px-6 pt-10 pb-0 text-center sm:px-10 sm:pt-12 sm:pb-0",
    };
  }
  if (category === "의류/패션") {
    return {
      ...DEFAULT_RHYTHM,
      heroMinClass: "min-h-[84svh] sm:min-h-[760px]",
      heroOverlayClass:
        "absolute inset-0 z-20 flex flex-col items-center justify-end px-10 pb-16 text-center sm:px-14 sm:pb-24",
      heroTitleExtra: "tracking-[-0.045em]",
      generousPadClass: "px-6 py-16 sm:px-10 sm:py-28",
      checklistGridFour: "grid-cols-2 sm:grid-cols-4",
      checklistGapClass: "gap-x-5 gap-y-8",
      pointTextPadClass: "px-8 pt-10 pb-16 sm:px-12 sm:pt-12 sm:pb-20",
      trustPadClass: "px-6 py-12 sm:px-10 sm:py-16",
      ctaPadClass: "px-6 py-24 sm:px-10 sm:py-36",
      ctaButtonClass:
        "inline-flex h-12 min-w-[12rem] items-center justify-center rounded-sm px-10 text-sm font-semibold tracking-[0.16em] text-paper",
      galleryGapClass: "gap-0",
      galleryTitlePadClass: "px-6 pt-8 pb-0 text-center sm:px-10 sm:pt-10 sm:pb-0",
    };
  }
  if (category === "생활용품") {
    return {
      ...DEFAULT_RHYTHM,
      heroOverlayClass:
        "absolute inset-0 z-20 flex flex-col items-center justify-end px-7 pb-20 text-center sm:px-12 sm:pb-32",
      generousPadClass: "px-6 py-20 sm:px-10 sm:py-36",
      checklistGridFour: "grid-cols-2 sm:grid-cols-4",
      checklistGapClass: "gap-x-6 gap-y-12",
      pointTextPadClass: "px-6 pt-12 pb-16 sm:px-10 sm:pt-16 sm:pb-24",
      trustPadClass: "px-6 py-16 sm:px-10 sm:py-24",
      ctaPadClass: "px-6 py-24 sm:px-10 sm:py-36",
      ctaButtonClass:
        "inline-flex h-12 min-w-[13rem] items-center justify-center rounded-full px-10 text-sm font-semibold tracking-[0.04em] text-paper shadow-sm",
      galleryTitlePadClass: "px-6 pt-10 pb-0 text-center sm:px-10 sm:pt-12 sm:pb-0",
    };
  }
  if (category === "전자제품") {
    return {
      ...DEFAULT_RHYTHM,
      heroMinClass: "min-h-[78svh] sm:min-h-[700px]",
      heroTitleExtra: "tracking-[-0.05em] tabular-nums",
      generousPadClass: "px-6 py-16 sm:px-10 sm:py-28",
      checklistGridFour: "grid-cols-2 sm:grid-cols-4",
      checklistGapClass: "gap-x-5 gap-y-10",
      pointTextPadClass: "px-6 pt-7 pb-11 sm:px-10 sm:pt-9 sm:pb-14",
      trustPadClass: "px-6 py-14 sm:px-10 sm:py-20",
      ctaPadClass: "px-6 py-16 sm:px-10 sm:py-24",
      ctaButtonClass:
        "inline-flex h-11 min-w-[12rem] items-center justify-center rounded-none px-8 text-xs font-semibold uppercase tracking-[0.24em] text-paper",
      galleryGapClass: "gap-0",
    };
  }
  return {
    ...DEFAULT_RHYTHM,
    heroOverlayClass:
        "absolute inset-0 z-20 flex flex-col items-center justify-end px-6 pb-16 text-center sm:px-10 sm:pb-28",
    checklistGapClass: "gap-x-5 gap-y-10",
    generousPadClass: "px-6 py-16 sm:px-10 sm:py-28",
    pointTextPadClass: "px-6 pt-8 pb-14 sm:px-10 sm:pt-10 sm:pb-20",
    trustPadClass: "px-6 py-16 sm:px-10 sm:py-28",
    ctaPadClass: "px-6 py-20 sm:px-10 sm:py-32",
    ctaButtonClass:
        "inline-flex h-12 min-w-[13rem] items-center justify-center rounded-full px-10 text-sm font-semibold text-paper shadow-sm",
    galleryTitlePadClass: "px-6 pt-10 pb-0 text-center sm:px-10 sm:pt-12 sm:pb-0",
  };
}

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
  packaging_design: IMAGE_RATIO.square,
  how_it_works: IMAGE_RATIO.square,
  size_options: IMAGE_RATIO.square,
  customer_scenario: IMAGE_RATIO.landscape4x5,
  fabric_composition: IMAGE_RATIO.square,
  fit_guide: IMAGE_RATIO.landscape4x5,
  seasonal_styling: IMAGE_RATIO.landscape4x5,
  sourcing_story: IMAGE_RATIO.square,
  serving_suggestion: IMAGE_RATIO.landscape4x5,
  storage_tip: IMAGE_RATIO.square,
  design_detail: IMAGE_RATIO.square,
  connectivity: IMAGE_RATIO.square,
  install_scenario: IMAGE_RATIO.landscape4x5,
  material_detail: IMAGE_RATIO.square,
  usage_scenario_extra: IMAGE_RATIO.landscape4x5,
  feature_callout: IMAGE_RATIO.square,
  step_card: IMAGE_RATIO.square,
  care_tip: IMAGE_RATIO.square,
};

// ---------------------------------------------------------------------------
// 6. 정보 섹션(표·체크리스트) — LACTO급 인포 폴리싱용 토큰.
//    렌더러는 색/알파를 하드코딩하지 말고 여기 값만 쓴다.
// ---------------------------------------------------------------------------

export const INFO_TABLE = {
  /** 행 구분선 accent 알파 */
  rowBorderAlpha: 0.2,
  /** 교차 음영(짝수 행) accent 알파 */
  stripeAlpha: 0.07,
  /** 헤더 배경 accent 알파 */
  headerBgAlpha: 0.1,
  /** 우리 제품 열 강조 배경 */
  oursHighlightAlpha: 0.12,
} as const;

export const INFO_BADGE = {
  /** checklist / usage_steps 기본 */
  defaultSize: "md" as const,
  /** spec_table / comparison / 숫자 카드 옆 */
  compactSize: "sm" as const,
};
