/**
 * 452차 1 — 라이브 퍼징 안정성 비교. 같은 사례(기본 앞 30개)를 두 번(또는 작업자 수를 달리해) 돌려 결과가 같은지 본다. `next dev`가 떠 있어야 한다.
 *   npx tsx scripts/fuzz-stability.ts [--server=http://localhost:3100] [--n=30] [--workers-a=4] [--workers-b=1] [--out=review/452-verify/fuzz-stability-run.md]
 * 같은 사례 id·종류·글자(대비 위반은 «글자»)가 양쪽에 같으면 차이 0. 차이가 있으면 종료 코드 1.
 */
import fs from "node:fs";
import path from "node:path";
import { runLive, type LiveViolation } from "./fuzz-live";

const key = (v: LiveViolation): string => `${v.id}|${v.kind}|${(/«(.*?)»/.exec(v.detail)?.[1] ?? v.detail).slice(0, 24)}`;

export function diffViolations(a: LiveViolation[], b: LiveViolation[]): { onlyA: string[]; onlyB: string[] } {
  const ka = new Set(a.map(key)), kb = new Set(b.map(key));
  return { onlyA: [...ka].filter((k) => !kb.has(k)), onlyB: [...kb].filter((k) => !ka.has(k)) };
}

if (/fuzz-stability\.ts$/.test(process.argv[1] ?? "")) {
  const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
  const server = arg("server", "http://localhost:3100");
  const n = Number(arg("n", "30"));
  const widths = arg("widths", "320,360,390,750").split(",").map(Number);
  void (async () => {
    const a = await runLive({ server, n: 200, subset: n, widths, workers: Number(arg("workers-a", "4")) });
    const b = await runLive({ server, n: 200, subset: n, widths, workers: Number(arg("workers-b", "1")) });
    const d = diffViolations(a.violations, b.violations);
    const md = ["# 라이브 퍼징 안정성 실행", "", `사례 ${n}개 · 폭 ${widths.join("·")} · 작업자 ${arg("workers-a", "4")} vs ${arg("workers-b", "1")}`, `위반 ${a.violations.length} vs ${b.violations.length} · 한쪽에만 있는 위반 ${d.onlyA.length + d.onlyB.length}`, ...d.onlyA.map((k) => `- A만: ${k}`), ...d.onlyB.map((k) => `- B만: ${k}`), ""].join("\n");
    const out = arg("out", "review/452-verify/fuzz-stability-run.md");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, md);
    console.log(md);
    process.exit(d.onlyA.length + d.onlyB.length ? 1 : 0);
  })();
}
