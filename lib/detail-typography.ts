/** 상세페이지 전용 타이포 — 미리보기·HTML export 공통 스택 */

export const DETAIL_GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&family=Noto+Serif+KR:wght@600;700&display=swap";

export const DETAIL_FONT_STACK = {
  sans: '"Noto Sans KR", "Pretendard", system-ui, -apple-system, "Malgun Gothic", sans-serif',
  heading: '"Noto Serif KR", "Noto Sans KR", Georgia, serif',
  label: '"Noto Sans KR", "Pretendard", sans-serif',
} as const;

export const DETAIL_EXPORT_FONT_CSS = `
  body{margin:0;background:#FAF8F3;color:#1B1B18;font-family:${DETAIL_FONT_STACK.sans};font-size:16px;line-height:1.8;-webkit-font-smoothing:antialiased}
  h1,h2,h3{font-family:${DETAIL_FONT_STACK.heading};font-weight:700;letter-spacing:-0.02em}
`;
