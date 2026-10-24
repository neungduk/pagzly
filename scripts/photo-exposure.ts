/**
 * 449차 1-1 — 사진 노출 지표. 대비만 최적화하면 사진이 죽는 과보정이 되므로, 덮개(스크림·글 블록 면·카드 덧칠)가 사진을 얼마나 가리는지 잰다.
 * 방법: 같은 페이지의 사진 자리를 순백·순흑 사진으로 바꿔 두 번 렌더(글자 투명)하면, 합성식 S = P·(1-a) + 덮개색·a 에서 픽셀별 알파가 사진과 무관하게 풀린다:
 *   a = 1 - (S_white - S_black) / 255   (채널 평균)
 *  - 가림 면적비 = 사진 영역 중 a ≥ 0.5 인 픽셀 비율
 *  - 휘도 보존율 = 사진 영역의 평균 (1 - a)  (덮개가 사진 밝기를 남기는 정도, 1 = 덮개 없음)
 * 사진 영역 = 화면에 실제로 보이는 <img>(부모 overflow 잘림 반영) + 사진 url을 배경으로 쓰는 요소. 레이아웃 이름은 가장 가까운 히어로·v4 블록·임팩트·정보 구간.
 *   npx tsx scripts/photo-exposure.ts [--out=review/449-verify/exposure.md] [--fixtures=id,id] [--json=경로]
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { Browser } from "playwright";
import { generate } from "./gen-photo-stress";
import { EXTRA_ROOTS, launch, openHtml } from "./eye-lib";
import { FIXTURES as BASE_FIXTURES, PHOTO_DIR, swapPhotos } from "./photo-legibility";
import { htmlFor } from "./stress-variants";

export const EXPOSURE_LIMITS = { hero: { cover: 0.5, keep: 0.6 }, info: { cover: 1, keep: 0.12 }, banner: { cover: 1, keep: 0.06 } } as const;
/** 449차에서 확장한 말뭉치(히어로 E·흰 배경 컷아웃·임팩트 사진 블록 변형이 얹힌 픽스처 포함) */
export const EXPOSURE_FIXTURES = BASE_FIXTURES;

export type Region = { x: number; y: number; w: number; h: number; layout: string; desc?: string };
export type ExposureRow = { fixture: string; layout: string; area: number; cover: number; keep: number; desc?: string };

const REGIONS = `(() => {
  const clip = (e) => {
    const l = e.getBoundingClientRect(); let L = l.left, T = l.top, R = l.right, B = l.bottom;
    for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.overflow !== 'visible' || cs.overflowX !== 'visible') { const r = a.getBoundingClientRect(); L = Math.max(L, r.left); T = Math.max(T, r.top); R = Math.min(R, r.right); B = Math.min(B, r.bottom); } }
    return { x: L + scrollX, y: T + scrollY, w: Math.max(0, R - L), h: Math.max(0, B - T) };
  };
  const name = (e) => { if (e.closest('.pagzly-illustration-banner')) return 'banner'; const l = e.closest('[data-hero-v2]'); const v4 = e.closest('[data-pz-v4]'); const im = e.closest('[data-pz-impact]'); const info = e.closest('[data-info]'); return l ? 'hero-' + l.getAttribute('data-hero-v2') : v4 ? 'v4-' + v4.getAttribute('data-pz-v4') : im ? 'impact-' + im.getAttribute('data-pz-impact') : info ? 'info-' + info.getAttribute('data-info') : 'section'; };
  const out = [];
  for (const i of document.images) { if (i.naturalWidth > 0 && !i.closest('[aria-hidden="true"]')) { const r = clip(i); if (r.w > 40 && r.h > 40) out.push({ ...r, layout: name(i), desc: 'IMG y=' + Math.round(r.y) + ' ' + (i.parentElement ? (i.parentElement.getAttribute('style') || '').slice(0, 70) : '') }); } }
  for (const e of document.querySelectorAll('*')) { const bg = getComputedStyle(e).backgroundImage; if (bg && /url\\([^)]*stress/.test(bg)) { const r = clip(e); if (r.w > 40 && r.h > 40) out.push({ ...r, layout: name(e), desc: e.tagName + ' ' + (e.id || '') + ' ' + [...e.attributes].filter((a) => a.name.startsWith('data-')).map((a) => a.name).join(',') + ' | ' + (e.textContent || '').trim().slice(0, 20) }); } }
  return out;
})()`;
const HIDE_TEXT = "*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}";

async function shot(browser: Browser, html: string, W: number): Promise<{ raw: Buffer; w: number; h: number; regions: Region[] }> {
  const ex = await openHtml(browser, html, W);
  const regions = (await ex.page.evaluate(REGIONS)) as Region[];
  await ex.page.addStyleTag({ content: HIDE_TEXT });
  const png = await ex.page.screenshot({ fullPage: true });
  await ex.close();
  const im = sharp(png).removeAlpha();
  const m = await im.metadata();
  return { raw: await im.raw().toBuffer(), w: m.width!, h: m.height!, regions };
}

export async function exposureOf(browser: Browser, html: string, fixture: string, W = 390): Promise<ExposureRow[]> {
  const white = await shot(browser, swapPhotos(html, "ref-white"), W);
  const black = await shot(browser, swapPhotos(html, "ref-black"), W);
  const rows: ExposureRow[] = [];
  for (const r of white.regions) {
    const x0 = Math.max(0, Math.floor(r.x)), y0 = Math.max(0, Math.floor(r.y)), x1 = Math.min(white.w, Math.ceil(r.x + r.w)), y1 = Math.min(white.h, Math.ceil(r.y + r.h), black.h);
    let n = 0, cover = 0, keep = 0;
    for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
      const i = (y * white.w + x) * 3, j = (y * black.w + x) * 3;
      const d = ((white.raw[i]! - black.raw[j]!) + (white.raw[i + 1]! - black.raw[j + 1]!) + (white.raw[i + 2]! - black.raw[j + 2]!)) / 3;
      const a = Math.min(1, Math.max(0, 1 - d / 255));
      n += 1; if (a >= 0.5) cover += 1; keep += 1 - a;
    }
    if (n) rows.push({ fixture, layout: r.layout, area: n * 4, cover: cover / n, keep: keep / n, desc: r.desc });
  }
  return rows;
}

export async function runExposure(fixtures: string[] = EXPOSURE_FIXTURES): Promise<ExposureRow[]> {
  await generate(PHOTO_DIR);
  EXTRA_ROOTS["/stress/"] = PHOTO_DIR;
  const browser = await launch();
  const all: ExposureRow[] = [];
  for (const fx of fixtures) all.push(...(await exposureOf(browser, htmlFor(fx), fx)));
  await browser.close();
  return all;
}

export function summarizeExposure(rows: ExposureRow[], title = "사진 노출 지표 (449차)"): string {
  const layouts = [...new Set(rows.map((r) => r.layout))].sort();
  const lines = [`# ${title}`, "", `덮개가 사진을 가리는 정도(사진과 무관 — 순백·순흑 사진 쌍으로 푼 픽셀별 알파). 가림 면적비 = 알파 ≥0.5 픽셀 비율(낮을수록 사진이 보임), 휘도 보존율 = 평균(1-알파)(높을수록 사진이 밝게 보임). 목표: 히어로 가림 ≤${EXPOSURE_LIMITS.hero.cover}·보존 ≥${EXPOSURE_LIMITS.hero.keep}, 정보 구간 가림 ≤${EXPOSURE_LIMITS.info.cover}·보존 ≥${EXPOSURE_LIMITS.info.keep}.`, "", "| 레이아웃 | 영역 수 | 가림 평균 | 가림 최악 | 보존 평균 | 보존 최악 | 최악 픽스처 |", "|---|---|---|---|---|---|---|"];
  for (const l of layouts) {
    const rs = rows.filter((r) => r.layout === l);
    const w = rs.reduce((s, r) => s + r.area, 0);
    const avg = (f: (r: ExposureRow) => number) => rs.reduce((s, r) => s + f(r) * r.area, 0) / w;
    const worstCover = rs.reduce((a, b) => (b.cover > a.cover ? b : a));
    const worstKeep = rs.reduce((a, b) => (b.keep < a.keep ? b : a));
    lines.push(`| ${l} | ${rs.length} | ${avg((r) => r.cover).toFixed(2)} | ${worstCover.cover.toFixed(2)} | ${avg((r) => r.keep).toFixed(2)} | ${worstKeep.keep.toFixed(2)} | ${worstCover.fixture}${worstKeep.fixture === worstCover.fixture ? "" : " / " + worstKeep.fixture} |`);
  }
  return lines.join("\n") + "\n";
}

export function limitFailures(rows: ExposureRow[]): string[] {
  const out: string[] = [];
  for (const r of rows) {
    const lim = r.layout.startsWith("hero-") ? EXPOSURE_LIMITS.hero : r.layout.startsWith("info-") ? EXPOSURE_LIMITS.info : r.layout === "banner" ? EXPOSURE_LIMITS.banner : null;
    if (!lim) continue;
    if (r.cover > lim.cover) out.push(`${r.fixture} ${r.layout}: 가림 ${r.cover.toFixed(2)} > ${lim.cover}`);
    if (r.keep < lim.keep) out.push(`${r.fixture} ${r.layout}: 보존 ${r.keep.toFixed(2)} < ${lim.keep}`);
  }
  return out;
}

if (/photo-exposure\.ts$/.test(process.argv[1] ?? "")) {
  const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
  void runExposure(arg("fixtures", "") ? arg("fixtures", "").split(",") : undefined).then((rows) => {
    const out = arg("out", "review/449-verify/exposure.md");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const md = summarizeExposure(rows) + `\n## 목표 미달 영역\n${limitFailures(rows).slice(0, 40).map((l) => `- ${l}`).join("\n") || "- 없음"}\n`;
    fs.writeFileSync(out, md);
    if (arg("json", "")) fs.writeFileSync(arg("json", ""), JSON.stringify(rows));
    console.log(md);
    process.exit(limitFailures(rows).length ? 1 : 0);
  });
}
