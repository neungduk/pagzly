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

/** heading에서 초대형 키워드(영문 압축) + 나머지 분리 */
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
  if (first.length >= 2 && first.length <= 10) {
    return { keyword: first, remainder: trimmed.slice(first.length).trim() };
  }

  return { keyword: null, remainder: trimmed };
}

export function formatPointBadge(indexOneBased: number): string {
  return `POINT.${indexOneBased}`;
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
