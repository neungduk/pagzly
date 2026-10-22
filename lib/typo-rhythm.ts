/**
 * 438차 1-5 — 제목 줄 끝 고아(한두 글자 단어만 다음 줄로 떨어지는 것) 줄이기. text-wrap 없이, 입력 문구는 바꾸지 않고
 * 마지막 짧은 어절(1~2자)을 바로 앞 어절과 줄바꿈 없는 묶음(white-space:nowrap)으로 붙여 함께 넘어가게 한다("단백질 바" → 한 덩어리).
 * 대상: 임팩트·히어로 마크업 안의 제목 요소(h1, 굵기 700 이상·18px 이상인 p). 태그가 섞인 글(마커 강조 등)은 건드리지 않는다.
 */
import { DESIGN_POLISH_ENABLED } from "@/lib/design-polish";

/** 이스케이프된 제목 글에서 마지막 짧은 어절을 앞 어절과 묶는다(묶을 필요 없으면 그대로) */
export function bindTail(escaped: string): string {
  const m = /^(.*\S)\s+(\S+)\s+(\S{1,2})$/.exec(escaped);
  if (!m) return escaped;
  const [, head, prev, last] = m;
  if (prev!.length + last!.length > 12) return escaped;
  return `${head} <span style="white-space:nowrap">${prev} ${last}</span>`;
}

const TITLE_RE = /(<h1\b[^>]*>|<p\b[^>]*font-size:(\d+(?:\.\d+)?)px;font-weight:(\d+)[^>]*>)([^<]+)(<\/(?:h1|p)>)/g;

export function polishTitles(html: string, enabled: boolean = DESIGN_POLISH_ENABLED): string {
  if (!enabled) return html;
  return html.replace(TITLE_RE, (all, open: string, size: string | undefined, weight: string | undefined, text: string, close: string) => {
    const isH1 = open.startsWith("<h1");
    if (!isH1 && (Number(size) < 18 || Number(weight) < 700)) return all;
    return `${open}${bindTail(text)}${close}`;
  });
}
