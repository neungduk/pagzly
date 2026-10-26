/**
 * 448차 2-2 — 퍼징 세션 검사. 각 사례를 export로(+샘플은 라이브로) 렌더하고 360·390·750폭에서 확인한다:
 * 예외 · 빈 화면 · undefined/NaN/[object Object] 노출 · 가로 넘침 · 잘린 글자 · 빈 섹션 껍데기 · 린트 error(R6·R7·R9·R10 등) · 렌더 시간.
 *   npx tsx scripts/fuzz-check.ts [--n=200] [--live=30] [--widths=360,390,750] [--out=review/448-verify/fuzz-report.md] [--json=경로] [--only=fz003,fz010]
 * 무료·서버 불필요(export는 eye-lib의 Playwright route, 라이브는 renderToStaticMarkup).
 */
import fs from "node:fs";
import path from "node:path";
import React from "react";
import type { Browser } from "playwright";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { applyDisplayRules } from "../lib/display-sections";
import { applySectionDisplayBudget } from "../lib/section-display-budget";
import { comparisonPolicyRemovesChart } from "../lib/comparison-policy";
import { exportArgsOf } from "./design-corpus";
import { lintPage } from "./design-lint";
import { launch, openHtml } from "./eye-lib";
import { fuzzCases, type FuzzCase } from "./fuzz-sessions";

export type Violation = { kind: string; id: string; detail: string };
export const KINDS = ["예외", "빈 화면", "undefined 노출", "가로 넘침", "잘린 글자", "빈 섹션 껍데기", "린트 error", "렌더 느림"] as const;

const BAD = /undefined|\bNaN\b|\[object Object\]/;
const visibleText = (html: string): string => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<head[\s\S]*?<\/head>/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#\d+;/g, " ");

/** 페이지 안 검사: 가로 넘침·잘린 글자·빈 섹션 껍데기·본문 길이 */
const DOM_CHECK = `(() => {
  const root = document.querySelector('.pagzly-wrap') || document.body;
  const over = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  const clipped = [];
  for (const e of root.querySelectorAll('*')) {
    const cs = getComputedStyle(e);
    if ((cs.overflowX === 'hidden' || cs.overflow === 'hidden') && e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0 && (e.textContent || '').trim().length > 0 && cs.textOverflow !== 'ellipsis' && cs.display !== '-webkit-box' && (cs.webkitLineClamp === 'none' || !cs.webkitLineClamp) && !/^(IMG|SVG|PICTURE|VIDEO)$/i.test(e.tagName)) {
      const t = (e.textContent || '').trim();
      const hasMedia = e.querySelector('img,svg,video');
      if (t.length > 1 && !hasMedia && !e.closest('[aria-hidden="true"]') && cs.position !== 'absolute') clipped.push(t.slice(0, 20));
    }
  }
  const empties = [];
  const secs = [...root.children].filter((c) => c.tagName === 'SECTION');
  for (const s of secs) {
    const t = (s.textContent || '').trim();
    const media = s.querySelector('img,svg,video,[style*="background-image"]');
    const heads = s.querySelectorAll('h1,h2,h3');
    const headText = [...heads].map((h) => (h.textContent || '').trim()).join('');
    if (!t && !media) empties.push('내용 0');
    else if (heads.length && !media && !s.hasAttribute('data-info') && t.replace(/\\s/g, '') === headText.replace(/\\s/g, '') && s.getBoundingClientRect().height > 60 && !s.hasAttribute('data-hero-v2') && !s.closest('[data-pz-impact]')) empties.push('제목만:' + headText.slice(0, 16));
  }
  return { over, clipped: clipped.slice(0, 5), empties, textLen: (document.body.innerText || '').trim().length };
})()`;

export async function checkCase(browser: Browser, c: FuzzCase, widths: number[], live: boolean): Promise<Violation[]> {
  const v: Violation[] = [];
  const add = (kind: string, detail: string) => v.push({ kind, id: c.id, detail });
  let html = "";
  let args: ReturnType<typeof exportArgsOf>;
  const t0 = Date.now();
  try {
    args = exportArgsOf(c.session);
    html = buildDetailPageHtml(args);
  } catch (e) {
    add("예외", `export: ${e instanceof Error ? e.message.slice(0, 100) : String(e)}`);
    return v;
  }
  const ms = Date.now() - t0;
  if (ms > 3000) add("렌더 느림", `${ms}ms`);
  const txt = visibleText(html);
  const bad = BAD.exec(txt);
  if (bad) add("undefined 노출", `export «${txt.slice(Math.max(0, bad.index - 20), bad.index + 24).replace(/\s+/g, " ")}»`);
  try {
    const display = applyDisplayRules(applySectionDisplayBudget(args.category, args.sections, { chartRemoved: comparisonPolicyRemovesChart(args.claimFacts) }), args.imageUrls, { imageHashByUrl: args.imageHashByUrl, roles: args.imageRoles, origins: args.imageOrigins, category: args.category, tags: args.imageTags, hasSizeInfo: args.hasSizeInfo, claimFacts: args.claimFacts, brandName: args.brandName });
    const lint = lintPage(c.id, html, display.sections ?? (display as never));
    for (const i of lint.issues.filter((x) => x.sev === "error")) add("린트 error", `${i.rule} ${i.msg}`.slice(0, 120));
  } catch (e) {
    add("예외", `lint/display: ${e instanceof Error ? e.message.slice(0, 100) : String(e)}`);
  }
  for (const W of widths) {
    try {
      const ex = await openHtml(browser, html, W);
      const r = (await ex.page.evaluate(DOM_CHECK)) as { over: number; clipped: string[]; empties: string[]; textLen: number };
      await ex.close();
      if (r.textLen < 20) add("빈 화면", `${W}px 글 ${r.textLen}자`);
      if (r.over > 0) add("가로 넘침", `${W}px +${r.over}`);
      if (r.clipped.length) add("잘린 글자", `${W}px «${r.clipped.join("», «")}»`);
      for (const e of r.empties) add("빈 섹션 껍데기", `${W}px ${e}`);
    } catch (e) {
      add("예외", `브라우저 ${W}px: ${e instanceof Error ? e.message.slice(0, 80) : String(e)}`);
    }
  }
  if (live) {
    try {
      const { renderToStaticMarkup } = await import("react-dom/server");
      const { default: R } = await import("../components/DetailSectionRenderer");
      const a = args;
      const out = renderToStaticMarkup(React.createElement(R as never, { sections: applySectionDisplayBudget(a.category, a.sections ?? [], { chartRemoved: comparisonPolicyRemovesChart(a.claimFacts) }), imageUrls: a.imageUrls ?? [], category: a.category, theme: a.theme, productName: a.productName, brandName: a.brandName, logoUrl: a.logoUrl, ingredients: a.ingredients, keyFeatures: a.keyFeatures, certifications: a.certifications, stylePackId: a.stylePackId, infoBackdrops: a.infoBackdrops, imageHashByUrl: a.imageHashByUrl, imageOrigins: a.imageOrigins, imageRoles: a.imageRoles, imageTags: a.imageTags, sceneImages: a.sceneImages, hasSizeInfo: a.hasSizeInfo, claimFacts: a.claimFacts } as never));
      const lt = visibleText(out);
      const lb = BAD.exec(lt);
      if (lb) add("undefined 노출", `라이브 «${lt.slice(Math.max(0, lb.index - 20), lb.index + 24).replace(/\s+/g, " ")}»`);
    } catch (e) {
      add("예외", `라이브: ${e instanceof Error ? e.message.slice(0, 100) : String(e)}`);
    }
  }
  return v;
}

export async function runFuzz(opts: { n: number; live: number; widths: number[]; only?: string[]; subset?: number }): Promise<{ cases: FuzzCase[]; violations: Violation[] }> {
  const all = fuzzCases(opts.n);
  const cases = opts.only?.length ? all.filter((c) => opts.only!.some((o) => c.id.startsWith(o))) : opts.subset ? all.slice(0, opts.subset) : all;
  const browser = await launch();
  const violations: Violation[] = [];
  const step = opts.live > 0 ? Math.max(1, Math.floor(cases.length / opts.live)) : Infinity;
  for (let i = 0; i < cases.length; i += 1) violations.push(...(await checkCase(browser, cases[i]!, opts.widths, i % step === 0 && Math.floor(i / step) < opts.live)));
  await browser.close();
  return { cases, violations };
}

/**
 * 457차 2 — 제외 입력: 제품명이 공백뿐인 사례. 앱 화면은 제품명이 비면 막고(`CreateProductForm` 「제품명을 입력」 검사, 전송도 `productName.trim()`) 저장 세션에 비어 있는 제품명이 들어갈 수 없다.
 * 그래서 이 입력에서만 나오는 린트 R10 「히어로 제품명 없음」은 정상 결과로 보고 error 판정에서 뺀다(가로 넘침 제품명 공백 제외와 같은 처리). 다른 error는 그대로 센다.
 */
export const isBlankNameCase = (c: FuzzCase): boolean => c.ops.includes("제품명 공백");
export const isExcludedViolation = (c: FuzzCase | undefined, v: Violation): boolean => Boolean(c && isBlankNameCase(c) && v.kind === "린트 error" && /R10/.test(v.detail));

export function report(cases: FuzzCase[], vs: Violation[]): string {
  const lines = ["# 퍼징 보고 (448차)", "", `사례 ${cases.length}개(시드 448 고정) · 위반 ${vs.length}건 · 위반 사례 ${new Set(vs.map((x) => x.id)).size}개`, "", "| 종류 | 건수 | 사례 수 |", "|---|---|---|"];
  for (const k of KINDS) { const xs = vs.filter((x) => x.kind === k); lines.push(`| ${k} | ${xs.length} | ${new Set(xs.map((x) => x.id)).size} |`); }
  lines.push("", "## 종류별 대표 재현(최대 3개)");
  for (const k of KINDS) {
    const xs = vs.filter((x) => x.kind === k);
    if (!xs.length) continue;
    lines.push(`### ${k}`);
    const seen = new Set<string>();
    for (const x of xs) { if (seen.size >= 3) break; if (seen.has(x.id)) continue; seen.add(x.id); const c = cases.find((q) => q.id === x.id)!; lines.push(`- \`${x.id}\` (${c.ops.join(" + ")}): ${x.detail}`); }
  }
  return lines.join("\n") + "\n";
}

if (/fuzz-check\.ts$/.test(process.argv[1] ?? "")) {
  const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
  const out = arg("out", "review/448-verify/fuzz-report.md");
  void runFuzz({ n: Number(arg("n", "200")), live: Number(arg("live", "30")), widths: arg("widths", "320,360,390,750").split(",").map(Number), only: arg("only", "").split(",").filter(Boolean) }).then(({ cases, violations }) => {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const md = report(cases, violations);
    fs.writeFileSync(out, md);
    if (arg("json", "")) fs.writeFileSync(arg("json", ""), JSON.stringify(violations));
    console.log(md.split("\n").slice(0, 16).join("\n"));
    const byId = new Map(cases.map((c) => [c.id, c]));
    const excluded = violations.filter((v) => isExcludedViolation(byId.get(v.id), v));
    if (excluded.length) console.log(`제외(제품명 공백 R10): ${excluded.length}건 — ${[...new Set(excluded.map((v) => v.id))].join(", ")}`);
    process.exit(violations.some((v) => v.kind !== "렌더 느림" && !isExcludedViolation(byId.get(v.id), v)) ? 1 : 0);
  });
}
