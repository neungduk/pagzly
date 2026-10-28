/** 471차 — 지표 보고(목표 대비 표). 실패로 종료하지 않는다. 문자열 전용. 목표는 review/471-targets.md. */
import { setDesignUp1ForTests, setDesignV5ForTests } from "../lib/design-v4";
import { ARCHETYPE_IDS, setV5ArchetypeForTests, type ArchetypeId } from "../lib/page-archetype-v5";
import { corpus, exportHtmlOf } from "./design-corpus";
import { ghostStats, heroFloorViolations, heroSig, scenePairsWithoutInterlude, sigDiff, tallAdjacent, type HeroSig } from "./hero-metrics-471";
import { singleRuns3 } from "./dynamics-metrics-468";
import { pageMetrics } from "./variety-metrics-463";

setDesignUp1ForTests(true);
setDesignV5ForTests(true);
const files = corpus();
const per: Record<string, { sig: HeroSig[]; floor: number; ghost: { total: number; risky: number; topRight: number }; pairs: number; missing: number; tall: number; flat: number; single: number }> = {};
for (const a of ARCHETYPE_IDS) {
  setV5ArchetypeForTests(a);
  const rows = files.map(([, f]) => { const h = exportHtmlOf(f); const g = ghostStats(h); const p = scenePairsWithoutInterlude(h); return { tall: tallAdjacent(h), sig: heroSig(h), floor: heroFloorViolations(h), g, p, flat: pageMetrics(h).flatZones, single: singleRuns3(h) }; });
  per[a] = { sig: rows.map((r) => r.sig), floor: rows.reduce((x, r) => x + r.floor, 0), ghost: rows.reduce((x, r) => ({ total: x.total + r.g.total, risky: x.risky + r.g.risky, topRight: x.topRight + r.g.topRight }), { total: 0, risky: 0, topRight: 0 }), pairs: rows.reduce((x, r) => x + r.p.pairs, 0), missing: rows.reduce((x, r) => x + r.p.missing, 0), tall: rows.reduce((x, r) => x + r.tall, 0), flat: rows.reduce((x, r) => x + r.flat, 0), single: rows.reduce((x, r) => x + r.single, 0) / rows.length };
}
// H1: 페이지별 28쌍 최소/평균 차이
let minAll = 99; let sum = 0; let cnt = 0; let worst = "";
for (let p = 0; p < files.length; p += 1) for (let i = 0; i < ARCHETYPE_IDS.length; i += 1) for (let j = i + 1; j < ARCHETYPE_IDS.length; j += 1) {
  const d = sigDiff(per[ARCHETYPE_IDS[i]!]!.sig[p]!, per[ARCHETYPE_IDS[j]!]!.sig[p]!);
  sum += d; cnt += 1; if (d < minAll) { minAll = d; worst = `${files[p]![0]} ${ARCHETYPE_IDS[i]}-${ARCHETYPE_IDS[j]}`; }
}
console.log(`H1 첫 화면 시그니처 쌍 차이: 평균 ${(sum / cnt).toFixed(2)} · 최소 ${minAll} (${worst}) · 목표 최소 ≥ 3`);
console.log("| 아키타입 | H2 히어로 사진 하한 위반 | H3 고스트 전체/위험/우상단 | H4 장면 쌍/짧은 구간 없음 · 큰 블록 연속 쌍 | 평탄 합계 | 단일3연속 |\n|---|---|---|---|---|---|");
for (const a of ARCHETYPE_IDS as readonly ArchetypeId[]) { const r = per[a]!; console.log(`| ${a} | ${r.floor} | ${r.ghost.total}/${r.ghost.risky}/${r.ghost.topRight} | ${r.pairs}/${r.missing} · ${r.tall} | ${r.flat} | ${r.single.toFixed(2)} |`); }
