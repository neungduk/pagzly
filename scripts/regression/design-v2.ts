/**
 * 회귀 — 428차 디자인 V2. 플래그(off면 427차와 같은 출력)·대상 카테고리(뷰티·패션만)·타이포 상한·하드 색 면 반전 예산(≤6, AI 배경 우선)·틴트 대비·
 * export 금지 CSS 기법 없음·라이브/export가 같은 CSS 한 벌을 쓰는지. 호출 0.
 */
import { applyDisplayRules } from "../../lib/display-sections";
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";
import { contrastRatioToken } from "../../lib/design-tokens";
import { infoColorsOf, infoCss } from "../../lib/info-style";
import { V2_MAX_HARD_FLIPS, V2_TITLE_SCALE, designV2Css, designV2On, designV2Typo, planBands, v2Tint, v2TitleOverrides } from "../../lib/design-v2";
import { emphasisMarkerGradient } from "../../lib/body-emphasis";
import { V2_MARKER, emphasisCss } from "../../lib/design-v2";
import { ICON_HUE_OFFSETS_V2, iconHueOffset } from "../../lib/concept-icons";
import { HERO_CAPTION, HERO_STAGE_ENABLED, HERO_STAGE_WIDTH_PCT, heroStageCss, heroStageOn } from "../../lib/hero-variants";
import { PRICE_STRIP_HEIGHT_PX, buildPriceStrip, priceStripHtml, stripCss } from "../../lib/price-strip";
import { buildClaimFacts } from "../../lib/numeric-claim-gate";
import type { DetailSection } from "../../lib/types/generate";

export const name = "디자인 V2 — 플래그·대상·타이포 상한·하드 면 예산·틴트 대비·export 안전 CSS·라이브/export 동일";

const S = (o: Record<string, unknown>) => o as unknown as DetailSection;
const sections = (extra: Record<string, unknown>[] = []): DetailSection[] => [
  S({ type: "hero", slot: "hero", headline: "세안 후 15cm", subheadline: "촉촉", imageIndex: 0 }),
  S({ type: "checklist", slot: "checklist", heading: "체크", items: ["a", "b"] }),
  S({ type: "highlight_box", slot: "highlight_box", heading: "포인트", cards: [{ title: "가", body: "나" }, { title: "다", body: "라" }] }),
  S({ type: "usage_steps", slot: "usage_steps", heading: "사용법", steps: ["세안 후 사용하세요", "가볍게 뿌려요", "두드려 흡수시켜요"] }),
  S({ type: "stat_infographic", slot: "stat_infographic", heading: "숫자", metrics: [{ label: "용량", value: "30mL" }, { label: "형태", value: "미스트" }] }),
  S({ type: "caution", slot: "caution", heading: "주의", body: "주의 문구" }),
  S({ type: "cta_price", slot: "cta_price", price: 24000 }),
  ...extra.map(S),
];

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };
  const theme = getCategoryTheme("화장품/뷰티");
  const colors = infoColorsOf(theme);
  const base = { scope: "[data-pz-v2]", colors, category: "화장품/뷰티", beautyInfo: true, sections: sections() };

  // ── 플래그·대상 ──
  eq("뷰티 대상", designV2On("화장품/뷰티", true), true);
  eq("패션 대상", designV2On("의류/패션", true), true);
  eq("기타 카테고리 불변", [designV2On("식품", true), designV2On("전자제품", true), designV2On(undefined, true)], [false, false, false]);
  eq("flag off", designV2On("화장품/뷰티", false), false);
  eq("타이포는 인포 켜짐일 때만", [designV2Typo("화장품/뷰티", "calm", true), designV2Typo("화장품/뷰티", "bold", true), designV2Typo("식품", "bold", true)], [false, true, false]);
  eq("flag off → 빈 CSS", designV2Css({ ...base, level: "bold", enabled: false }), "");
  eq("비대상 → 빈 CSS", designV2Css({ ...base, level: "bold", category: "식품" }), "");
  eq("calm 패션 → 타이포·띠 규칙 없음", designV2Css({ ...base, level: "calm", beautyInfo: false, category: "의류/패션" }).includes("data-info"), false);

  // ── 타이포 상한 ──
  const t = v2TitleOverrides({});
  eq("구간 제목 상한", [t.section?.base, t.section?.wide], [V2_TITLE_SCALE.section!.base, V2_TITLE_SCALE.section!.wide]);
  eq("팩이 더 작으면 존중", v2TitleOverrides({ section: { base: "1.5rem", wide: "2rem" } }).section, { base: "1.5rem", wide: "2rem" });
  eq("팩이 더 크면 줄임", v2TitleOverrides({ section: { base: "2.125rem", wide: "2.75rem" } }).section, { base: "1.75rem", wide: "2.25rem" });
  const css = designV2Css({ ...base, level: "bold" });
  for (const needle of ["font-size:40px", "font-size:24px", "font-size:36px", "font-size:44px", "font-weight:600"]) if (!css.includes(needle)) fails.push(`V2 CSS에 ${needle} 없음`);
  if (/\b900\b/.test(css)) fails.push("V2 CSS에 굵기 900이 남음");

  // ── 하드 면 예산 ──
  const bold = planBands(sections(), "bold", undefined, { buyCard: true });
  eq("bold: points만 하드", bold.hard, ["points"]);
  if (bold.flips > V2_MAX_HARD_FLIPS) fails.push(`bold 반전 ${bold.flips} > ${V2_MAX_HARD_FLIPS}`);
  eq("bold: 밝은 구간은 틴트", bold.tinted.sort(), ["care", "stat", "steps"]);
  const dr = planBands(sections(), "dramatic", undefined, { buyCard: true });
  if (dr.flips > V2_MAX_HARD_FLIPS) fails.push(`dramatic 반전 ${dr.flips} > ${V2_MAX_HARD_FLIPS}`);
  // AI 배경 구간은 예산을 넘어도 유지(우선), 반전 횟수에는 포함
  const bd = planBands(sections(), "dramatic", { points: "https://x/a.png", stat: "https://x/b.png", care: "https://x/c.png", steps: "https://x/d.png" }, { buyCard: true });
  eq("배경 구간 모두 유지", [bd.hard.includes("points"), bd.hard.includes("stat"), bd.hard.includes("care"), bd.hard.includes("steps")], [true, true, true, true]);
  eq("배경 구간은 틴트로 덮지 않음", designV2Css({ ...base, level: "dramatic", backdrops: { stat: "https://x/b.png", steps: "https://x/d.png", care: "https://x/c.png" } }).includes('[data-info="steps"]{background'), false);
  eq("calm → 계획 없음", planBands(sections(), "calm", undefined, { buyCard: false }), { hard: [], tinted: [], demoted: [], flips: 0 });
  // 예산 초과 시 dramatic stat은 bold 표현으로 낮춘다
  const many = planBands(sections(), "dramatic", { points: "https://x/a.png", steps: "https://x/b.png", care: "https://x/c.png" }, { buyCard: true });
  eq("예산 초과 → stat 낮춤", [many.demoted.includes("stat"), many.hard.includes("stat")], [true, false]);
  const demoted = infoCss("dramatic", "[data-pz-v2]", colors, undefined, { demote: ["stat"] });
  const normal = infoCss("dramatic", "[data-pz-v2]", colors, undefined);
  if (demoted === normal) fails.push("demote가 infoCss를 바꾸지 않음");
  if (!demoted.includes(`[data-info="stat"]{background:${colors.soft}`)) fails.push("낮춘 stat이 옅은 면이 아님");

  // ── 틴트: 밝은 면(L>205), 본문 잉크 대비 4.5 이상 ──
  for (const hue of [theme.accentSoft, "#C8DCEB", "#EAD8B8", "#D9C8E8"]) {
    const tint = v2Tint({ ...colors, soft: hue });
    const lum = (h: string) => { const n = parseInt(h.slice(1), 16); return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255); };
    if (lum(tint) <= 205) fails.push(`틴트 ${tint}(${hue})가 밝은 면이 아님`);
    if (contrastRatioToken(colors.ink, tint) < 4.5) fails.push(`틴트 ${tint} 위 잉크 대비 < 4.5`);
  }

  // ── export 안전 CSS: 쓰지 않던 기법 금지 ──
  for (const lvl of ["bold", "dramatic"] as const) {
    const c = designV2Css({ ...base, level: lvl });
    if (/:has\(|@container|text-wrap/.test(c)) fails.push(`V2 CSS(${lvl})에 export 금지 기법`);
  }

  // ── 라이브/export 같은 CSS: 같은 함수 한 벌(export HTML이 V2 CSS를 그대로 담는다) ──
  const urls = ["https://example.com/a.jpg"];
  const mk = (category: string) => buildDetailPageHtml({ productName: "p", brandName: "b", category, sections: sections(), imageUrls: urls, theme: getCategoryTheme(category) });
  const html = mk("화장품/뷰티");
  const v2css = designV2Css({ scope: ".pagzly-wrap", colors: infoColorsOf(getCategoryTheme("화장품/뷰티")), level: "bold", category: "화장품/뷰티", beautyInfo: true, sections: applyDisplayRules(sections(), urls, { category: "화장품/뷰티" }).sections });
  if (v2css && !html.includes(v2css.slice(0, 200))) fails.push("export HTML이 V2 CSS를 담지 않음");
  if (!html.includes("--pz-t-section:1.75rem")) fails.push("export 제목 스케일에 상한이 반영되지 않음");
  const nonTarget = mk("식품");
  if (nonTarget.includes("--pz-t-section:1.75rem") || nonTarget.includes('[data-info="steps"]{background:linear-gradient')) fails.push("비대상 카테고리 export가 바뀜");

  // ── 2-3 강조 연출: 기존 라벨·구절에만 스타일, 새 요소·문구 없음, 칩 상한 ──
  {
    const marker = emphasisMarkerGradient("#20547E");
    const sel = emphasisCss("[data-pz-v2]", colors, false);
    if (!sel.includes('strong[style*="linear-gradient(transparent 60%"]')) fails.push("마커 선택자 없음");
    if (!marker.includes("linear-gradient(transparent 60%")) fails.push("기존 마커 값이 선택자와 맞지 않음(body-emphasis 변경 확인)");
    if (!sel.includes(`${V2_MARKER.alpha}`)) fails.push("마커 진하기 상수 미반영");
    eq("calm: 칩·배지 없음", [sel.includes("steps"), sel.includes("statnum")], [false, false]);
    const on = emphasisCss("[data-pz-v2]", colors, true);
    eq("인포: STEP 칩·수치 배지", [on.includes('[data-info="steps"] ol>li>div:last-child>p'), on.includes('[data-info="statnum"]>div>div>:first-child')], [true, true]);
    // 칩 상한: 칩은 사용 단계 라벨뿐(마크업을 늘리지 않으므로 단계 수 이하)
    if (/content:/.test(on)) fails.push("강조 CSS가 새 문구(content)를 만듦");
    // 배지 글자 대비: 흰 글자 on 포인트색 4.5 이상
    if (contrastRatioToken(colors.paper, colors.accent) < 4.5) fails.push("수치 배지 대비 < 4.5");
  }
  // ── 2-4 가격·혜택 스트립: 입력만·가격 없으면 생략·높이 ≤64·게이트·export 위치 ──
  {
    const cta = (o: Record<string, unknown>) => S({ type: "cta_price", slot: "cta_price", price: 24000, ...o });
    const facts = buildClaimFacts({ productName: "미스트", price: 24000, keyFeatures: "5만원 이상 무료배송", wholesaleUrl: "5만원 이상 무료배송 적립" });
    eq("가격 없음 → 스트립 없음", [buildPriceStrip([S({ type: "hero", slot: "hero" })], "미스트"), buildPriceStrip([cta({ price: 0 })], "미스트")], [null, null]);
    const full = buildPriceStrip([cta({ badges: ["5만원 이상 무료배송", "당일 출고", "적립 1%", "무료교환"] })], "  Dream Glow 미스트  ", facts);
    eq("상품명 입력 그대로(공백만 정리)·가격", [full?.name, full?.price], ["Dream Glow 미스트", "₩24,000"]);
    eq("혜택 칩: 혜택 말만·최대 2개·입력에 없는 수치(적립 1%)는 게이트로 제외", full?.chips, ["5만원 이상 무료배송", "무료교환"]);
    eq("칩 없음도 허용", buildPriceStrip([cta({})], "미스트")?.chips, []);
    eq("긴 칩 제외", buildPriceStrip([cta({ badges: ["무료배송 무료교환 무료반품 무료포장 서비스"] })], "x")?.chips, []);
    if (PRICE_STRIP_HEIGHT_PX > 64) fails.push("스트립 높이 > 64px");
    if (!stripCss("[data-pz-v2]", "#111111", "#333333").includes(`height:${PRICE_STRIP_HEIGHT_PX}px`)) fails.push("스트립 CSS 높이 미반영");
    if (/:has\(|@container|text-wrap/.test(stripCss(".pagzly-wrap", "#111", "#333"))) fails.push("스트립 CSS에 export 금지 기법");
    const html1 = priceStripHtml({ name: "상품<b>", price: "₩1,000", chips: ["무료배송"] }, (t) => t.replace(/</g, "&lt;"));
    eq("마크업 구조", html1, "<div data-pz-strip><span data-pz-strip-price>₩1,000</span><span data-pz-strip-name>상품&lt;b></span><span data-pz-strip-chip>무료배송</span></div>");
    const secs = sections([]).map((x) => (x.type === "cta_price" ? S({ ...(x as unknown as Record<string, unknown>), badges: ["무료배송"] }) : x));
    const exp = (category: string, ss: DetailSection[]) => buildDetailPageHtml({ productName: "미스트", brandName: "b", category, sections: ss, imageUrls: ["https://example.com/a.jpg"], theme: getCategoryTheme(category) });
    const countStrip = (h: string) => (h.match(/<div data-pz-strip>/g) ?? []).length;
    eq("뷰티 export 스트립 1개", countStrip(exp("화장품/뷰티", secs)), 1);
    eq("패션 export 스트립 1개", countStrip(exp("의류/패션", secs)), 1);
    eq("식품 export 스트립 없음", countStrip(exp("식품", secs)), 0);
    eq("가격 없으면 없음", countStrip(exp("화장품/뷰티", secs.filter((x) => x.type !== "cta_price"))), 0);
  }
  // ── 2-5 product-stage 히어로: 뷰티·V2·사진 있을 때만, 폭 60~70%, 기본 꺼짐, 캡션 글자 대비, 글자가 사진 위에 없음 ──
  {
    eq("stage 조건(뷰티·V2·사진·flag)", [heroStageOn("화장품/뷰티", true, true, true), heroStageOn("의류/패션", true, true, true), heroStageOn("화장품/뷰티", false, true, true), heroStageOn("화장품/뷰티", true, false, true), heroStageOn("화장품/뷰티", true, true, false)], [true, false, false, false, false]);
    eq("기본값은 꺼짐(사람 결정 대기)", HERO_STAGE_ENABLED, false);
    if (!(HERO_STAGE_WIDTH_PCT.card >= 60 && HERO_STAGE_WIDTH_PCT.card <= 70 && HERO_STAGE_WIDTH_PCT.disc >= 60 && HERO_STAGE_WIDTH_PCT.disc <= 70)) fails.push("stage 카드 폭이 60~70% 밖");
    const css = heroStageCss("[data-pz-v2]", v2Tint(colors, 0.9), "#FFFFFF");
    if (/:has\(|@container|text-wrap/.test(css)) fails.push("stage CSS에 export 금지 기법");
    if (!css.includes("box-shadow:0 22px 34px -18px rgba(27,27,24,0.34)")) fails.push("stage 그림자(약하게) 없음");
    // 캡션(제목 잉크·부제 70%)은 stage 면 위가 아니라 틴트 띠 위: 같은 틴트에서 4.5 이상
    const tint = v2Tint(colors, 0.6);
    if (contrastRatioToken(HERO_CAPTION.ink, tint) < 4.5) fails.push("히어로 제목 대비 < 4.5(틴트 띠)");
    const subOnTint = (() => { const n = parseInt(tint.slice(1), 16); const bg = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; const c = [27, 27, 24].map((v, i) => Math.round(v * 0.7 + bg[i]! * 0.3)); return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`; })();
    if (contrastRatioToken(subOnTint, tint) < 4.5) fails.push("히어로 부제 대비 < 4.5(틴트 띠)");
    // 켜면 마크업에 stage가 생기고 글자(h1)는 stage 밖(캡션 띠)에 있다 — 켠 상태는 함수 조건으로만 확인(환경 변수 의존 없이 export 마크업 구조를 검사)
    const exp = buildDetailPageHtml({ productName: "p", brandName: "b", category: "화장품/뷰티", sections: sections(), imageUrls: ["https://example.com/a.jpg"], theme: getCategoryTheme("화장품/뷰티") });
    if (exp.includes("<div data-hero-stage=")) fails.push("기본(꺼짐)에서 export에 stage 마크업이 있음");
  }
  // ── 2-6 아이콘 색: V2(뷰티·패션)는 ±15° 안 변주, 비대상·flag off는 기존 표 ──
  {
    const worst = Math.max(...ICON_HUE_OFFSETS_V2.map((v) => Math.abs(v)));
    if (worst > 15) fails.push(`V2 아이콘 hue 변주 ${worst}° > 15°`);
    eq("V2 대상은 좁은 표", [iconHueOffset(1, "화장품/뷰티", true), iconHueOffset(5, "의류/패션", true)], [ICON_HUE_OFFSETS_V2[1], ICON_HUE_OFFSETS_V2[5]]);
    eq("비대상은 기존 표(±80°)", [iconHueOffset(1, "식품", true), iconHueOffset(8, "생활용품", true)], [-50, 80]);
    eq("flag off는 기존 표", [iconHueOffset(1, "화장품/뷰티", false), iconHueOffset(8, "의류/패션", false)], [-50, 80]);
    eq("순환", iconHueOffset(12, "화장품/뷰티", true), ICON_HUE_OFFSETS_V2[0]);
  }
  return fails;
}
