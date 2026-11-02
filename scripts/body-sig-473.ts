/** 473 — 본문 시각 시그니처 추출(문자열) */
import { BODY_SIG, bodySigDiff, type BodySig } from "../lib/body-sig-v5";
import type { ArchetypeId } from "../lib/page-archetype-v5";

const attr = (html: string, name: string): string | null => {
  const m = new RegExp(`${name}="([^"]+)"`).exec(html);
  return m?.[1] ?? null;
};

export function bodySigFromHtml(html: string, arch: ArchetypeId): BodySig {
  // 페이지에서 첫 data-pz-bsig 표식(본문 시그니처는 아키타입 상수 — HTML 표식과 일치해야 함)
  const i = html.indexOf('data-pz-bsig="');
  const slice = i >= 0 ? html.slice(i, i + 500) : "";
  const num = attr(slice, "data-pz-bs-num");
  const list = attr(slice, "data-pz-bs-list");
  const stat = attr(slice, "data-pz-bs-stat");
  const rule = attr(slice, "data-pz-bs-rule");
  const radius = attr(slice, "data-pz-bs-r");
  const shadow = attr(slice, "data-pz-bs-sh");
  if (num && list && stat && rule && radius && shadow) {
    return { num: num as BodySig["num"], list: list as BodySig["list"], stat: stat as BodySig["stat"], rule: rule as BodySig["rule"], radius: radius as BodySig["radius"], shadow: shadow as BodySig["shadow"] };
  }
  return BODY_SIG[arch];
}

export { bodySigDiff, BODY_SIG };
