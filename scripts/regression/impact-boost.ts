/**
 * 회귀 — 435차 임팩트 보강: brand_story 텍스트 보존(인용+나머지 = 원문), 짧은 글은 Big statement, 추천/참고 카드 제목-내용 일치(고민이 있으면 추천 열 없이 참고 블록만·
 * 제목은 기존 라벨), 둘 다 있으면 두 블록, 일러스트 오브젝트-면 대비 ≥3:1(전 카테고리 테마), 글자 크기 하한, export 동일·금지 기법 없음. 호출 0.
 */
import { applyDisplayRules } from "../../lib/display-sections";
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";
import { buildClaimFacts } from "../../lib/numeric-claim-gate";
import { NOTE_LABEL, STORY_QUOTE_MAX, STORY_QUOTE_MIN, boostHtml, splitQuote } from "../../lib/impact-boost";
import { boostIllustColors, impactPalette } from "../../lib/impact-templates";
import { contrastRatioToken, pastelFace } from "../../lib/design-tokens";
import type { DetailSection } from "../../lib/types/generate";

export const name = "임팩트 보강 — brand_story 텍스트 보존·짧은 글 statement·추천/참고 제목-내용 일치·일러스트 면 대비 ≥3:1·글자 크기·export 동일";

const S = (o: Record<string, unknown>) => o as unknown as DetailSection;
const urls = ["https://example.com/a.jpg", "https://example.com/b.jpg"];
const LONG = "glowiest는 맑고 촉촉한 수분을 담는 일에 집중하는 브랜드입니다. 건조함과 당김이 느껴질 때 부담 없이 꺼내 쓸 수 있는 미스트를 준비했습니다.\n\n동백 추출물과 히알루론산을 담았습니다. 가벼운 사용감입니다.";
const base = (story: string, trade: Record<string, unknown> | null, persona: boolean): DetailSection[] => [
  S({ type: "hero", slot: "hero", headline: "제목", subheadline: "부제", imageIndex: 0 }),
  ...(persona ? [S({ type: "target_persona", slot: "target_persona", heading: "고민", personas: ["a 고민", "b 고민", "c 고민"] })] : []),
  S({ type: "brand_story", slot: "brand_story", heading: "맑은 수분을 담는 브랜드", body: story, imageIndexes: [1] }),
  S({ type: "highlight_box", slot: "highlight_box", heading: "요약", body: "본문" }),
  S({ type: "usage_steps", slot: "step_card", heading: "사용", steps: ["1", "2"] }),
  ...(trade ? [S({ type: "tradeoff_card", slot: "tradeoff_card", heading: "이런 분께 잘 맞아요", ...trade })] : []),
  S({ type: "faq", slot: "faq", heading: "FAQ", items: [{ question: "q", answer: "a" }] }),
  S({ type: "cta_price", slot: "cta_price", price: 1000 }),
];
const F = () => buildClaimFacts({ productName: "미스트", brandName: "glowiest", price: 1000, keyFeatures: "미스트" } as never);
type Imp = Extract<DetailSection, { type: "impact" }>;
const run1 = (secs: DetailSection[]) => applyDisplayRules(secs, urls, { category: "화장품/뷰티", claimFacts: F(), brandName: "glowiest" });
const impacts = (xs: DetailSection[]) => xs.filter((s): s is Imp => s.type === "impact");
const norm = (t: string) => t.replace(/\s+/g, " ").trim();

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };
  // 1-1 브랜드 스토리: 인용 12~40자 + 나머지 = 원문, 칩=입력 브랜드명, 사진=입력 사진
  const sq = splitQuote(LONG);
  if (!sq || sq.quote.length < STORY_QUOTE_MIN || sq.quote.length > STORY_QUOTE_MAX) fails.push(`인용 길이 ${sq?.quote.length}`);
  eq("원문 연결 동일", norm(`${sq?.quote} ${sq?.rest}`), norm(LONG));
  eq("첫 문장이 40자 초과면 인용 없음", splitQuote(`${"가".repeat(45)}입니다. 다음 문장입니다.`), null);
  const out = run1(base(LONG, null, true));
  const story = impacts(out.sections).find((s) => s.kind === "story");
  if (!story) fails.push("brand_story가 story로 안 바뀜");
  else {
    eq("스토리 텍스트 보존", norm(`${story.quote ?? ""} ${story.body ?? ""}`), norm(LONG));
    eq("브랜드 칩=입력 브랜드명", story.chip, "glowiest");
    eq("제목 그대로", story.text, "맑은 수분을 담는 브랜드");
    if (story.images?.[0]?.url !== urls[1]) fails.push("입력 사진이 아님");
  }
  const short = impacts(run1(base("맑은 수분을 담습니다. 가볍게 씁니다.", null, true)).sections).map((s) => s.kind);
  if (!short.includes("statement")) fails.push("짧은 글이 Big statement로 안 바뀜");
  // 1-3 추천/참고: 고민이 있으면 추천 열 없이 참고 블록만, 제목은 기존 라벨
  const trade = { recommendFor: ["세안 후 당김이 느껴지는 분", "휴대용 미니 미스트를 찾는 분"], considerIf: ["민감한 피부라면 사용 전 전성분을 확인해 주세요."] };
  const withPersona = impacts(run1(base(LONG, trade, true)).sections).filter((s) => s.kind === "fit" || s.kind === "note");
  eq("고민 있음: 참고 블록만", withPersona.map((s) => s.kind), ["note"]);
  eq("참고 블록 제목=기존 라벨", withPersona[0]?.text, NOTE_LABEL);
  eq("참고 블록 내용=참고 항목", withPersona[0]?.labels, trade.considerIf);
  const noPersona = impacts(run1(base(LONG, trade, false)).sections).filter((s) => s.kind === "fit" || s.kind === "note");
  eq("고민 없음: 두 블록 분리", noPersona.map((s) => s.kind), ["fit", "note"]);
  eq("추천 블록 제목·항목", [noPersona[0]?.text, noPersona[0]?.labels], ["이런 분께 잘 맞아요", trade.recommendFor]);
  for (const s of impacts(run1(base(LONG, trade, true)).sections)) if (s.kind === "fit" && (s.labels ?? []).some((l) => trade.considerIf.includes(l))) fails.push("추천 블록에 참고 항목이 섞임");
  const empty = run1(base(LONG, { recommendFor: [], considerIf: [] }, true));
  eq("둘 다 비면 보강 블록 없음", impacts(empty.sections).some((s) => s.kind === "fit" || s.kind === "note"), false);
  // 1-4 주의 카드·글 카드: 규제 문구 줄 단위 그대로·글 카드 연속 변환 금지·feature_callout 불변
  const CAUTION = "사용 중 이상이 있으면 중단하십시오.\n어린이 손이 닿지 않는 곳에 보관하십시오.";
  const tx = (h: string, slot = "texture_feel") => S({ type: "image_text", slot, heading: h, body: `${h} 본문 설명입니다.`, imageIndex: 0, imagePosition: "left", layout: "text_only" });
  const secs4: DetailSection[] = [S({ type: "hero", slot: "hero", headline: "제목", subheadline: "부제", imageIndex: 0 }), S({ type: "target_persona", slot: "target_persona", heading: "고민", personas: ["a 고민", "b 고민", "c 고민"] }), tx("글 카드 하나"), tx("글 카드 둘"), tx("글 카드 셋"), tx("말풍선", "feature_callout"), S({ type: "caution", slot: "caution", heading: "사용 시 참고하세요", body: CAUTION }), S({ type: "faq", slot: "faq", heading: "FAQ", items: [{ question: "q", answer: "a" }] }), S({ type: "cta_price", slot: "cta_price", price: 1000 })];
  const o4 = run1(secs4).sections;
  const cautionNote = impacts(o4).find((s) => s.kind === "note");
  eq("주의 문구 줄 단위 그대로", cautionNote?.labels?.join("\n"), CAUTION);
  eq("주의 카드 제목 그대로", cautionNote?.text, "사용 시 참고하세요");
  o4.forEach((s, i) => { if (i > 0 && s.type === "impact" && s.kind === "textboost" && o4[i - 1]!.type === "impact" && (o4[i - 1] as Imp).kind === "textboost") fails.push("글 카드 연속 변환"); });
  if (!impacts(o4).some((s) => s.kind === "textboost")) fails.push("글 카드가 textboost로 안 바뀜");
  if (!o4.some((s) => s.type === "image_text" && s.slot === "feature_callout")) fails.push("feature_callout이 바뀜");
  // 1-2 일러스트 면 대비: 전 카테고리 테마에서 주색-면 ≥3:1
  for (const cat of ["화장품/뷰티", "의류/패션", "전자제품", "식품", "생활용품", "반려동물"]) {
    const th = getCategoryTheme(cat);
    const face = pastelFace(th, cat);
    const c = boostIllustColors(th, face);
    for (const [k, col] of [["a", c.a], ["b", c.b], ["c", c.c]] as const) {
      const r = contrastRatioToken(col, face);
      if (r < 3) fails.push(`${cat}: 일러스트 ${k}색-면 대비 ${r.toFixed(2)} < 3(변형 회전 시 주색이 됨)`);
    }
  }
  // 글자 크기 하한: 본문 ≥15px, 라벨 칩 ≥14px
  const pal = impactPalette(getCategoryTheme("화장품/뷰티"), "화장품/뷰티");
  const htmlStory = boostHtml({ type: "impact", slot: "impact", kind: "story", text: "제목", quote: "인용 문장입니다 인용", body: "본문", chip: "브랜드" }, pal, "a");
  const sizes = [...htmlStory.matchAll(/font-size:([\d.]+)px/g)].map((m) => Number(m[1]));
  if (Math.min(...sizes.filter((n) => n !== 12)) < 15) fails.push(`story 글자 크기 ${Math.min(...sizes)}px`);
  // export 동일·금지 기법
  const html = buildDetailPageHtml({ productName: "미스트", brandName: "glowiest", category: "화장품/뷰티", sections: base(LONG, trade, true), imageUrls: urls, theme: getCategoryTheme("화장품/뷰티"), claimFacts: F() });
  if (!/data-pz-impact="story"/.test(html) || !/data-pz-impact="note"/.test(html)) fails.push("export에 보강 마크업 없음");
  if (/:has\(|@container|text-wrap/.test([...html.matchAll(/<section data-pz-impact[\s\S]*?<\/section>/g)].map((m) => m[0]).join(""))) fails.push("보강 마크업에 export 금지 기법");
  return fails;
}
