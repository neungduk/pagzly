/**
 * 회귀 — 442차 2-C 이전 섹션 여백 3단 스냅(DESIGN_V4): 소스 규칙(원천 한 곳에서 라이브·export가 같이 바뀜)과 말뭉치 DOM(export, 390폭)에서
 * 히어로 제외 모든 최상위 섹션의 위·아래 여백이 0·32·48·64(8px 이하 가장자리 제외)인지, 이웃 섹션 여백 급변(2배 초과)이 없는지. 호출 0, 브라우저는 DOM 측정에만.
 */
import { getCategoryRhythm } from "../../lib/design-tokens";
import { getRhythmTokens } from "../../lib/rhythm-tokens";
import { corpus, exportHtmlOf } from "../design-corpus";
import { measureDomPages } from "../design-metrics-dom";

export const name = "여백 3단 — 이전 섹션 포함 0·32·48·64·급변 없음·원천 스냅(클래스·토큰·팩 배율)";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  // 원천: 6개 카테고리의 좁은 폭 세로 여백 클래스가 3단 안(py-14·pt-10·pt-9 없음)
  for (const cat of ["화장품/뷰티", "의류/패션", "식품/건강기능식품", "전자제품", "생활용품", "반려동물"]) {
    const r = getCategoryRhythm(cat);
    for (const cls of [r.generousPadClass, r.trustPadClass, r.ctaPadClass, r.pointTextPadClass, r.galleryTitlePadClass]) {
      if (/(^|\s)(py-14|pt-10|pt-9)(\s|$)/.test(cls)) fails.push(`${cat}: 3단 밖 클래스 ${cls}`);
    }
    // 팩 배율(0.75~1.3)을 곱해도 export 토큰이 3단
    for (const scale of [0.75, 0.85, 0.875, 1, 1.25, 1.3]) {
      const t = getRhythmTokens(cat, false, scale);
      for (const v of [t.padY, t.padTy, t.padCy]) if (![32, 48, 64].includes(v)) fails.push(`${cat} 배율 ${scale}: 토큰 ${v}`);
    }
    // 넓은 폭은 그대로(스냅하지 않음)
    const w = getRhythmTokens(cat, true, 1);
    if (w.padY < 56) fails.push(`${cat}: 넓은 폭 여백이 줄어듦 ${w.padY}`);
  }
  // 말뭉치 DOM
  const files = corpus();
  if (files.length < 18) return fails;
  const dom = await measureDomPages(files.map(([id, f]) => [id, exportHtmlOf(f)]));
  for (const [id] of files) {
    const m = dom.get(id)!;
    if (m.padOff) fails.push(`${id}: 3단 밖 여백 ${m.padOff}곳`);
    if (m.padJumps) fails.push(`${id}: 이웃 섹션 여백 급변 ${m.padJumps}곳`);
  }
  return fails;
}
