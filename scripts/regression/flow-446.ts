/**
 * 회귀 — 446차 4 후킹 흐름·밀도: ① "한눈에 보기" 칩 폴백(키워드 근거 없는 칩은 번호 배지, 근거 있는 칩·번호 없음(index 미지정)은 기존 아이콘, 말뭉치에서 체크 아이콘 ≤1),
 * ② 긴 평문(SEO 요약) 서식: 180자 초과만 문장 끝에서 줄바꿈(글자 불변)·CSS 서식(v4), ③ 넓은 폭 세로 여백 3단 스냅(모든 카테고리 py ≤16·pt ≤12·pb ≤16 클래스, --pz-pad-* 넓은 값 ≤64). 호출 0·서버 0.
 */
import { glanceIconSvg } from "../../lib/icons";
import { breakSentences, SEO_LONG_TEXT_CHARS } from "../../lib/detail-seo-text";
import { getCategoryRhythm } from "../../lib/design-tokens";
import { getRhythmTokens } from "../../lib/rhythm-tokens";
import React from "react";
import { applySectionDisplayBudget } from "../../lib/section-display-budget";
import { comparisonPolicyRemovesChart } from "../../lib/comparison-policy";
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { corpus, exportArgsOf, exportHtmlOf, readSession } from "../design-corpus";

export const name = "후킹 흐름·밀도 — 요약 칩 번호 폴백·긴 평문 서식·넓은 폭 여백 3단";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  // ① 아이콘 폴백
  const none = glanceIconSvg("그냥 평범한 문구", "#225544", "#2F9E8F", 2);
  if (!/data-pz-icon="num"/.test(none) || !/>3<\/text>/.test(none)) fails.push(`근거 없는 칩이 번호 배지(3)가 아님: ${none.slice(0, 160)}`);
  if (/data-pz-icon="num"/.test(glanceIconSvg("그냥 평범한 문구", "#225544", "#2F9E8F"))) fails.push("index 없이 번호 배지가 나옴");
  if (/data-pz-icon="num"/.test(glanceIconSvg("30mL 미니", "#225544", "#2F9E8F", 0))) fails.push("근거(용량) 있는 칩이 번호 배지로 바뀜");
  let withStrip = 0;
  for (const [id, file] of corpus()) {
    const html = exportHtmlOf(file);
    const i = html.indexOf("한눈에 보기</p>");
    if (i < 0) continue;
    withStrip += 1;
    const seg = html.slice(i, i + 6000);
    const checks = (seg.match(/data-pz-icon="check"/g) ?? []).length;
    if (checks > 1) fails.push(`${id}: 한눈에 보기 체크 아이콘 ${checks}개(≤1 기대)`);
  }
  // 라이브도 같은 번호 배지(같은 함수·같은 인덱스): export에 번호 배지가 있는 픽스처는 라이브에도 같은 개수
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { default: R } = await import("../../components/DetailSectionRenderer");
  let numbered = 0;
  for (const [id, file] of corpus({ only: ["fx-compare-beauty", "fx-tier-sparse-beauty-1p", "fx-tech-vacuum", "fx-food-snack"] })) {
    const nExp = (exportHtmlOf(file).match(/data-pz-icon="num"/g) ?? []).length;
    const a = exportArgsOf(readSession(file));
    const live = renderToStaticMarkup(React.createElement(R as never, { sections: applySectionDisplayBudget(a.category, a.sections ?? [], { chartRemoved: comparisonPolicyRemovesChart(a.claimFacts) }), imageUrls: a.imageUrls ?? [], category: a.category, theme: a.theme, productName: a.productName, brandName: a.brandName, stylePackId: a.stylePackId, imageHashByUrl: a.imageHashByUrl, imageOrigins: a.imageOrigins, imageRoles: a.imageRoles, imageTags: a.imageTags, hasSizeInfo: a.hasSizeInfo, claimFacts: a.claimFacts } as never));
    const nLive = (live.match(/data-pz-icon="num"/g) ?? []).length;
    numbered += nExp;
    if (nExp !== nLive) fails.push(`${id}: 번호 배지 export ${nExp} ≠ 라이브 ${nLive}`);
  }
  if (!numbered) fails.push("번호 배지가 말뭉치 4종 어디에도 안 나옴(검사 대상 0)");
  if (withStrip < 10) fails.push(`한눈에 보기가 있는 말뭉치 ${withStrip}개뿐`);

  // ② 긴 평문
  const short = "짧은 문장입니다. 두 번째 문장입니다.";
  if (breakSentences(short).includes("<br>")) fails.push("180자 이하에 줄바꿈이 들어감");
  const long = Array.from({ length: 12 }, (_, k) => `이것은 길게 이어지는 설명 문장 번호 ${k + 1} 입니다.`).join(" ");
  if ([...long].length <= SEO_LONG_TEXT_CHARS) fails.push("테스트 입력이 180자 이하");
  const broken = breakSentences(long);
  if ((broken.match(/<br>/g) ?? []).length !== 11) fails.push(`문장 줄바꿈 ${(broken.match(/<br>/g) ?? []).length}개(11 기대)`);
  if (broken.replace(/<br>/g, " ") !== long) fails.push("줄바꿈 외에 글자가 바뀜");
  const any = corpus().map(([, f]) => exportHtmlOf(f)).find((h) => h.includes("pagzly-seo-text"));
  if (!any || !any.includes(".pagzly-seo-text h2{margin:20px 0 8px;font-size:12px")) fails.push("v4 평문 블록 CSS가 없음");

  // ③ 넓은 폭 여백
  for (const cat of ["화장품/뷰티", "의류/패션", "전자제품", "식품/건강기능식품", "생활용품", "반려동물"]) {
    const r = getCategoryRhythm(cat);
    for (const [label, cls] of [["generous", r.generousPadClass], ["trust", r.trustPadClass], ["cta", r.ctaPadClass], ["point", r.pointTextPadClass], ["gallery", r.galleryTitlePadClass]] as const) {
      for (const m of cls.matchAll(/@min-\[640px\]\/pz:(py|pt|pb)-(\d+)/g)) {
        const px = Number(m[2]) * 4;
        if (![0, 32, 48, 64].includes(px) && !(label === "gallery" && m[1] === "pb" && px === 32)) fails.push(`${cat}/${label}: 넓은 폭 ${m[1]}-${m[2]}(${px}px)가 3단 밖`);
      }
    }
    const w = getRhythmTokens(cat, true);
    for (const [k, v] of Object.entries({ padY: w.padY, padTy: w.padTy, padCy: w.padCy })) if (v > 64) fails.push(`${cat}: 넓은 폭 ${k}=${v} > 64`);
  }
  // ④ 446차 5 — 사진 위 STEP 칩: export·라이브 모두 12px·자간 label 토큰, 폰트 쌍 자간 규칙이 export STEP 태그에도
  {
    const [, file] = corpus({ only: ["fx-tier-rich-tech-6p"] })[0]!;
    const a1 = exportArgsOf(readSession(file));
    const only = (a1.sections ?? []).find((x) => x.type === "step_card");
    if (!only) fails.push("fx-tier-rich-tech-6p에 step_card가 없음(npx tsx scripts/gen-fixture-steps.ts)");
    const exp = buildDetailPageHtml({ ...a1, sections: only ? [only] : [] } as never);
    const chip = /<span style="position:absolute;left:\d+px;top:\d+px;background:[^"]*">STEP 01<\/span>/.exec(exp)?.[0] ?? "";
    if (!/font-size:12px/.test(chip) || !/letter-spacing:0\.14em/.test(chip)) fails.push(`export 사진 위 STEP 칩이 토큰(12px·0.14em)이 아님: ${chip.slice(0, 200)}`);
    const a2 = exportArgsOf(readSession(file));
    const live = renderToStaticMarkup(React.createElement(R as never, { sections: only ? [only] : [], imageUrls: a2.imageUrls ?? [], category: a2.category, theme: a2.theme, productName: a2.productName, brandName: a2.brandName, stylePackId: a2.stylePackId, imageHashByUrl: a2.imageHashByUrl, imageOrigins: a2.imageOrigins, imageRoles: a2.imageRoles, imageTags: a2.imageTags, hasSizeInfo: a2.hasSizeInfo, claimFacts: a2.claimFacts } as never));
    const lc = /<span class="absolute rounded-full[^"]*"[^>]*>STEP 01<\/span>/.exec(live)?.[0] ?? "";
    if (!/font-size:12px/.test(lc) || !/letter-spacing:0\.14em/.test(lc)) fails.push(`라이브 사진 위 STEP 칩이 토큰이 아님: ${lc.slice(-200)}`);
  }
  const anyDoc = corpus().map(([, f]) => exportHtmlOf(f)).find((h) => h.includes(".font-mono{letter-spacing:"));
  if (!anyDoc || !/\.pagzly-step-tag\{letter-spacing:[^}]*!important\}/.test(anyDoc)) fails.push("export에 STEP 태그 자간 규칙이 없음(폰트 쌍)");
  return fails;
}
