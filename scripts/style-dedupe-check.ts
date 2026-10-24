/**
 * 448차 5 — 반복 style 묶기가 화면을 바꾸지 않는지: 묶은 문서와 되돌린(expand) 문서를 같은 폭에서 열어 모든 요소의 계산 스타일을 비교한다.
 *   npx tsx scripts/style-dedupe-check.ts [--widths=390,750] [--only=id,id]
 */
import { corpus, exportHtmlOf } from "./design-corpus";
import { expandDedupedStyles } from "../lib/style-dedupe";
import { launch, openHtml } from "./eye-lib";
import type { Browser } from "playwright";

const SNAP = `(() => { const out = []; for (const e of document.querySelectorAll('body, body *')) { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); const items = []; for (let i = 0; i < cs.length; i++) { const p = cs[i]; items.push(p + ':' + cs.getPropertyValue(p)); } items.sort(); out.push(e.tagName + '|' + Math.round(r.width) + 'x' + Math.round(r.height) + '|' + items.join(';')); } return out; })()`;

export async function diffDocs(browser: Browser, html: string, W: number): Promise<{ n: number; diff: number; sample: string }> {
  const a = await openHtml(browser, html, W);
  await a.page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  const A = (await a.page.evaluate(SNAP)) as string[];
  await a.close();
  const b = await openHtml(browser, expandDedupedStyles(html), W);
  await b.page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  const B = (await b.page.evaluate(SNAP)) as string[];
  await b.close();
  let diff = 0, sample = "";
  if (A.length !== B.length) return { n: A.length, diff: Math.abs(A.length - B.length) + 1, sample: `요소 수 ${A.length} ≠ ${B.length}` };
  for (let i = 0; i < A.length; i += 1) if (A[i] !== B[i]) { diff += 1; if (!sample) { const pa = A[i]!.split(";"), pb = B[i]!.split(";"); const k = pa.findIndex((x, j) => x !== pb[j]); sample = `${A[i]!.split("|")[0]} #${i}: ${(pa[k] ?? "").slice(0, 160)} ≠ ${(pb[k] ?? "").slice(0, 160)}`; } }
  return { n: A.length, diff, sample };
}

if (/style-dedupe-check\.ts$/.test(process.argv[1] ?? "")) {
  const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
  void (async () => {
    const b = await launch();
    let bad = 0;
    for (const [id, f] of corpus({ only: arg("only", "").split(",").filter(Boolean) }).filter(([i]) => i.startsWith("fx-"))) {
      const html = exportHtmlOf(f);
      for (const W of arg("widths", "390,750").split(",").map(Number)) {
        const r = await diffDocs(b, html, W);
        console.log(`${id} ${W}px: 요소 ${r.n}, 차이 ${r.diff}${r.sample ? " — " + r.sample : ""}`);
        if (r.diff) bad += 1;
      }
    }
    await b.close();
    process.exit(bad ? 1 : 0);
  })();
}
