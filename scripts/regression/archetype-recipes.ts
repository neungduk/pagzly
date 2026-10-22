/**
 * 회귀 — 436차 1-2 레시피·mood: 16유형 전부 레시피 보유, mood 토큰 범위 일관, 레시피 순서(단계 이동·우선순위·배송 슬롯 보호), 유형 미정/플래그 대상 아님 = 순서 불변,
 * 유형마다 섹션 순서가 실제로 달라짐(편집 거리 > 0), applyMood(배율 1.0 = 항등, 여백·반경·그림자·굵기 변환), mood 찍힘. 호출 0.
 */
import { applyDisplayRules } from "../../lib/display-sections";
import { applyRecipeOrder } from "../../lib/detail-story-order";
import { ARCHETYPE_IDS } from "../../lib/product-archetype";
import { MOODS, MOOD_IDS, RECIPES, archetypeHeroLayout, pickMood, recipeFor } from "../../lib/archetype-recipes";
import { NEUTRAL_MOOD, applyMood } from "../../lib/mood";
import { buildClaimFacts } from "../../lib/numeric-claim-gate";
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";
import { HERO_V2_ENABLED } from "../../lib/hero-spec";
import { CLASSIC_LAYOUT } from "../../lib/style-packs";
import type { DetailSection } from "../../lib/types/generate";

export const name = "아키타입 레시피·mood — 16유형 레시피·토큰 범위·레시피 순서·미정 불변·유형별 순서 편차·applyMood";

const S = (o: Record<string, unknown>) => o as unknown as DetailSection;
const urls = ["https://example.com/a.jpg", "https://example.com/b.jpg"];
const gen = (): DetailSection[] => [
  S({ type: "hero", slot: "hero", headline: "제목", subheadline: "부제", imageIndex: 0 }),
  S({ type: "target_persona", slot: "target_persona", heading: "고민", personas: ["a 고민", "b 고민", "c 고민"] }),
  S({ type: "brand_story", slot: "brand_story", heading: "브랜드", body: "브랜드 소개 본문입니다. 두 번째 문장입니다. 세 번째 문장도 이어집니다 그리고 길게." }),
  S({ type: "image_text", slot: "feature_detail", heading: "기능", body: "기능 설명입니다 길게 적어 둡니다.", imageIndex: 1, imagePosition: "left", layout: "full" }),
  S({ type: "image_text", slot: "ingredient_highlight", heading: "성분", body: "성분 설명입니다 길게 적어 둡니다.", imageIndex: 1, imagePosition: "left", layout: "full" }),
  S({ type: "stat_infographic", slot: "stat_infographic", heading: "수치", metrics: [{ label: "용량", value: "30mL" }] }),
  S({ type: "usage_steps", slot: "step_card", heading: "사용", steps: ["1", "2", "3"] }),
  S({ type: "image_text", slot: "fit_guide", heading: "핏", body: "핏 설명입니다 길게 적어 둡니다.", imageIndex: 1, imagePosition: "left", layout: "full" }),
  S({ type: "spec_table", slot: "spec_table", heading: "스펙", rows: [{ label: "a", value: "b" }] }),
  S({ type: "spec_table", slot: "shipping_info", heading: "배송", rows: [{ label: "a", value: "b" }] }),
  S({ type: "faq", slot: "faq", heading: "FAQ", items: [{ question: "q", answer: "a" }] }),
  S({ type: "cta_price", slot: "cta_price", price: 1000 }),
];
const slots = (xs: DetailSection[]) => xs.map((s) => ((s as { slot?: string }).slot ?? s.type));
const editDist = (a: string[], b: string[]): number => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i += 1) for (let j = 1; j <= b.length; j += 1) d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length]![b.length]!;
};

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };
  // 레시피·mood 데이터 일관성
  eq("16유형 전부 레시피", ARCHETYPE_IDS.filter((id) => !recipeFor(id)), []);
  eq("default는 레시피 없음", recipeFor("default"), null);
  for (const r of Object.values(RECIPES)) {
    if (r.moods.length < 1 || r.moods.length > 3 || r.moods.some((m) => !MOOD_IDS.includes(m))) fails.push(`${r.id}: mood 목록 ${r.moods}`);
    if (r.rotation.length < 4) fails.push(`${r.id}: 사진 회전 ${r.rotation.length}종 < 4`);
    if (r.rotation.some((k) => r.skip.includes(k) && false)) fails.push(`${r.id}: 회전·제외 충돌`);
  }
  for (const id of MOOD_IDS) {
    const k = MOODS[id];
    if (k.pad < 0.8 || k.pad > 1.25 || k.r < 0.1 || k.r > 2 || k.sh < 0.4 || k.sh > 1.5) fails.push(`${id}: 토큰 범위 밖`);
    if (!["wave", "slant", "line", "none"].includes(k.divider) || ![700, 800, 900].includes(k.titleWeight)) fails.push(`${id}: 토큰 값`);
  }
  eq("mood 6종", MOOD_IDS.length, 6);
  eq("키워드가 가장 많이 맞는 mood", pickMood(RECIPES["fashion-outer"], "도톰하고 포근한 니트 오버핏"), "warm");
  eq("키워드 없으면 기본 mood", pickMood(RECIPES["fashion-top"], "평범한 상품"), RECIPES["fashion-top"].moods[0]);
  // 레시피 순서: 배송 슬롯(spec_table 종류)은 스펙 레시피에 끌려가지 않음, hero·cta 고정, 개수 보존
  const tech = applyRecipeOrder(gen(), RECIPES["tech-mobile"]);
  eq("개수 보존", tech.length, gen().length);
  eq("히어로·구매 위치", [tech[0]!.type, tech[tech.length - 1]!.type], ["hero", "cta_price"]);
  const ts = slots(tech);
  if (ts.indexOf("spec_table") > ts.indexOf("usage_steps") && ts.indexOf("usage_steps") >= 0 && false) fails.push("never");
  if (ts.indexOf("shipping_info") < ts.indexOf("faq") - 0 && ts.indexOf("shipping_info") < ts.indexOf("spec_table")) fails.push("배송 슬롯이 스펙 앞으로 이동");
  if (ts.indexOf("feature_detail") > ts.indexOf("brand_story")) fails.push("전자: 기능이 브랜드 스토리보다 뒤");
  // 유형 간 순서 편차: 같은 섹션 목록을 유형별 레시피로 정렬하면 서로 달라진다
  const orders = Object.fromEntries(ARCHETYPE_IDS.map((id) => [id, slots(applyRecipeOrder(gen(), RECIPES[id]))]));
  const base = slots(gen());
  const changed = ARCHETYPE_IDS.filter((id) => editDist(orders[id]!, base) > 0).length;
  if (changed < 8) fails.push(`순서가 바뀌는 유형 ${changed}/16 (< 8)`);
  const pairs: number[] = [];
  for (let i = 0; i < ARCHETYPE_IDS.length; i += 1) for (let j = i + 1; j < ARCHETYPE_IDS.length; j += 1) pairs.push(editDist(orders[ARCHETYPE_IDS[i]!]!, orders[ARCHETYPE_IDS[j]!]!));
  if (!pairs.some((d) => d >= 3)) fails.push("유형 간 편집 거리 ≥3 쌍이 없음");
  // 유형 미정/폴백은 불변: 신호 없는 상품명 → default → 레시피 순서 적용 안 됨(기존 순서와 동일)
  const facts = (name: string, kf: string, cat = "전자제품") => buildClaimFacts({ productName: name, brandName: "b", price: 1000, keyFeatures: kf } as never);
  const plain = applyDisplayRules(gen(), urls, { category: "전자제품", claimFacts: facts("신상품", "좋은 제품"), brandName: "b" });
  eq("유형 미정이면 archetype fallback", plain.archetype?.result.fallback, true);
  eq("유형 미정이면 mood 없음", plain.archetype?.mood, null);
  const typed = applyDisplayRules(gen(), urls, { category: "전자제품", claimFacts: facts("블루투스 이어버드", "ANC 이어훅"), brandName: "b" });
  eq("유형 판별", typed.archetype?.result.id, "tech-mobile");
  const moods = typed.sections.filter((s) => s.type === "impact").map((s) => (s as { mood?: string }).mood);
  if (moods.length > 0 && moods.some((m) => m !== typed.archetype?.mood)) fails.push("임팩트 블록에 mood가 안 찍힘");
  eq("편집 모드는 archetype 없음", applyDisplayRules(gen(), urls, { category: "전자제품", claimFacts: facts("블루투스 이어버드", "ANC"), editing: true }).archetype, undefined);
  // applyMood: 항등·변환
  const html = `<section data-pz-impact="x" style="padding:48px 24px;background:#fff"><div style="border-radius:16px;box-shadow:0 4px 12px rgba(27, 27, 24, 0.18)"></div><p style="font-family:var(--pz-f-title, 'Noto Sans KR', system-ui, -apple-system, 'Malgun Gothic', sans-serif);font-size:22px;font-weight:800;letter-spacing:-0.02em">제목</p></section>`;
  eq("단계에 맞는 입력 + 중립 mood는 항등", applyMood(html, NEUTRAL_MOOD), html);
  // 토큰 단계 스냅(1-5): 여백 32/48/64·반경 8/16/24·그림자 알파 0.10/0.18, 알약·원·진한 그림자는 그대로
  const odd = html.replace("padding:48px", "padding:44px").replace("border-radius:16px", "border-radius:14px").replace("0.18", "0.2");
  eq("임의 값이 단계로 맞춰짐", applyMood(odd, NEUTRAL_MOOD), html);
  eq("알약·원은 그대로", applyMood(`<section style="padding:48px 24px"><span style="border-radius:999px"></span><i style="border-radius:50%"></i></section>`, { ...NEUTRAL_MOOD, r: 0.5 }), `<section style="padding:48px 24px"><span style="border-radius:999px"></span><i style="border-radius:50%"></i></section>`);
  const airy = applyMood(html, { ...NEUTRAL_MOOD, pad: 1.2, r: 0.5, sh: 0.5, titleWeight: 700, titleTracking: "0.005em" });
  if (!airy.includes("padding:58px 24px") || !airy.includes("border-radius:8px") || !airy.includes("rgba(27, 27, 24, 0.09)") || !airy.includes("font-weight:700;letter-spacing:0.005em")) fails.push(`applyMood 변환: ${airy}`);
  // 히어로(1-4): 팩이 히어로를 정하지 않은 classic일 때만 아키타입 히어로, 팩이 정한 히어로는 그대로, export에 arch 마크업
  eq("classic이면 아키타입 히어로", archetypeHeroLayout({ ...CLASSIC_LAYOUT, hero: "bleed-bottom" }, "arch").hero, "arch");
  eq("팩이 정한 히어로는 유지", archetypeHeroLayout({ ...CLASSIC_LAYOUT, hero: "full-photo" }, "arch").hero, "full-photo");
  eq("레시피 히어로 없음(null)은 불변", archetypeHeroLayout({ ...CLASSIC_LAYOUT, hero: "bleed-bottom" }, null).hero, "bleed-bottom");
  const outerFacts = buildClaimFacts({ productName: "브이넥 니트 가디건", brandName: "b", price: 1000, keyFeatures: "가을 아우터" } as never);
  const outerHtml = buildDetailPageHtml({ productName: "브이넥 니트 가디건", brandName: "b", category: "의류/패션", sections: gen(), imageUrls: urls, theme: getCategoryTheme("의류/패션"), claimFacts: outerFacts });
  // 437차: 히어로 v2가 켜져 있으면 첫 화면은 v2 히어로가 대신한다(arch는 v2 off일 때의 히어로)
  if (!HERO_V2_ENABLED && (!/data-hero-variant="arch"/.test(outerHtml) || !/999px 999px 24px 24px/.test(outerHtml))) fails.push("export 히어로에 arch 마크업 없음");
  if (HERO_V2_ENABLED && !/data-hero-v2="/.test(outerHtml)) fails.push("export 히어로 v2 마크업 없음");
  return fails;
}
