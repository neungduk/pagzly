/**
 * 451차 — 라이브 퍼징 사례 한 건을 열어 글자 대비 위반 요소의 원천(클래스·인라인 색·부모 배경 사슬)을 찍는다.
 *   npx tsx scripts/live-probe.ts fz067 fz138 [--width=390] [--server=http://localhost:3100]
 */
import { assertHeavyEntry } from "./lib/heavy-guard";
assertHeavyEntry("live-probe", typeof module !== "undefined" ? require.main === module : true);
import { chromium } from "playwright";
import { fuzzCases } from "./fuzz-sessions";
import { contrastPage, openCase } from "./fuzz-live";

const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const ids = process.argv.slice(2).filter((a) => !a.startsWith("--"));
void (async () => {
  const b = await chromium.launch();
  for (const c of fuzzCases(200).filter((x) => ids.some((i) => x.id.startsWith(i)))) {
    const o = await openCase(b, arg("server", "http://localhost:3100"), c, Number(arg("width", "390")));
    const bad = await contrastPage(o.page);
    console.log(c.id, c.ops.join("+"));
    for (const x of bad.slice(0, 8)) {
      console.log("  ", x.text, x.px, x.ratio.toFixed(2), `need ${x.need}`, x.src);
      const chain = await o.page.evaluate(`((t) => { const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT); let n; while((n=w.nextNode())){ if((n.textContent||'').trim().startsWith(t)){ const out=[]; for(let e=n.parentElement;e&&e!==document.body;e=e.parentElement){ const cs=getComputedStyle(e); out.push(e.tagName+'.'+String(e.className).slice(0,30)+' bg='+cs.backgroundColor+' bgi='+cs.backgroundImage.slice(0,70)+' op='+cs.opacity+(e.hasAttribute('style')?' style='+e.getAttribute('style').slice(0,110):'')); if(out.length>6) break;} return out.join('\\n      ');} } return ''; })(${JSON.stringify(x.text.slice(0, 12))})`);
      console.log("      " + chain);
    }
    await o.close();
  }
  await b.close();
})();
