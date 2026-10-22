/**
 * 회귀 — 437차 1-4 레퍼런스 반영 섹션: 입력 요건 미달은 불변(퀵포인트 4개 미만·고민 사진 띠·후기 5건 미만·review_highlight 존재),
 * 제목·본문·고민·후기 문구는 원문 그대로, 후기 요약은 "판매자 제공 후기" 표기·원문 위조 없음, 페이지당 각 1개, export 동일·금지 CSS 없음. 호출 0.
 */
import { applyDisplayRules } from "../../lib/display-sections";
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";
import { buildClaimFacts } from "../../lib/numeric-claim-gate";
import { CHAT_NOTICE, planReference, referenceHtml } from "../../lib/reference-sections";
import { impactPalette } from "../../lib/impact-templates";
import type { DetailSection } from "../../lib/types/generate";

export const name = "레퍼런스 섹션 — 입력 요건·불변·원문 보존·후기 요약 표기·페이지당 1개·export 동일";

const S = (o: Record<string, unknown>) => o as unknown as DetailSection;
const urls = ["https://example.com/a.jpg", "https://example.com/b.jpg"];
const hero = S({ type: "hero", slot: "hero", headline: "제목", subheadline: "부제", imageIndex: 0 });
const cta = S({ type: "cta_price", slot: "cta_price", price: 1000 });
const mid = S({ type: "highlight_box", slot: "highlight_box", heading: "요약", body: "본문" });
const qp = (h: string, b: string) => S({ type: "image_text", slot: "quick_points", heading: h, body: b, imageIndex: 1, imagePosition: "left", layout: "compact" });
const F = (o: Record<string, unknown> = {}) => buildClaimFacts({ productName: "미스트", brandName: "b", price: 1000, keyFeatures: "미스트", ...o } as never);
type Imp = Extract<DetailSection, { type: "impact" }>;
const imps = (xs: DetailSection[], kind: string) => xs.filter((s): s is Imp => s.type === "impact" && s.kind === kind);
const idx = (n: number) => Array.from({ length: n }, (_, i) => i);
const plan = (secs: DetailSection[], facts = F()) => planReference(secs, idx(secs.length), { facts });

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };
  // 체크포인트 그리드: 퀵포인트 4~6개 연속, 문구 원문, 3개는 불변
  const four = [qp("미스트 안개", "고르게 퍼집니다."), qp("휴대 30mL", "작은 크기입니다."), qp("산뜻한 마무리", "가볍게 마무리됩니다."), qp("가벼운 사용감", "무겁지 않습니다.")];
  const g1 = plan([hero, mid, ...four, mid, cta]);
  eq("그리드 항목=제목+본문 원문", imps(g1.sections, "checkgrid")[0]?.labels, ["미스트 안개\n고르게 퍼집니다.", "휴대 30mL\n작은 크기입니다.", "산뜻한 마무리\n가볍게 마무리됩니다.", "가벼운 사용감\n무겁지 않습니다."]);
  eq("퀵포인트가 그리드로 대체", g1.sections.some((s) => s.type === "image_text" && s.slot === "quick_points"), false);
  eq("3개는 불변", plan([hero, mid, ...four.slice(0, 3), mid, cta]).placed.length, 0);
  eq("제목 17자 이상이면 불변", plan([hero, mid, qp("아주 아주 아주 긴 제목 열일곱자 넘음", "b"), ...four.slice(1), mid, cta]).placed.length, 0);
  eq("페이지당 1개(두 묶음이어도)", imps(plan([hero, mid, ...four, mid, ...four, mid, cta]).sections, "checkgrid").length, 1);
  // 고민 말풍선: 3~5개·40자 이하·사진 띠 없음, 문구 원문
  const ps = ["세안 후 얼굴이 당겨 불편한 분", "건조함이 느껴져 수분을 자주 채우고 싶은 분", "가방에 넣어 다닐 작은 미스트를 찾는 분"];
  const persona = (o: Record<string, unknown> = {}) => S({ type: "target_persona", slot: "target_persona", heading: "세안 후 당김이 남아 있나요?", personas: ps, ...o });
  const b1 = plan([hero, persona(), mid, cta]);
  eq("말풍선 제목·문구 원문", [imps(b1.sections, "bubbles")[0]?.text, imps(b1.sections, "bubbles")[0]?.labels], ["세안 후 당김이 남아 있나요?", ps]);
  eq("사진 띠가 있으면 불변", plan([hero, persona({ imageIndexes: [1] }), mid, cta]).placed.length, 0);
  eq("2개는 불변", plan([hero, persona({ personas: ps.slice(0, 2) }), mid, cta]).placed.length, 0);
  eq("40자 초과는 불변", plan([hero, persona({ personas: [...ps.slice(0, 2), "가".repeat(41)] }), mid, cta]).placed.length, 0);
  // 후기 요약 채팅: 후기 ≥5건·장점 ≥2·review_highlight 없음
  const ri = (n: number, praises = ["촉촉해요", "휴대하기 좋아요", "끈적임 없어요"]) => ({ commonPraises: praises, commonComplaints: [], reviewLineCount: n, praiseMatchCounts: [3, 2, 1] });
  const body = [hero, mid, S({ type: "image_text", slot: "texture_feel", heading: "사용감", body: "본문", imageIndex: 0, imagePosition: "left", layout: "text_only" }), mid, cta];
  const c1 = plan(body, F({ reviewInsights: ri(12) }));
  const chat = imps(c1.sections, "chat")[0];
  eq("후기 문구 원문(요약)", chat?.labels, ["촉촉해요", "휴대하기 좋아요", "끈적임 없어요"]);
  const html = referenceHtml(chat!, impactPalette(getCategoryTheme("화장품/뷰티"), "화장품/뷰티"));
  if (!html.includes(CHAT_NOTICE) || !html.includes("후기 12건")) fails.push("후기 요약 표기(판매자 제공 후기·건수) 없음");
  if (/카카오|kakao|톡/i.test(html)) fails.push("메신저 브랜드를 흉내 냄");
  eq("후기 4건은 불변", plan(body, F({ reviewInsights: ri(4) })).placed.length, 0);
  eq("장점 1개는 불변", plan(body, F({ reviewInsights: ri(12, ["촉촉해요"]) })).placed.length, 0);
  eq("후기 입력 없음은 불변", plan(body).placed.length, 0);
  eq("review_highlight가 있으면 불변", plan([hero, mid, S({ type: "review_highlight", slot: "review_highlight", heading: "후기", praises: ["a", "b"] }), cta], F({ reviewInsights: ri(12) })).placed.length, 0);
  // 전체 표시·export
  const secs = [hero, persona(), mid, ...four, S({ type: "faq", slot: "faq", heading: "FAQ", items: [{ question: "q", answer: "a" }] }), cta];
  const out = applyDisplayRules(secs, urls, { category: "화장품/뷰티", claimFacts: F({ reviewInsights: ri(12) }), brandName: "b" });
  eq("sourceIndexes 길이", out.sourceIndexes.length, out.sections.length);
  const exp = buildDetailPageHtml({ productName: "미스트", brandName: "b", category: "화장품/뷰티", sections: secs, imageUrls: urls, theme: getCategoryTheme("화장품/뷰티"), claimFacts: F({ reviewInsights: ri(12) }) });
  if (!/data-pz-impact="(bubbles|checkgrid|chat)"/.test(exp)) fails.push("export에 레퍼런스 섹션 없음");
  if (/:has\(|@container|text-wrap/.test([...exp.matchAll(/<section data-pz-impact[\s\S]*?<\/section>/g)].map((m) => m[0]).join(""))) fails.push("레퍼런스 마크업에 export 금지 기법");
  return fails;
}
