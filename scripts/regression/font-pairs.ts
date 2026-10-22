/**
 * 회귀 — 432차 폰트 정책: 상세페이지 폰트는 Noto Sans KR 하나. 모든 세트의 제목·본문·라벨이 Noto, 굵기는 파일이 있는 400·500·700·900만, 카테고리당 2~3세트·결정적 선택·패션은 팩 연동,
 * 스택이 var(--pz-f-*, 기존 스택)이라 플래그 off(변수 없음)면 429차 글꼴, export는 같은 출처 /fonts/noto-sans-kr.css만 링크(Google Fonts·다른 폰트 CSS 없음), 안전 CSS, 폴백 보정·preload. 호출 0.
 */
import fs from "node:fs";
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";
import { DETAIL_FONT_STACK } from "../../lib/detail-typography";
import { CATEGORY_FONT_PAIRS, FONT_FAMILIES, FONT_PAIRS, NOTO_FALLBACK_CSS, NOTO_PRELOAD_FILES, NOTO_WEIGHTS, fontLinkHrefs, fontPairCss, fontPreloadHrefs, fontSeed, pairFamilies, pairStacks, pickFontPair } from "../../lib/font-pairs";
import type { DetailSection } from "../../lib/types/generate";

export const name = "폰트 정책(Noto Sans KR 하나) — 세트 전부 Noto·굵기 400/500/700/900·카테고리당 2~3세트·결정적·var 폴백(off=429차)·같은 출처 링크·폴백/preload";

const S = (o: Record<string, unknown>) => o as unknown as DetailSection;
const OLD_FONTS = /Pretendard|Hahmlet|Gowun|Black Han|Do Hyeon|Jua|Playfair|Montserrat/;

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };

  eq("패밀리는 Noto Sans KR 하나", Object.keys(FONT_FAMILIES), ["noto-sans-kr"]);
  for (const [cat, ids] of Object.entries(CATEGORY_FONT_PAIRS)) {
    if (ids.length < 2 || ids.length > 3) fails.push(`${cat}: 세트 ${ids.length}개(2~3개여야 함)`);
    for (const id of ids) if (!FONT_PAIRS[id]) fails.push(`${cat}: 없는 세트 ${id}`);
  }
  // 모든 세트: 제목·본문·라벨 = Noto, 굵기는 파일이 있는 값만, 대제목 700~900 또는 소프트 400~500, 자간·줄간격 범위
  const weights = new Set<number>();
  for (const p of Object.values(FONT_PAIRS)) {
    eq(`${p.id} 패밀리`, pairFamilies(p), ["noto-sans-kr"]);
    if (!(NOTO_WEIGHTS as readonly number[]).includes(p.title.weight)) fails.push(`${p.id}: 제목 굵기 ${p.title.weight}(파일 없음)`);
    if (!(NOTO_WEIGHTS as readonly number[]).includes(p.body.weight)) fails.push(`${p.id}: 본문 굵기 ${p.body.weight}(파일 없음)`);
    weights.add(p.title.weight);
    if (p.title.soft ? p.title.weight > 500 : p.title.weight < 700) fails.push(`${p.id}: 굵기 ${p.title.weight}와 soft=${p.title.soft}가 맞지 않음`);
    if (p.title.lineHeight < 1.25 || p.title.lineHeight > 1.3) fails.push(`${p.id}: 줄간격 ${p.title.lineHeight}`);
    const ls = parseFloat(p.title.letterSpacing);
    if (p.id.startsWith("beauty-") && p.title.soft && ls < 0) fails.push(`${p.id}: 뷰티 소프트·엘레강스는 넓은 자간(0 이상)이어야 함 ${p.title.letterSpacing}`);
    if (!p.title.soft && p.id !== "food-warm" && ls > -0.01) fails.push(`${p.id}: 강한 스타일 자간 ${p.title.letterSpacing}(−0.02em 근처)`);
    const lab = parseFloat(p.label_.letterSpacing);
    if (lab < 0.02 || lab > 0.06) fails.push(`${p.id}: 라벨 자간 ${p.label_.letterSpacing}(+0.02~0.06em)`);
    const st = pairStacks(p);
    for (const v of Object.values(st)) if (!v.startsWith("'Noto Sans KR'") || OLD_FONTS.test(v)) fails.push(`${p.id}: 스택에 Noto 외 폰트`);
  }
  if (weights.size < 4) fails.push(`제목 굵기 단계 ${weights.size}개(개성 프리셋이 400·500·700·900을 모두 써야 함)`);

  // 결정적 선택 + 시드 분산 + 패션 팩 연동
  const a = pickFontPair({ category: "화장품/뷰티", productName: "미스트", brandName: "b" });
  eq("같은 입력 같은 세트", pickFontPair({ category: "화장품/뷰티", productName: "미스트", brandName: "b" }).id, a.id);
  const seen = new Set<string>();
  for (let i = 0; i < 60; i += 1) seen.add(pickFontPair({ category: "화장품/뷰티", productName: `상품${i}`, brandName: "x" }).id);
  eq("뷰티 시드 분산(3세트 모두)", seen.size, 3);
  if (fontSeed("a", "b") === fontSeed("b", "a")) fails.push("시드가 순서에 둔감함");
  eq("패션 클래식·세리프", [pickFontPair({ category: "의류/패션" }).id, pickFontPair({ category: "의류/패션", packHeadline: { kind: "serif", weight: 600 } }).id], ["fashion-classic", "fashion-classic"]);
  eq("패션 모노·볼드", [pickFontPair({ category: "의류/패션", packHeadline: { kind: "sans-display", weight: 600 } }).id, pickFontPair({ category: "의류/패션", packHeadline: { kind: "sans-display", weight: 900 } }).id], ["fashion-mono", "fashion-bold"]);

  // 스택: 변수 + 기존 폴백(플래그 off = 변수 없음 → 429차 글꼴)
  for (const [k, v] of Object.entries(DETAIL_FONT_STACK)) if (!/^var\(--pz-f-(body|label|title), /.test(v)) fails.push(`DETAIL_FONT_STACK.${k}가 var 폴백이 아님`);
  if (!/Noto Sans KR/.test(DETAIL_FONT_STACK.sans) || !/Noto Serif KR/.test(DETAIL_FONT_STACK.serifHeadline)) fails.push("폴백에 기존 Noto 스택이 없음(플래그 off 복원용)");

  // CSS: 금지 기법 없음, 숫자 tabular-nums, 라벨 자간, 제목 굵기·줄간격
  for (const p of Object.values(FONT_PAIRS)) {
    const css = fontPairCss(".pagzly-wrap", p);
    if (/:has\(|@container|text-wrap/.test(css)) fails.push(`${p.id}: export 금지 CSS 기법`);
    if (!css.includes(`font-weight:${p.title.weight}!important`) || !css.includes(`line-height:${p.title.lineHeight}!important`)) fails.push(`${p.id}: 제목 굵기·줄간격 규칙 없음`);
    if (!css.includes("tabular-nums") || !css.includes(`letter-spacing:${p.label_.letterSpacing}!important`)) fails.push(`${p.id}: 숫자·라벨 규칙 없음`);
    if (OLD_FONTS.test(css)) fails.push(`${p.id}: CSS에 옛 폰트 이름`);
  }

  // export: 같은 출처 noto-sans-kr.css만, Google Fonts·옛 폰트 CSS 링크 없음, 폴백·preload 포함
  const secs = [S({ type: "hero", slot: "hero", headline: "제목", subheadline: "부제", imageIndex: 0 }), S({ type: "cta_price", slot: "cta_price", price: 1000 })];
  const exp = (category: string) => buildDetailPageHtml({ productName: "미스트", brandName: "b", category, sections: secs, imageUrls: ["https://example.com/a.jpg"], theme: getCategoryTheme(category) });
  for (const cat of ["화장품/뷰티", "의류/패션", "식품", "전자제품"]) {
    const h = exp(cat);
    const pair = pickFontPair({ category: cat, productName: "미스트", brandName: "b" });
    eq(`${cat}: 링크는 noto 하나`, fontLinkHrefs(pair), ["/fonts/noto-sans-kr.css"]);
    if (!h.includes('href="/fonts/noto-sans-kr.css"')) fails.push(`${cat}: export에 noto-sans-kr.css 링크 없음`);
    if (/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(h)) fails.push(`${cat}: export가 Google Fonts를 부름`);
    if (/\/fonts\/(pretendard|hahmlet|gowun|black-han|do-hyeon|jua|playfair|montserrat)/.test(h)) fails.push(`${cat}: export가 옛 폰트 CSS를 링크`);
    if (!h.includes(NOTO_FALLBACK_CSS)) fails.push(`${cat}: export에 폴백 보정 @font-face 없음`);
    for (const href of fontPreloadHrefs()) if (!h.includes(`rel="preload" as="font" type="font/woff2" href="${href}"`)) fails.push(`${cat}: export에 preload ${href} 없음`);
  }
  if (!/size-adjust:92\.5%/.test(NOTO_FALLBACK_CSS)) fails.push("폴백 size-adjust 값(Noto 기준 측정 0.925) 불일치");

  // 빌드 산출물이 있으면: Noto 하나만, 굵기 파일 4종, preload 파일 존재, 옛 폰트 디렉터리 없음(없는 환경은 건너뜀)
  if (fs.existsSync("public/fonts/noto-sans-kr.css")) {
    const dirs = fs.readdirSync("public/fonts").filter((f) => fs.statSync(`public/fonts/${f}`).isDirectory());
    eq("public/fonts 디렉터리", dirs, ["noto-sans-kr"]);
    const css = fs.readFileSync("public/fonts/noto-sans-kr.css", "utf8");
    for (const w of ["100 400", "font-weight:500", "600 800", "font-weight:900"]) if (!css.includes(w)) fails.push(`noto-sans-kr.css에 굵기 선언 ${w} 없음`);
    for (const f of NOTO_PRELOAD_FILES) if (!fs.existsSync(`public/fonts/noto-sans-kr/${f}`)) fails.push(`preload 파일 없음: ${f}`);
  }
  return fails;
}
