/**
 * 453차 3 — 섹션 종류별 완성도 지표. export HTML(합성 21종, 390폭)에서 최상위 구간(.pagzly-wrap 직계 section)마다 종류 키를 매기고 지표를 잰다:
 *  - 외톨이 줄: 2줄 이상 글의 마지막 줄이 1~2글자인 상자 수
 *  - 겹침: 보이는 글 상자끼리 면적 20% 이상 겹친 쌍 수(조상·자손·장식 aria-hidden 제외)
 *  - 빈 띠 비율: 세로로 글·사진·도형·표·목록·테두리 상자가 없는 틈(내부 48px 초과분 + 위·아래 80px 초과분)의 구간 높이 대비 비율(장식 도형도 채움, 배경 사진 구간은 0)
 *  - 넘침: 구간 밖으로 삐져나온 글 상자 수
 * 점수 = 100 − 8×외톨이 − 20×겹침 − 15×넘침 − 빈 띠 비율×120  (0~100). 종류 키 = data-pz-v4 → data-pz-impact → data-info → 첫 클래스 → data-hero-v2 → tag
 *   npx tsx scripts/section-floor.ts [--out=review/453-verify/section-floor.md] [--json=경로] [--width=390]
 */
import fs from "node:fs";
import path from "node:path";
import { corpus, exportHtmlOf } from "./design-corpus";
import { launch, openHtml } from "./eye-lib";

export type SecRow = { fixture: string; type: string; index: number; height: number; orphan: number; overlap: number; overflow: number; empty: number; score: number; text: string };

const MEASURE = `(() => {
  const root = document.querySelector('.pagzly-wrap') || document.body;
  const secs = [...root.children].filter((c) => c.tagName === 'SECTION');
  const keyOf = (s) => s.getAttribute('data-pz-v4') ? 'v4:' + s.getAttribute('data-pz-v4') : s.getAttribute('data-pz-impact') ? 'impact:' + s.getAttribute('data-pz-impact') : s.getAttribute('data-info') ? 'info:' + s.getAttribute('data-info') : s.hasAttribute('data-hero-v2') ? 'hero:' + s.getAttribute('data-hero-v2') : (String(s.className).split(/\\s+/)[0] || 'section');
  const vis = (e) => { const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0 && !e.closest('[aria-hidden="true"],[data-hero-fold]'); };
  const out = [];
  secs.forEach((s, index) => {
    const sr = s.getBoundingClientRect(); if (sr.height < 20) return;
    const textBoxes = [];
    let orphan = 0, overflow = 0;
    const tw = document.createTreeWalker(s, NodeFilter.SHOW_TEXT); let n;
    const seen = new Set();
    while ((n = tw.nextNode())) {
      const t = (n.textContent || '').trim(); if (!t) continue;
      const e = n.parentElement; if (!e || seen.has(e) || !vis(e) || ['SCRIPT','STYLE','NOSCRIPT'].includes(e.tagName)) continue; seen.add(e);
      const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect(); if (b.width < 3 || b.height < 3) continue;
      textBoxes.push({ e, x: b.left, y: b.top, w: b.width, h: b.height });
      if (b.right > sr.right + 2 || b.left < sr.left - 2) overflow += 1;
      const rects = [...r.getClientRects()];
      const rows = []; for (const q of rects) { if (!rows.length || Math.abs(q.top - rows[rows.length - 1].top) > q.height * 0.6) rows.push({ top: q.top, w: q.width }); else rows[rows.length - 1].w += q.width; }
      if (rows.length >= 2) { const cs = getComputedStyle(e); const fs = parseFloat(cs.fontSize) || 14; const last = rows[rows.length - 1].w; if (last <= fs * 2.2) orphan += 1; }
    }
    let overlap = 0;
    for (let i = 0; i < textBoxes.length; i += 1) for (let j = i + 1; j < textBoxes.length; j += 1) {
      const a = textBoxes[i], b = textBoxes[j];
      if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ix > 0 && iy > 0 && (ix * iy) / Math.min(a.w * a.h, b.w * b.h) > 0.2) overlap += 1;
    }
    // 빈 띠: 글·사진·도형·표·목록·테두리 상자의 세로 구간 합집합에서 내부 틈(48px 초과분)과 위·아래 여백(80px 초과분)을 합해 구간 높이로 나눈다.
    // 장식 도형(aria-hidden)도 채움으로 센다(숨 쉬는 구간의 모티프). 구간 전체를 덮는 배경 상자는 제외.
    const lite = (e) => { const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0; };
    let photoFill = false;
    const spans = textBoxes.map((t) => [t.y - sr.top, t.y + t.h - sr.top]);
    for (const e of s.querySelectorAll('img,svg,button,input,canvas,video,hr,table,li,[style*="border"],[style*="background"]')) { if (!lite(e)) continue; const b = e.getBoundingClientRect(); if (b.width < 2 || b.height < 2) continue; if (b.height > sr.height * 0.9) { if (/^(IMG|VIDEO|CANVAS)$/.test(e.tagName)) photoFill = true; continue; } spans.push([b.top - sr.top, b.bottom - sr.top]); }
    spans.sort((x, y) => x[0] - y[0]);
    let cursor = 0, gapSum = 0, first = true, covered = 0;
    for (const [y0, y1] of spans) { if (first) { gapSum += Math.max(0, y0 - 80); first = false; cursor = Math.max(cursor, y1); continue; } if (y0 > cursor) gapSum += Math.max(0, y0 - cursor - 48); cursor = Math.max(cursor, y1); }
    gapSum += first ? Math.max(0, sr.height - 160) : Math.max(0, sr.height - cursor - 80);
    const bgImg = getComputedStyle(s).backgroundImage !== 'none';
    const empty = bgImg || photoFill ? 0 : Math.min(1, gapSum / sr.height);
    out.push({ type: keyOf(s), index, height: Math.round(sr.height), orphan, overlap, overflow, empty: Math.round(empty * 100) / 100, text: (s.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 24) });
  });
  return out;
})()`;

const scoreOf = (r: { orphan: number; overlap: number; overflow: number; empty: number }): number => Math.max(0, Math.round(100 - 8 * r.orphan - 20 * r.overlap - 15 * r.overflow - r.empty * 120));

export async function run(width = 390, only?: string[]): Promise<SecRow[]> {
  const browser = await launch();
  const rows: SecRow[] = [];
  for (const [id, file] of corpus({ only }).filter(([i]) => i.startsWith("fx-"))) {
    const ex = await openHtml(browser, exportHtmlOf(file), width);
    await ex.page.evaluate("document.fonts.ready");
    const secs = (await ex.page.evaluate(MEASURE)) as Array<Omit<SecRow, "fixture" | "score">>;
    await ex.close();
    for (const s of secs) rows.push({ fixture: id, ...s, score: scoreOf(s) });
  }
  await browser.close();
  return rows;
}

export type TypeAgg = { type: string; n: number; mean: number; min: number; orphan: number; overlap: number; overflow: number; empty: number };
export function aggregate(rows: SecRow[]): TypeAgg[] {
  const m = new Map<string, SecRow[]>();
  for (const r of rows) m.set(r.type, [...(m.get(r.type) ?? []), r]);
  return [...m].map(([type, rs]) => ({ type, n: rs.length, mean: rs.reduce((a, r) => a + r.score, 0) / rs.length, min: Math.min(...rs.map((r) => r.score)), orphan: rs.reduce((a, r) => a + r.orphan, 0), overlap: rs.reduce((a, r) => a + r.overlap, 0), overflow: rs.reduce((a, r) => a + r.overflow, 0), empty: rs.reduce((a, r) => a + r.empty, 0) / rs.length })).sort((a, b) => a.mean - b.mean);
}

export function tableMd(title: string, aggs: TypeAgg[], minN = 2): string {
  const rows = aggs.filter((a) => a.n >= minN);
  return [`## ${title}`, "", "| 종류 | 구간 수 | 평균 점수 | 최저 | 외톨이 | 겹침 | 넘침 | 빈 띠(평균) |", "|---|---|---|---|---|---|---|---|", ...rows.map((a) => `| ${a.type} | ${a.n} | ${a.mean.toFixed(1)} | ${a.min} | ${a.orphan} | ${a.overlap} | ${a.overflow} | ${a.empty.toFixed(2)} |`), ""].join("\n");
}

if (/section-floor\.ts$/.test(process.argv[1] ?? "")) {
  const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
  void run(Number(arg("width", "390"))).then((rows) => {
    const aggs = aggregate(rows);
    const md = ["# 섹션 종류별 완성도 (453차)", "", `합성 21종 × ${arg("width", "390")}폭, 최상위 구간 ${rows.length}개. 점수 = 100 − 8×외톨이 − 20×겹침 − 15×넘침 − 빈 띠×120. 구간 수 2 미만인 종류는 제외.`, "", tableMd("종류별(낮은 순)", aggs), "## 하위 구간 20개", "", "| 점수 | 픽스처 | 종류 | 높이 | 외톨이 | 겹침 | 넘침 | 빈 띠 | 글 |", "|---|---|---|---|---|---|---|---|---|", ...[...rows].sort((a, b) => a.score - b.score).slice(0, 20).map((r) => `| ${r.score} | ${r.fixture} | ${r.type} | ${r.height} | ${r.orphan} | ${r.overlap} | ${r.overflow} | ${r.empty} | ${r.text} |`), ""].join("\n");
    const out = arg("out", "review/453-verify/section-floor.md");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, md);
    if (arg("json", "")) fs.writeFileSync(arg("json", ""), JSON.stringify(rows));
    console.log(md.split("\n").slice(0, 26).join("\n"));
  });
}
