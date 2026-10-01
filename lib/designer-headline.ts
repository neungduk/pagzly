/**
 * 290차 — 디자이너 상세페이지의 2톤 제목·채운 POINT 알약 (라이브·export 공용).
 * 작은 잉크색 리드 한 줄 + 큰 포인트색 핵심 문구. 리드는 쉼표·줄바꿈 앞 짧은 구절만 인정한다.
 */

const LEAD_MAX_CHARS = 16;
const MAIN_MIN_CHARS = 2;

/** 리드 줄 글자 크기 — 제목 font-size 대비 em */
export const TWO_TONE_LEAD_EM = 0.52;

export type TwoToneHeadline = { lead: string | null; main: string };

export function splitTwoToneHeadline(text: string | null | undefined): TwoToneHeadline {
  const raw = (text ?? "").trim();
  if (!raw) return { lead: null, main: "" };
  const m = raw.match(/^([^,\n]+?)\s*(?:,|\n)\s*([\s\S]+)$/);
  if (!m) return { lead: null, main: raw };
  const lead = m[1].trim();
  const main = m[2].replace(/\s*\n\s*/g, " ").trim();
  if (lead.length > LEAD_MAX_CHARS || main.length < MAIN_MIN_CHARS) return { lead: null, main: raw };
  if (/\d$/.test(lead) && /^\d/.test(main)) return { lead: null, main: raw };
  return { lead, main };
}

/** 채운 POINT 알약 — 라이브 Tailwind 리터럴과 같은 치수 */
export const POINT_PILL = {
  fontPx: 13,
  padY: 6,
  padX: 18,
  letterSpacingEm: 0.04,
} as const;

export function pointPillLabel(indexZeroBased: number): string {
  return `POINT ${indexZeroBased + 1}`;
}
