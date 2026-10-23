/**
 * 440차 3 — v4 아이콘 시스템(코드 SVG, 외부·AI 트레이스 이미지 0). 라이브·export가 같은 문자열을 쓴다.
 *
 * 왜: 이전 차수 아이콘은 요약 칩·혜택 카드용 26종(lib/summary-line-icons.ts, 선 1.4)뿐이라 v4 블록(아이콘 행·벤토·스펙 카드)은
 * 번호·체크로만 채웠다. 같은 24 격자·둥근 끝 규칙으로 카테고리 아이콘을 더해 66종으로 늘리고, v4에서는 선 2 + 듀오톤(틴트 원)을 쓴다.
 *  - 기존 26종 경로는 그대로 재사용(SUMMARY_ICON_PATHS) — 같은 뜻에 다른 그림이 나오지 않게
 *  - 선택은 입력 라벨 키워드 → 아이콘(규칙 순서대로 첫 일치). 못 맞추면 null → 호출하는 쪽이 번호·체크로 폴백(억지 매칭 금지)
 *  - 이전 차수 화면(요약 칩·혜택 카드)의 규칙·그림은 바꾸지 않는다(off 동일)
 * 색: 선은 면 역할 글자색(대비 4.5 이상), 듀오톤 틴트는 장식(비텍스트)이라 선과 3:1을 따로 요구하지 않는다(선이 형태를 전부 담는다).
 */
import { SUMMARY_ICON_PATHS, SUMMARY_ICON_PX, benefitMatches, pickSummaryIcon, summaryIconSvg, type SummaryIconId } from "@/lib/summary-line-icons";
import { DESIGN_V4_ENABLED } from "@/lib/design-v4";
import { hexToRgba } from "@/lib/design-tokens";
import { ensureContrast } from "@/lib/palette-v4";

/** 440차에 더한 아이콘 — 24 격자, 선 2, 둥근 끝(stroke-linecap/linejoin round), 채움 없음 */
const EXTRA_PATHS = {
  // 뷰티
  pump: '<path d="M9 9h6v11a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V9z"/><path d="M10.5 9V6h3v3M13.5 4.5h4M10.5 6V4.5h3"/><path d="M9 14h6"/>',
  jar: '<rect x="5" y="9" width="14" height="11" rx="2"/><path d="M6 9V6.5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1V9"/><path d="M9 14h6"/>',
  mist: '<path d="M9 10h5v10.5H9z"/><path d="M10 10V7.5h3V10M13 6h2"/><path d="M18 4.5l1.5-1M18.5 7h2M18 9.5l1.5 1"/>',
  lips: '<path d="M3.5 12c2.5-3.5 5-5 6.5-4 1 .6 1.5.6 2 .3.5.3 1 .3 2-.3 1.5-1 4 .5 6.5 4-2.5 3.5-5 5.5-8.5 5.5S6 15.5 3.5 12z"/><path d="M3.5 12h17"/>',
  face: '<circle cx="12" cy="12" r="8.5"/><path d="M9 10v.5M15 10v.5"/><path d="M8.5 14.5c2 2 5 2 7 0"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  hair: '<path d="M6 21V11a6 6 0 0 1 12 0v10"/><path d="M10 9.5c0 3-1 6-2 8M14 9.5c0 3 1 6 2 8"/>',
  shine: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
  // 패션
  shirt: '<path d="M8.5 3.5L4 6l1.5 4.5 2-1V20.5h9V9.5l2 1L20 6l-4.5-2.5c-.5 1.5-1.8 2.5-3.5 2.5S9 5 8.5 3.5z"/>',
  hanger: '<path d="M12 8V6.8a2 2 0 1 0-2-2"/><path d="M12 8l-8.5 7.5a1 1 0 0 0 .7 1.7h15.6a1 1 0 0 0 .7-1.7L12 8z"/>',
  scissors: '<circle cx="6.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="M8.3 15.7L18 4M15.7 15.7L6 4"/>',
  needle: '<path d="M19.5 4.5L6 18l-1.5 1.5"/><path d="M17 4.5a2 2 0 0 1 2.5 2.5"/><path d="M4 9c4-1 8 3 6 6s-6 2-6-1"/>',
  wash: '<path d="M4 7h16l-1.6 11.2a2 2 0 0 1-2 1.8H7.6a2 2 0 0 1-2-1.8L4 7z"/><path d="M5.5 11c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4 0"/>',
  iron: '<path d="M3.5 17.5h17l-1-4.5a5 5 0 0 0-4.9-4H9"/><path d="M9 9V6.5h7"/><path d="M7 14h.01M10 14h.01"/>',
  tag: '<path d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1a1 1 0 0 1 .7.3l7.2 7.2a1 1 0 0 1 0 1.4l-8.1 8.1a1 1 0 0 1-1.4 0l-7.2-7.2a1 1 0 0 1-.3-.7z"/><circle cx="8" cy="8" r="1.5"/>',
  fit: '<path d="M7 3.5h10l1.5 17h-5L12 11l-1.5 9.5h-5L7 3.5z"/><path d="M7 7h10"/>',
  // 전자
  battery: '<rect x="2.5" y="7.5" width="16" height="9" rx="2"/><path d="M21.5 10.5v3"/><path d="M6 10.5v3M9.5 10.5v3M13 10.5v3"/>',
  bluetooth: '<path d="M7 7l10 10-5 4.5v-19L17 7 7 17"/>',
  wifi: '<path d="M2.5 9a14 14 0 0 1 19 0"/><path d="M5.5 12.5a9.5 9.5 0 0 1 13 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><path d="M12 19.5h.01"/>',
  plug: '<path d="M9 3v5M15 3v5"/><path d="M6.5 8h11v3a5.5 5.5 0 0 1-11 0V8z"/><path d="M12 16.5v4.5"/>',
  usb: '<rect x="7" y="3.5" width="10" height="7" rx="1"/><path d="M5.5 10.5h13v4a3 3 0 0 1-3 3h-7a3 3 0 0 1-3-3v-4z"/><path d="M10 6.5h.01M14 6.5h.01M12 17.5v3"/>',
  headphones: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3.5" y="14" width="4" height="6.5" rx="1.5"/><rect x="16.5" y="14" width="4" height="6.5" rx="1.5"/>',
  speaker: '<path d="M4 9.5h4L13 5v14l-5-4.5H4v-5z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5v3.5"/>',
  chip: '<rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/><path d="M9.5 3v3.5M14.5 3v3.5M9.5 17.5V21M14.5 17.5V21M3 9.5h3.5M3 14.5h3.5M17.5 9.5H21M17.5 14.5H21"/>',
  screen: '<rect x="3" y="4.5" width="18" height="12" rx="1.5"/><path d="M8.5 20.5h7M12 16.5v4"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M9.5 2.5h5M18.5 6.5l1.5-1.5"/>',
  // 식품
  flame: '<path d="M12 21.5a6.5 6.5 0 0 0 6.5-6.5c0-3.5-2.5-5.5-3.5-9-2 1.5-3 3.5-3 5.5-1-1-1.5-2-1.5-3.5C8 9.5 5.5 12 5.5 15a6.5 6.5 0 0 0 6.5 6.5z"/>',
  snow: '<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6"/><path d="M9.5 4l2.5 2 2.5-2M9.5 20l2.5-2 2.5 2"/>',
  fridge: '<rect x="5.5" y="2.5" width="13" height="19" rx="2"/><path d="M5.5 10h13M8.5 6v2M8.5 13v3"/>',
  bowl: '<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z"/><path d="M8 20h8"/><path d="M9 8c0-1.5 1-1.5 1-3M13 8c0-1.5 1-1.5 1-3"/>',
  wheat: '<path d="M12 21.5V8"/><path d="M12 12c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4zM12 12c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4zM12 16.5c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4zM12 16.5c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4zM12 8c-1-1-1-3 0-5.5 1 2.5 1 4.5 0 5.5z"/>',
  coffee: '<path d="M4.5 9h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V9z"/><path d="M16.5 10.5h1a2.5 2.5 0 0 1 0 5h-1.2"/><path d="M8 3.5c0 1.5 1 1.5 1 3M12 3.5c0 1.5 1 1.5 1 3"/>',
  apple: '<path d="M12 7.5c-3-2-7.5-.5-7.5 4.5 0 4.5 3 9 5.5 9 1 0 1.3-.5 2-.5s1 .5 2 .5c2.5 0 5.5-4.5 5.5-9 0-5-4.5-6.5-7.5-4.5z"/><path d="M12 7.5c0-2 1-3.5 3-4.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5h.01"/>',
  // 생활
  home: '<path d="M3.5 11L12 3.5l8.5 7.5"/><path d="M5.5 9.5v11h13v-11"/><path d="M10 20.5v-5.5h4v5.5"/>',
  broom: '<path d="M14 3l-3.5 8.5"/><path d="M7 11.5h7l1.5 9h-10l1.5-9z"/><path d="M9 15.5l-.5 5M12 15.5v5"/>',
  spray: '<path d="M8 9h6v11.5H8z"/><path d="M9 9V6.5h4l2.5-1.5v4"/><path d="M18 6h2.5M18 3.5l1.8-1M18 8.5l1.8 1"/>',
  drawer: '<rect x="3.5" y="4" width="17" height="16" rx="1.5"/><path d="M3.5 12h17M10 8h4M10 16h4"/>',
  bed: '<path d="M3 19.5v-12M21 19.5V13a2.5 2.5 0 0 0-2.5-2.5H11v6"/><path d="M3 16.5h18"/><circle cx="7" cy="12.5" r="2"/>',
  paw: '<circle cx="7" cy="9" r="1.8"/><circle cx="17" cy="9" r="1.8"/><circle cx="10" cy="5" r="1.6"/><circle cx="14" cy="5" r="1.6"/><path d="M12 11.5c-3 0-5.5 4-5.5 6 0 2 1.5 3 3 3 1.2 0 1.6-.6 2.5-.6s1.3.6 2.5.6c1.5 0 3-1 3-3 0-2-2.5-6-5.5-6z"/>',
  // 공통
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8L12 3.5z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><path d="M12 14.5v2"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  chat: '<path d="M4 5.5h16v10.5H9.5L5 20v-4H4V5.5z"/><path d="M8 9.5h8M8 12.5h5"/>',
  refresh: '<path d="M20 11.5A8 8 0 0 0 5.5 7"/><path d="M4 12.5A8 8 0 0 0 18.5 17"/><path d="M5.5 3v4h4M18.5 21v-4h-4"/>',
  hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V5.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5A5.5 5.5 0 0 1 5 18.2L3.6 15a1.5 1.5 0 0 1 2.6-1.4L8 16"/>',
  size: '<path d="M4 4h6M4 4v6M20 20h-6M20 20v-6M4 4l16 16"/>',
} as const;

export type ExtraIconId = keyof typeof EXTRA_PATHS;
export type V4IconId = SummaryIconId | ExtraIconId;

export const V4_ICON_PATHS: Record<V4IconId, string> = { ...SUMMARY_ICON_PATHS, ...EXTRA_PATHS };
export const V4_ICON_IDS = Object.keys(V4_ICON_PATHS) as V4IconId[];

/** 440차에 더한 아이콘의 키워드(위에서부터 첫 일치) — 기존 혜택 규칙(benefitMatches)보다 먼저 본다. 근거 없는 의미를 붙이지 않도록 구체 명사만 */
const EXTRA_RULES: Array<[RegExp, V4IconId]> = [
  [/배터리|mah|사용\s*시간|재생\s*시간|연속\s*\d+\s*시간/i, "battery"],
  [/블루투스|bluetooth|무선\s*연결|페어링/i, "bluetooth"],
  [/와이파이|wi-?fi|앱\s*연동|스마트\s*연동/i, "wifi"],
  [/어댑터|플러그|콘센트|전원/, "plug"],
  [/usb|c\s*타입|type-?c|충전\s*단자/i, "usb"],
  [/이어폰|이어버드|헤드폰|헤드셋/, "headphones"],
  [/스피커|출력\s*\d|볼륨|음량/, "speaker"],
  [/마이크|통화/, "mic"],
  [/칩셋|프로세서|드라이버\s*\d|센서/, "chip"],
  [/화면|디스플레이|모니터|액정/, "screen"],
  [/스마트폰|휴대폰|핸드폰/, "phone"],
  [/타이머|예약|분\s*만에|초\s*만에/, "timer"],
  [/펌프/, "pump"],
  [/크림|밤\b|젤\b|용기/, "jar"],
  [/미스트|스프레이|분사/, "mist"],
  [/립|입술|틴트/, "lips"],
  [/눈가|아이\s*(크림|라인|섀도)|속눈썹/, "eye"],
  [/모발|두피|헤어|머릿결|샴푸/, "hair"],
  [/피부|얼굴|안색|세안/, "face"],
  [/윤기|광택|글로우/, "shine"],
  [/티셔츠|셔츠|상의|니트|원피스|아우터/, "shirt"],
  [/핏|실루엣|라인/, "fit"],
  [/세탁|손빨래|드라이\s*클리닝/, "wash"],
  [/다림질|구김/, "iron"],
  [/봉제|바느질|스티치|마감/, "needle"],
  [/재단|커팅/, "scissors"],
  [/옷걸이|걸어/, "hanger"],
  [/가격|정가|판매가/, "tag"],
  [/조리|가열|굽|구워|볶|에어프라이어|전자레인지/, "flame"],
  [/냉동|얼려/, "snow"],
  [/냉장|보관\s*온도/, "fridge"],
  [/한\s*그릇|국물|간편식|식사/, "bowl"],
  [/곡물|밀|통밀|현미|쌀/, "wheat"],
  [/커피|음료|티백|차\b/, "coffee"],
  [/과일|사과|베리|비타민\s*c/i, "apple"],
  [/알레르기|함유\s*식품|주의\s*성분/, "info"],
  [/청소|먼지|흡입/, "broom"],
  [/세정|살균|탈취|뿌려/, "spray"],
  [/수납|정리|서랍|칸막이/, "drawer"],
  [/침구|베개|매트리스|이불/, "bed"],
  [/집|인테리어|거실|홈\b/, "home"],
  [/반려|강아지|고양이|펫/, "paw"],
  [/후기|리뷰|평점|별점/, "star"],
  [/잠금|안전\s*잠금|보안/, "lock"],
  [/유통기한|사용기한|개봉\s*후|기간/, "calendar"],
  [/상담|문의|고객센터/, "chat"],
  [/재사용|리필|교체/, "refresh"],
  [/손에|한\s*손|그립|휴대/, "hand"],
  [/사이즈|치수|크기|규격/, "size"],
  // 441차 1-7 — 색 조합은 팔레트(이전 혜택 규칙 "톤"이 미백·톤업 뜻의 반짝임으로 잡던 것)
  [/톤온톤|톤\s*온\s*톤|색\s*조합|컬러\s*매치/, "palette"],
];

const BODY_ONLY_BLOCKED = new Set<V4IconId>(["ruler", "weight", "cup", "size"]);

/** 라벨(+본문) 하나에서 아이콘 후보들 — 440 규칙 → 기존 혜택 규칙 순. 없으면 빈 배열 */
export function iconCandidatesV4(text: string): V4IconId[] {
  const t = String(text ?? "").replace(/\d+(\.\d+)?\s*%/g, "");
  const out: V4IconId[] = [];
  for (const [re, id] of EXTRA_RULES) if (re.test(t) && !out.includes(id)) out.push(id);
  for (const id of benefitMatches(t)) if (!out.includes(id)) out.push(id);
  return out;
}

/**
 * 항목 묶음 전체에 아이콘을 고른다(같은 아이콘 반복 피함). 한 항목이라도 근거가 없으면 null —
 * 일부만 아이콘이 있거나 억지 의미를 붙이면 디자인이 깨진다(이전 차수 pickBenefitCardIcons와 같은 원칙). 호출하는 쪽은 번호·체크로 폴백.
 */
export function pickIconsV4(items: Array<{ title: string; body?: string }>): V4IconId[] | null {
  const used = new Set<V4IconId>();
  const picked: V4IconId[] = [];
  for (const it of items) {
    // 441차 1-7 — 크기·무게·용량 아이콘은 제목 근거일 때만(본문 "168cm" 때문에 "남녀 공용"이 자 아이콘이 되던 것)
    const c = [...iconCandidatesV4(it.title), ...iconCandidatesV4(it.body ?? "").filter((x) => !BODY_ONLY_BLOCKED.has(x))];
    if (!c.length) return null;
    const id = c.find((x) => !used.has(x)) ?? c[0]!;
    used.add(id);
    picked.push(id);
  }
  return picked;
}

/**
 * v4 아이콘 SVG. line: 선만. duotone: 오른쪽 아래로 비낀 틴트 원(장식) 위에 선 — 같은 아이콘이 면 색에 따라 톤만 바뀐다.
 * 선 2·둥근 끝은 이전 차수 요약 아이콘(1.4)보다 굵다: v4 블록 아이콘은 40~48px로 커서 1.4면 가늘게 보인다.
 */
export function iconV4Svg(id: V4IconId, o: { color: string; px: number; tint?: string }): string {
  const duo = o.tint ? `<circle cx="14.5" cy="14.5" r="7.5" fill="${o.tint}" stroke="none"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${o.px}" height="${o.px}" fill="none" stroke="${o.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block" aria-hidden="true" data-pz-icon="${id}">${duo}${V4_ICON_PATHS[id]}</svg>`;
}

/** 440차 신규 규칙만 본 첫 일치(없으면 null) — 요약 칩처럼 이전 차수 규칙을 그대로 두고 앞에만 얹을 때 */
export function extraIconFor(text: string): ExtraIconId | null {
  const t = String(text ?? "").replace(/\d+(\.\d+)?\s*%/g, "");
  for (const [re, id] of EXTRA_RULES) if (re.test(t)) return id as ExtraIconId;
  return null;
}

/**
 * "한눈에 보기" 요약 칩 아이콘(라이브·export 공용). v4: 신규 규칙 → 이전 요약 규칙 순으로 고르고 선 2 + 듀오톤(포인트색 16% 틴트).
 * off: 이전과 같은 summaryIconSvg(선 1.4·요약 규칙)
 */
export function glanceIconSvg(chip: string, color: string, accent: string): string {
  if (!DESIGN_V4_ENABLED) return summaryIconSvg(pickSummaryIcon(chip), color, SUMMARY_ICON_PX);
  // 440차 6 린트 R13 — 인증 강조 칩은 원본 포인트색이라 옅은 요약 면에서 2.9:1까지 떨어졌다. 비텍스트 기준 3:1을 옅은 면 대표값(#F0EBE3)에 맞춘다
  return iconV4Svg(extraIconFor(chip) ?? pickSummaryIcon(chip), { color: ensureContrast(color, "#F0EBE3", 3), px: SUMMARY_ICON_PX, tint: hexToRgba(accent, 0.16) });
}
