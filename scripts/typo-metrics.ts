/**
 * 452차 2 — 한글 타이포 지표(DOM). export HTML을 브라우저에 올려 글 상자마다 줄 단위로 나눠 재고(글자별 상자 위치로 줄을 가른다) 다섯 지표를 센다:
 *  ① 외톨이 줄 — 2줄 이상 글의 마지막 줄이 공백 뺀 1~2글자
 *  ② 단어 중간 끊김 — 줄 끝과 다음 줄 첫 글자가 둘 다 공백이 아닌 어절 안에서 줄이 바뀜
 *  ③ 본문 행간 이탈 — 2줄 이상 본문(13~18px)의 행간 비율이 1.5~1.75 밖
 *  ④ 제목 행간 이탈 — 2줄 이상 h1~h3의 행간 비율이 1.2~1.4 밖
 *  ⑤ 한 줄 글자 수 이탈 — 2줄 이상 본문의 가득 찬 줄(마지막 줄 제외) 중앙값이 390폭 12~24자, 750폭 24~40자 밖
 *   npx tsx scripts/typo-metrics.ts [--out=review/452-verify/typo/metrics.md] [--json=경로] [--widths=390,750]
 * 문구는 건드리지 않는다. 글자 폭·행간은 폰트(Noto Sans KR)가 로드된 뒤 잰다.
 */
import fs from "node:fs";
import path from "node:path";
import type { Page } from "playwright";
import { corpus, exportHtmlOf } from "./design-corpus";
import { launch, openHtml } from "./eye-lib";

export type TypoCounts = { orphan: number; midword: number; bodyLh: number; titleLh: number; lineLen: number; boxes: number };
export type TypoDetail = { kind: keyof Omit<TypoCounts, "boxes">; text: string; info: string };

const MEASURE = `((W) => {
  const out = { orphan: 0, midword: 0, bodyLh: 0, titleLh: 0, lineLen: 0, boxes: 0, detail: [] };
  const root = document.querySelector('.pagzly-wrap') || document.body;
  const skip = (e) => e.closest('[aria-hidden="true"],[data-hero-fold],.pagzly-seo-text,[data-hl="sticker"],script,style,svg') || e.querySelector('br');
  const cand = [...root.querySelectorAll('h1,h2,h3,h4,p,li,td,th,span,div,a,button,label')].filter((e) => {
    if (skip(e)) return false;
    const kids = [...e.childNodes];
    const hasText = kids.some((n) => n.nodeType === 3 && (n.textContent || '').trim().length > 0);
    if (!hasText) return false;
    if (e.querySelector('p,h1,h2,h3,h4,li,div,td,th')) return false;
    const cs = getComputedStyle(e);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && e.getBoundingClientRect().width > 0;
  });
  const lo = W >= 700 ? 24 : 12, hi = W >= 700 ? 40 : 24;
  for (const e of cand) {
    const cs = getComputedStyle(e);
    if (cs.webkitLineClamp && cs.webkitLineClamp !== 'none') continue;
    const chars = [];
    const tw = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    let n; while ((n = tw.nextNode())) { if (n.parentElement && n.parentElement.closest('[aria-hidden="true"]')) continue; const t = n.textContent || ''; for (let i = 0; i < t.length; i += 1) chars.push([n, i, t[i]]); }
    const total = chars.filter((c) => !/\\s/.test(c[2])).length;
    if (total < 6 || chars.length > 600) continue;
    const r = document.createRange();
    const rows = [];
    let curTop = null, cur = [];
    for (const [node, i, ch] of chars) {
      if (/\\s/.test(ch)) { cur.push([ch, true]); continue; }
      r.setStart(node, i); r.setEnd(node, i + 1);
      const b = r.getBoundingClientRect(); if (!b.height) continue;
      if (curTop === null || Math.abs(b.top - curTop) > b.height * 0.6) { if (cur.length) rows.push(cur); cur = []; curTop = b.top; }
      cur.push([ch, false]);
    }
    if (cur.length) rows.push(cur);
    if (rows.length < 2) continue;
    out.boxes += 1;
    const fs = parseFloat(cs.fontSize); const lhPx = parseFloat(cs.lineHeight); const ratio = (isNaN(lhPx) ? 1.2 * fs : lhPx) / fs;
    const text = (e.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 18);
    const rowStr = rows.map((rw) => rw.filter((c) => !c[1]).map((c) => c[0]).join(''));
    const last = rowStr[rowStr.length - 1];
    if (last.length >= 1 && last.length <= 2) { out.orphan += 1; out.detail.push({ kind: 'orphan', text, info: '마지막 줄 «' + last + '»' }); }
    for (let k = 0; k < rows.length - 1; k += 1) {
      const a = rows[k], b = rows[k + 1];
      const aEnd = a[a.length - 1], bStart = b[0];
      if (aEnd && bStart && !aEnd[1] && !bStart[1]) { out.midword += 1; out.detail.push({ kind: 'midword', text, info: '«' + rowStr[k].slice(-3) + '|' + rowStr[k + 1].slice(0, 3) + '»' }); }
    }
    const isTitle = /^H[1-3]$/.test(e.tagName) || /pagzly-display-headline|pz-fit/.test(e.className || '');
    if (isTitle) { if (ratio < 1.2 - 0.001 || ratio > 1.4 + 0.001) { out.titleLh += 1; out.detail.push({ kind: 'titleLh', text, info: ratio.toFixed(2) }); } }
    else if (fs >= 13 && fs <= 18) {
      if (ratio < 1.5 - 0.001 || ratio > 1.75 + 0.001) { out.bodyLh += 1; out.detail.push({ kind: 'bodyLh', text, info: ratio.toFixed(2) + ' @' + fs + 'px ' + e.tagName + '.' + String(e.className).slice(0, 20) + ' ' + (e.getAttribute('style') || '').slice(0, 90) + ' ^ ' + (e.parentElement ? e.parentElement.tagName + ' ' + (e.parentElement.getAttribute('data-ip') || '') + ' ' + (e.parentElement.getAttribute('style') || '').slice(0, 60) : '') }); }
      const full = rowStr.slice(0, -1).map((s) => s.length).sort((x, y) => x - y);
      const med = full[Math.floor(full.length / 2)];
      if (med < lo || med > hi) { out.lineLen += 1; out.detail.push({ kind: 'lineLen', text, info: med + '자' }); }
    }
  }
  return out;
})`;

export async function measureTypo(page: Page, width: number): Promise<TypoCounts & { detail: TypoDetail[] }> {
  await page.evaluate("document.fonts.ready");
  return (await page.evaluate(`${MEASURE}(${width})`)) as TypoCounts & { detail: TypoDetail[] };
}

export type TypoRow = TypoCounts & { id: string; width: number; detail: TypoDetail[] };

export async function run(widths = [390, 750], only?: string[]): Promise<TypoRow[]> {
  const browser = await launch();
  const rows: TypoRow[] = [];
  for (const [id, file] of corpus({ only }).filter(([i]) => i.startsWith("fx-"))) {
    const html = exportHtmlOf(file);
    for (const W of widths) {
      const ex = await openHtml(browser, html, W);
      const m = await measureTypo(ex.page, W);
      await ex.close();
      rows.push({ id, width: W, ...m });
    }
  }
  await browser.close();
  return rows;
}

export const sum = (rows: TypoRow[], k: keyof TypoCounts): number => rows.reduce((a, r) => a + r[k], 0);

if (/typo-metrics\.ts$/.test(process.argv[1] ?? "")) {
  const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
  void run(arg("widths", "390,750").split(",").map(Number)).then((rows) => {
    const md = [
      "# 한글 타이포 지표 (452차)", "",
      `합성 21종 × ${arg("widths", "390,750")}폭. 글 상자 ${sum(rows, "boxes")}개(2줄 이상). 합계: 외톨이 ${sum(rows, "orphan")} · 단어 중간 끊김 ${sum(rows, "midword")} · 본문 행간 이탈 ${sum(rows, "bodyLh")} · 제목 행간 이탈 ${sum(rows, "titleLh")} · 한 줄 글자 수 이탈 ${sum(rows, "lineLen")}`, "",
      "| 세션 | 폭 | 상자 | 외톨이 | 끊김 | 본문행간 | 제목행간 | 줄글자수 |", "|---|---|---|---|---|---|---|---|",
      ...rows.map((r) => `| ${r.id} | ${r.width} | ${r.boxes} | ${r.orphan} | ${r.midword} | ${r.bodyLh} | ${r.titleLh} | ${r.lineLen} |`), "",
    ].join("\n");
    const out = arg("out", "review/452-verify/typo/metrics.md");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, md);
    if (arg("json", "")) fs.writeFileSync(arg("json", ""), JSON.stringify(rows));
    console.log(md.split("\n").slice(0, 3).join("\n"));
  });
}
