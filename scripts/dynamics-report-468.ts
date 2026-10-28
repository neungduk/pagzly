/**
 * 468차 — 지표 보고(목표 대비 표). 실패로 종료하지 않는다(미달은 보고서에 수치 그대로). 문자열 전용.
 *   npx tsx scripts/dynamics-report-468.ts [--base]   (--base: 468차 변경을 끈 기준선 — dynamics468Off)
 * 목표는 docs/dynamics-audit-468.md §3(코드 전에 확정). 강도 5=impact·pop / 4=softlife·narrative·catalog / 3=editorial·techsheet·luxe.
 */
import { setDesignUp1ForTests, setDesignV5ForTests } from "../lib/design-v4";
import { ARCHETYPES, ARCHETYPE_IDS, setV5ArchetypeForTests } from "../lib/page-archetype-v5";
import { corpus, exportHtmlOf } from "./design-corpus";
import { banners, compShares, darkBanners, frameStats, readableFocal, singleRuns3, visibleDark } from "./dynamics-metrics-468";

const FOCAL = { 5: 2.6, 4: 2.2, 3: 1.9 } as const;
const med = (a: number[]): number => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)]! : 0; };
const avg = (a: number[]): number => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

setDesignUp1ForTests(true);
setDesignV5ForTests(true);
const files = corpus();
const f2 = (x: number) => x.toFixed(2);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
console.log("| 아키타입(강도·면) | 진한 면 평균 | 진한 면 최악 | 전면 스크림 배너/페이지(배너) | 진한 면 판정 | 읽히는 초점 중앙값(목표) | 판정 | 단일 | 풀블리드/비대칭 | 겹침 | 단일3연속 | 빈 틀 최대px | 틀 종류비 | 판정 |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
let hit = 0; let total = 0;
for (const a of ARCHETYPE_IDS) {
  setV5ArchetypeForTests(a);
  const htmls = files.map(([, f]) => exportHtmlOf(f));
  const dk = htmls.map(visibleDark);
  const fo = med(htmls.map(readableFocal));
  const cs = htmls.map(compShares);
  const runs = avg(htmls.map(singleRuns3));
  const fr = htmls.map(frameStats);
  const t = ARCHETYPES[a];
  const face = t.face;
  const dMean = avg(dk); const dMax = Math.max(...dk);
  const scr = avg(htmls.map(darkBanners)); const bn = avg(htmls.map(banners));
  const darkOk0 = face === "blockAlt" ? dMean >= 0.25 && dMean <= 0.45 : face === "colorCollide" ? dMean >= 0.3 && dMean <= 0.55 : dMean <= 0.15 && dMax <= 0.25;
  const darkOk = darkOk0 && (face === "blockAlt" || face === "colorCollide" || scr === 0);
  const fTarget = FOCAL[t.dyn.level];
  const single = avg(cs.map((c) => c.single)); const ba = avg(cs.map((c) => c.bleedOrAsym)); const ov = avg(cs.map((c) => c.overlap));
  const compOk = single <= 0.55 && ba >= 0.3 && ov >= 0.25;
  const fMax = Math.max(...fr.map((f) => f.max));
  const withFr = fr.filter((f) => f.count > 0);
  const kindR = avg(withFr.map((f) => f.kindRatio));
  const frameOk = fMax <= 320 && kindR >= 0.7;
  for (const ok of [darkOk, fo >= fTarget, compOk, frameOk]) { total += 1; if (ok) hit += 1; }
  console.log(`| ${a}(${t.dyn.level}·${face}) | ${pct(dMean)} | ${pct(dMax)} | ${f2(scr)}(${f2(bn)}) | ${darkOk ? "○" : "×"} | ${f2(fo)} (≥${fTarget}) | ${fo >= fTarget ? "○" : "×"} | ${f2(single)} | ${f2(ba)} | ${f2(ov)} | ${f2(runs)} | ${Math.round(fMax)} | ${f2(kindR)} | ${frameOk ? "○" : "×"} |  구도 ${compOk ? "○" : "×"}`);
}
console.log(`\n목표 달성 ${hit}/${total}`);
