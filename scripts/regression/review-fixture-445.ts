/**
 * 회귀 — 445차 5: 합성 픽스처의 review_highlight. ① 후기 입력 ≥5건, 칭찬·아쉬운 점 문장은 후기 파일(판매자 제공)의 문장 그대로(새 문구 없음), 제목은 서버 함수의 고정 문구,
 * ② scripts/gen-fixture-reviews.ts와 일치(픽스처가 생성기 결과와 같음), ③ 표시 계획을 통과해 export·라이브 둘 다 모든 문장을 그린다, ④ 라이브 후기 카드 반경이 토큰(16 = rounded-2xl)을 읽는다. 호출 0·서버 0.
 */
import fs from "node:fs";
import React from "react";
import { extractLinesFromTxt } from "../../lib/review-insights";
import { buildReviewHighlightSection } from "../../lib/section-inserts";
import { applySectionDisplayBudget } from "../../lib/section-display-budget";
import { comparisonPolicyRemovesChart } from "../../lib/comparison-policy";
import type { ReviewHighlightSection } from "../../lib/types/generate";
import { corpus, displayOf, exportArgsOf, exportHtmlOf, readSession } from "../design-corpus";
import { REVIEW_FILE, REVIEW_FIXTURES, reviewParts } from "../gen-fixture-reviews";

export const name = "review_highlight 픽스처 — 후기 5건 이상·판매자 문장 그대로·생성기 일치·export/라이브 렌더·카드 반경 토큰";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const lines = extractLinesFromTxt(fs.readFileSync(REVIEW_FILE));
  if (lines.length < 5) fails.push(`후기 파일 ${lines.length}건(≥5 필요)`);
  const fixedHeading = buildReviewHighlightSection(["x"]).heading;
  const parts = reviewParts();
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { default: R } = await import("../../components/DetailSectionRenderer");

  for (const fx of REVIEW_FIXTURES) {
    const entry = corpus().find(([id]) => id === `fx-${fx.replace("archetype-", "")}`);
    if (!entry) { fails.push(`${fx}: 말뭉치에 없음`); continue; }
    const s = readSession(entry[1]);
    const rh = (s.generated?.sections ?? []).find((x: { type: string }) => x.type === "review_highlight") as ReviewHighlightSection | undefined;
    if (!rh) { fails.push(`${fx}: review_highlight 없음`); continue; }
    if ((rh.sourceReviewCount ?? 0) < 5) fails.push(`${fx}: sourceReviewCount ${rh.sourceReviewCount} < 5`);
    if (rh.heading !== fixedHeading) fails.push(`${fx}: 제목이 서버 고정 문구가 아님 «${rh.heading}»`);
    for (const t of [...rh.praises, ...(rh.concerns ?? [])]) if (!lines.some((l) => l.includes(t))) fails.push(`${fx}: «${t}»가 후기 파일 문장이 아님`);
    if (JSON.stringify(rh.praises) !== JSON.stringify(parts.praises) || JSON.stringify(rh.concerns) !== JSON.stringify(parts.concerns)) fails.push(`${fx}: 생성기 결과와 다름(npx tsx scripts/gen-fixture-reviews.ts)`);

    if (!displayOf(entry[1]).sections.some((x) => x.type === "review_highlight")) fails.push(`${fx}: 표시 계획에서 빠짐`);
    const exp = exportHtmlOf(entry[1]);
    const a = exportArgsOf(s);
    const budgeted = applySectionDisplayBudget(a.category, a.sections ?? [], { chartRemoved: comparisonPolicyRemovesChart(a.claimFacts) });
    const live = renderToStaticMarkup(
      React.createElement(R as never, { sections: budgeted, imageUrls: a.imageUrls ?? [], category: a.category, theme: a.theme, productName: a.productName, brandName: a.brandName, stylePackId: a.stylePackId, imageHashByUrl: a.imageHashByUrl, imageOrigins: a.imageOrigins, imageRoles: a.imageRoles, imageTags: a.imageTags, hasSizeInfo: a.hasSizeInfo, claimFacts: a.claimFacts } as never),
    );
    // 키워드 강조로 문장이 <strong>으로 쪼개지므로 태그를 떼고 비교
    const plain = (h: string) => h.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ");
    for (const [tag, h] of [["export", exp], ["라이브", live]] as const) {
      const text = plain(h);
      for (const t of [...rh.praises, ...(rh.concerns ?? [])]) if (!text.includes(t)) fails.push(`${fx}: ${tag}에 «${t}»가 없음`);
      if (!text.includes(fixedHeading)) fails.push(`${fx}: ${tag}에 제목이 없음`);
    }
    // 라이브 후기 카드: 토큰 반경(16 = rounded-2xl). 카드는 data-testid="review-card"
    const cards = [...live.matchAll(/<li[^>]*data-testid="review-card"[^>]*>/g)].map((m) => m[0]);
    if (cards.length !== rh.praises.length) fails.push(`${fx}: 라이브 후기 카드 ${cards.length}장 ≠ 칭찬 ${rh.praises.length}`);
    if (cards.some((c) => !/class="[^"]*rounded-2xl/.test(c))) fails.push(`${fx}: 라이브 후기 카드가 반경 토큰(rounded-2xl)을 안 읽음`);
    // 후기 캡션(v4): 글자 12px 이상·잉크 알파 0.65(면 위 4.5:1), opacity 줄이기 없음 — export 인라인과 라이브 인라인 모두
    const caps = [...exp.matchAll(/<p class="pagzly-rv-cap" style="([^"]*)"/g)].map((m) => m[1]!);
    if (!caps.length) fails.push(`${fx}: export 후기 캡션이 없음`);
    for (const c of caps) {
      if (!/font-size:12px/.test(c)) fails.push(`${fx}: export 후기 캡션 글자 12px 미만 «${c}»`);
      if (!/color:rgba\(27,27,24,0\.65\)/.test(c)) fails.push(`${fx}: export 후기 캡션 잉크 알파 0.65 아님 «${c}»`);
      if (/opacity:\.4/.test(c)) fails.push(`${fx}: export 후기 캡션에 opacity .4가 남음`);
    }
    const lc = /<p[^>]*data-testid="review-highlight-count"[^>]*>/.exec(live)?.[0] ?? "";
    if (!/font-size:12px/.test(lc) || !/rgba\(27, ?27, ?24, ?0\.65\)/.test(lc)) fails.push(`${fx}: 라이브 후기 건수 캡션이 토큰(12px·알파 0.65)을 안 읽음 «${lc.slice(0, 160)}»`);
  }
  return fails;
}
