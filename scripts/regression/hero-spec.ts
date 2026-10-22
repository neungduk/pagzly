/**
 * 회귀 — 437차 첫 화면 히어로: 제품명 최대 글자(32~44px)·훅 18~22px, 스크림·포화 면 대비 4.5:1, 변형 선택 결정성·안전 폴백(사진 없음 E·불확실 A), 입력 없을 때(제품명 없음·편집 모드·claimFacts 없음) 기존 히어로,
 * 배지·해시태그 입력 없음 = 없음·원문 그대로, multiply는 흰 배경 컷에서만, 마크업 금지 CSS 없음·export 동일. 호출 0.
 */
import { applyDisplayRules } from "../../lib/display-sections";
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";
import { buildClaimFacts } from "../../lib/numeric-claim-gate";
import { HERO_SPEC, HERO_V2_VARIANTS, estimatePhotoKind, hashtagsFrom, heroBadgesFrom, heroNameSizePx, heroPalette, heroV2Html, saturatedFace, scrimGradient, selectHeroVariant, splitProductName, worstCaseScrimContrast, type HeroV2Plan } from "../../lib/hero-spec";
import { contrastRatioToken } from "../../lib/design-tokens";
import type { DetailSection, HeroSection } from "../../lib/types/generate";

export const name = "히어로 사양 — 제품명 최대 글자·대비·변형 선택 결정성/폴백·입력 없음 불변·배지/해시태그 원문·multiply 조건·마크업 안전";

const S = (o: Record<string, unknown>) => o as unknown as DetailSection;
const hero = { type: "hero", slot: "hero", headline: "15cm 거리, 촉촉함 한 겹", subheadline: "에센스 미스트 30mL", imageIndex: 0 } as HeroSection;
const urls = ["https://example.com/a.jpg"];
const F = (o: Record<string, unknown> = {}) => buildClaimFacts({ productName: "수분 에센스 미스트", brandName: "glowiest", price: 1000, keyFeatures: "건조함, 당김, 휴대하기 좋은 30mL", ...o } as never);
const base = (): DetailSection[] => [hero as unknown as DetailSection, S({ type: "target_persona", slot: "target_persona", heading: "고민", personas: ["a 고민", "b 고민", "c 고민"] }), S({ type: "highlight_box", slot: "highlight_box", heading: "요약", body: "본문" }), S({ type: "faq", slot: "faq", heading: "FAQ", items: [{ question: "q", answer: "a" }] }), S({ type: "cta_price", slot: "cta_price", price: 1000 })];
const plan = (over: Partial<HeroV2Plan> = {}): HeroV2Plan => ({ variant: "A", photoKind: "person", confidence: 0.85, name: "수분 에센스 미스트", brand: "glowiest", imageUrl: urls[0]!, whiteBg: false, badges: [], tags: [], pos: "50% 40%", ...over });

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };
  // 제품명: 괄호 한글 분리·크기 범위
  eq("영문(한글) 분리", splitProductName("Dream Glow Camellia Essence Mist (드림 글로우 카멜리아 에센스 미스트)"), { main: "드림 글로우 카멜리아 에센스 미스트", sub: "Dream Glow Camellia Essence Mist" });
  eq("한글 이름은 그대로", splitProductName("브이넥 청키 립 니트 가디건"), { main: "브이넥 청키 립 니트 가디건" });
  for (const n of ["미스트", "수분 에센스 미스트", "드림 글로우 카멜리아 에센스 미스트", "아주아주아주아주 긴 제품 이름 입니다 정말로 매우 길어요"]) {
    const px = heroNameSizePx(n);
    if (px < HERO_SPEC.nameMinPx || px > HERO_SPEC.nameMaxPx) fails.push(`제품명 크기 ${px}px 범위 밖`);
  }
  if (!(heroNameSizePx("미스트") > heroNameSizePx("드림 글로우 카멜리아 에센스 미스트"))) fails.push("짧을수록 커야 함");
  // 변형 선택
  const sel = (o: Partial<Parameters<typeof selectHeroVariant>[0]> = {}) => selectHeroVariant({ hasPhoto: true, kind: "product", confidence: 0.8, archetype: null, mood: null, category: "", ...o });
  eq("사진 없음 → E", sel({ hasPhoto: false }), "E");
  eq("사람 사진 → A", sel({ kind: "person", confidence: 0.85 }), "A");
  eq("종류 모름 → A(안전)", sel({ kind: "unknown", confidence: 0 }), "A");
  eq("신뢰도 낮음 → A(안전)", sel({ confidence: 0.3 }), "A");
  eq("뷰티 제품 → B", sel({ archetype: "beauty-skincare", mood: "natural" }), "B");
  eq("뷰티 미니멀 럭셔리 → D", sel({ archetype: "beauty-skincare", mood: "minimal-luxe" }), "D");
  eq("전자 모바일 → C", sel({ archetype: "tech-mobile" }), "C");
  eq("전자 가전 → D", sel({ archetype: "tech-appliance" }), "D");
  eq("식품 → B", sel({ archetype: "food-snack" }), "B");
  eq("패션 제품 단독 → D", sel({ archetype: "fashion-top" }), "D");
  eq("결정적", sel({ archetype: "tech-mobile" }), sel({ archetype: "tech-mobile" }));
  // 사진 종류 추정
  eq("착용 태그 → person", estimatePhotoKind(["전신", "착용"], undefined).kind, "person");
  eq("단독 태그 → product", estimatePhotoKind(["정면", "단독"], "hero").kind, "product");
  eq("태그·역할 없음 → unknown(신뢰도 0)", estimatePhotoKind(undefined, undefined), { kind: "unknown", confidence: 0, whiteBg: false });
  eq("흰 배경 태그", estimatePhotoKind(["단독", "흰 배경"], "hero").whiteBg, true);
  // 해시태그·배지
  eq("키워드 없으면 태그 없음", hashtagsFrom("", null), []);
  eq("# 명시는 그대로", hashtagsFrom("#상처재생 #피부진정", null), ["상처재생", "피부진정"]);
  eq("짧은 키워드만·숫자/괄호/문장 제외", hashtagsFrom("건조함, 당김, 휴대하기 좋은 30mL, 초가을(단독), 가볍게 사용하는 제품입니다", null), ["건조함", "당김"]);
  eq("태그 최대 4개", hashtagsFrom("가나, 다라, 마바, 사아, 자차, 카타", null).length, 4);
  eq("인증 입력 없으면 배지는 히어로 배지만", heroBadgesFrom({ ...hero, badge: "30mL" }, "", "화장품/뷰티", F()), ["30mL"]);
  eq("인증 입력 없고 배지도 없으면 없음", heroBadgesFrom(hero, "", "화장품/뷰티", F()), []);
  eq("인증 입력은 원문 그대로(최대 3개)", heroBadgesFrom({ ...hero, badge: "30mL" }, "피부자극 테스트 완료(자체, n=32), 비건 인증", "화장품/뷰티", F({ certifications: "피부자극 테스트 완료(자체, n=32), 비건 인증" })), ["30mL", "피부자극 테스트 완료", "비건 인증"]);
  // 대비
  if (worstCaseScrimContrast(HERO_SPEC.scrimTextAlpha) < 4.5) fails.push(`스크림 최악 대비 ${worstCaseScrimContrast(HERO_SPEC.scrimTextAlpha).toFixed(2)} < 4.5`);
  if (!/rgba\(10,10,10,0\.78\) 34%/.test(scrimGradient())) fails.push("스크림 곡선 변경됨(텍스트 영역 알파 ≥0.6 확인 필요)");
  for (const accent of ["#2B6CB0", "#F0B6C6", "#E3A72E", "#F5F5DC", "#1F4E5F", "#C22A3A", "#7FA38A"]) {
    const face = saturatedFace(accent);
    const r = contrastRatioToken("#FFFFFF", face);
    if (r < 4.5) fails.push(`포화 면 ${accent}→${face} 흰 글자 대비 ${r.toFixed(2)} < 4.5`);
  }
  // 마크업: 5변형 공통 점검
  const pal = heroPalette(getCategoryTheme("화장품/뷰티"), "화장품/뷰티");
  for (const v of HERO_V2_VARIANTS) {
    const html = heroV2Html(hero, plan({ variant: v, badges: ["30mL"], tags: ["건조함"], nameSub: "DREAM GLOW" }), pal, "alt");
    if (!html.includes(`data-hero-v2="${v}"`)) fails.push(`${v}: 변형 표식 없음`);
    const size = Number(/data-hero-name="(\d+)"/.exec(html)?.[1]);
    if (!(size >= 32 && size <= 44)) fails.push(`${v}: 제품명 ${size}px`);
    const hookSize = Number(/data-hero-hook style="[^"]*font-size:(\d+)px/.exec(html)?.[1]);
    if (!(hookSize >= HERO_SPEC.hookMinPx && hookSize <= HERO_SPEC.hookMaxPx)) fails.push(`${v}: 훅 ${hookSize}px`);
    if (!(size > hookSize)) fails.push(`${v}: 제품명이 훅보다 크지 않음`);
    if (/:has\(|@container|text-wrap|<foreignObject|filter:/.test(html)) fails.push(`${v}: 금지 기법`);
    if (!html.includes("수분 에센스 미스트") || !html.includes("15cm 거리, 촉촉함 한 겹") || !html.includes("#건조함") || !html.includes("DREAM GLOW")) fails.push(`${v}: 입력 문구 누락`);
    if (v !== "E" && !html.includes(urls[0]!)) fails.push(`${v}: 사진 주소 없음`);
  }
  // multiply: 흰 배경 B에서만
  if (!/mix-blend-mode:multiply/.test(heroV2Html(hero, plan({ variant: "B", whiteBg: true }), pal, "a"))) fails.push("B 흰 배경인데 multiply 없음");
  if (/mix-blend-mode/.test(heroV2Html(hero, plan({ variant: "B", whiteBg: false }), pal, "a"))) fails.push("B 일반 사진에 multiply(폴백 카드여야 함)");
  for (const v of ["A", "C", "D", "E"] as const) if (/mix-blend-mode/.test(heroV2Html(hero, plan({ variant: v, whiteBg: true }), pal, "a"))) fails.push(`${v}: multiply 사용`);
  // 계획: 제품명 없음/편집/claimFacts 없음 → 기존 히어로(v2 없음), 있으면 입력 그대로
  const withName = applyDisplayRules(base(), urls, { category: "화장품/뷰티", claimFacts: F(), brandName: "glowiest", tags: [["정면", "단독"]], roles: ["hero"] });
  const h0 = withName.sections[0] as HeroSection;
  eq("계획 생성: 제품명·브랜드 입력 그대로", [h0.v2?.name, h0.v2?.brand], ["수분 에센스 미스트", "glowiest"]);
  eq("뷰티 단독 컷 → B", h0.v2?.variant, "B");
  eq("제품명 없음 → 기존 히어로", (applyDisplayRules(base(), urls, { category: "화장품/뷰티", claimFacts: F({ productName: "" }), brandName: "g" }).sections[0] as HeroSection).v2, undefined);
  eq("편집 모드 → 기존 히어로", (applyDisplayRules(base(), urls, { category: "화장품/뷰티", claimFacts: F(), editing: true }).sections[0] as HeroSection).v2, undefined);
  eq("claimFacts 없음 → 기존 히어로", (applyDisplayRules(base(), urls, { category: "화장품/뷰티" }).sections[0] as HeroSection).v2, undefined);
  // export: 같은 마크업
  const html = buildDetailPageHtml({ productName: "수분 에센스 미스트", brandName: "glowiest", category: "화장품/뷰티", sections: base(), imageUrls: urls, theme: getCategoryTheme("화장품/뷰티"), claimFacts: F(), imageTags: [["정면", "단독"]], imageRoles: ["hero"] });
  if (!/data-hero-v2="B"/.test(html)) fails.push("export에 히어로 v2 마크업 없음");
  return fails;
}
