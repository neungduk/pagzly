/**
 * 회귀 — 439차 2-1·2-6 레이아웃 변주·후킹 구조: 연속 동일 구조 0·같은 변형 ≤2·입력 요건 미달 폴백·결정성·문구 원문·
 * 첫 3화면(히어로 → 한눈에 보기 → 고민)·정보 3연속 없음·구매 유도 접점 1개(가격 있을 때만)·export 동일·금지 CSS 없음. 호출 0.
 * 합성 페이지(파일 안 고정값) + 말뭉치(합성 픽스처·저장 세션이 있으면).
 */
import { applyDisplayRules } from "../../lib/display-sections";
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";
import { buildClaimFacts } from "../../lib/numeric-claim-gate";
import { MAX_SAME_VARIANT, V4_VARIANTS, isInfoSection, structureKey, variantFits, variantOrder } from "../../lib/layout-variants";
import type { DetailSection } from "../../lib/types/generate";
import { corpus, displayOf, exportHtmlOf } from "../design-corpus";

export const name = "레이아웃 변주(v4) — 연속 동일 0·변형 ≤2·요건 폴백·결정성·원문·첫 3화면·정보 3연속 없음·export 동일";

const S = (o: Record<string, unknown>) => o as unknown as DetailSection;
const urls = ["https://example.com/a.jpg", "https://example.com/b.jpg", "https://example.com/c.jpg", "https://example.com/d.jpg"];
const hero = S({ type: "hero", slot: "hero", headline: "건조한 날에도 촉촉하게", subheadline: "부제", imageIndex: 0 });
const qp = (h: string, b: string, img = 1) => S({ type: "image_text", slot: "quick_points", heading: h, body: b, imageIndex: img, imagePosition: "left", layout: "compact" });
const full = (slot: string, h: string, img: number) => S({ type: "image_text", slot, heading: h, body: `${h} 본문입니다.`, imageIndex: img, imagePosition: "left", layout: "full" });
const page = (): DetailSection[] => [
  hero,
  S({ type: "brand_story", slot: "brand_story", heading: "브랜드 이야기", body: "작은 공방에서 시작했습니다. 매일 쓰는 물건을 오래 쓰게 만들고 싶었습니다. 그래서 재료를 고르고 또 골랐습니다. 지금도 같은 방식으로 만듭니다." }),
  S({ type: "target_persona", slot: "target_persona", heading: "이런 고민 있으신가요?", personas: ["세안 후 얼굴이 당기는 분", "수분을 자주 채우고 싶은 분", "작은 미스트를 찾는 분"] }),
  qp("동백 추출물", "촉촉함을 더합니다.", 1), qp("가벼운 마무리", "끈적임이 적습니다.", 2), qp("휴대 30mL", "가방에 쏙 들어갑니다.", 3),
  full("feature_detail", "고운 분사", 1), full("texture_feel", "산뜻한 사용감", 2),
  S({ type: "spec_table", slot: "spec_table", heading: "제품 정보", rows: [{ label: "용량", value: "30mL" }, { label: "사용기한", value: "제조일로부터 24개월" }, { label: "제조국", value: "대한민국" }] }),
  S({ type: "faq", slot: "faq", heading: "자주 묻는 질문", items: [{ question: "메이크업 위에 써도 되나요?", answer: "네, 15cm 거리에서 뿌려 주세요." }] }),
  S({ type: "caution", slot: "caution", heading: "주의사항", body: "눈에 들어가지 않게 주의하세요.\n이상이 있으면 사용을 멈추세요." }),
  S({ type: "cta_price", slot: "cta_price", price: 18900 }),
];
const F = (o: Record<string, unknown> = {}) => buildClaimFacts({ productName: "동백 수분 미스트", brandName: "b", price: 18900, keyFeatures: "동백, 휴대, 30mL", ...o } as never);
type Imp = Extract<DetailSection, { type: "impact" }>;
const v4s = (xs: DetailSection[]) => xs.filter((s): s is Imp => s.type === "impact" && s.kind === "v4");

/** 한 페이지 표시 결과의 규칙 위반 목록 */
export function pageRuleFails(id: string, secs: DetailSection[]): string[] {
  const fails: string[] = [];
  const keys = secs.map(structureKey);
  keys.forEach((k, i) => { if (i > 0 && k === keys[i - 1] && (k.includes(".") && !k.startsWith("impact.") && !k.startsWith("image_text."))) fails.push(`${id}: 연속 동일 구조 ${k} @${i}`); });
  const counts = new Map<string, number>();
  for (const s of v4s(secs)) { const k = `${s.v4!.family}.${s.v4!.variant}`; if (s.v4!.family !== "breather") counts.set(k, (counts.get(k) ?? 0) + 1); }
  for (const [k, n] of counts) if (n > MAX_SAME_VARIANT) fails.push(`${id}: 같은 변형 ${k} ${n}회`);
  let run = 0;
  secs.forEach((s, i) => { run = isInfoSection(s) ? run + 1 : 0; if (run >= 3) fails.push(`${id}: 정보 섹션 3연속 @${i}`); });
  if (v4s(secs).filter((s) => s.v4!.family === "touch").length > 1) fails.push(`${id}: 구매 유도 접점 2개 이상`);
  for (const s of v4s(secs)) if (!V4_VARIANTS[s.v4!.family].includes(s.v4!.variant)) fails.push(`${id}: 모르는 변형 ${s.v4!.family}.${s.v4!.variant}`);
  return fails;
}

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };
  // 입력 요건
  const it = (n: number, photos = 0) => Array.from({ length: n }, (_, i) => ({ title: `항목 ${i + 1}`, ...(i < photos ? { img: { url: urls[i]! } } : {}) }));
  eq("벤토는 3개 이상", [variantFits("benefits", "bento", { items: it(2) }), variantFits("benefits", "bento", { items: it(3) })], [false, true]);
  eq("지그재그는 사진 2장 이상", [variantFits("benefits", "zigzag", { items: it(3, 1) }), variantFits("benefits", "zigzag", { items: it(3, 2) })], [false, true]);
  eq("콜라주는 사진 카드 2개", [variantFits("phototext", "collage", { items: it(1, 1) }), variantFits("phototext", "collage", { items: it(2, 2) })], [false, true]);
  eq("스트립은 짧은 값만", variantFits("spec", "strip", { items: [{ title: "용량", body: "제조일로부터 24개월 이내" }, { title: "a", body: "b" }] }), false);
  eq("인용형은 인용 문장 있을 때만", variantFits("story", "quote", { items: [], body: "본문" }), false);
  eq("변형 순서 결정적", variantOrder("benefits", "playful", 7), variantOrder("benefits", "playful", 7));
  // 합성 페이지
  const facts = F();
  const run1 = applyDisplayRules(page(), urls, { category: "화장품/뷰티", claimFacts: facts, brandName: "b" });
  const run2 = applyDisplayRules(page(), urls, { category: "화장품/뷰티", claimFacts: facts, brandName: "b" });
  eq("결정성", JSON.stringify(run1.sections), JSON.stringify(run2.sections));
  eq("sourceIndexes 길이", run1.sourceIndexes.length, run1.sections.length);
  fails.push(...pageRuleFails("합성", run1.sections));
  const ben = v4s(run1.sections).find((s) => s.v4!.family === "benefits");
  if (!ben) fails.push("합성: 퀵포인트 3장이 benefits 블록이 되지 않음");
  else {
    eq("benefits 문구 원문", ben.v4!.items!.map((x) => [x.title, x.body]), [["동백 추출물", "촉촉함을 더합니다."], ["가벼운 마무리", "끈적임이 적습니다."], ["휴대 30mL", "가방에 쏙 들어갑니다."]]);
    eq("첫 3화면 ②: 한눈에 보기가 히어로 바로 뒤", run1.sections[1] === ben && ben.v4!.glance === true, true);
  }
  const s2 = run1.sections[2]!;
  eq("첫 3화면 ③: 고민 계열", s2.type === "target_persona" || (s2.type === "impact" && (s2.kind === "bubbles" || s2.kind === "checkrows" || s2.v4?.family === "concern")), true);
  eq("구매 유도 접점 가격=입력", v4s(run1.sections).find((s) => s.v4!.family === "touch")?.v4?.price, "18,900원");
  const noPrice = applyDisplayRules(page().filter((s) => s.type !== "cta_price"), urls, { category: "화장품/뷰티", claimFacts: facts, brandName: "b" });
  eq("가격 없으면 접점 없음", v4s(noPrice.sections).some((s) => s.v4!.family === "touch"), false);
  // 퀵포인트 1장은 그대로(요건 미달 폴백)
  const one = applyDisplayRules([hero, qp("하나", "본문"), full("x", "사진", 1), S({ type: "faq", slot: "faq", heading: "Q", items: [{ question: "q", answer: "a" }] }), S({ type: "cta_price", slot: "cta_price", price: 1000 })], urls, { category: "화장품/뷰티", claimFacts: facts, brandName: "b" });
  eq("퀵포인트 1장은 그대로", one.sections.some((s) => s.type === "image_text" && s.slot === "quick_points"), true);
  // export: 같은 v4 블록 순서, 금지 기법 없음
  const exp = buildDetailPageHtml({ productName: "동백 수분 미스트", brandName: "b", category: "화장품/뷰티", sections: page(), imageUrls: urls, theme: getCategoryTheme("화장품/뷰티"), claimFacts: facts });
  const expKeys = [...exp.matchAll(/data-pz-v4="([a-z0-9.]+)"/g)].map((m) => m[1]);
  eq("export v4 순서 = 표시 순서", expKeys, v4s(run1.sections).map((s) => `${s.v4!.family}.${s.v4!.variant}`));
  const v4Html = [...exp.matchAll(/<section[^>]*data-pz-impact="v4"[\s\S]*?<\/section>/g)].map((m) => m[0]).join("");
  if (/:has\(|@container|text-wrap|mix-blend-mode|clip-path/.test(v4Html)) fails.push("v4 마크업에 export 금지·불안정 기법");
  // 말뭉치
  for (const [id, file] of corpus()) {
    const d = displayOf(file);
    fails.push(...pageRuleFails(id, d.sections));
    const keys = [...exportHtmlOf(file).matchAll(/data-pz-v4="([a-z0-9.]+)"/g)].map((m) => m[1]);
    eq(`${id}: export v4 순서`, keys, v4s(d.sections).map((s) => `${s.v4!.family}.${s.v4!.variant}`));
  }
  return fails;
}
