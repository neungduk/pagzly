/**
 * 447차 2-b 모티프 블록 위 간격. 순수 함수(같은 밝은 면 이웃 + 한쪽이 모티프 블록이면 앞 섹션 아래 여백 32, 면이 다르거나 어두우면 그대로, 이미 32 이하인 앞 섹션은 건드리지 않음),
 * 합성 21종 export: data-pz-bot 표식 수 = 계획 bottomPads 수·CSS 한 줄, (v4 off 동일은 check-v4-off 3종이 증명. 실측 간격은 브라우저가 필요해 _gap 점검에서 본다.)
 */
import { MOTIF_BOTTOM_PX, bottomPadCssV4, motifBottomPads } from "../../lib/rhythm-v4";
import type { DetailSection } from "../../lib/types/generate";
import { corpus, displayOf, exportHtmlOf } from "../design-corpus";

export const name = "모티프 블록 간격 — 앞 섹션 아래 여백 32(밝은 면 이웃만)·가드·표식 수=계획";

const imp = (face: string, motif: boolean, kind = "v4"): DetailSection => ({ type: "impact", kind, v4: { face, motifs: motif ? [{ id: "dots" }] : [] } } as unknown as DetailSection);
const key = (s: DetailSection | undefined): string | null => (s && s.type === "impact" ? ((s as unknown as { v4: { face: string } }).v4.face === "bgB" ? "warm" : (s as unknown as { v4: { face: string } }).v4.face === "dark" ? "ink" : "white") : null);

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const ok = (c: boolean, m: string) => { if (!c) fails.push(m); };
  const hero = { type: "hero" } as DetailSection;
  ok(MOTIF_BOTTOM_PX === 32, "32는 3단 스케일의 가장 작은 단");
  const eq = (l: string, got: Record<number, number>, want: Record<number, number>) => { if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${l}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); };
  eq("뒤가 모티프(흰·웜 같은 밝은 면)", motifBottomPads([hero, imp("bgA", false), imp("bgB", true)], (s) => key(s), "beauty"), { 1: 32 });
  eq("앞이 모티프", motifBottomPads([hero, imp("bgA", true), imp("bgA", false)], (s) => key(s), "beauty"), { 1: 32 });
  eq("모티프 없으면 그대로", motifBottomPads([hero, imp("bgA", false), imp("bgA", false)], (s) => key(s), "beauty"), {});
  eq("어두운 면은 그대로", motifBottomPads([hero, imp("bgA", false), imp("dark", true)], (s) => key(s), "beauty"), {});
  eq("히어로 앞은 건드리지 않음", motifBottomPads([hero, imp("bgA", true)], (s) => key(s), "beauty"), {});
  eq("이전 섹션 아래 여백이 이미 32 이하(갤러리)면 그대로", motifBottomPads([hero, { type: "gallery" } as DetailSection, imp("bgA", true)], () => "light", "beauty"), {});
  ok(bottomPadCssV4((px) => `x[${px}]`) === "x[32]{padding-bottom:32px!important}", "CSS 한 줄");

  const entries = corpus().filter(([id]) => id.startsWith("fx-"));
  let withPads = 0;
  for (const [id, f] of entries) {
    const d = displayOf(f) as unknown as { bottomPads?: Record<number, number>; sections: DetailSection[] };
    const n = Object.keys(d.bottomPads ?? {}).length;
    const marks = (exportHtmlOf(f).match(/<section[^>]*? data-pz-bot="32"/g) ?? []).length;
    if (n) withPads += 1;
    ok(marks === n, `${id}: 표식 ${marks} ≠ 계획 ${n}`);
  }
  ok(withPads >= 12, `모티프 이웃이 많은 말뭉치에서 대부분 적용: ${withPads}/21`);
  return fails;
}
