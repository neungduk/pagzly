/**
 * 447차 1 — 저장 세션(실사진·실데이터) 검증. pc-verify 6단계. 찾은 세션마다:
 *  ① 섹션 수 패리티(근사): 표시 계획의 섹션 수 = 라이브 렌더의 data-section-index 수, export 최상위 섹션 수가 계획 ±2 이내(info 분리·구매 띠)
 *  ② 428 DOM 지표(큰 글줄/화면·명암 반전·gapBig·R17) ③ 750폭 가로 넘침 0 ④ 린트(점수·R7·R16·R17·R18)
 *   npx tsx scripts/pc-verify-sessions.ts [--out=review/pc-verify-날짜] [--offline]
 * 사진은 PC의 실제 주소를 그대로 불러온다(--offline이면 외부 요청 차단). 값(키·토큰)은 읽지도 출력하지도 않는다. 불합격이 있으면 종료 코드 1.
 */
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { chromium } from "playwright";
import { findSessions } from "./pc-sessions-find";

const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const OUT = arg("out", "review/pc-verify");
const OFFLINE = process.argv.includes("--offline");

async function main() {
  const sessions = findSessions();
  if (!sessions.length) { console.log("저장 세션 없음 — review/*-live/**/session.json 또는 review/pexels-*/session.json을 두면 자동 탐색한다"); process.exit(0); }
  const { exportArgsOf, exportHtmlOf, displayOf, readSession } = await import("./design-corpus");
  const { lintPage } = await import("./design-lint");
  const { measureDomPages } = await import("./design-metrics-dom");
  const { measureFaces, budgetOf } = await import("./color-budget");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { default: R } = await import("../components/DetailSectionRenderer");
  const { applySectionDisplayBudget } = await import("../lib/section-display-budget");
  const { comparisonPolicyRemovesChart } = await import("../lib/comparison-policy");

  const pages = sessions.map(([id, f]) => ({ id, file: f, html: exportHtmlOf(f), display: displayOf(f).sections }));
  const dom = await measureDomPages(pages.map((p) => [p.id, p.html]));
  const faces = await measureFaces(pages.map((p) => [p.id, p.html]));
  const browser = await chromium.launch();
  const rows: string[] = ["| 세션 | 섹션 수 패리티 | 큰글줄/화면 | 반전 | gapBig | 750 넘침 | 린트 | R7 | R16 | R17 | R18 | 판정 |", "|---|---|---|---|---|---|---|---|---|---|---|---|"];
  let bad = 0;
  for (const p of pages) {
    const a = exportArgsOf(readSession(p.file));
    const live = renderToStaticMarkup(React.createElement(R as never, { sections: applySectionDisplayBudget(a.category, a.sections ?? [], { chartRemoved: comparisonPolicyRemovesChart(a.claimFacts) }), imageUrls: a.imageUrls ?? [], category: a.category, theme: a.theme, productName: a.productName, brandName: a.brandName, logoUrl: a.logoUrl, ingredients: a.ingredients, keyFeatures: a.keyFeatures, certifications: a.certifications, stylePackId: a.stylePackId, infoBackdrops: a.infoBackdrops, imageHashByUrl: a.imageHashByUrl, imageOrigins: a.imageOrigins, imageRoles: a.imageRoles, imageTags: a.imageTags, sceneImages: a.sceneImages, hasSizeInfo: a.hasSizeInfo, claimFacts: a.claimFacts } as never));
    const nLive = (live.match(/data-section-index="/g) ?? []).length;
    const nExp = (p.html.match(/<section[\s>]/g) ?? []).length;
    const parity = nLive >= p.display.length - 1 && nLive <= p.display.length && Math.abs(nExp - p.display.length) <= 2;
    const { openHtml } = await import("./eye-lib");
    const ex = await openHtml(browser, p.html, 750, undefined, !OFFLINE);
    const overflow = (await ex.page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")) as number;
    await ex.close();
    const d = dom.get(p.id);
    const f = faces.get(p.id);
    const cb = f ? budgetOf(f.faces) : null;
    const lint = lintPage(p.id, p.html, p.display, d ? { ...d, ...(cb ? { colorGroups: cb.groups, colorGroupHues: cb.groupHues } : {}) } : undefined);
    const n = (r: string) => lint.issues.filter((i) => i.rule === r).length;
    const hard = n("R7") + n("R16") + n("R9") + n("R13");
    const ok = parity && overflow <= 0 && hard === 0;
    if (!ok) bad += 1;
    rows.push(`| ${p.id} | ${parity ? "일치" : `**불일치**(계획 ${p.display.length}·라이브 ${nLive}·export ${nExp})`} | ${d?.bigPerScreen.toFixed(2) ?? "-"} | ${d?.flips ?? "-"} | ${d?.gapBig ?? "-"} | ${overflow <= 0 ? "0" : `**${overflow}px**`} | ${lint.score} | ${n("R7")} | ${n("R16")} | ${n("R17")} | ${n("R18")} | ${ok ? "합격" : "**불합격**"} |`);
  }
  await browser.close();
  fs.mkdirSync(OUT, { recursive: true });
  const md = `# 저장 세션 검증\n\n${rows.join("\n")}\n\n판정: 섹션 수 패리티 일치 + 750폭 가로 넘침 0 + 린트 R7·R16·R9·R13 위반 0. 428 지표(큰 글줄 ≤1.5·반전 ≤6)와 R17·R18은 참고(경고).\n`;
  fs.writeFileSync(path.join(OUT, "sessions.md"), md);
  console.log(md);
  process.exit(bad ? 1 : 0);
}
void main();
