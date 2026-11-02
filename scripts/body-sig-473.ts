/** 473 — 본문 시각 시그니처 추출(문자열) */
import { BODY_SIG, bodySigDiff, type BodySig } from "../lib/body-sig-v5";
import type { ArchetypeId } from "../lib/page-archetype-v5";

const cssVar = (html: string, name: string): string | null => {
  const m = new RegExp(`--pz-bs-${name}:([^;!}]+)`).exec(html);
  return m?.[1]?.trim() ?? null;
};

export function bodySigFromHtml(html: string, arch: ArchetypeId): BodySig {
  // bodySigCssV5가 넣는 CSS 변수(페이지당 1회). 섹션 data-attrs 반복은 export 다이어트.
  if (!/data-pz-bsig=/.test(html)) return BODY_SIG[arch];
  const num = cssVar(html, "num");
  const list = cssVar(html, "list");
  const stat = cssVar(html, "stat");
  const rule = cssVar(html, "rule");
  const radius = cssVar(html, "r");
  const shadow = cssVar(html, "sh");
  if (num && list && stat && rule && radius && shadow) {
    return { num: num as BodySig["num"], list: list as BodySig["list"], stat: stat as BodySig["stat"], rule: rule as BodySig["rule"], radius: radius as BodySig["radius"], shadow: shadow as BodySig["shadow"] };
  }
  return BODY_SIG[arch];
}

export { bodySigDiff, BODY_SIG };
