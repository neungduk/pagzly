/** 51차 — 브랜드 타이틀·POINT 타이포·인증 강조 공통 헬퍼 */

const CATEGORY_TITLE_KEYWORDS: Record<string, string> = {
  "화장품/뷰티": "BEAUTY",
  "의류/패션": "FASHION",
  "식품/건강기능식품": "FOOD",
  "전자제품": "TECH",
  "반려동물": "PET CARE",
  "생활용품": "HOME",
};

export function getCategoryTitleKeyword(category: string): string {
  return CATEGORY_TITLE_KEYWORDS[category] ?? category.split(/[/·]/)[0]?.toUpperCase() ?? "PRODUCT";
}

/** 지시어·부사 — 초대형으로 키우면 "이런 / 점을 확인하세요"처럼 뜻이 끊긴다 */
const MEGA_KEYWORD_STOPWORDS = new Set([
  "이런", "이렇게", "그런", "그렇게", "저런", "어떤", "어떻게", "왜", "무엇", "무엇을",
  "우리", "우리의", "당신의", "나의", "내", "이", "그", "저", "더", "꼭", "딱", "늘",
  "매일", "오늘", "지금", "이제", "바로", "모든", "다시", "함께", "가장", "정말", "진짜",
  "자주", "처음", "한번", "하루", "언제나", "누구나", "이것", "그것",
]);

/** 끝이 조사인 3자 이상 토큰("수분이", "피부에")은 키워드가 아니라 문장 일부 */
const TRAILING_PARTICLE = /[을를은는이가의에도와과로]$/;

function isFunctionWordToken(token: string): boolean {
  if (MEGA_KEYWORD_STOPWORDS.has(token)) return true;
  return token.length >= 3 && TRAILING_PARTICLE.test(token);
}

/** 공백 제외 8자 이하 섹션 제목 — 메가 키워드로 쪼개면 꼬리가 너무 작아져 한 줄 제목으로 둔다 */
export function isShortSectionHeading(heading: string): boolean {
  return heading.replace(/\s/g, "").length <= 8;
}

/** 배합 농도·함량 % — 만점 대비 점수가 아니라 막대로 그리면 "낮은 점수"처럼 읽힘 */
export function isConcentrationMetricLabel(label: string): boolean {
  return /배합|함량|농도|함유/.test(label);
}

/** heading에서 초대형 키워드(영문 압축) + 나머지 분리 */
/** 형제 카드끼리 큰 키워드/일반 제목이 섞이지 않도록 — 하나라도 분리 안 되면 전부 일반 제목 */
export function parseUniformCardKeywords(
  titles: string[],
): { keyword: string | null; remainder: string }[] {
  const parsed = titles.map((title) => parseMegaKeywordHeading(title));
  return parsed.every((p) => p.keyword)
    ? parsed
    : titles.map((title) => ({ keyword: null, remainder: title.trim() }));
}

export function parseMegaKeywordHeading(title: string): {
  keyword: string | null;
  remainder: string;
} {
  const trimmed = title.trim();
  if (!trimmed) return { keyword: null, remainder: "" };

  const latin = trimmed.match(/^([A-Za-z][A-Za-z0-9.&-]{0,18})/);
  if (latin) {
    return {
      keyword: latin[1].toUpperCase(),
      remainder: trimmed.slice(latin[0].length).trim(),
    };
  }

  const first = trimmed.split(/\s+/)[0] ?? "";
  // 219차: 숫자가 섞인 토큰("210g/yd", "1단당" 등)은 줄바꿈 지점이 없어
  // 초대형 keywordDisplay에서 카드 밖으로 흘러넘칠 수 있으므로 승격 제외.
  const hasDigit = /[0-9]/.test(first);
  if (first.length >= 2 && first.length <= 10 && !hasDigit && !isFunctionWordToken(first)) {
    return { keyword: first, remainder: trimmed.slice(first.length).trim() };
  }

  return { keyword: null, remainder: trimmed };
}

export function formatPointBadge(indexOneBased: number): string {
  return `POINT ${indexOneBased}`;
}

export function isCertificationHighlight(
  label: string,
  value: string,
  certTokens: string[],
): boolean {
  if (!value.trim() || certTokens.length === 0) return false;
  if (/인증|수상|KC|USDA|FDA|비건|organic/i.test(label)) return true;
  const v = value.trim();
  return certTokens.some(
    (token) =>
      token.length >= 2 &&
      (v.includes(token) || token.includes(v) || v.toLowerCase().includes(token.toLowerCase())),
  );
}
