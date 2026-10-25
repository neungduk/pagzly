/**
 * 450차 1 — 소형 글자 대비 위반을 원천(클래스·인라인 색/불투명도)별로 분류. export 합성 21종(+선택 라이브)의 전수 픽셀 대비 위반을 모아 상위 원천을 표로.
 *   npx tsx scripts/contrast-sources.ts [--out=review/450-verify/contrast-sources.md] [--json=경로]
 */
import fs from "node:fs";
import path from "node:path";
import { corpus, exportHtmlOf } from "./design-corpus";
import { launch, openHtml } from "./eye-lib";
import { contrastPage } from "./fuzz-live";

export type Hit = { fixture: string; text: string; px: number; ratio: number; need: number; src: string };

export async function collectExport(): Promise<Hit[]> {
  const b = await launch();
  const out: Hit[] = [];
  for (const [id, f] of corpus().filter(([i]) => i.startsWith("fx-"))) {
    const ex = await openHtml(b, exportHtmlOf(f), 390);
    for (const x of await contrastPage(ex.page)) out.push({ fixture: id, text: x.text, px: x.px, ratio: x.ratio, need: x.need, src: x.src ?? "" });
    await ex.close();
  }
  await b.close();
  return out;
}

export function groupBySource(hits: Hit[]): Array<{ key: string; n: number; min: number; sample: Hit }> {
  const m = new Map<string, Hit[]>();
  for (const h of hits) { const [cls, sty, tag] = h.src.split("|"); const k = `${(cls ?? "").replace(/\d+/g, "N").slice(0, 40)} | ${(sty ?? "").replace(/[\d.]+/g, "N")} | ${tag ?? ""}`; m.set(k, [...(m.get(k) ?? []), h]); }
  return [...m].map(([key, hs]) => ({ key, n: hs.length, min: Math.min(...hs.map((x) => x.ratio)), sample: hs[0]! })).sort((a, b) => b.n - a.n);
}

if (/contrast-sources\.ts$/.test(process.argv[1] ?? "")) {
  const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
  void collectExport().then((hits) => {
    const g = groupBySource(hits);
    const md = ["# 소형 글자 대비 위반 원천 (export 합성 21종, 390px)", "", `위반 ${hits.length}곳`, "", "| 건수 | 최소 대비 | 원천(클래스 | 인라인 색·불투명도 | 태그>부모) | 예 |", "|---|---|---|---|", ...g.slice(0, 30).map((x) => `| ${x.n} | ${x.min.toFixed(2)} | \`${x.key}\` | «${x.sample.text}» ${x.sample.px}px (${x.sample.fixture}) |`)].join("\n") + "\n";
    const out = arg("out", "review/450-verify/contrast-sources.md");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, md);
    if (arg("json", "")) fs.writeFileSync(arg("json", ""), JSON.stringify(hits));
    console.log(md);
  });
}
