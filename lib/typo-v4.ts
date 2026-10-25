/**
 * 452차 2 — 한글 타이포 마감 토큰(DESIGN_V4). 라이브·export가 같은 규칙을 한 자리에서 받는다.
 *  - 한글 어절 보존: 본문·제목·목록·표 글에 `word-break:keep-all`(어절 가운데에서 줄이 바뀌지 않게)과 `overflow-wrap:anywhere`(긴 영단어·URL이 상자를 넘지 않게 마지막 방어).
 *    입력 문구는 바꾸지 않는다(공백·글자 그대로, CSS만). `text-wrap`·`<br>`은 쓰지 않는다.
 *  - 행간 하한/상한은 자리별 토큰(BODY_LINE_HEIGHT)을 쓰는 곳(구매 카드 혜택 칩 등)에서 가져간다.
 * 선택자에 `:has()`·container query를 쓰지 않는다.
 */
export const BODY_LINE_HEIGHT = 1.5;
export const BODY_LINE_HEIGHT_MAX = 1.75;
export const TITLE_LINE_HEIGHT_MIN = 1.2;
export const TITLE_LINE_HEIGHT_MAX = 1.4;

const TAGS = ["p", "li", "td", "th", "dd", "h2", "h3", "h4"] as const;
const RULE = "word-break:keep-all;overflow-wrap:anywhere";

/** export(.pagzly-wrap) 범위 바닥 CSS. 인라인 style이 정한 값은 건드리지 않는다(속성이 없을 때만 적용되는 상속 규칙) */
export function typoCssExport(scope: string): string {
  // 본문 행간이 1.75를 넘는 클래스(.pagzly-body-lh, 1.8~1.9)는 상한으로 — 인라인 값을 !important로 눌러야 해서 클래스 한정
  return TAGS.map((t) => `${scope} ${t}`).join(",") + `{${RULE}}` + `${scope} .pagzly-body-lh{line-height:${BODY_LINE_HEIGHT_MAX}!important}`;
}

/** 라이브 범위 바닥 CSS(같은 내용) */
export function typoCssLive(scope: string): string {
  return typoCssExport(scope);
}
