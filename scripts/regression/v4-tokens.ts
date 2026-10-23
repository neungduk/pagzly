/**
 * 회귀 — 440차 4 이전 마크업 v4 보정: 특수 섹션 단계(timeline) STEP 라벨이 흰·따뜻한 중립 면 모두 4.5:1, 가격 통화기호 작게(v4),
 * 말뭉치 export의 STEP 라벨·배지 대비 4.5:1 이상(인라인 색·바탕 기준). off 문자열 불변은 check-v4-off가 본다. 호출 0.
 */
import { contrastRatioToken } from "../../lib/design-tokens";
import { v4TextOn } from "../../lib/palette-v4";
import { corpus, exportHtmlOf } from "../design-corpus";

export const name = "v4 토큰 보정 — STEP 라벨·배지 4.5:1·가격 통화기호";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  for (const accent of ["#D2698D", "#2A9F29", "#C9A227", "#3D97C6"]) {
    const c = v4TextOn(accent, "#F7F3EE");
    if (contrastRatioToken(c, "#F7F3EE") < 4.5 || contrastRatioToken(c, "#FFFFFF") < 4.5) fails.push(`timeline STEP ${accent} → ${c} 대비 미달`);
  }
  let ctas = 0;
  for (const [id, f] of corpus()) {
    const h = exportHtmlOf(f);
    if (/class="pagzly-cta"/.test(h)) {
      ctas += 1;
      if (!/vertical-align:0\.32em;letter-spacing:0">₩<\/span>\d/.test(h)) fails.push(`${id}: 가격 통화기호가 작게 분리되지 않음`);
    }
    // STEP 라벨·배지: 같은 요소의 인라인 글자색·바탕색이 둘 다 있으면 4.5 이상
    for (const m of h.matchAll(/<(?:span|p)\b[^>]*style="([^"]*)"[^>]*>STEP \d{2}</g)) {
      const st = m[1]!;
      const fg = /(?:^|;)color:(#[0-9A-Fa-f]{6})/.exec(st)?.[1];
      const bg = /background:(#[0-9A-Fa-f]{6})/.exec(st)?.[1];
      if (fg && bg && contrastRatioToken(fg, bg) < 4.5) fails.push(`${id}: STEP 배지 대비 ${contrastRatioToken(fg, bg).toFixed(2)}`);
    }
  }
  if (!ctas) fails.push("말뭉치에 구매 카드 없음(검사 안 됨)");
  return fails;
}
