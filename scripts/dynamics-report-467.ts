/**
 * 467차 — 다이나믹 지표 보고(목표 대비 표). 실패로 종료하지 않는다(목표 미달은 보고서에 수치 그대로). 문자열 전용.
 *   npx tsx scripts/dynamics-report-467.ts
 * 목표는 docs/dynamics-audit-467.md §4(코드 전에 확정): 강도 5=impact·pop / 4=softlife·narrative·catalog / 3=editorial·techsheet·luxe.
 */
import { setDesignUp1ForTests, setDesignV5ForTests } from "../lib/design-v4";
import { ARCHETYPES, ARCHETYPE_IDS, setV5ArchetypeForTests } from "../lib/page-archetype-v5";
import { setDynamicsOffForTests } from "../lib/dynamics-layer-v5";
import { corpus, exportHtmlOf } from "./design-corpus";
import { dynMetrics } from "./dynamics-metrics-467";

const T = {
  5: { overlap: 12, tilt: 8, focal: 3.0, straight: 0.45, card: 0.4, frames: 8 },
  4: { overlap: 10, tilt: 5, focal: 2.6, straight: 0.55, card: 0.45, frames: 7 },
  3: { overlap: 8, tilt: 3, focal: 2.2, straight: 0.65, card: 0.5, frames: 6 },
} as const;

function run(off: boolean) {
  setDynamicsOffForTests(off);
  const out: Record<string, Record<string, number>> = {};
  const files = corpus();
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    const r = files.map(([, f]) => dynMetrics(exportHtmlOf(f)));
    const avg = (k: keyof (typeof r)[number]) => r.reduce((x, m) => x + (m[k] as number), 0) / r.length;
    const med = r.map((m) => m.focalMedian).sort((x, y) => x - y)[Math.floor(r.length / 2)]!;
    out[a] = { overlap: avg("overlap"), tilt: avg("tilt"), focal: med, straight: avg("straightSeamShare"), card: avg("cardSameShare"), frames: avg("frameKinds"), asym: avg("asym") };
  }
  setDynamicsOffForTests(false);
  return out;
}

setDesignUp1ForTests(true);
setDesignV5ForTests(true);
const before = run(true);
const after = run(false);
const f1 = (x: number) => x.toFixed(2);
console.log("| 아키타입(강도) | 지표 | 466차 끝 | 467차 | 목표 | 판정 |\n|---|---|---|---|---|---|");
let hit = 0; let total = 0;
for (const a of ARCHETYPE_IDS) {
  const lv = ARCHETYPES[a].dyn.level; const t = T[lv];
  const rows: Array<[string, number, number, number, boolean]> = [
    ["겹침 ≥", before[a]!.overlap, after[a]!.overlap, t.overlap, after[a]!.overlap >= t.overlap],
    ["기울임 ≥", before[a]!.tilt, after[a]!.tilt, t.tilt, after[a]!.tilt >= t.tilt],
    ["초점 스케일 중앙값 ≥", before[a]!.focal, after[a]!.focal, t.focal, after[a]!.focal >= t.focal],
    ["직선 이음새 비율 ≤", before[a]!.straight, after[a]!.straight, t.straight, after[a]!.straight <= t.straight],
    ["같은 카드 서명 비율 ≤", before[a]!.card, after[a]!.card, t.card, after[a]!.card <= t.card],
    ["사진 틀 종류 ≥", before[a]!.frames, after[a]!.frames, t.frames, after[a]!.frames >= t.frames],
  ];
  for (const [n, b, x, tg, ok] of rows) { total += 1; if (ok) hit += 1; console.log(`| ${a}(${lv}) | ${n} | ${f1(b)} | ${f1(x)} | ${tg} | ${ok ? "○" : "×"} |`); }
}
console.log(`\n목표 달성 ${hit}/${total}`);
