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

export type HeadlineSegment = { text: string; keyword: boolean };

const HEADLINE_KEYWORD_RE = new RegExp(
  [
    String.raw`(?<![A-Za-z0-9.])\d+(?:[.,]\d+)?(?:\s?(?:%|％|kg|mg|g|mL|ml|L|cm|mm|시간|분|초|개월|일|년|개|가지|회|단계|배|종|컷|°C|℃|dB|mAh|W|도|겹|장|매|포|정|위|인분|명))?\+?`,
    String.raw`(?<![가-힣])(?:한|두|세|네|다섯|여섯|일곱|여덟|아홉|열)\s?(?:가지|컷|단계|종|겹|번|장)(?=$|[\s,.!?·]|[은는이가을를로으의에도와과만])`,
    // 한글 제목 속 브랜드·모델명("AURA ONE Pro", "USB-C") — 대문자로 시작하는 라틴 어절 묶음
    String.raw`(?<![A-Za-z0-9])[A-Z][A-Za-z0-9+\-]+(?:\s[A-Z0-9][A-Za-z0-9+\-]*)*`,
  ].join("|"),
  "g",
);

/**
 * 359차 — 디자이너 제목처럼 수치·개수 구절만 포인트색, 나머지는 잉크색.
 * 구절이 없거나 제목 전체가 구절뿐이면 null(기존 단색 유지).
 */
export function splitHeadlineKeywords(text: string | null | undefined): HeadlineSegment[] | null {
  const raw = text ?? "";
  const segments: HeadlineSegment[] = [];
  let last = 0;
  for (const m of raw.matchAll(HEADLINE_KEYWORD_RE)) {
    const at = m.index ?? 0;
    if (at > last) segments.push({ text: raw.slice(last, at), keyword: false });
    segments.push({ text: m[0], keyword: true });
    last = at + m[0].length;
  }
  if (!segments.length) return null;
  if (last < raw.length) segments.push({ text: raw.slice(last), keyword: false });
  const rest = segments.filter((s) => !s.keyword).map((s) => s.text).join("");
  if ((rest.match(/[가-힣]/g) ?? []).length < 2) return null;
  return segments;
}

/** 채운 POINT 알약 — 라이브 Tailwind 리터럴과 같은 치수 */
export const POINT_PILL = {
  fontPx: 13,
  padY: 6,
  padX: 18,
  letterSpacingEm: 0.04,
} as const;

/** POINT 알약 위 챕터 연결선 — 섹션 위 여백(최소 48px) 안에 들어가는 길이 */
export const CHAPTER_CONNECTOR = {
  linePx: 26,
  dotPx: 5,
  gapPx: 8,
} as const;

/** 체크리스트 비교 상단 VS 헤더 (실제 상품 사진 vs 일반 제품 실루엣) */
export const COMPARE_VERSUS = {
  thumbPx: 72,
  colPx: 120,
  gapPx: 20,
  marginTopPx: 32,
  bottlePath: "M10 2h4v3l2.5 3.5V20a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V8.5L10 5z",
} as const;

/** 요약 카드(highlight_box) 위 상품 사진 — 카드들이 사진을 설명하는 구도 */
export const HIGHLIGHT_PRODUCT = { px: 136, marginTopPx: 32, ringPx: 4 } as const;
