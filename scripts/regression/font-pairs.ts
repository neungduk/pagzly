/**
 * 회귀 — 430차 폰트 조합(디자인 V3 폰트). 카테고리당 2~3세트·한 페이지 폰트 3종 이하·디스플레이 폰트는 제목에만·결정적 선택·패션은 팩 성격을 따름·
 * 스택이 var(--pz-f-*, 기존 스택)이라 플래그 off(변수 없음)면 429차 글꼴·export는 같은 출처 /fonts/*.css만 쓰고 Google Fonts 링크가 없음·export 금지 CSS 기법 없음. 호출 0.
 */
import fs from "node:fs";
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";
import { DETAIL_FONT_STACK } from "../../lib/detail-typography";
import { CATEGORY_FONT_PAIRS, FONT_FAMILIES, FONT_PAIRS, fontLinkHrefs, fontPairCss, fontSeed, pairFamilies, pairStacks, pickFontPair } from "../../lib/font-pairs";
import type { DetailSection } from "../../lib/types/generate";

export const name = "폰트 조합 — 카테고리당 2~3세트·페이지 폰트 3종 이하·결정적·팩 연동·var 폴백(off=429차)·셀프 호스팅 링크·안전 CSS";

const S = (o: Record<string, unknown>) => o as unknown as DetailSection;

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };

  // 카테고리당 2~3세트, 세트 id 존재
  for (const [cat, ids] of Object.entries(CATEGORY_FONT_PAIRS)) {
    if (ids.length < 2 || ids.length > 3) fails.push(`${cat}: 세트 ${ids.length}개(2~3개여야 함)`);
    for (const id of ids) if (!FONT_PAIRS[id]) fails.push(`${cat}: 없는 세트 ${id}`);
  }
  // 한 페이지 폰트 3종 이하, 본문은 항상 Pretendard(디스플레이 폰트는 본문에 쓰지 않음), 디스플레이 폰트는 제목 자리에만
  for (const p of Object.values(FONT_PAIRS)) {
    if (pairFamilies(p).length > 3) fails.push(`${p.id}: 폰트 ${pairFamilies(p).length}종`);
    eq(`${p.id} 본문`, p.body.family, "pretendard");
    if (FONT_FAMILIES[p.label_.family].display) fails.push(`${p.id}: 라벨에 디스플레이 폰트`);
    if (!fs.existsSync("scripts/build-detail-fonts.mjs")) fails.push("폰트 빌드 스크립트 없음");
    // 굵기: 단일 굵기 디스플레이 폰트는 400만, 그 밖은 600~800
    const single = ["black-han-sans", "do-hyeon", "jua"].includes(p.title.family);
    if (single && p.title.weight !== 400) fails.push(`${p.id}: 단일 굵기 폰트에 굵기 ${p.title.weight}`);
    if (!single && (p.title.weight < 600 || p.title.weight > 800)) fails.push(`${p.id}: 제목 굵기 ${p.title.weight}`);
  }

  // 결정적 선택 + 시드 분산
  const a = pickFontPair({ category: "화장품/뷰티", productName: "미스트", brandName: "b" });
  eq("같은 입력 같은 세트", pickFontPair({ category: "화장품/뷰티", productName: "미스트", brandName: "b" }).id, a.id);
  const seen = new Set<string>();
  for (let i = 0; i < 60; i += 1) seen.add(pickFontPair({ category: "화장품/뷰티", productName: `상품${i}`, brandName: "x" }).id);
  eq("뷰티 시드 분산(3세트 모두)", seen.size, 3);
  if (fontSeed("a", "b") === fontSeed("b", "a")) fails.push("시드가 순서에 둔감함");
  // 패션은 팩 성격
  eq("패션 클래식/에디토리얼(세리프)", [pickFontPair({ category: "의류/패션" }).id, pickFontPair({ category: "의류/패션", packHeadline: { kind: "serif", weight: 600 } }).id], ["fashion-classic", "fashion-classic"]);
  eq("패션 모노(가는 고딕)·볼드(굵은 고딕)", [pickFontPair({ category: "의류/패션", packHeadline: { kind: "sans-display", weight: 600 } }).id, pickFontPair({ category: "의류/패션", packHeadline: { kind: "sans-display", weight: 900 } }).id], ["fashion-mono", "fashion-bold"]);
  eq("전자 세트", ["tech-clean", "tech-display"].includes(pickFontPair({ category: "전자제품", productName: "x" }).id), true);

  // 스택: 변수 + 기존 폴백(플래그 off = 변수 없음 → 429차 글꼴)
  for (const [k, v] of Object.entries(DETAIL_FONT_STACK)) if (!/^var\(--pz-f-(body|label|title), /.test(v)) fails.push(`DETAIL_FONT_STACK.${k}가 var 폴백이 아님`);
  if (!/Noto Sans KR/.test(DETAIL_FONT_STACK.sans) || !/Noto Serif KR/.test(DETAIL_FONT_STACK.serifHeadline)) fails.push("폴백에 기존 Noto 스택이 없음");

  // CSS: 금지 기법 없음, 제목은 !important 변수 사용
  for (const p of Object.values(FONT_PAIRS)) {
    const css = fontPairCss(".pagzly-wrap", p);
    if (/:has\(|@container|text-wrap/.test(css)) fails.push(`${p.id}: export 금지 CSS 기법`);
    if (!css.includes(`font-weight:${p.title.weight}!important`)) fails.push(`${p.id}: 제목 굵기 규칙 없음`);
    const st = pairStacks(p);
    if (!st.body.startsWith("'Pretendard'")) fails.push(`${p.id}: 본문 스택`);
  }

  // export: V3 켜짐 기본 — 같은 출처 /fonts 링크, Google Fonts 없음, 세트 CSS 포함
  const secs = [S({ type: "hero", slot: "hero", headline: "제목", subheadline: "부제", imageIndex: 0 }), S({ type: "cta_price", slot: "cta_price", price: 1000 })];
  const exp = (category: string) => buildDetailPageHtml({ productName: "미스트", brandName: "b", category, sections: secs, imageUrls: ["https://example.com/a.jpg"], theme: getCategoryTheme(category) });
  for (const cat of ["화장품/뷰티", "의류/패션", "식품", "전자제품"]) {
    const h = exp(cat);
    const pair = pickFontPair({ category: cat, productName: "미스트", brandName: "b" });
    for (const href of fontLinkHrefs(pair)) if (!h.includes(`href="${href}"`)) fails.push(`${cat}: export에 ${href} 링크 없음`);
    if (/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(h)) fails.push(`${cat}: export가 Google Fonts를 부름`);
    if (!h.includes(`--pz-f-title:`)) fails.push(`${cat}: export에 폰트 변수 없음`);
  }
  // 빌드 산출물이 있으면 링크 대상 CSS가 실제로 있는지(없는 환경은 건너뜀)
  if (fs.existsSync("public/fonts/pretendard.css")) {
    for (const f of Object.values(FONT_FAMILIES)) if (!fs.existsSync(`public/fonts/${f.css}.css`)) fails.push(`public/fonts/${f.css}.css 없음`);
  }
  return fails;
}
