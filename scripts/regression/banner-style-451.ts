/**
 * 회귀 — 451차 3 BANNER_STYLE 3값. ① 기본값은 full-scrim(바뀌지 않음) ② 3값 모두 배너 글자 대비 ≥4.5(합성 사진 5종 부분집합, 전체 17종은 scripts/banner-style-measure.ts)
 * ③ 라이브·export가 같은 값에서 같은 제목·본문 글자와 같은 구조 표지(card-only: 스크림 없음, split: 띠 면)를 낸다.
 */
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import R from "../../components/DetailSectionRenderer";
import { BANNER_SPLIT_BAND_BG, BANNER_STYLE, setBannerStyleForTests } from "../../lib/design-tokens-v4";
import { comparisonPolicyRemovesChart } from "../../lib/comparison-policy";
import { applySectionDisplayBudget } from "../../lib/section-display-budget";
import { corpus, exportArgsOf, exportHtmlOf } from "../design-corpus";
import { STYLES, bannerOnly, run as measure } from "../banner-style-measure";

export const name = "배너 3안 스위치 — 기본 full-scrim·3값 대비 ≥4.5·라이브/export 글자·구조 패리티";

const text = (h: string): string => h.replace(/<style[\s\S]*?<\/style>|<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  if (BANNER_STYLE !== "full-scrim") fails.push(`기본값이 full-scrim이 아님: ${BANNER_STYLE}`);
  const rows = await measure(["portrait-45", "sky-ground", "very-dark", "noise-shelf", "cutout-white"]);
  for (const r of rows) if (r.worst !== null && r.worst < 4.5) fails.push(`${r.style}/${r.photo} 대비 ${r.worst.toFixed(2)} < 4.5`);
  const file = corpus({ only: ["fx-food-snack"] })[0]![1];
  const a: any = exportArgsOf(JSON.parse(fs.readFileSync(file, "utf8")));
  const banner = (a.sections as Array<{ type: string; heading?: string; body?: string }>).find((s) => s.type === "illustration_banner");
  if (!banner) return [...fails, "fx-food-snack에 배너가 없음"];
  try {
    for (const style of STYLES) {
      setBannerStyleForTests(style);
      const ex = bannerOnly(exportHtmlOf(file));
      const live = renderToStaticMarkup(React.createElement(R as never, { sections: applySectionDisplayBudget(a.category, [banner], { chartRemoved: comparisonPolicyRemovesChart(a.claimFacts) }), imageUrls: a.imageUrls ?? [], category: a.category, theme: a.theme, productName: a.productName, brandName: a.brandName, stylePackId: a.stylePackId, claimFacts: a.claimFacts } as never));
      for (const t of [banner.heading, banner.body]) if (t && (!text(ex).includes(t) || !text(live).includes(t))) fails.push(`${style}: 글자 «${t.slice(0, 10)}»가 한쪽에 없음`);
      const exScrim = /position:absolute;inset:0;background:linear-gradient/.test(ex);
      const lvScrim = /class="absolute inset-0" style="background:[^"]*linear-gradient/.test(live);
      if (style === "full-scrim" && !(exScrim && lvScrim)) fails.push(`full-scrim: 전면 스크림이 없음(export ${exScrim}·라이브 ${lvScrim})`);
      if (style !== "full-scrim" && (exScrim || lvScrim)) fails.push(`${style}: 전면 스크림이 남음(export ${exScrim}·라이브 ${lvScrim})`);
      const band = BANNER_SPLIT_BAND_BG.replace("rgba(27,27,24,", "").replace(")", "");
      if (style === "split" && !(ex.includes(BANNER_SPLIT_BAND_BG) && live.includes(band))) fails.push("split: 제목 띠 면이 라이브·export 중 한쪽에 없음");
      if (style !== "split" && ex.includes(BANNER_SPLIT_BAND_BG)) fails.push(`${style}: split 띠가 섞임`);
    }
  } finally {
    setBannerStyleForTests(BANNER_STYLE);
  }
  return fails;
}
