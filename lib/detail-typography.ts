/**
 * 상세페이지 타이포 — 본문 Noto Sans KR 유지,
 * 헤드라인만 카테고리별 디스플레이 페이스 (117차).
 *
 * 도입 폰트 1종: Noto Serif KR (뷰티·패션·식품)
 * 그 외: 기존 Noto Sans KR + weight/tracking 강화 (신규 패밀리 없음)
 */
import { resolveTemplateCategory, type TemplateCategory } from "@/lib/section-templates";

export type HeadlineFontKind = "serif" | "sans-display";

const SANS_FALLBACK =
  '"Noto Sans KR", system-ui, -apple-system, "Malgun Gothic", sans-serif';

export const DETAIL_FONT_STACK = {
  sans: SANS_FALLBACK,
  /** @deprecated 카테고리 무관 기본 — resolveHeadlineFontStack 사용 */
  heading: SANS_FALLBACK,
  label: '"Noto Sans KR", system-ui, sans-serif',
  serifHeadline: `"Noto Serif KR", ${SANS_FALLBACK}`,
  sansDisplayHeadline: SANS_FALLBACK,
} as const;

/** Google Fonts — Sans + Serif, display=swap */
export const DETAIL_GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;900&family=Noto+Serif+KR:wght@400;600;700&display=swap";

/** 카테고리 → 헤드라인 페이스 (1~2종만) */
export const DETAIL_HEADLINE_FONT_KIND: Record<TemplateCategory, HeadlineFontKind> = {
  "화장품/뷰티": "serif",
  "패션/의류": "serif",
  식품: "serif",
  "전자/가전": "sans-display",
  "생활/리빙": "sans-display",
  반려동물: "sans-display",
};

export function resolveHeadlineFontKind(category: string): HeadlineFontKind {
  return DETAIL_HEADLINE_FONT_KIND[resolveTemplateCategory(category)];
}

export function resolveHeadlineFontStack(category: string): string {
  return resolveHeadlineFontKind(category) === "serif"
    ? DETAIL_FONT_STACK.serifHeadline
    : DETAIL_FONT_STACK.sansDisplayHeadline;
}

export function resolveHeadlineLetterSpacing(category: string): string {
  return resolveHeadlineFontKind(category) === "serif" ? "-0.02em" : "-0.045em";
}

export function resolveHeadlineFontWeight(category: string): number {
  return resolveHeadlineFontKind(category) === "serif" ? 700 : 800;
}

/** 미리보기·인라인용 */
export function headlineDisplayStyle(category: string): {
  fontFamily: string;
  letterSpacing: string;
  fontWeight: number;
} {
  return {
    fontFamily: resolveHeadlineFontStack(category),
    letterSpacing: resolveHeadlineLetterSpacing(category),
    fontWeight: resolveHeadlineFontWeight(category),
  };
}

/** export HTML 인라인 style 조각 */
export function displayHeadlineInlineCss(category: string): string {
  const s = headlineDisplayStyle(category);
  return `font-family:${s.fontFamily};font-weight:${s.fontWeight};letter-spacing:${s.letterSpacing}`;
}

/** @deprecated 카테고리 없는 기본 — buildDetailExportFontCss(category) 사용 */
export const DETAIL_EXPORT_FONT_CSS = `
  body{margin:0;background:#FAF8F3;color:#1B1B18;font-family:${DETAIL_FONT_STACK.sans};font-size:16px;line-height:1.8;-webkit-font-smoothing:antialiased}
  h1,h2,h3{font-family:${DETAIL_FONT_STACK.sans};font-weight:700;letter-spacing:-0.02em}
  .pagzly-display-headline{font-family:${DETAIL_FONT_STACK.serifHeadline};font-weight:700;letter-spacing:-0.02em}
`;

export function buildDetailExportFontCss(category: string): string {
  const display = displayHeadlineInlineCss(category);
  return `
  body{margin:0;background:#FAF8F3;color:#1B1B18;font-family:${DETAIL_FONT_STACK.sans};font-size:16px;line-height:1.8;-webkit-font-smoothing:antialiased}
  h1,h2,h3{font-family:${DETAIL_FONT_STACK.sans};font-weight:700;letter-spacing:-0.02em}
  .pagzly-display-headline{${display};word-break:keep-all;overflow-wrap:break-word}
`;
}
