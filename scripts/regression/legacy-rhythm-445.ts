/**
 * 회귀 — 445차 3 이전(비임팩트) 섹션 리듬 확장(lib/rhythm-v4.ts): ① 섹션 타입 → 면·여백 표(LEGACY_SECTION_V4)와 면 키(A·D 흰 면 / B·E 색 면 / boldBlock 어두운 면 / 자기 면 / 표 밖 null),
 * ② legacyTopPads 순수 불변식(면이 다르면 항목 없음, 같은 면이고 앞 아래 + 뒤 위 > 96이면 항목 있음·값 32/48·합 96 이하 또는 최소 단, 위 여백이 늘지 않음),
 * ③ 말뭉치: 계획 topPads가 만든 표식(data-pz-top)이 export·라이브에 같은 개수·같은 값으로 나오고 CSS 한 줄이 같은 값을 쓴다, ④ export DOM에서 표식 달린 섹션의 위 여백이 표식 값. 호출 0·서버 0.
 */
import React from "react";
import { LEGACY_SECTION_V4, faceKeysFor, legacyFaceKey, legacyTopPads, resolveTopPad, topPadCssV4 } from "../../lib/rhythm-v4";
import { faceKeyOf } from "../../lib/layout-variants";
import { getRhythmTokens } from "../../lib/rhythm-tokens";
import { getSectionPattern } from "../../lib/design-tokens";
import { SPACE_V4 } from "../../lib/design-tokens-v4";
import type { DetailSection } from "../../lib/types/generate";
import { applySectionDisplayBudget } from "../../lib/section-display-budget";
import { comparisonPolicyRemovesChart } from "../../lib/comparison-policy";
import { corpus, displayOf, exportArgsOf, exportHtmlOf, readSession } from "../design-corpus";
import { launch, openHtml } from "../eye-lib";

export const name = "이전 섹션 리듬 — 타입→면·여백 표·면 키·topPads 불변식·라이브/export 같은 표식과 위 여백";

const CATEGORIES = ["의류/패션", "화장품/뷰티", "전자제품", "식품", "생활용품"];
const sec = (type: string, extra: Record<string, unknown> = {}): DetailSection => ({ type, slot: type, ...extra }) as unknown as DetailSection;
const HERO = sec("hero", { headline: "h", subheadline: "s", imageIndex: 0 });
const count = (s: string, sub: string) => s.split(sub).length - 1;

export async function run(): Promise<string[]> {
  const fails: string[] = [];

  // ① 표와 면 키
  const types = Object.keys(LEGACY_SECTION_V4);
  for (const t of types) {
    const r = LEGACY_SECTION_V4[t]!;
    for (const v of [r.top, r.bottom]) if (!(typeof v === "number" ? [0, ...Object.values(SPACE_V4)].includes(v as never) : ["y", "ty", "cy"].includes(v))) fails.push(`${t}: 여백 출처 ${v} 이상`);
  }
  for (const t of ["hero", "image_text", "illustration_banner", "tradeoff_card", "impact"]) if (legacyFaceKey(sec(t), 3) !== null) fails.push(`${t}: 표 밖 타입은 면 키 null이어야 함`);
  if (legacyFaceKey(sec("cta_price"), 4) !== "own:cta_price") fails.push("구매 섹션은 자기 면");
  for (let b = 0; b < 8; b += 1) {
    const p = getSectionPattern(b, "faq");
    const want = p === "A" || p === "D" ? "white" : "tint:legacy";
    if (legacyFaceKey(sec("faq"), b) !== want) fails.push(`faq 본문 ${b}번: 면 키 ${legacyFaceKey(sec("faq"), b)} ≠ ${want}`);
    if (legacyFaceKey(sec("checklist", { boldBlock: true }), b) !== `ink:${b}`) fails.push("boldBlock은 어두운 면(이웃과 같은 면 아님)");
  }
  const keys = faceKeysFor([HERO, sec("faq"), sec("spec_table")], faceKeyOf);
  if (keys(HERO) !== null) fails.push("히어로는 면 키 null");

  // ② 순수 불변식: 모든 (앞, 뒤) 타입 쌍 × 본문 시작 순번 × 카테고리
  const surfaceTypes = types.filter((t) => LEGACY_SECTION_V4[t]!.face === "surface");
  let pairsSame = 0, pairsDiff = 0, tightened = 0;
  for (const category of CATEGORIES) {
    const tk = getRhythmTokens(category, false);
    const px = (v: string | number) => (typeof v === "number" ? v : v === "y" ? tk.padY : v === "ty" ? tk.padTy : tk.padCy);
    for (const a of surfaceTypes) for (const b of types) for (let start = 0; start < 4; start += 1) {
      const secs = [HERO, ...Array.from({ length: start }, () => sec("image_text")), sec(a), sec(b)];
      const key = faceKeysFor(secs, faceKeyOf);
      const pads = legacyTopPads(secs, key, category);
      const i = secs.length - 1;
      const same = key(secs[i - 1]) !== null && key(secs[i - 1]) === key(secs[i]);
      const top = px(LEGACY_SECTION_V4[b]!.top);
      const gap = px(LEGACY_SECTION_V4[a]!.bottom) + top;
      const got = pads[i];
      if (!same) {
        pairsDiff += 1;
        if (got !== undefined) fails.push(`${category} ${a}→${b}@${start}: 면이 다른데 줄임 ${got}`);
        continue;
      }
      pairsSame += 1;
      if (got === undefined) {
        if (top > SPACE_V4.sm && gap > 96) fails.push(`${category} ${a}→${b}@${start}: 같은 면 간격 ${gap} > 96인데 줄이지 않음`);
        continue;
      }
      tightened += 1;
      if (![SPACE_V4.sm, SPACE_V4.md].includes(got as never)) fails.push(`${category} ${a}→${b}@${start}: 값 ${got}이 32·48이 아님`);
      if (got >= top) fails.push(`${category} ${a}→${b}@${start}: 위 여백이 안 줄어듦 ${top} → ${got}`);
      if (got !== resolveTopPad(px(LEGACY_SECTION_V4[a]!.bottom), top, true)) fails.push(`${category} ${a}→${b}@${start}: resolveTopPad와 다름`);
    }
  }
  if (!pairsSame || !pairsDiff || !tightened) fails.push(`불변식 표본 부족(같은 면 ${pairsSame}, 다른 면 ${pairsDiff}, 줄임 ${tightened})`);
  // 앞이 임팩트(최악 64 가정)·히어로 바로 뒤는 처리
  {
    const imp = { type: "impact", slot: "impact", kind: "note" } as unknown as DetailSection;
    const secs = [HERO, imp, sec("faq")]; // 본문 1번 faq는 패턴이 흰/색 중 하나 — 흰 note와 같은 면이 되는 시작을 찾는다
    for (let start = 0; start < 4; start += 1) {
      const s2 = [HERO, ...Array.from({ length: start }, () => sec("image_text")), imp, sec("faq")];
      const key = faceKeysFor(s2, faceKeyOf);
      const pads = legacyTopPads(s2, key, "의류/패션");
      const same = key(s2[s2.length - 2]) === key(s2[s2.length - 1]);
      const tk = getRhythmTokens("의류/패션", false);
      const want = same && tk.padTy > SPACE_V4.sm && 64 + tk.padTy > 96 ? resolveTopPad(64, tk.padTy, true) : undefined;
      if (pads[s2.length - 1] !== want) fails.push(`임팩트 뒤 faq@${start}: 기대 ${want} ≠ ${pads[s2.length - 1]}`);
    }
    void secs;
  }
  if (legacyTopPads([HERO, sec("faq")], faceKeysFor([HERO, sec("faq")], faceKeyOf), "전자제품")[1] !== undefined) fails.push("히어로 바로 뒤는 줄이지 않음");

  // 표식 → CSS: 두 단(32·48)을 같은 선언으로
  const css = topPadCssV4((p) => `X[data-pz-top="${p}"]`);
  if (css !== 'X[data-pz-top="32"]{padding-top:32px!important}X[data-pz-top="48"]{padding-top:48px!important}') fails.push(`topPadCssV4 형태: ${css}`);

  // ③ 말뭉치: 계획 topPads ↔ export·라이브 표식
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { default: R } = await import("../../components/DetailSectionRenderer");
  const exportCss = topPadCssV4((p) => `.pagzly-wrap section[data-pz-top="${p}"]`);
  const liveCss = topPadCssV4((p) => `[data-pz-typefloor] [data-pz-top="${p}"] > section`);
  let withPads = 0;
  const forDom: Array<[string, string, Record<number, number>]> = [];
  for (const [id, file] of corpus()) {
    const plan = displayOf(file);
    const pads = (plan as { topPads?: Record<number, number> }).topPads ?? {};
    const want = Object.entries(pads);
    for (const [i, v] of want) {
      const s = plan.sections[Number(i)];
      if (!s || !LEGACY_SECTION_V4[s.type]) fails.push(`${id}: topPads[${i}]가 이전 섹션이 아님(${s?.type})`);
      if (![32, 48].includes(v)) fails.push(`${id}: topPads[${i}]=${v}`);
    }
    const exp = exportHtmlOf(file);
    const eMarks = [...exp.matchAll(/<section[^>]*data-pz-top="(\d+)"/g)].map((m) => Number(m[1]));
    if (eMarks.join(",") !== want.map(([, v]) => v).join(",")) fails.push(`${id}: export 표식 ${eMarks.join(",")} ≠ 계획 ${want.map(([, v]) => v).join(",")}`);
    if (!exp.includes(exportCss)) fails.push(`${id}: export에 표식 CSS가 없음`);
    const a = exportArgsOf(readSession(file));
    const budgeted = applySectionDisplayBudget(a.category, a.sections ?? [], { chartRemoved: comparisonPolicyRemovesChart(a.claimFacts) });
    const live = renderToStaticMarkup(
      React.createElement(R as never, { sections: budgeted, imageUrls: a.imageUrls ?? [], category: a.category, theme: a.theme, productName: a.productName, brandName: a.brandName, logoUrl: a.logoUrl, ingredients: a.ingredients, keyFeatures: a.keyFeatures, certifications: a.certifications, stylePackId: a.stylePackId, infoBackdrops: a.infoBackdrops, imageHashByUrl: a.imageHashByUrl, imageOrigins: a.imageOrigins, imageRoles: a.imageRoles, imageTags: a.imageTags, sceneImages: a.sceneImages, hasSizeInfo: a.hasSizeInfo, claimFacts: a.claimFacts } as never),
    );
    const lMarkVals = [...live.matchAll(/<div[^>]*data-pz-top="(\d+)"/g)].map((m) => Number(m[1]));
    if (lMarkVals.join(",") !== want.map(([, v]) => v).join(",")) fails.push(`${id}: 라이브 표식 값 ${lMarkVals.join(",")} ≠ 계획 ${want.map(([, v]) => v).join(",")}`);
    if (!/\[data-pz-top=(?:"|&quot;)32(?:"|&quot;)\] &gt; section\{padding-top:32px!important\}/.test(live) && !live.includes(liveCss)) fails.push(`${id}: 라이브에 표식 CSS가 없음`);
    if (want.length) { withPads += 1; forDom.push([id, exp, pads]); }
  }
  if (withPads < 3) fails.push(`말뭉치에서 이전 섹션 위 여백을 줄이는 입력이 ${withPads}개뿐(≥3 기대)`);

  // ④ export DOM: 표식 달린 섹션의 위 여백이 표식 값
  const b = await launch();
  for (const [id, exp, pads] of forDom) {
    const ex = await openHtml(b, exp, 390);
    const rows = (await ex.page.evaluate(`Array.from(document.querySelectorAll('section[data-pz-top]')).map((s) => [Number(s.getAttribute('data-pz-top')), Math.round(parseFloat(getComputedStyle(s).paddingTop))])`)) as Array<[number, number]>;
    if (rows.length !== Object.keys(pads).length) fails.push(`${id}: DOM 표식 ${rows.length}개 ≠ ${Object.keys(pads).length}`);
    for (const [want, got] of rows) if (want !== got) fails.push(`${id}: 표식 ${want}인데 위 여백 ${got}`);
    await ex.close();
  }
  await b.close();
  return fails;
}
