/**
 * 회귀 — 408차 여백 숫자 토큰: 7개 카테고리(+기타) × 좁은/넓은 칸의 값이 408차 이전 export 변수와 정확히 같다.
 * rhythm-golden-408.json은 리팩터 직전 buildDetailPageHtml이 낸 `.pagzly-wrap{…}` 변수 문자열(고정값). 유료 호출 0.
 */
import fs from "node:fs";
import path from "node:path";
import { getCategoryRhythm } from "../../lib/design-tokens";
import { getRhythmTokens, rhythmLiveVars, rhythmVarsCss } from "../../lib/rhythm-tokens";

export const name = "여백 숫자 토큰 = 이전 클래스 값(8개 카테고리)";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const golden = JSON.parse(fs.readFileSync(path.join(__dirname, "rhythm-golden-408.json"), "utf8")) as Record<string, string[]>;
  for (const [category, [narrow, wide]] of Object.entries(golden)) {
    const vars = (s: string) => s.slice(s.indexOf("--pz-hero-x")).replace(/\}$/, "");
    if (rhythmVarsCss(category, false) !== vars(narrow!)) fails.push(`${category} 좁은 칸 토큰이 이전 값과 다름`);
    if (rhythmVarsCss(category, true) !== vars(wide!)) fails.push(`${category} 넓은 칸 토큰이 이전 값과 다름`);
    // 표식 클래스는 붙어 있지만(스타일 팩용) 기존 클래스는 그대로 앞에 남는다
    const r = getCategoryRhythm(category);
    for (const [k, marker] of [["generousPadClass", "pz-pad-g"], ["trustPadClass", "pz-pad-t"], ["ctaPadClass", "pz-pad-c"], ["pointTextPadClass", "pz-pad-p"]] as const) {
      if (!r[k].endsWith(` ${marker}`)) fails.push(`${category} ${k}에 표식 ${marker} 없음`);
    }
  }
  // 세로 여백 배율 1.25: 가로·히어로는 그대로, 세로만 곱해진다
  const base = getRhythmTokens("의류/패션", false);
  const scaled = getRhythmTokens("의류/패션", false, 1.25);
  if (scaled.padX !== base.padX || scaled.heroX !== base.heroX || scaled.heroB !== base.heroB) fails.push("배율이 가로·히어로 여백을 바꿈");
  if (scaled.padY !== Math.round(base.padY * 1.25)) fails.push(`세로 배율 계산: ${scaled.padY}`);
  const live = rhythmLiveVars("의류/패션", 1.25);
  if (live["--pz-pad-y-b"] !== `${scaled.padY}px`) fails.push("라이브 변수가 export 토큰과 다른 숫자");
  return fails;
}
