/**
 * 289차 — 히어로 직후 "한눈에 보기" 요약 그리드용 라인 아이콘.
 * 경쟁 상세페이지 공통 패턴: 단색 라인 아이콘 1종 + 굵은 짧은 라벨. 선 굵기 ≈ 아이콘 높이 5~6%.
 * 정적 마크업만 사용 (런타임 생성·유료 호출 없음). 라이브·export가 같은 문자열을 쓴다.
 */

export type SummaryIconId =
  | "check"
  | "shield"
  | "award"
  | "flask"
  | "truck"
  | "clock"
  | "return"
  | "gift"
  | "pin"
  | "leaf"
  | "droplet"
  | "bolt";

const PATHS: Record<SummaryIconId, string> = {
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>',
  shield: '<path d="M12 3l7 3v5.5c0 4.4-3 8.2-7 9.5-4-1.3-7-5.1-7-9.5V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
  award: '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5L7 21l5-2.5 5 2.5-1.5-7.5"/>',
  flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/>',
  truck:
    '<path d="M3 6.5h11v10H3z"/><path d="M14 10h4l3 3.2v3.3h-7"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17.5" cy="17.5" r="1.6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  return: '<path d="M4 9h11a5 5 0 0 1 0 10H8"/><path d="M8 5L4 9l4 4"/>',
  gift:
    '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8.5h14V12M12 8v12.5"/><path d="M12 8c-1.5-3-5-3.5-5-1.2S10 8 12 8zm0 0c1.5-3 5-3.5 5-1.2S14 8 12 8z"/>',
  pin: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  leaf: '<path d="M5 19c0-8 5-14 14-14 0 9-6 14-14 14z"/><path d="M5 19l8-8"/>',
  droplet: '<path d="M12 3.5c3 3.8 6 7.2 6 10.5a6 6 0 0 1-12 0c0-3.3 3-6.7 6-10.5z"/>',
  bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6L13 3z"/>',
};

/** 위에서부터 먼저 맞는 규칙. 근거 없는 의미를 덧씌우지 않도록 못 맞추면 체크 아이콘 */
const RULES: [RegExp, SummaryIconId][] = [
  [/인증|허가|등록|haccp|해썹|gmp|fda|\bkc\b|\bce\b|iso|식약처|유기농/i, "shield"],
  [/수상|1위|어워드|award|베스트/i, "award"],
  [/테스트|임상|검사|시험/, "flask"],
  [/당일|오늘\s*출발|새벽|익일|빠른\s*배송/, "clock"],
  [/배송|택배|출고/, "truck"],
  [/교환|반품|환불/, "return"],
  [/증정|사은품|무료|할인|쿠폰|적립/, "gift"],
  [/원산지|국내산|국산|제조국|made\s*in/i, "pin"],
  [/동물실험|비건|vegan|천연|무첨가|무향|친환경/i, "leaf"],
  [/보습|수분|방수|촉촉/, "droplet"],
  [/충전|배터리|mah|소비전력|와트/i, "bolt"],
];

export function pickSummaryIcon(label: string): SummaryIconId {
  for (const [re, id] of RULES) if (re.test(label)) return id;
  return "check";
}

export function summaryIconSvg(id: SummaryIconId, color: string, sizePx: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${sizePx}" height="${sizePx}" fill="none" stroke="${color}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="display:block" aria-hidden="true">${PATHS[id]}</svg>`;
}

export const SUMMARY_ICON_PX = 30;

/** 칩 수 → 열 수. 4개는 2×2, 5~6개는 3열 (390 폭에서도 칸당 약 110px 확보) */
export function summaryGridColumns(count: number): number {
  if (count <= 3) return Math.max(1, count);
  if (count === 4) return 2;
  return 3;
}

/** flex-wrap 칸 폭 — 마지막 줄이 덜 차면 가운데 정렬되도록 grid 대신 사용 (column-gap 12px 기준) */
export function summaryChipWidth(count: number): string {
  const cols = summaryGridColumns(count);
  return `calc((100% - ${(cols - 1) * 12}px) / ${cols})`;
}
