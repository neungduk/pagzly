/**
 * 452차 2 — 한글 타이포 마감 토큰(DESIGN_V4). 라이브·export가 같은 규칙을 한 자리에서 받는다.
 *  - 한글 어절 보존: 본문·제목·목록·표 글에 `word-break:keep-all`(어절 가운데에서 줄이 바뀌지 않게)과 `overflow-wrap:anywhere`(긴 영단어·URL이 상자를 넘지 않게 마지막 방어).
 *    입력 문구는 바꾸지 않는다(공백·글자 그대로, CSS만). `text-wrap`·`<br>`은 쓰지 않는다.
 *  - 행간 하한/상한은 자리별 토큰(BODY_LINE_HEIGHT)을 쓰는 곳(구매 카드 혜택 칩 등)에서 가져간다.
 * 선택자에 `:has()`·container query를 쓰지 않는다.
 */
import { bindTail } from "@/lib/typo-rhythm";

export const BODY_LINE_HEIGHT = 1.5;
export const BODY_LINE_HEIGHT_MAX = 1.75;
export const TITLE_LINE_HEIGHT_MIN = 1.2;
export const TITLE_LINE_HEIGHT_MAX = 1.4;

const TAGS = ["p", "li", "td", "th", "dd", "h2", "h3", "h4"] as const;
const RULE = "word-break:keep-all;overflow-wrap:anywhere";

/** export(.pagzly-wrap) 범위 바닥 CSS. 인라인 style이 정한 값은 건드리지 않는다(속성이 없을 때만 적용되는 상속 규칙) */
export function typoCssExport(scope: string): string {
  // 본문 행간이 1.75를 넘는 클래스(.pagzly-body-lh, 1.8~1.9)는 상한으로 — 인라인 값을 !important로 눌러야 해서 클래스 한정
  return TAGS.map((t) => `${scope} ${t}`).join(",") + `{${RULE}}` + `${scope} td,${scope} th,${scope} li{line-height:${BODY_LINE_HEIGHT}}` + `${scope} p[style*="line-height:1.8"]{line-height:${BODY_LINE_HEIGHT_MAX}!important}` + `${scope} .pagzly-body-lh{line-height:${BODY_LINE_HEIGHT_MAX}!important}`;
}

/** 라이브 범위 바닥 CSS(같은 내용) */
export function typoCssLive(scope: string): string {
  return typoCssExport(scope);
}

/**
 * 453차 1 — 가운뎃점으로 이어진 짧은 복합어(「봄·여름에는」「데님·슬랙스」)는 가운뎃점 뒤에서 줄이 바뀌면 한 낱말이 두 줄로 쪼개진다.
 * export 마지막 HTML의 본문 글 노드에서 공백 없이 이어진 `A·B(·C…)`(10자 이하)를 `white-space:nowrap` 묶음으로 감싼다. 글자는 그대로(태그만 추가).
 * script·style·head는 건드리지 않는다. 라이브는 편집 가능한 글(contentEditable) 안에 태그를 넣을 수 없어 적용하지 않는다(편집 UI 불변) — export에만 적용.
 */
/** 458차 — 묶음 최대 글자 수. 18자까지 묶었더니 큰 글자(26px 안팎) 진술문의 「동백·히알루론산·판테놀·병풀」(15자)이 395px로 390폭 밖으로 넘쳤다(사진 0장 퍼징). 10자 이하만 묶는다 */
export const COMPOUND_MAX_CHARS = 10;
const COMPOUND = /[^\s·&;<>]{1,8}(?:·[^\s·&;<>]{1,8})+/g;
export function bindCompoundsHtml(html: string): string {
  const bodyAt = html.indexOf("<body");
  if (bodyAt < 0) return html;
  const head = html.slice(0, bodyAt), body = html.slice(bodyAt);
  const protectedRe = /<(script|style)\b[\s\S]*?<\/\1>/gi;
  const parts: string[] = [];
  let last = 0;
  for (const m of body.matchAll(protectedRe)) { parts.push(wrapText(body.slice(last, m.index!)), m[0]); last = m.index! + m[0].length; }
  parts.push(wrapText(body.slice(last)));
  return head + parts.join("");
}
/** 이스케이프된 글의 마지막 두 어절을 묶는다(마지막 어절 4자 이하, 묶음 14자 이하). 글자는 그대로 */
export function bindLast(escaped: string): string {
  const m = /^(.*\S)\s+(\S+)\s+(\S{1,4})$/.exec(escaped);
  if (!m || m[2]!.length + m[3]!.length > 13) return escaped;
  return `${m[1]} <span style="white-space:nowrap">${m[2]} ${m[3]}</span>`;
}
function wrapText(chunk: string): string {
  // 453차 3 — 표 값 칸(td 또는 「라벨 span + 값 span」 줄)의 긴 글(14자 이상)은 마지막 짧은 어절을 앞 어절과 묶어 「소매 / 56」처럼 숫자만 다음 줄로 떨어지는 외톨이를 막는다(글자 불변)
  chunk = chunk.replace(/(<td\b[^>]*>(?:<span\b[^>]*>)?)([^<>]{14,})(?=<\/(?:span|td)>)/g, (_a, open: string, text: string) => open + bindLast(text));
  chunk = chunk.replace(/(<\/span><span\b[^>]*>)([^<>]{14,})(?=<\/span><\/div>)/g, (_a, open: string, text: string) => open + bindLast(text));
  return chunk.replace(/>([^<>]+)(?=<)/g, (all, text: string) => (text.includes("·") ? ">" + text.replace(COMPOUND, (w) => (w.length <= COMPOUND_MAX_CHARS ? `<span style="white-space:nowrap">${w}</span>` : w)) : all));
}
