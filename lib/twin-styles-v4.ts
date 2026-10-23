/**
 * 443차 2 — 이전 섹션 쌍둥이 수정용 v4 스타일 선언. 라이브(DetailSectionRenderer)와 export(export-detail-html)가 따로 그리는 섹션의
 * "v4에서만 바뀌는 값"을 섹션마다 한 함수로 모아 두 렌더러가 같이 읽는다(마크업은 각자, 값은 한 곳). 값은 lib/design-tokens-v4.ts 토큰만 쓴다.
 * 선언 목록(Decl)을 라이브는 declObject(style 객체)로, export는 declStyle(인라인 문자열)로 바꿔 쓴다. 하드코딩 신규 금지.
 */
import { BRAND, FLAT_PAPER, INFO_TABLE, hexToRgba } from "@/lib/design-tokens";
import { classifyBoolishCell } from "@/lib/comparison-cell-classify";
import { SPACE_V4, tokenDecl, type Decl } from "@/lib/design-tokens-v4";

/** 선언 목록 합치기 — 같은 속성은 뒤가 이긴다(순서는 처음 나온 위치) */
export function mergeDecl(...lists: Decl[]): Decl {
  const out = new Map<string, string>();
  for (const l of lists) for (const [p, v] of l) out.set(p, v);
  return [...out.entries()];
}

// ── highlight_box(강조 카드) ─────────────────────────────────────────────────
/** 카드 제목 토큰: 판매자 신뢰 근거 카드(큰 인용 제목)는 위계 '중', 일반 카드는 '소' */
export const highlightTitleKey = (trust: boolean) => (trust ? "heading-mid" : "heading-small");
/** 카드 면·깊이: 반경 3단 '중', 신뢰 근거는 위·아래 여백 48. 일반 카드는 hairline+soft, 가운데 강조 카드는 테두리 없이 float, 진한 바탕(boldBlock)은 그림자 없음 */
export function highlightCardV4(c: { trust: boolean; em: boolean; bold: boolean }, ink: string = BRAND.ink): Decl {
  const pad: Decl = c.trust ? [["padding-top", `${SPACE_V4.md}px`], ["padding-bottom", `${SPACE_V4.md}px`]] : [];
  const depth: Decl = c.em ? [["border", "none"], ...tokenDecl("shadow-float", ink)] : c.bold ? tokenDecl("shadow-none") : [...tokenDecl("hairline", ink), ...tokenDecl("shadow-soft", ink)];
  return mergeDecl(tokenDecl("radius-md"), pad, depth);
}

// ── target_persona(페르소나) ─────────────────────────────────────────────────
/** 페르소나 문장(목록 카드·사진 띠 한 줄)은 카드 제목 '소'(17·700). 단일 라벨은 442차대로 '중'(PERSONA_SINGLE, 같은 토큰) */
export const personaTextV4 = (): Decl => tokenDecl("heading-small");
/** 목록 카드 껍데기: 반경 3단 '중' — 라이브 rounded-xl(12)과 export RADIUS.lg(16)이 따로 가던 것을 한 값으로 */
export const personaCardV4 = (): Decl => mergeDecl(tokenDecl("radius-md"), personaTextV4());

// ── faq ──────────────────────────────────────────────────────────────────────
/** 질문 글: 카드 제목 '소'(17·700) 토큰 */
export const faqQuestionV4 = (): Decl => tokenDecl("heading-small");
/** 목록: 줄 구분(border-top) 대신 카드 사이 간격 16, 위 간격 48 */
export const faqListV4 = (): Decl => mergeDecl([["margin-top", `${SPACE_V4.md}px`], ["display", "flex"], ["flex-direction", "column"]], tokenDecl("gap-md"));
/** 카드 한 장: 흰 면 + hairline + soft 그림자 + 반경 '중', 안쪽 여백 24/20(정적 펼침 — 질문·답을 항상 모두 보인다) */
export const faqCardV4 = (ink: string = BRAND.ink): Decl =>
  mergeDecl(tokenDecl("radius-md"), tokenDecl("hairline", ink), tokenDecl("shadow-soft", ink), [["background", FLAT_PAPER], ["padding", "24px 20px"]]);

// ── spec_table(스펙 표) ──────────────────────────────────────────────────────
/** 표 칸 안쪽 여백(행 높이 = 글줄 + 위아래 14): 라이브 py-3.5와 export 14px가 같은 값 */
export const TABLE_CELL_PAD_V4 = { y: 14, x: 16 } as const;
/** 표 껍데기: 반경 3단 '중' + 흰 면. 일반 스펙은 hairline 테두리(위·아래 굵은 줄 대신), 배송 안내는 기존 accent 테두리 위에 반경만 */
export const specWrapV4 = (isShipping: boolean, ink: string = BRAND.ink): Decl =>
  mergeDecl(tokenDecl("radius-md"), [["overflow", "hidden"]], isShipping ? [] : mergeDecl(tokenDecl("hairline", ink), [["background", FLAT_PAPER]]));
/** 라벨 칸: 면(헤더 대신) + 진해진 글자(면 위 4.5:1 — 이전 55%는 면 위에서 부족) + 좌우 16 여백 */
export const specLabelCellV4 = (accent: string, ink: string = BRAND.ink): Decl => [
  ["padding", `${TABLE_CELL_PAD_V4.y}px ${TABLE_CELL_PAD_V4.x}px`],
  ["background", hexToRgba(accent, INFO_TABLE.headerBgAlpha)],
  ["color", hexToRgba(ink, 0.72)],
  ["opacity", "1"],
];
export const specValueCellV4 = (): Decl => [["padding", `${TABLE_CELL_PAD_V4.y}px ${TABLE_CELL_PAD_V4.x}px`]];
/** 줄무늬: 홀수 번째 행(0부터) — 2열 격자(pagzly-spec-grid)에서는 열이 통째로 칠해지므로 쓰지 않는다 */
export const specZebraV4 = (accent: string): Decl => [["background", hexToRgba(accent, INFO_TABLE.stripeAlpha)]];

// ── comparison_table(비교 표) ────────────────────────────────────────────────
/** "30mL"·"42dB"·"15" → 숫자와 단위로. 숫자로 시작하지 않거나 단위가 길면(글 값) null. 값은 입력 그대로(계산·반올림 없음) */
export function splitNumberUnit(value: string): { num: string; unit: string } | null {
  const m = /^([0-9][0-9.,~∼\-]*)\s*([^\s].{0,5})?$/.exec(value.trim());
  return m ? { num: m[1]!, unit: m[2] ?? "" } : null;
}
/** 열의 모든 행이 숫자(+단위) 값이면 그 열은 우측 정렬(O/X 같은 불린 값은 숫자가 아니다) */
export function numericColumnV4(rows: ReadonlyArray<{ values: readonly string[] }>, col: number): boolean {
  return rows.length > 0 && rows.every((r) => classifyBoolishCell(r.values[col] ?? "") === null && splitNumberUnit(r.values[col] ?? "") !== null);
}
export const COMPARE_UNIT_PX = 12; // 라벨 하한(12) — 단위는 숫자보다 작게
export const compareUnitV4 = (): Decl => [["font-size", `${COMPARE_UNIT_PX}px`], ["margin-left", "2px"]];
/** 표 껍데기: 위 간격 48, 반경 '중', hairline, 넘침 숨김 */
export const compareWrapV4 = (ink: string = BRAND.ink): Decl =>
  mergeDecl([["margin-top", `${SPACE_V4.md}px`]], tokenDecl("radius-md"), tokenDecl("hairline", ink), [["overflow", "hidden"]]);
/** 칸 안쪽 여백(행 높이): 라이브 px-4/py-3.5와 export 12px이 따로 가던 것을 한 값으로. 숫자 열은 우측 정렬 */
export const compareCellV4 = (right: boolean): Decl => [["padding", `${TABLE_CELL_PAD_V4.y}px ${TABLE_CELL_PAD_V4.x}px`], ...(right ? ([["text-align", "right"]] as Decl) : [])];
