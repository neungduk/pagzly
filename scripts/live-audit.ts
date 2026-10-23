/**
 * 445차 5 — 섹션 한 장 단위 라이브↔export 계산 스타일 전수 대조. 원본 섹션 한 장만 같은 입력으로 export와 라이브(dev 서버)에 열고,
 * 글자가 있는 요소는 글자 순서로, 면·테두리·그림자가 있는 상자는 순서로 짝지어 글자 크기·굵기·행간·자간·색·반경·안팎 여백·그림자를 비교한다.
 *   npx tsx scripts/live-audit.ts --server=http://localhost:3100 --fixture=fx-compare-beauty --type=review_highlight [--width=390]
 * (원본 섹션 목록에서 type이 같은 첫 섹션 하나만 쓴다. 표시 규칙이 임팩트로 바꾸는 brand_story 같은 섹션도 원형 그대로 본다.)
 */
import { chromium } from "playwright";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { corpus, exportArgsOf, readSession } from "./design-corpus";
import { launch, openHtml } from "./eye-lib";
import { SESSION_KEY, presetOf } from "./live-lib";

const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const SERVER = arg("server", "http://localhost:3100");
const FIXTURE = arg("fixture", "fx-compare-beauty");
const TYPE = arg("type", "review_highlight");
const W = Number(arg("width", "390"));

const EXPR = `(() => {
  const root = document.querySelector('[data-pz-typefloor]') || document.querySelector('.pagzly-wrap') || document.body;
  const tops = Array.from(root.querySelectorAll('section')).filter((s) => !s.parentElement.closest('section') && !s.closest('article') && s.getBoundingClientRect().height > 8 && !s.hasAttribute('data-pz-hero') && !s.classList.contains('pagzly-hero'));
  const sec = tops.find((s) => !s.querySelector('h1')) || tops[0];
  const px = (v) => Math.round(parseFloat(v) * 10) / 10;
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const g = cv.getContext('2d');
  const norm = (col) => { try { g.clearRect(0,0,1,1); g.fillStyle = '#000'; g.fillStyle = col; g.fillRect(0,0,1,1); const d = g.getImageData(0,0,1,1).data; return d[3] === 0 ? 'none' : 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')' + (d[3] < 250 ? '/' + (Math.round(d[3] / 2.55) / 100) : ''); } catch (e) { return col; } };
  const texts = [], boxes = [];
  for (const e of [sec, ...Array.from(sec.querySelectorAll('*'))]) {
    if (e.closest('[aria-hidden="true"]') && !e.textContent.trim()) continue;
    const c = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    const own = Array.from(e.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    if (own) texts.push({ t: own.slice(0, 16), fs: px(c.fontSize), fw: c.fontWeight, lh: px(c.lineHeight) || 0, ls: c.letterSpacing === 'normal' ? 0 : px(c.letterSpacing), color: norm(c.color), pt: px(c.paddingTop), pb: px(c.paddingBottom), pl: px(c.paddingLeft), mt: px(c.marginTop), mb: px(c.marginBottom), w: Math.round(r.width), h: Math.round(r.height) });
    const painted = c.backgroundColor !== 'rgba(0, 0, 0, 0)' || c.borderTopWidth !== '0px' || c.boxShadow !== 'none';
    if (painted && r.width >= 40 && r.height >= 24) boxes.push({ t: e.tagName, bg: norm(c.backgroundColor), br: px(c.borderTopLeftRadius), bw: px(c.borderTopWidth), sh: c.boxShadow === 'none' ? '-' : 'Y', pt: px(c.paddingTop), pb: px(c.paddingBottom), pl: px(c.paddingLeft), w: Math.round(r.width), h: Math.round(r.height) });
  }
  return { h: Math.round(sec.getBoundingClientRect().height), texts, boxes };
})()`;

type T = { t: string; fs: number; fw: string; lh: number; ls: number; color: string; pt: number; pb: number; pl: number; mt: number; mb: number; w: number; h: number };
type B = { t: string; bg: string; br: number; bw: number; sh: string; pt: number; pb: number; pl: number; w: number; h: number };
type Out = { h: number; texts: T[]; boxes: B[] };

async function main() {
  const file = corpus({ only: [FIXTURE] })[0]![1];
  const s = readSession(file);
  const a = exportArgsOf(s);
  const section = (a.sections ?? []).find((x) => x.type === TYPE);
  if (!section) throw new Error(`${FIXTURE}에 ${TYPE} 없음`);
  const only = { ...a, sections: [section] };
  const html = buildDetailPageHtml(only as never);
  const browser = await launch();
  const ex = await openHtml(browser, html, W);
  await ex.page.addStyleTag({ content: ".pagzly-anchor-nav{display:none!important}" });
  const e = (await ex.page.evaluate(EXPR)) as Out;
  const lb = await chromium.launch();
  const ctx = await lb.newContext({ viewport: { width: W, height: 844 } });
  const preset = { ...presetOf(file), sections: [section] };
  await ctx.addInitScript(`try{window.sessionStorage.setItem(${JSON.stringify(SESSION_KEY)}, ${JSON.stringify(JSON.stringify(preset))})}catch(e){}; window.__name = (f) => f;`);
  const page = await ctx.newPage();
  await page.route("**/*", (r) => (new URL(r.request().url()).origin === new URL(SERVER).origin ? r.continue() : r.abort()));
  await page.goto(`${SERVER}/dev/detail-preview?capture=session`, { waitUntil: "load" });
  await page.locator("[data-pz-typefloor]").first().waitFor({ state: "attached", timeout: 60000 });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}[data-pagzly-preview]{max-width:none!important;border:0!important;box-shadow:none!important}[data-scroll-reveal]{transform:none!important;opacity:1!important}" });
  await page.waitForTimeout(1500);
  const l = (await page.evaluate(EXPR)) as Out;
  if (process.env.AUDIT_RULES) console.log(await page.evaluate(`(() => { const els = Array.from(document.querySelectorAll('[data-pz-typefloor] *')).filter((e) => Array.from(e.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim().startsWith(${JSON.stringify(process.env.AUDIT_RULES)})); return els.map((e) => e.tagName + ' class=' + e.className + ' style=' + e.getAttribute('style') + ' ls=' + getComputedStyle(e).letterSpacing + ' fs=' + getComputedStyle(e).fontSize + ' w=' + Math.round(e.getBoundingClientRect().width)).join('\\n'); })()`));
  console.log(`${FIXTURE} ${TYPE} @${W}: 섹션 높이 export ${e.h} · 라이브 ${l.h}; 글자 요소 ${e.texts.length}/${l.texts.length}, 상자 ${e.boxes.length}/${l.boxes.length}`);
  // 글자는 내용(앞 16자)으로 짝짓는다 — 한쪽에만 있는 숨은 요소(크기 0)가 있어도 어긋나지 않게
  const used = new Set<number>();
  for (const x of e.texts) {
    const j = l.texts.findIndex((y, k) => !used.has(k) && y.t === x.t);
    if (j < 0) { console.log(`  글자 «${x.t}»: export에만 있음`); continue; }
    used.add(j);
    const y = l.texts[j]!;
    const d: string[] = [];
    for (const k of ["fs", "fw", "lh", "ls", "color", "pt", "pb", "pl", "mt", "mb"] as const) if (x[k] !== y[k]) d.push(`${k} ${x[k]}→${y[k]}`);
    if (Math.abs(x.w - y.w) > 2) d.push(`w ${x.w}→${y.w}`);
    if (Math.abs(x.h - y.h) > 2) d.push(`h ${x.h}→${y.h}`);
    if (d.length) console.log(`  글자 «${x.t}»: ${d.join(", ")}`);
  }
  l.texts.forEach((y, k) => { if (!used.has(k)) console.log(`  글자 «${y.t}»: 라이브에만 있음 (${y.fs}px ${y.w}x${y.h})`); });
  const m = Math.min(e.boxes.length, l.boxes.length);
  for (let i = 0; i < m; i++) {
    const x = e.boxes[i]!, y = l.boxes[i]!;
    const d: string[] = [];
    for (const k of ["bg", "br", "bw", "sh", "pt", "pb", "pl"] as const) if (x[k] !== y[k]) d.push(`${k} ${x[k]}→${y[k]}`);
    if (Math.abs(x.w - y.w) > 2) d.push(`w ${x.w}→${y.w}`);
    if (Math.abs(x.h - y.h) > 2) d.push(`h ${x.h}→${y.h}`);
    if (d.length) console.log(`  상자 #${i} ${x.t}/${y.t}: ${d.join(", ")}`);
  }
  await lb.close();
  await browser.close();
}
void main();
