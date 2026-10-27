/**
 * 448차 4·5 — 접근성·의미 구조·성능 린트(R19~R23). design-lint(R1~R18)와 같은 무료 방식(정규식 + 브라우저 DOM).
 *  R19 제목 순서   error  export: h1이 정확히 1개 · 라이브: h1 0~1개 · 제목 단계 건너뜀(h1→h3 등) 없음 · 섹션 제목은 h2/h3
 *  R20 이미지 대체텍스트 error  alt 속성이 없는 <img> / aria-hidden인데 alt가 비어 있지 않은 이미지 · warn 장식(aria-hidden 아님)인데 alt가 길이 1~2자
 *  R21 비텍스트 대비 warn  테두리만 있는 알약·칩(배경 투명, 둥근 모서리 ≥ 12px, 테두리 알파 ≥ 0.25 — 더 옅은 머리카락 선은 장식으로 본다)의 테두리색이 바탕과 3:1 미만(DOM)
 *  R22 문서 구조    error  export: <html lang="ko"> 없음 · 중복 id · 이름 없는 링크·버튼(글·aria-label·title·이미지 alt 없음)
 *  R23 이미지 비율 예약 warn  width·height 속성이 없고 부모가 높이·aspect-ratio를 정하지 않은 <img>(DOM, 로드 뒤 레이아웃 이동 위험)
 * 사용: npx tsx scripts/a11y-lint.ts [--out=review/448-verify/a11y-report.md] [--json=경로]
 */
import { assertHeavyEntry } from "./lib/heavy-guard";
assertHeavyEntry("a11y-lint", typeof module !== "undefined" ? require.main === module : true);
import fs from "node:fs";
import path from "node:path";
import React from "react";
import type { Browser } from "playwright";
import { corpus, exportArgsOf, exportHtmlOf, readSession } from "./design-corpus";
import { launch, openHtml } from "./eye-lib";
import { applySectionDisplayBudget } from "../lib/section-display-budget";
import { comparisonPolicyRemovesChart } from "../lib/comparison-policy";

export type A11yIssue = { rule: "R19" | "R20" | "R21" | "R22" | "R23"; sev: "error" | "warn" | "info"; msg: string; src?: string };

const attr = (tag: string, name: string): string | null => { const m = new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, "i").exec(tag); return m ? m[1]! : null; };
const hasAttr = (tag: string, name: string): boolean => new RegExp(`\\s${name}(\\s|=|/|>)`, "i").test(tag);
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();

/** HTML 문자열만 보는 규칙(R19·R20·R22). mode: export면 문서 전체, live면 렌더러 조각 */
export function a11yStatic(html: string, mode: "export" | "live"): A11yIssue[] {
  const out: A11yIssue[] = [];
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "");
  // R19
  const heads = [...body.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  const h1 = heads.filter((h) => h === 1).length;
  if (mode === "export" && h1 !== 1) out.push({ rule: "R19", sev: "error", msg: `h1 ${h1}개(1개여야 함)` });
  if (mode === "live" && h1 > 1) out.push({ rule: "R19", sev: "error", msg: `h1 ${h1}개` });
  let prev = mode === "live" ? 1 : 0;
  heads.forEach((h, i) => { if (h - prev > 1 && !(mode === "live" && i === 0)) out.push({ rule: "R19", sev: "error", msg: `제목 단계 건너뜀 h${prev}→h${h}` }); prev = h; });
  // R20
  for (const m of body.matchAll(/<img\b[^>]*>/gi)) {
    const t = m[0];
    const alt = attr(t, "alt");
    const hidden = /aria-hidden="true"/.test(t);
    if (alt === null) out.push({ rule: "R20", sev: "error", msg: `alt 없음 ${attr(t, "src")?.slice(-30) ?? ""}` });
    else if (hidden && alt.trim() !== "") out.push({ rule: "R20", sev: "error", msg: `aria-hidden인데 alt «${alt.slice(0, 20)}»` });
    else if (!hidden && alt.trim().length === 1) out.push({ rule: "R20", sev: "warn", msg: `alt가 너무 짧음 «${alt}»` });
  }
  // R22
  if (mode === "export" && !/<html[^>]*\slang="ko"/i.test(html)) out.push({ rule: "R22", sev: "error", msg: "<html lang=\"ko\"> 없음" });
  const ids = [...body.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]!);
  const dup = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  for (const d of dup) out.push({ rule: "R22", sev: "error", msg: `중복 id «${d}»` });
  for (const m of body.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
    const inner = m[3]!;
    const name = stripTags(inner) || attr(m[0], "aria-label") || attr(m[0], "title") || (/<img[^>]*\salt="([^"]+)"/.exec(inner)?.[1] ?? "");
    if (!name) out.push({ rule: "R22", sev: "error", msg: `이름 없는 ${m[1]!.toLowerCase()} ${m[2]!.slice(0, 60).trim()}` });
  }
  return out;
}

/** 브라우저 DOM 규칙(R21·R23) — 390폭 */
const DOM_RULES = `(() => {
  const out = [];
  const parse = (c) => { const m = (c || '').match(/[\\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 0]; };
  const lin = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const bgOf = (e) => { let acc = [255, 255, 255]; const chain = []; for (let a = e.parentElement; a; a = a.parentElement) chain.push(a); for (const a of chain.reverse()) { const c = parse(getComputedStyle(a).backgroundColor); if (c.length >= 3 && (c[3] === undefined || c[3] > 0)) { const al = c[3] === undefined ? 1 : c[3]; acc = acc.map((v, i) => c[i] * al + v * (1 - al)); } } return acc; };
  // R21: 테두리만 있는 알약·칩
  for (const e of document.querySelectorAll('.pagzly-wrap *')) {
    const cs = getComputedStyle(e);
    const bw = parseFloat(cs.borderTopWidth);
    if (bw < 1 || cs.borderTopStyle !== 'solid') continue;
    const bg = parse(cs.backgroundColor);
    if (bg.length >= 4 && bg[3] > 0.05) continue;
    if (parseFloat(cs.borderTopLeftRadius) < 12) continue;
    const r = e.getBoundingClientRect(); if (r.width < 24 || r.height < 16 || r.height > 60 || !(e.textContent || '').trim()) continue;
    if (e.closest('[aria-hidden="true"]')) continue;
    const bc = parse(cs.borderTopColor); const back = bgOf(e);
    const al = bc[3] === undefined ? 1 : bc[3];
    if (al < 0.25) continue; // 머리카락 선(알파 0.25 미만)은 장식 — 정보를 담지 않는다
    const eff = [0, 1, 2].map((i) => bc[i] * al + back[i] * (1 - al));
    const cr = ratio(L(eff[0], eff[1], eff[2]), L(back[0], back[1], back[2]));
    // 449차: 조작 칩(라벨·버튼·링크·입력 연결)만 경계가 정보 — 장식 칩은 글자 대비 4.5:1 이상이면 info(제외)
    const control = !!e.closest('label,button,a,[role],input,select');
    const tc = parse(cs.color); const tl = L(tc[0], tc[1], tc[2]); const tr = ratio(tl, L(back[0], back[1], back[2]));
    if (cr < 3 && !control && tr >= 4.5) { out.push({ rule: 'R21', sev: 'info', msg: '장식 칩(제외) ' + cr.toFixed(2) + ' «' + (e.textContent || '').trim().slice(0, 14) + '»' }); continue; }
    if (cr < 3) out.push({ rule: 'R21', sev: 'warn', msg: '테두리 대비 ' + cr.toFixed(2) + ' «' + (e.textContent || '').trim().slice(0, 14) + '»', src: (e.getAttribute('class') || '') + '|' + (e.getAttribute('style') || '').slice(0, 140) });
  }
  // R23: 비율 예약 없는 이미지 — src를 잠깐 떼어 자리 높이가 변하는지 잰다(변하면 로드 뒤 아래 내용이 밀린다)
  for (const img of document.querySelectorAll('.pagzly-wrap img')) {
    if (img.hasAttribute('width') && img.hasAttribute('height')) continue;
    const src = img.getAttribute('src'); const srcset = img.getAttribute('srcset');
    const box = img.closest('section') || img.parentElement;
    const h1 = box.getBoundingClientRect().height;
    img.removeAttribute('src'); if (srcset) img.removeAttribute('srcset');
    const h2 = box.getBoundingClientRect().height;
    if (src !== null) img.setAttribute('src', src); if (srcset) img.setAttribute('srcset', srcset);
    if (Math.abs(h1 - h2) > 1) out.push({ rule: 'R23', sev: 'warn', msg: '비율 예약 없음(자리 높이 ' + Math.round(h2) + '→' + Math.round(h1) + 'px) ' + (src || '').slice(-28) });
  }
  return out;
})()`;

export async function a11yDom(browser: Browser, html: string): Promise<A11yIssue[]> {
  const ex = await openHtml(browser, html, 390);
  try { return (await ex.page.evaluate(DOM_RULES)) as A11yIssue[]; } finally { await ex.close(); }
}

export async function liveMarkup(file: string): Promise<string> {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { default: R } = await import("../components/DetailSectionRenderer");
  const a = exportArgsOf(readSession(file));
  return renderToStaticMarkup(React.createElement(R as never, { sections: applySectionDisplayBudget(a.category, a.sections ?? [], { chartRemoved: comparisonPolicyRemovesChart(a.claimFacts) }), imageUrls: a.imageUrls ?? [], category: a.category, theme: a.theme, productName: a.productName, brandName: a.brandName, logoUrl: a.logoUrl, ingredients: a.ingredients, keyFeatures: a.keyFeatures, certifications: a.certifications, stylePackId: a.stylePackId, infoBackdrops: a.infoBackdrops, imageHashByUrl: a.imageHashByUrl, imageOrigins: a.imageOrigins, imageRoles: a.imageRoles, imageTags: a.imageTags, sceneImages: a.sceneImages, hasSizeInfo: a.hasSizeInfo, claimFacts: a.claimFacts } as never));
}

export type A11yRow = { id: string; export: A11yIssue[]; live: A11yIssue[]; bytes: number };

export async function auditCorpus(ids?: string[]): Promise<A11yRow[]> {
  const browser = await launch();
  const rows: A11yRow[] = [];
  for (const [id, f] of corpus({ only: ids }).filter(([i]) => i.startsWith("fx-"))) {
    const html = exportHtmlOf(f);
    const exp = [...a11yStatic(html, "export"), ...(await a11yDom(browser, html))];
    const live = a11yStatic(await liveMarkup(f), "live");
    rows.push({ id, export: exp, live, bytes: Buffer.byteLength(html, "utf8") });
  }
  await browser.close();
  return rows;
}

export function tableOf(rows: A11yRow[]): string {
  const rules = ["R19", "R20", "R21", "R22", "R23"] as const;
  const cnt = (xs: A11yIssue[], r: string) => xs.filter((x) => x.rule === r && x.sev !== "info").length;
  const head = `| 세션 | ${rules.map((r) => `${r} export`).join(" | ")} | ${rules.slice(0, 1).concat(["R20", "R22"] as never).map((r) => `${r} 라이브`).join(" | ")} |`;
  const lines = [head, `|---|${"---|".repeat(rules.length + 3)}`];
  for (const r of rows) lines.push(`| ${r.id} | ${rules.map((x) => cnt(r.export, x)).join(" | ")} | ${["R19", "R20", "R22"].map((x) => cnt(r.live, x)).join(" | ")} |`);
  lines.push(`| **합계** | ${rules.map((x) => rows.reduce((s, r) => s + cnt(r.export, x), 0)).join(" | ")} | ${["R19", "R20", "R22"].map((x) => rows.reduce((s, r) => s + cnt(r.live, x), 0)).join(" | ")} |`);
  return lines.join("\n");
}

if (/a11y-lint\.ts$/.test(process.argv[1] ?? "")) {
  const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
  void auditCorpus().then((rows) => {
    const out = arg("out", "review/448-verify/a11y-report.md");
    const detail = rows.flatMap((r) => [...r.export.map((i) => `- ${r.id} export ${i.rule} ${i.sev}: ${i.msg}`), ...r.live.map((i) => `- ${r.id} 라이브 ${i.rule} ${i.sev}: ${i.msg}`)]);
    const md = `# 접근성·구조·성능 린트 R19~R23 (448차)\n\n${tableOf(rows)}\n\n## 위반 상세(앞 60건)\n${detail.slice(0, 60).join("\n")}\n`;
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, md);
    if (arg("json", "")) fs.writeFileSync(arg("json", ""), JSON.stringify(rows));
    console.log(md.split("\n").slice(0, 32).join("\n"));
    const n = (rule: string) => rows.reduce((s, r) => s + r.export.filter((i) => i.rule === rule && i.sev !== "info").length + r.live.filter((i) => i.rule === rule && i.sev !== "info").length, 0);
    process.exit(n("R19") + n("R20") + n("R22") > 0 || n("R21") > 10 || n("R23") > 2 ? 1 : 0);
  });
}
