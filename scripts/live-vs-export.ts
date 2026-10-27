/**
 * 445차 1 — 라이브↔export 시각 대조. 같은 픽스처를 라이브(dev 서버 /dev/detail-preview)와 export(정적)로 같은 폭에 열고, 최상위 섹션을 글자 서명으로
 * 짝지어 높이·위아래 여백·제목 크기/굵기·면 색·카드 반경 집합을 숫자로 비교한다. 차이가 있는 섹션은 export | 라이브를 나란히 붙인 그림으로 남긴다.
 *   npx tsx scripts/live-vs-export.ts --server=http://localhost:3100 [--out=review/445-verify/live-vs-export] [--widths=390] [--only=id,id]
 * 결과: <out>/summary.md(표), <out>/<픽스처>-w<폭>.json, <out>/<픽스처>/w<폭>/NN-<서명>.png(차이 있는 섹션 최대 8장).
 */
import { assertHeavyEntry } from "./lib/heavy-guard";
assertHeavyEntry("live-vs-export", typeof module !== "undefined" ? require.main === module : true);
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { Page } from "playwright";
import { corpus, exportHtmlOf } from "./design-corpus";
import { launch, openHtml } from "./eye-lib";
import { openLive } from "./live-lib";

const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const SERVER = arg("server", "http://localhost:3100");
const OUT = arg("out", "review/445-verify/live-vs-export");
const WIDTHS = arg("widths", "390").split(",").map(Number);
const ONLY = arg("only", "").split(",").filter(Boolean);
const MAX_IMAGES = 8;

export type Info = {
  sig: string; top: number; height: number; pt: number; pb: number; bg: string; head: string; headPx: number; headW: number; headLh: number; radii: number[]; shadows: number;
};

/** 두 페이지에서 같은 식으로 평가하는 추출 식(문자열) */
export const EXTRACT = `(() => {
  const root = document.querySelector('[data-pz-typefloor]');
  const rt = root.getBoundingClientRect().top + window.scrollY;
  const tops = Array.from(root.querySelectorAll('section')).filter((s) => !s.parentElement.closest('section') && !s.closest('article') && s.getBoundingClientRect().height > 8);
  const px = (v) => Math.round(parseFloat(v) || 0);
  const faceOf = (w) => {
    const wr = w.getBoundingClientRect();
    for (const n of [w, ...Array.from(w.querySelectorAll('*'))]) {
      const r = n.getBoundingClientRect();
      if (r.width < wr.width * 0.9 || r.height < wr.height * 0.5) continue;
      if (n.tagName === 'IMG') return 'photo';
      const c = getComputedStyle(n);
      if (c.backgroundColor !== 'rgba(0, 0, 0, 0)') return c.backgroundColor;
      if (c.backgroundImage.startsWith('linear-gradient') || c.backgroundImage.startsWith('radial-gradient')) { const f = c.backgroundImage.match(/rgba?\\([^)]*\\)/); if (f) return f[0]; }
    }
    return 'rgb(255, 255, 255)';
  };
  return tops.map((s) => {
    const cs = getComputedStyle(s);
    const r = s.getBoundingClientRect();
    const cands = Array.from(s.querySelectorAll('h1,h2,h3,p,span,div')).filter((e) => { const t = Array.from(e.childNodes).filter((c) => c.nodeType === 3).map((c) => c.textContent).join('').trim(); return t.length > 1 && t.length <= 40 && !e.closest('[aria-hidden="true"]'); });
    let best = null, bestPx = 0;
    for (const e of cands) { const f = parseFloat(getComputedStyle(e).fontSize); if (f > bestPx) { bestPx = f; best = e; } }
    const bcs = best ? getComputedStyle(best) : null;
    const radii = new Set();
    let shadows = 0;
    s.querySelectorAll('*').forEach((e) => {
      const rr = e.getBoundingClientRect();
      if (rr.width < 120 || rr.height < 40) return;
      const c = getComputedStyle(e);
      const painted = c.backgroundColor !== 'rgba(0, 0, 0, 0)' || c.borderTopWidth !== '0px';
      const br = px(c.borderTopLeftRadius);
      if (painted && br > 0 && br < 200) radii.add(br);
      if (c.boxShadow !== 'none' && painted) shadows += 1;
    });
    const text = (s.textContent || '').replace(/\\s+/g, '').replace(/^[A-Z]{3,}(?=[^A-Za-z])/, '');
    return { sig: text.slice(0, 18), top: Math.round(r.top + window.scrollY - rt), height: Math.round(r.height), pt: px(cs.paddingTop), pb: px(cs.paddingBottom), bg: faceOf(s), head: best ? (best.textContent || '').trim().slice(0, 14) : '', headPx: bestPx, headW: bcs ? Number(bcs.fontWeight) : 0, headLh: bcs ? Math.round(parseFloat(bcs.lineHeight) || 0) : 0, radii: [...radii].sort((a, b) => a - b).slice(0, 6), shadows };
  });
})()`;

const rgb = (c: string) => (c.match(/[\d.]+/g) ?? ["0", "0", "0"]).slice(0, 3).map(Number);
const dist = (a: string, b: string) => { const x = rgb(a); const y = rgb(b); return Math.max(...x.map((v, i) => Math.abs(v - y[i]!))); };

export type Pair = { e: Info; l: Info; flags: string[] };
export function align(exp: Info[], live: Info[]): { pairs: Pair[]; onlyExport: Info[]; onlyLive: Info[] } {
  const pairs: Pair[] = [];
  const used = new Set<number>();
  const onlyExport: Info[] = [];
  let from = 0;
  for (const e of exp) {
    let hit = -1;
    for (let j = from; j < Math.min(live.length, from + 4); j++) if (!used.has(j) && live[j]!.sig === e.sig) { hit = j; break; }
    if (hit < 0) { onlyExport.push(e); continue; }
    used.add(hit);
    from = hit + 1;
    const l = live[hit]!;
    const flags: string[] = [];
    if (Math.abs(e.height - l.height) > 8) flags.push(`높이 ${e.height}→${l.height}`);
    if (Math.abs(e.pt - l.pt) > 2 || Math.abs(e.pb - l.pb) > 2) flags.push(`여백 ${e.pt}/${e.pb}→${l.pt}/${l.pb}`);
    if (Math.abs(e.headPx - l.headPx) > 1 || e.headW !== l.headW) flags.push(`제목 ${e.headPx}/${e.headW}→${l.headPx}/${l.headW}`);
    if (e.bg !== l.bg && e.bg !== "photo" && l.bg !== "photo" && dist(e.bg, l.bg) > 6) flags.push(`면 ${e.bg}→${l.bg}`);
    if (JSON.stringify(e.radii) !== JSON.stringify(l.radii)) flags.push(`반경 [${e.radii}]→[${l.radii}]`);
    pairs.push({ e, l, flags });
  }
  return { pairs, onlyExport, onlyLive: live.filter((_, j) => !used.has(j)) };
}

async function shoot(page: Page, index: number): Promise<Buffer> {
  return page.locator("[data-pz-typefloor] section").evaluateAll((els, i) => {
    const tops = els.filter((s) => !s.parentElement!.closest("section") && !s.closest("article") && s.getBoundingClientRect().height > 8);
    const r = tops[i as number]!.getBoundingClientRect();
    return [r.left + window.scrollX, r.top + window.scrollY, r.width, r.height];
  }, index).then((b) => page.screenshot({ clip: { x: b[0]!, y: b[1]!, width: b[2]!, height: Math.min(b[3]!, 1600) }, fullPage: true }));
}

async function main() {
  const browser = await launch();
  fs.mkdirSync(OUT, { recursive: true });
  const rows: string[] = [];
  for (const [id, file] of corpus({ only: ONLY })) {
    for (const W of WIDTHS) {
      const ex = await openHtml(browser, exportHtmlOf(file), W);
      await ex.page.addStyleTag({ content: ".pagzly-anchor-nav{display:none!important}" });
      const lv = await openLive(browser, SERVER, file, W);
      const eInfo = (await ex.page.evaluate(EXTRACT)) as Info[];
      const lInfo = (await lv.page.evaluate(EXTRACT)) as Info[];
      const { pairs, onlyExport, onlyLive } = align(eInfo, lInfo);
      const flagged = pairs.map((p, i) => ({ p, i })).filter((x) => x.p.flags.length);
      fs.writeFileSync(path.join(OUT, `${id}-w${W}.json`), JSON.stringify({ exportCount: eInfo.length, liveCount: lInfo.length, paired: pairs.length, onlyExport, onlyLive, pairs }, null, 1));
      const dir = path.join(OUT, id, `w${W}`);
      let shot = 0;
      for (const { p, i } of flagged.slice(0, MAX_IMAGES)) {
        const [a, b] = await Promise.all([shoot(ex.page, eInfo.indexOf(p.e)), shoot(lv.page, lInfo.indexOf(p.l))]);
        const [ma, mb] = await Promise.all([sharp(a).metadata(), sharp(b).metadata()]);
        const h = Math.max(ma.height ?? 0, mb.height ?? 0);
        fs.mkdirSync(dir, { recursive: true });
        await sharp({ create: { width: W * 2 + 12, height: h, channels: 3, background: "#7a7a7a" }, })
          .composite([{ input: a, left: 0, top: 0 }, { input: b, left: W + 12, top: 0 }])
          .png()
          .toFile(path.join(dir, `${String(i + 1).padStart(2, "0")}-${p.e.sig.slice(0, 8).replace(/[^\w가-힣]/g, "")}.png`));
        shot += 1;
      }
      rows.push(`| ${id} | ${W} | ${eInfo.length} | ${lInfo.length} | ${pairs.length} | ${flagged.length} | ${onlyExport.length}/${onlyLive.length} | ${lv.errors.length} | ${[...new Set(flagged.flatMap((x) => x.p.flags.map((f) => f.split(" ")[0])))].join(",")} |`);
      console.log(`${id} w${W}: export ${eInfo.length} · 라이브 ${lInfo.length} · 짝 ${pairs.length} · 차이 ${flagged.length}${shot ? ` (그림 ${shot})` : ""}`);
      await ex.close();
      await lv.close();
    }
  }
  fs.writeFileSync(path.join(OUT, "summary.md"), ["| 픽스처 | 폭 | export 섹션 | 라이브 섹션 | 짝 | 차이 있는 짝 | export만/라이브만 | 라이브 콘솔 오류 | 차이 종류 |", "|---|---|---|---|---|---|---|---|---|", ...rows].join("\n") + "\n");
  await browser.close();
}
if (process.argv[1] && /live-vs-export/.test(process.argv[1])) void main();
