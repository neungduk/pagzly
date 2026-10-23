/**
 * 상세페이지 타이포 — 본문 Noto Sans KR 유지,
 * 헤드라인만 카테고리별 디스플레이 페이스 (117차).
 *
 * 도입 폰트 1종: Noto Serif KR (뷰티·패션·식품)
 * 그 외: 기존 Noto Sans KR + weight/tracking 강화 (신규 패밀리 없음)
 */
import { FONT_SIZE } from "@/lib/design-tokens";
import { DESIGN_V4_ENABLED } from "@/lib/design-v4";
import type { StylePack } from "@/lib/style-packs";
import { resolveTemplateCategory, type TemplateCategory } from "@/lib/section-templates";

export type HeadlineFontKind = "serif" | "sans-display";

const SANS_FALLBACK =
  "'Noto Sans KR', system-ui, -apple-system, 'Malgun Gothic', sans-serif";

/**
 * 430차: 각 스택은 var(--pz-f-*, 기존 스택) 형태다. 디자인 V3 폰트가 켜지면 라이브·export가 같은 변수(lib/font-pairs fontPairCss)를 세워 새 조합이 적용되고,
 * 변수가 없으면(플래그 off·다른 문서) 기존 Noto 스택 그대로라 429차와 같은 글꼴이다.
 */
export const DETAIL_FONT_STACK = {
  sans: `var(--pz-f-body, ${SANS_FALLBACK})`,
  /** @deprecated 카테고리 무관 기본 — resolveHeadlineFontStack 사용 */
  heading: `var(--pz-f-label, ${SANS_FALLBACK})`,
  label: "var(--pz-f-label, 'Noto Sans KR', system-ui, sans-serif)",
  serifHeadline: `var(--pz-f-title, 'Noto Serif KR', ${SANS_FALLBACK})`,
  sansDisplayHeadline: `var(--pz-f-title, ${SANS_FALLBACK})`,
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

/**
 * Chrome은 word-break:keep-all에서도 "5%로"를 %와 한글 사이에서 끊는다(line-break 값 무관).
 * 표시용 문자열에만 WORD JOINER(U+2060)를 넣어 한 어절로 묶는다 — 저장 값은 건드리지 않는다.
 */
export function joinNumericSuffix(text: string): string {
  return text.replace(/([%％])(?=[가-힣])/g, "$1\u2060");
}

function glyphEm(ch: string): number {
  if (ch === "\u2060") return 0;
  if (/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF\u3040-\u30FF\u4E00-\u9FFF]/.test(ch)) return 1;
  if (/[A-Z%％#@&]/.test(ch)) return 0.72;
  if (/[0-9]/.test(ch)) return 0.6;
  if (/[a-z]/.test(ch)) return 0.55;
  return 0.4;
}

/**
 * 가장 긴 어절(공백 기준)의 대략 폭(em, 6% 여유 포함). `.pz-fit`의 `--pz-fit-em`으로 넘기면
 * 칸(부모 container) 폭보다 긴 어절일 때만 글자 크기가 줄어든다.
 */
export function longestTokenEm(text: string, letterSpacingEm = 0): number {
  let max = 0;
  for (const token of text.split(/\s+/)) {
    let width = 0;
    for (const ch of token) width += glyphEm(ch) + (ch === "\u2060" ? 0 : letterSpacingEm);
    max = Math.max(max, width);
  }
  return Math.max(0.01, Math.round(max * 1.06 * 100) / 100);
}

/**
 * 440차 눈 검수 D1 — 큰 숫자 카드(stat) 값의 맞춤 폭(DESIGN_V4, 라이브·export 공용). 어절 단위 폭은 "20수 싱글 저지"를 48px로 3줄,
 * "50~56cm"를 단위 중간("c|m")에서 끊었다(900 굵기 영문·기호 폭을 작게 잡음). v4에서는 값 전체를 한 줄로 보고(공백 0.3em, 물결 0.8em) 굵기 여유 28%를 준다
 * (눈 검수: 12%로는 "50~56cm"가 여전히 끊김).
 * off면 이전과 같은 어절 기준.
 */
export function statFitEm(value: string | undefined, letterSpacingEm = -0.05): number {
  if (!DESIGN_V4_ENABLED) return longestTokenEm(value ?? "", letterSpacingEm);
  let width = 0;
  for (const ch of (value ?? "").trim()) width += /\s/.test(ch) ? 0.3 : (/[~～]/.test(ch) ? 0.8 : glyphEm(ch)) + letterSpacingEm;
  return Math.max(0.01, Math.round(width * 1.28 * 100) / 100);
}

/** 408차 — 스타일 팩의 제목 서체·굵기·자간(Noto Sans/Serif 2종 안). 기본 팩이면 null */
export function packHeadlineStyle(pack?: StylePack | null): { fontFamily: string; letterSpacing: string; fontWeight: number } | null {
  if (!pack?.headline) return null;
  return {
    fontFamily: pack.headline.kind === "serif" ? DETAIL_FONT_STACK.serifHeadline : DETAIL_FONT_STACK.sansDisplayHeadline,
    letterSpacing: pack.headline.letterSpacing,
    fontWeight: pack.headline.weight,
  };
}

/** export <style>용 — 인라인 제목 스타일을 팩 값으로 덮는다. 기본 팩이면 빈 문자열 */
export function packHeadlineExportCss(pack?: StylePack | null): string {
  const s = packHeadlineStyle(pack);
  if (!s) return "";
  // 일러스트 배너 제목은 라이브에서 이 클래스를 쓰지 않으므로(250차 배너는 손대지 않는다) export에서도 배너 안은 뺀다
  return `section:not(.pagzly-illustration-banner) .pagzly-display-headline{font-family:${s.fontFamily}!important;font-weight:${s.fontWeight}!important;letter-spacing:${s.letterSpacing}!important}`;
}

/** 라이브 루트 style — globals.css의 [data-pz-pack] 제목 규칙이 읽는다. 기본 팩이면 빈 객체 */
export function packHeadlineLiveVars(pack?: StylePack | null): Record<string, string> {
  const s = packHeadlineStyle(pack);
  if (!s) return {};
  return { "--pz-hl-family": s.fontFamily, "--pz-hl-weight": String(s.fontWeight), "--pz-hl-ls": s.letterSpacing };
}

/** 미리보기·인라인용 */
export function headlineDisplayStyle(category: string, pack?: StylePack | null): {
  fontFamily: string;
  letterSpacing: string;
  fontWeight: number;
} {
  const fromPack = packHeadlineStyle(pack);
  if (fromPack) return fromPack;
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

export function buildDetailExportFontCss(category: string): string {
  const display = displayHeadlineInlineCss(category);
  return `
  body{margin:0;background:#FAF8F3;color:#1B1B18;font-family:${DETAIL_FONT_STACK.sans};font-size:${FONT_SIZE.bodyLg};line-height:1.8;-webkit-font-smoothing:antialiased;word-break:keep-all;overflow-wrap:break-word}
  h1,h2,h3{font-family:${DETAIL_FONT_STACK.sans};font-weight:700;letter-spacing:-0.02em}
  .pagzly-display-headline{${display};word-break:keep-all;overflow-wrap:break-word}
`;
}
