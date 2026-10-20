/**
 * 회귀 — 419차 3-3 뷰티 인포 강화. 뷰티가 아니거나 flag off면 레이아웃·HTML이 그대로, 뷰티는 기본 bold + 구매 카드·퀵포인트 CSS,
 * 글자 크기 하한(가격 56px 이상·본문 15px 이상·보조 12px 이상)·색 대비(12 hue)·라이브/export 같은 규칙. 유료 호출 0.
 */
import fs from "node:fs";
import path from "node:path";
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme, type CategoryTheme } from "../../lib/category-theme";
import { buildInfoBackdropPrompt, infoBackdropEligible } from "../../lib/info-backdrop";
import { BEAUTY_INFO_DEFAULT, beautyAttr, chooseBeautyAccent, beautyData, beautyInfoCss, beautyInfoLayout, beautyIp, beautyIpAttr } from "../../lib/beauty-style";
import { CLASSIC_LAYOUT } from "../../lib/style-packs";
import { infoColorsOf, infoCss } from "../../lib/info-style";
import { HUES } from "../../lib/style-lint";
import { applyPackTone } from "../../lib/style-packs";
import { buildThemeFromHueWithNeutral, STUDIO_NEUTRAL_SAMPLE } from "../../lib/color-extract";
import { contrastRatioToken } from "../../lib/design-tokens";
import type { DetailSection } from "../../lib/types/generate";

export const name = "뷰티 인포 강화 — 플래그·패션 불변, 기본 bold, 구매 카드·퀵포인트 하한·대비·라이브/export 동일";

const sections = (): DetailSection[] =>
  [
    { type: "hero", slot: "hero", headline: "촉촉함 한 겹", subheadline: "30mL", imageIndex: 0 },
    { type: "image_text", slot: "quick_points", heading: "휴대 30mL", body: "파우치 한 칸에 들어가는 크기입니다.", layout: "compact", imageIndex: 0, imagePosition: "left" },
    { type: "cta_price", slot: "cta_price", price: 24000, targetCustomer: "건조함과 당김이 고민인 20~30대 여성", badges: ["30mL", "가벼운 사용감", "메이크업 위 사용", "5만원 이상 무료배송"] },
  ] as unknown as DetailSection[];

export async function run(): Promise<string[]> {
  const fails: string[] = [];

  // 레이아웃: 뷰티만 바뀌고, 나머지는 같은 객체
  const b = beautyInfoLayout(CLASSIC_LAYOUT, "화장품/뷰티");
  if (b.info !== BEAUTY_INFO_DEFAULT || BEAUTY_INFO_DEFAULT !== "bold" || !b.beautyInfo) fails.push("뷰티 레이아웃이 기본 bold + 표식이 아님");
  if (beautyInfoLayout(CLASSIC_LAYOUT, "화장품/뷰티", false) !== CLASSIC_LAYOUT) fails.push("flag off인데 레이아웃이 바뀜");
  for (const c of ["의류/패션", "전자제품", undefined]) if (beautyInfoLayout(CLASSIC_LAYOUT, c) !== CLASSIC_LAYOUT) fails.push(`${String(c)} 레이아웃이 바뀜`);
  if (beautyInfoLayout({ ...CLASSIC_LAYOUT, info: "dramatic" }, "화장품/뷰티").info !== "dramatic") fails.push("이미 정해진 강도를 덮어씀");
  if (Object.keys(beautyData(CLASSIC_LAYOUT, "buy")).length || Object.keys(beautyIp(CLASSIC_LAYOUT, "x")).length || beautyAttr(CLASSIC_LAYOUT, "buy") !== "" || beautyIpAttr(CLASSIC_LAYOUT, "x") !== "") fails.push("표식이 없는 레이아웃에 속성이 붙음");

  // CSS
  const theme = applyPackTone({ ...getCategoryTheme("화장품/뷰티"), ...buildThemeFromHueWithNeutral(30, STUDIO_NEUTRAL_SAMPLE) } as CategoryTheme, null);
  const colors = infoColorsOf(theme);
  if (beautyInfoCss("calm", ".pagzly-wrap", colors) !== "" || beautyInfoCss(undefined, ".pagzly-wrap", colors) !== "") fails.push("calm인데 뷰티 CSS가 나옴");
  for (const lv of ["bold", "dramatic"] as const) {
    const exp = beautyInfoCss(lv, ".pagzly-wrap", colors);
    const live = beautyInfoCss(lv, "[data-pz-info]", colors);
    if (!exp || live.replace(/\[data-pz-info\]/g, "S") !== exp.replace(/\.pagzly-wrap/g, "S")) fails.push(`${lv} 라이브·export CSS가 스코프 외에 다름`);
    if (/:has\(|@container|text-wrap|@supports|backdrop-filter/.test(exp)) fails.push(`${lv} 새 CSS 기능`);
    // 글자 크기 하한
    const px = (sel: RegExp) => Number(new RegExp(`${sel.source}[^}]*font-size:(\\d+)px`).exec(exp)?.[1] ?? 0);
    if (px(/data-ip="price"\]\{/) < 56) fails.push(`${lv} 가격이 56px 미만`);
    if (px(/data-ip="note"\]\{/) < 12) fails.push(`${lv} 보조 문구가 12px 미만`);
    if (px(/data-ip="badges"\]>span\{/) < 14) fails.push(`${lv} 혜택 칩이 14px 미만`);
    if (px(/data-info="quick"\] p\{/) < 15) fails.push(`${lv} 퀵포인트 본문이 15px 미만`);
    if (!/grid-template-columns:1fr 1fr/.test(exp)) fails.push(`${lv} 혜택 칩이 2열이 아님`);
    if (!/data-ip="cta"\][^}]*box-shadow/.test(exp) || !/data-ip="cta"\][^}]*padding:22px/.test(exp)) fails.push(`${lv} CTA 버튼 면적·그림자 규칙 없음`);
    // 인포 CSS(5구간)에도 skipHeadline이면 제목 규칙이 빠진다
    const withHead = infoCss(lv, ".pagzly-wrap", colors);
    const noHead = infoCss(lv, ".pagzly-wrap", colors, undefined, { skipHeadline: true });
    if (!/var\(--pz-fs\)/.test(withHead) || /var\(--pz-fs\)/.test(noHead)) fails.push(`${lv} skipHeadline이 제목 규칙을 빼지 않음`);
  }

  // 색 대비: 흰 글자 on 포인트·진한 색, 진한 글자 on 흰·연한 색 (12 hue)
  for (const h of HUES) {
    const t = applyPackTone({ ...getCategoryTheme("화장품/뷰티"), ...buildThemeFromHueWithNeutral(h, STUDIO_NEUTRAL_SAMPLE) } as CategoryTheme, null);
    const c = infoColorsOf(t);
    const pairs: Array<[string, string, string]> = [
      ["가격·칩 흰 글자 on 포인트", c.paper, c.accent],
      ["CTA 흰 글자 on 진한 색", c.paper, c.deep],
      ["혜택 칩 진한 글자 on 흰", c.deep, c.paper],
      ["퀵 제목 진한 글자 on 흰", c.deep, c.paper],
      ["퀵 본문 ink on 흰", c.ink, c.paper],
    ];
    for (const [label, fg, bg] of pairs) if (contrastRatioToken(fg, bg) < 4.5) fails.push(`hue ${h} ${label} 대비 ${contrastRatioToken(fg, bg).toFixed(2)} < 4.5`);
  }

  // 포인트색 출처 규칙: 판매자 > 제품 > theme > 사진 배경, 유효하지 않은 값은 건너뜀
  const ca = chooseBeautyAccent;
  if (ca({ sellerHex: "#112233", productHex: "#E6B800", themeHex: "#20547E", photoHex: "#A7BED0" })?.source !== "seller") fails.push("판매자 색이 최우선이 아님");
  if (ca({ productHex: "#E6B800", themeHex: "#20547E", photoHex: "#A7BED0" })?.source !== "product") fails.push("제품 주조색이 theme보다 앞이 아님");
  if (ca({ themeHex: "#20547E", photoHex: "#A7BED0" })?.source !== "theme") fails.push("theme이 사진 배경보다 앞이 아님");
  if (ca({ photoHex: "#A7BED0" })?.source !== "photo" || ca({}) !== null) fails.push("사진 배경 폴백/빈 입력 처리가 다름");
  if (ca({ sellerHex: "파랑", productHex: "#e6b800" })?.hex !== "#E6B800") fails.push("유효하지 않은 값을 건너뛰지 않음");

  // 인포 AI 배경 대상: 뷰티(info bold/dramatic)도 허용, 패션 규칙은 그대로
  const eb = { category: "화장품/뷰티", info: "bold" as const, autoEnabled: false, hasSpec: false };
  if (!infoBackdropEligible(eb) || !infoBackdropEligible({ ...eb, info: "dramatic" })) fails.push("뷰티 bold/dramatic이 인포 배경 대상이 아님");
  if (infoBackdropEligible({ ...eb, info: "calm" }) || infoBackdropEligible({ ...eb, beautyEnabled: false })) fails.push("뷰티 calm/flag off가 대상임");
  if (infoBackdropEligible({ category: "의류/패션", info: "bold", autoEnabled: true, hasSpec: false })) fails.push("패션 규칙(스펙 필요)이 바뀜");
  // 뷰티 프롬프트: 직물 단어 없음, 입력 원문 없음, 접미 유지, 질감 사전·일반 폴백
  for (const kind of ["A", "B", "C"] as const) {
    const p = buildInfoBackdropPrompt(kind, { material: "글로우 미스트 30mL", color: "노랑 골드", mood: "맑고 촉촉한", category: "화장품/뷰티" });
    if (/knit|wool|linen|denim|fabric|textile|cotton/i.test(p)) fails.push(`뷰티 ${kind} 프롬프트에 직물 단어`);
    if (/[가-힣]/.test(p) || !p.endsWith("calm center area")) fails.push(`뷰티 ${kind} 프롬프트 형식 오류`);
  }
  if (!/water mist/.test(buildInfoBackdropPrompt("A", { material: "에센스 미스트", category: "화장품/뷰티" }))) fails.push("미스트 질감 사전 불일치");
  if (!/serum/.test(buildInfoBackdropPrompt("A", { material: "비타민 세럼", category: "화장품/뷰티" })) || !/pearly satin/.test(buildInfoBackdropPrompt("A", { material: "알 수 없음", category: "화장품/뷰티" }))) fails.push("세럼·일반 폴백 불일치");
  if (/skincare/.test(buildInfoBackdropPrompt("A", { material: "울 니트", category: "의류/패션" }))) fails.push("패션 프롬프트에 뷰티 문구");

  // export 연결: 뷰티는 표식·CSS·버튼, 패션 classic은 바이트에 흔적이 없다
  const mk = (category: string) =>
    buildDetailPageHtml({ productName: "p", brandName: "b", category, sections: sections(), imageUrls: ["https://x.test/0.png"], theme: getCategoryTheme(category) });
  const beauty = mk("화장품/뷰티");
  for (const k of ['data-info="buy"', 'data-info="quick"', 'data-ip="price"', 'data-ip="badges"', 'data-ip="cta"', 'data-ip="note"', "지금 구매하기"]) if (!beauty.includes(k)) fails.push(`뷰티 export에 ${k} 없음`);
  const fashion = mk("의류/패션");
  for (const k of ['data-info="buy"', 'data-info="quick"', 'data-ip="price"', 'data-ip="cta"', "지금 구매하기", "[data-info=\"buy\"]"]) if (fashion.includes(k)) fails.push(`패션 export에 뷰티 흔적 ${k}`);
  // 라이브 연결(소스): 같은 표식을 같은 이름으로 단다
  const live = fs.readFileSync(path.join(__dirname, "..", "..", "components", "DetailSectionRenderer.tsx"), "utf8");
  for (const k of ['beautyData(layout, "buy")', 'beautyData(layout, "quick")', 'beautyIp(layout, "price")', 'beautyIp(layout, "badges")', 'beautyIp(layout, "cta")', 'beautyIp(layout, "note")', "data-pz-info", "beautyInfoCss("]) {
    if (!live.includes(k)) fails.push(`라이브에 ${k} 없음`);
  }
  return fails;
}
