/**
 * 443차 2 — 이전 섹션 쌍둥이 수정용 v4 스타일 선언. 라이브(DetailSectionRenderer)와 export(export-detail-html)가 따로 그리는 섹션의
 * "v4에서만 바뀌는 값"을 섹션마다 한 함수로 모아 두 렌더러가 같이 읽는다(마크업은 각자, 값은 한 곳). 값은 lib/design-tokens-v4.ts 토큰만 쓴다.
 * 선언 목록(Decl)을 라이브는 declObject(style 객체)로, export는 declStyle(인라인 문자열)로 바꿔 쓴다. 하드코딩 신규 금지.
 */
import { BRAND } from "@/lib/design-tokens";
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
