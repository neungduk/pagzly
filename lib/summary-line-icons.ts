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
  | "bolt"
  | "feather"
  | "heart"
  | "sparkle"
  | "molecule"
  | "sun"
  | "layers"
  | "target"
  | "wave"
  | "thermo";

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
  feather: '<path d="M20 4C11 4 6 9 6 18l-2 2"/><path d="M20 4c0 9-5 14-14 14"/><path d="M9.5 14.5H15M12 11h5"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  sparkle:
    '<path d="M11 3.5l1.6 4.9 4.9 1.6-4.9 1.6L11 16.5l-1.6-4.9L4.5 10l4.9-1.6L11 3.5z"/><path d="M18 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z"/>',
  molecule:
    '<circle cx="12" cy="12" r="2.6"/><circle cx="5.5" cy="6" r="2"/><circle cx="18.5" cy="6" r="2"/><circle cx="12" cy="20" r="1.8"/><path d="M7 7.4l3.1 2.8M17 7.4l-3.1 2.8M12 14.6v3.6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
  layers: '<path d="M12 4l8.5 4.5L12 13 3.5 8.5 12 4z"/><path d="M3.5 12.5L12 17l8.5-4.5"/><path d="M3.5 16.5L12 21l8.5-4.5"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  wave: '<path d="M3.5 10.5v3M7.5 8v8M11.5 5v14M15.5 8.5v7M19.5 10.5v3"/>',
  thermo: '<path d="M14 14.5V5a2 2 0 0 0-4 0v9.5a4 4 0 1 0 4 0z"/><path d="M12 9v7.5"/>',
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

/** 혜택 카드(핵심 N가지)용 — 위에서부터 먼저 맞는 규칙 */
const BENEFIT_RULES: [RegExp, SummaryIconId][] = [
  [/테스트|임상|검사|시험/, "flask"],
  [/인증|haccp|해썹|gmp|식약처/i, "shield"],
  [/자외선|spf|uv|햇빛/i, "sun"],
  [/진정|민감|예민|편안|자극|순한|저자극|트러블/, "heart"],
  [/보습|수분|촉촉|히알루론|방수|물기/, "droplet"],
  [/가볍|가벼|산뜻|흡수|스며|끈적/, "feather"],
  [/미백|톤|광채|브라이트|맑|투명|생기|윤기/, "sparkle"],
  [/장벽|보호|차단|방어|안심/, "shield"],
  [/성분|배합|함유|나이아신|판테놀|세라마이드|비타민|펩타이드|레티놀|콜라겐|단백질|유산균|\d\s*%/, "molecule"],
  [/레이어|겹겹|다층|구조|이중|3중|삼중/, "layers"],
  [/지속|오래|하루\s*종일|24\s*시간|롱래스팅|내구/, "clock"],
  [/충전|배터리|출력|파워|강력|고속|mah/i, "bolt"],
  [/소음|저소음|노이즈|사운드|음질/, "wave"],
  [/온도|보온|쿨링|냉감|발열|따뜻|시원/, "thermo"],
  [/천연|비건|유기농|무첨가|친환경|식물/, "leaf"],
  [/원산지|국내산|국산|산지|제조국/, "pin"],
  [/집중|정확|타겟|핵심|맞춤/, "target"],
  [/배송|출고/, "truck"],
  [/증정|사은품/, "gift"],
];

function benefitMatches(text: string): SummaryIconId[] {
  const out: SummaryIconId[] = [];
  for (const [re, id] of BENEFIT_RULES) if (re.test(text) && !out.includes(id)) out.push(id);
  return out;
}

/**
 * 카드 묶음 전체에 아이콘을 고른다. 제목 근거를 먼저, 겹치면 본문 근거로 다른 아이콘을 찾는다.
 * 한 장이라도 근거가 없으면 null — 일부만 아이콘이 있거나 억지 의미를 붙이면 디자인이 깨진다.
 */
export function pickBenefitCardIcons(
  cards: Array<{ title?: string; body?: string }>,
): SummaryIconId[] | null {
  const used = new Set<SummaryIconId>();
  const picked: SummaryIconId[] = [];
  for (const card of cards) {
    const candidates = [
      ...benefitMatches(card.title ?? ""),
      ...benefitMatches(card.body ?? ""),
    ];
    if (candidates.length === 0) return null;
    const id = candidates.find((c) => !used.has(c)) ?? candidates[0]!;
    used.add(id);
    picked.push(id);
  }
  return picked;
}

export const BENEFIT_ICON_PX = 34;

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
