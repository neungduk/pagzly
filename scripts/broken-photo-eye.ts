/**
 * 455차 1 — 사진 로드 실패 상태 눈 검수 + DOM 측정(무료: 외부 호출 없음, 모든 사진 요청을 브라우저에서 실패시킨다).
 * 저장 세션(있으면) + 합성 픽스처 21종을 export로 열어 ① 보이는 깨진 <img>(대체 글자 노출) ② 빈 큰 틀(내용 없는 면)을 센다.
 *   npx tsx scripts/broken-photo-eye.ts [--out=review/455-verify/broken-before] [--widths=390,750] [--only=id,id] [--no-sheets] [--json=경로]
 * 시트는 pc-verify-eye와 같은 방식(844px 단위, 390은 3장·750은 2장 가로).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { launch, openHtml } from "./eye-lib";
import { findSessions } from "./pc-sessions-find";

const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const OUT = arg("out", "review/455-verify/broken-before");
const WIDTHS = arg("widths", "390,750").split(",").map(Number);
const ONLY = arg("only", "").split(",").filter(Boolean);
const JSON_OUT = arg("json", "");
const SHEETS = !process.argv.includes("--no-sheets");
const H = 844;

export type BrokenReport = { id: string; W: number; visibleAlt: string[]; holes: string[]; overflow: number };

/** 페이지 안에서 실행: 보이는 깨진 이미지·빈 큰 틀·가로 넘침 */
export const MEASURE = `(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
  const visibleAlt = [];
  for (const i of Array.from(document.images)) {
    if (i.complete && i.naturalWidth === 0 && vis(i)) {
      const cs = getComputedStyle(i);
      // 깨진 이미지는 alt 글자(또는 깨진 아이콘)를 보인다. 글자가 투명·0px이고 상자가 없으면 보이지 않는 것으로 친다
      const r = i.getBoundingClientRect();
      const hidden = (parseFloat(cs.fontSize) === 0 || cs.color === 'rgba(0, 0, 0, 0)') && r.width < 2;
      if (!hidden) visibleAlt.push((i.getAttribute('alt') || '(alt 없음)').slice(0, 24) + ' @' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
  }
  const page = getComputedStyle(document.body).backgroundColor;
  const parse = (c) => { const m = c.match(/[\\d.]+/g); return m ? m.map(Number) : [0,0,0,0]; };
  const holes = [];
  const all = Array.from(document.querySelectorAll('body *'));
  for (const e of all) {
    if (e.getAttribute('aria-hidden') === 'true') continue;
    if (['IMG','SVG','SCRIPT','STYLE','PATH','CIRCLE','RECT'].includes(e.tagName.toUpperCase())) continue;
    const r = e.getBoundingClientRect();
    if (r.width < 110 || r.height < 110) continue;
    if ((e.textContent || '').trim().length > 0) continue;
    if (e.querySelector('svg,img,video,canvas,[role=img]')) { const imgs = Array.from(e.querySelectorAll('img')).filter((i) => vis(i) && i.naturalWidth > 0); if (imgs.length || e.querySelector('svg')) continue; }
    const cs = getComputedStyle(e);
    if (cs.backgroundImage !== 'none') continue;
    const bg = parse(cs.backgroundColor);
    const bw = parseFloat(cs.borderTopWidth) || 0;
    const radius = parseFloat(cs.borderTopLeftRadius) || 0;
    // 틀(둥근 모서리나 테두리 또는 그림자)이 있는데 안이 비어 있다
    const framed = radius >= 8 || bw > 0 || cs.boxShadow !== 'none';
    if (!framed && bg[3] === 0) continue;
    const white = bg[3] === 0 || (bg[0] > 244 && bg[1] > 244 && bg[2] > 244);
    // 직접 자식 중 내용 있는 것이 있으면 빈 틀이 아니다
    if (Array.from(e.children).some((c) => (c.textContent || '').trim() || c.querySelector('svg'))) continue;
    const sec = e.closest('section');
    const head = e.outerHTML.slice(0, 150).replace(/src="[^"]*"/g, 'src="…"').replace(/\\s+/g, ' ');
    holes.push((sec ? 'sec#' + Array.from(document.querySelectorAll('section')).indexOf(sec) + ' ' : '') + Math.round(r.width) + 'x' + Math.round(r.height) + '@y' + Math.round(r.top + scrollY) + (white ? ' 흰면' : ' 색면') + ' ' + head);
  }
  // 깨진 이미지의 부모 틀이 무너졌는지(높이 24px 미만 — 사진 자리가 사라진 곳)
  for (const i of Array.from(document.images)) { if (i.complete && i.naturalWidth === 0 && i.getAttribute('data-hero-v2') === null) { const p = i.parentElement; if (p) { const r = p.getBoundingClientRect(); const cs = getComputedStyle(p); if (cs.overflow === 'hidden' && r.height < 24 && r.width > 40) holes.push('붕괴 ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' ' + p.outerHTML.slice(0, 120).replace(/src="[^"]*"/g, 'src="…"')); } } }
  const overflow = Math.max(0, document.documentElement.scrollWidth - innerWidth);
  return { visibleAlt, holes, overflow, page };
})()`;

async function main() {
  const { corpus, exportHtmlOf } = await import("./design-corpus");
  const synth = corpus().filter(([id]) => id.startsWith("fx-"));
  const all: Array<[string, string]> = [...findSessions(), ...synth].filter(([id]) => !ONLY.length || ONLY.includes(id));
  const browser = await launch();
  const reports: BrokenReport[] = [];
  for (const [id, file] of all) {
    const html = exportHtmlOf(file);
    for (const W of WIDTHS) {
      const ex = await openHtml(browser, html, W, undefined, false, true);
      await ex.page.addStyleTag({ content: ".pagzly-anchor-nav{display:none!important}" });
      const m = (await ex.page.evaluate(MEASURE)) as { visibleAlt: string[]; holes: string[]; overflow: number };
      reports.push({ id, W, visibleAlt: m.visibleAlt, holes: m.holes, overflow: m.overflow });
      if (SHEETS) {
        const total = (await ex.page.evaluate("document.documentElement.scrollHeight")) as number;
        const n = Math.ceil(total / H);
        const slices: Buffer[] = [];
        for (let i = 0; i < n; i++) slices.push(await ex.page.screenshot({ clip: { x: 0, y: i * H, width: W, height: Math.min(H, total - i * H) }, fullPage: true }));
        const dir = path.join(OUT, id, `w${W}`);
        fs.mkdirSync(dir, { recursive: true });
        const per = W <= 500 ? 3 : 2;
        for (let s = 0; s * per < slices.length; s++) {
          const group = slices.slice(s * per, s * per + per);
          await sharp({ create: { width: group.length * W + (group.length - 1) * 8, height: H, channels: 3, background: "#7a7a7a" } }).composite(group.map((input, k) => ({ input, left: k * (W + 8), top: 0 }))).png().toFile(path.join(dir, `sheet-${String(s + 1).padStart(2, "0")}.png`));
        }
      }
      await ex.close();
      console.log(`${id} w${W}: 대체글자 ${m.visibleAlt.length} · 빈틀 ${m.holes.length} · 가로넘침 ${m.overflow}`);
    }
  }
  await browser.close();
  if (JSON_OUT) {
    fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
    fs.writeFileSync(JSON_OUT, JSON.stringify(reports, null, 1));
  }
  const bad = reports.filter((r) => r.visibleAlt.length || r.holes.length || r.overflow);
  console.log(`\n합계: 대체글자 ${reports.reduce((a, r) => a + r.visibleAlt.length, 0)} · 빈틀 ${reports.reduce((a, r) => a + r.holes.length, 0)} · 가로넘침 ${reports.reduce((a, r) => a + (r.overflow ? 1 : 0), 0)} (문제 있는 조합 ${bad.length}/${reports.length})`);
}
if (process.argv[1] && /broken-photo-eye/.test(process.argv[1])) void main();
