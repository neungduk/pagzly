/**
 * 448차 1-2 — 극단 사진 × 레이아웃 가독성 측정(픽셀 기반).
 * 대표 픽스처 6종(히어로 A·B·C·D와 임팩트 사진 블록 overlap·offset·arch·caption·collage·bleed·배너를 모두 포함)의 모든 사진 자리를 합성 극단 사진 한 장으로 바꿔 열고,
 * 사진 위에 얹힌 글자마다 ① 글자를 투명하게 한 재캡처로 그 글자 상자 뒤 실제 렌더 픽셀을 얻어 ② 배경 휘도 5·50·95 백분위로 글자색과의 WCAG 대비를 계산한다
 * (글자가 배경보다 밝으면 가장 밝은 쪽 95백분위, 어두우면 5백분위가 최악). 큰 글자(≥24px, 또는 ≥18.7px 굵게)는 3:1, 그 밖은 4.5:1.
 *   npx tsx scripts/photo-legibility.ts [--out=review/448-verify/photo-stress.md] [--fixtures=id,id] [--photos=id,id] [--json=경로]
 * 사진은 scripts/gen-photo-stress.ts가 review/448-verify/photos에 만든다(없으면 만든다).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { STRESS_PHOTOS, generate } from "./gen-photo-stress";
import { corpus, exportHtmlOf } from "./design-corpus";
import { EXTRA_ROOTS, launch, openHtml } from "./eye-lib";
import { VARIANT_IDS, htmlFor } from "./stress-variants";

export const PHOTO_DIR = "review/448-verify/photos";
export const FIXTURES = ["fx-compare-fashion", "fx-fashion-dress-floral", "fx-skincare-serum", "fx-food-snack", "fx-tech-keyboard", "fx-tech-vacuum", "fx-hairbody-shampoo", "fx-tier-normal-living-3p", ...VARIANT_IDS];

export type TextProbe = { text: string; x: number; y: number; w: number; h: number; fg: [number, number, number, number]; px: number; weight: number; layout: string };
export type Finding = { fixture: string; photo: string; layout: string; text: string; px: number; need: number; ratio: number; p5: number; p50: number; p95: number };

const lin = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
export const lum = (r: number, g: number, b: number): number => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export const ratioOf = (a: number, b: number): number => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** 글자 상자 목록을 뽑는 페이지 안 스크립트: 사진(img·url() 배경) 위에 50% 넘게 겹친 글자만 */
export const PROBE = `(() => {
  const rect = (e) => {
    let l = e.getBoundingClientRect(); let L = l.left, T = l.top, R = l.right, B = l.bottom;
    for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.overflow !== 'visible' || cs.overflowX !== 'visible') { const r = a.getBoundingClientRect(); L = Math.max(L, r.left); T = Math.max(T, r.top); R = Math.min(R, r.right); B = Math.min(B, r.bottom); } }
    return { x: L + scrollX, y: T + scrollY, w: Math.max(0, R - L), h: Math.max(0, B - T) };
  };
  const photos = [];
  for (const i of document.images) { const r = rect(i); if (r.w > 40 && r.h > 40 && i.naturalWidth > 0) photos.push(r); }
  for (const e of document.querySelectorAll('*')) { const bg = getComputedStyle(e).backgroundImage; if (bg && /url\\([^)]*(stress|qa-fixtures)/.test(bg)) { const r = rect(e); if (r.w > 40 && r.h > 40) photos.push(r); } }
  const cover = (t) => { let best = 0; for (const p of photos) { const w = Math.max(0, Math.min(t.x + t.w, p.x + p.w) - Math.max(t.x, p.x)), h = Math.max(0, Math.min(t.y + t.h, p.y + p.h) - Math.max(t.y, p.y)); best = Math.max(best, (w * h) / Math.max(1, t.w * t.h)); } return best; };
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const n = walker.currentNode; const text = (n.textContent || '').trim(); if (!text) continue;
    const e = n.parentElement; if (!e || seen.has(e) || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(e.tagName)) continue;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
    const r = document.createRange(); r.selectNodeContents(n); const b = (cs.webkitLineClamp && cs.webkitLineClamp !== 'none') ? e.getBoundingClientRect() : r.getBoundingClientRect(); if (b.width < 4 || b.height < 4) continue;
    const t = { x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height };
    if (cover(t) < 0.5) continue;
    seen.add(e);
    const m = cs.color.match(/[\\d.]+/g) || ['0', '0', '0', '1'];
    const l = e.closest('[data-hero-v2]'); const im = e.closest('[data-pz-impact]'); const v4 = e.closest('[data-pz-v4]'); const sec = e.closest('section');
    const layout = l ? 'hero-' + l.getAttribute('data-hero-v2') : v4 ? 'v4-' + v4.getAttribute('data-pz-v4') : im ? 'impact-' + im.getAttribute('data-pz-impact') : sec ? 'section' : 'other';
    out.push({ ...t, text: text.slice(0, 24), fg: [Number(m[0]), Number(m[1]), Number(m[2]), m[3] === undefined ? 1 : Number(m[3])], px: parseFloat(cs.fontSize), weight: Number(cs.fontWeight) || 400, layout });
  }
  return out;
})()`;

const HIDE_TEXT = "*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}svg text,svg tspan{fill:transparent!important;stroke:none!important}";

export async function measure(browser: Awaited<ReturnType<typeof launch>>, html: string, fixture: string, photo: string, W = 390): Promise<Finding[]> {
  const ex = await openHtml(browser, html, W);
  const probes = (await ex.page.evaluate(PROBE)) as TextProbe[];
  await ex.page.addStyleTag({ content: HIDE_TEXT });
  const buf = await ex.page.screenshot({ fullPage: true });
  await ex.close();
  const img = sharp(buf);
  const meta = await img.metadata();
  const raw = await img.ensureAlpha().raw().toBuffer();
  const WW = meta.width!, HH = meta.height!;
  const out: Finding[] = [];
  for (const p of probes) {
    const x0 = Math.max(0, Math.floor(p.x)), y0 = Math.max(0, Math.floor(p.y)), x1 = Math.min(WW, Math.ceil(p.x + p.w)), y1 = Math.min(HH, Math.ceil(p.y + p.h));
    if (x1 - x0 < 2 || y1 - y0 < 2) continue;
    const ls: number[] = [];
    let sr = 0, sg = 0, sb = 0;
    for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) { const i = (y * WW + x) * 4; ls.push(lum(raw[i]!, raw[i + 1]!, raw[i + 2]!)); sr += raw[i]!; sg += raw[i + 1]!; sb += raw[i + 2]!; }
    const nPx = ls.length;
    ls.sort((a, b) => a - b);
    const at = (q: number) => ls[Math.min(ls.length - 1, Math.floor(q * ls.length))]!;
    const p5 = at(0.05), p50 = at(0.5), p95 = at(0.95);
    // 글자 알파를 중앙 배경에 섞은 실효 글자 휘도
    const a = p.fg[3];
    const mix = (c: number, avg: number) => c * a + avg * (1 - a);
    const fl = a >= 0.999 ? lum(p.fg[0], p.fg[1], p.fg[2]) : lum(mix(p.fg[0], sr / nPx), mix(p.fg[1], sg / nPx), mix(p.fg[2], sb / nPx));
    const worstBg = fl >= p50 ? p95 : p5;
    const ratio = ratioOf(fl, worstBg);
    const large = p.px >= 24 || (p.px >= 18.66 && p.weight >= 700);
    out.push({ fixture, photo, layout: p.layout, text: p.text, px: p.px, need: large ? 3 : 4.5, ratio: Math.round(ratio * 100) / 100, p5, p50, p95 });
  }
  return out;
}

export function swapPhotos(html: string, photo: string): string {
  return html.replace(/(?:https?:\/\/qa-fixtures\.invalid)?\/(?:qa-fixtures\/ph|synth\/section-backdrops)\/[^"')\s]+|https?:\/\/qa-fixtures\.invalid\/[^"')\s]+/g, `/stress/${photo}.jpg`);
}

export async function run(opts: { fixtures?: string[]; photos?: string[]; width?: number } = {}): Promise<Finding[]> {
  if (!fs.existsSync(PHOTO_DIR) || fs.readdirSync(PHOTO_DIR).length < STRESS_PHOTOS.length) await generate(PHOTO_DIR);
  EXTRA_ROOTS["/stress/"] = PHOTO_DIR;
  const browser = await launch();
  const all: Finding[] = [];
  const fixtures = (opts.fixtures ?? FIXTURES).filter(Boolean);
  const photos = (opts.photos ?? STRESS_PHOTOS.map((p) => p.id)).filter(Boolean);
  for (const fx of fixtures) {
    const base = htmlFor(fx);
    for (const ph of photos) all.push(...(await measure(browser, swapPhotos(base, ph), fx, ph, opts.width ?? 390)));
  }
  await browser.close();
  return all;
}

export function summarize(all: Finding[]): string {
  const photos = [...new Set(all.map((f) => f.photo))];
  const layouts = [...new Set(all.map((f) => f.layout))].sort();
  const worst = new Map<string, Finding>();
  for (const f of all) { const k = `${f.photo}|${f.layout}`; const slack = f.ratio - f.need; const cur = worst.get(k); if (!cur || slack < cur.ratio - cur.need) worst.set(k, f); }
  const viol = all.filter((f) => f.ratio < f.need);
  const lines: string[] = [`# 사진 스트레스 가독성 (448차)`, "", `측정 글자 ${all.length}개 · 위반(최악 백분위 대비 < 기준) **${viol.length}개** · 사진 ${photos.length}종 × 레이아웃 ${layouts.length}종`, "", "셀 = 그 사진·레이아웃에서 기준 대비 여유가 가장 작은 글자의 대비(기준). ❌ = 위반.", ""];
  lines.push(`| 사진 | ${layouts.join(" | ")} |`, `|---|${layouts.map(() => "---").join("|")}|`);
  for (const ph of photos) lines.push(`| ${ph} | ${layouts.map((l) => { const w = worst.get(`${ph}|${l}`); return w ? `${w.ratio < w.need ? "❌ " : ""}${w.ratio}(${w.need})` : "-"; }).join(" | ")} |`);
  lines.push("", "## 위반 목록(사진 · 레이아웃별 최악 3개)");
  const grouped = new Map<string, Finding[]>();
  for (const f of viol) { const k = `${f.photo} · ${f.layout}`; grouped.set(k, [...(grouped.get(k) ?? []), f]); }
  for (const [k, fs2] of [...grouped].sort()) lines.push(`- ${k}: ${fs2.sort((a, b) => a.ratio - b.ratio).slice(0, 3).map((f) => `«${f.text}» ${f.px}px ${f.ratio}<${f.need} (${f.fixture})`).join(" / ")}`);
  return lines.join("\n") + "\n";
}

if (/photo-legibility\.ts$/.test(process.argv[1] ?? "")) {
  const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  const out = arg("out") ?? "review/448-verify/photo-stress.md";
  void run({ fixtures: arg("fixtures")?.split(","), photos: arg("photos")?.split(",") }).then((all) => {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const md = summarize(all);
    fs.writeFileSync(out, md);
    if (arg("json")) fs.writeFileSync(arg("json")!, JSON.stringify(all));
    console.log(md.split("\n").slice(0, 4).join("\n"));
    process.exit(all.some((f) => f.ratio < f.need) ? 1 : 0);
  });
}
