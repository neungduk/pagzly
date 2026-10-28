/**
 * 469차 — 지표 보고(목표 대비 표). 실패로 종료하지 않는다. 문자열 전용. 목표는 docs/dynamics-audit-469.md §4(코드 전에 확정).
 *   npx tsx scripts/dynamics-report-469.ts
 */
import { setDesignUp1ForTests, setDesignV5ForTests } from "../lib/design-v4";
import { ARCHETYPES, ARCHETYPE_IDS, setV5ArchetypeForTests } from "../lib/page-archetype-v5";
import { corpus, exportHtmlOf } from "./design-corpus";
import { singleRuns3, visibleDark } from "./dynamics-metrics-468";
import { bodyMedian, charsPerLine, darkInfoZones, sceneCount, visibleDark2 } from "./dynamics-metrics-469";
import { pageMetrics, topSections } from "./variety-metrics-463";

const SCENE = { 5: 3, 4: 2, 3: 1 } as const;
const avg = (a: number[]): number => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const med = (a: number[]): number => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)]! : 0; };

setDesignUp1ForTests(true);
setDesignV5ForTests(true);
const files = corpus();
const f1 = (x: number) => x.toFixed(1);
const f2 = (x: number) => x.toFixed(2);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
console.log("| 아키타입(강도·면) | 진한 면(468 정의) | 진한 면(정정) 평균 | 최악 | 진한 정보 구간/페이지 | 진한 면 판정 | 본문 중앙값px | 줄 글자수 | 판정 | 장면/페이지 | 판정 | 섹션 15+ 페이지 달성률 | 평탄 구간 | 단일3연속 |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
let hit = 0; let total = 0;
for (const a of ARCHETYPE_IDS) {
  setV5ArchetypeForTests(a);
  const hs = files.map(([, f]) => exportHtmlOf(f));
  const old = avg(hs.map(visibleDark));
  const dk = hs.map(visibleDark2);
  const dMean = avg(dk); const dMax = Math.max(...dk);
  const zones = avg(hs.map(darkInfoZones));
  const face = ARCHETYPES[a].face;
  const darkOk = face === "blockAlt" ? dMean >= 0.25 && dMean <= 0.45 : face === "colorCollide" ? dMean >= 0.3 && dMean <= 0.55 : dMean <= 0.15 && dMax <= 0.25;
  const bm = med(hs.map(bodyMedian).filter((x) => x > 0));
  const bodyOk = bm >= 15;
  const sc = avg(hs.map(sceneCount));
  const lv = ARCHETYPES[a].dyn.level;
  const sceneOk = sc >= SCENE[lv];
  const big = hs.map((h) => ({ n: topSections(h).length, sc: sceneCount(h) })).filter((x) => x.n >= 15);
  const rate = big.length ? big.filter((x) => x.sc >= SCENE[lv]).length / big.length : 0;
  const flat = avg(hs.map((h) => pageMetrics(h).flatZones));
  const runs = avg(hs.map(singleRuns3));
  for (const ok of [darkOk, bodyOk, sceneOk]) { total += 1; if (ok) hit += 1; }
  console.log(`| ${a}(${lv}·${face}) | ${pct(old)} | ${pct(dMean)} | ${pct(dMax)} | ${f2(zones)} | ${darkOk ? "○" : "×"} | ${f1(bm)} | ${f1(charsPerLine(bm))} | ${bodyOk ? "○" : "×"} | ${f2(sc)} (≥${SCENE[lv]}) | ${sceneOk ? "○" : "×"} | ${pct(rate)} | ${f1(flat)} | ${f2(runs)} |`);
}
console.log(`\n목표 달성 ${hit}/${total}`);
