/**
 * 회귀 — 433차 1-4 증빙 모듈: 입력(인증·시험 문구, 업로드 후기)이 없으면 출력이 현재와 동일, 있으면 입력 그대로·출처 표기·규제 표현은 제외·후기 5건 미만은 건너뜀·별점·비율 없음·뷰티·패션만. 호출 0.
 */
import { applyDisplayRules } from "../../lib/display-sections";
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";
import { buildClaimFacts } from "../../lib/numeric-claim-gate";
import { buildProofRows, buildReviewStat } from "../../lib/evidence-modules";
import type { DetailSection } from "../../lib/types/generate";

export const name = "증빙 모듈 — 입력 없음=불변·인증/시험 입력 그대로+출처·규제 표현 제외·후기 5건 미만 건너뜀·별점 없음·카테고리 한정·export 동일";

const S = (o: Record<string, unknown>) => o as unknown as DetailSection;
const urls = ["https://example.com/a.jpg", "https://example.com/b.jpg"];
const base = (): DetailSection[] => [
  S({ type: "hero", slot: "hero", headline: "제목", subheadline: "부제", imageIndex: 0 }),
  S({ type: "target_persona", slot: "target_persona", heading: "고민", personas: ["a", "b", "c"] }),
  S({ type: "brand_story", slot: "brand_story", heading: "브랜드", body: "본문" }),
  S({ type: "image_text", slot: "quick_points", heading: "포인트", body: "설명", imageIndex: 1, imagePosition: "left", layout: "compact" }),
  S({ type: "image_text", slot: "texture_feel", heading: "사용감", body: "본문", imageIndex: 1, imagePosition: "left", layout: "text_only" }),
  S({ type: "usage_steps", slot: "step_card", heading: "사용", steps: ["1", "2"] }),
  S({ type: "faq", slot: "faq", heading: "FAQ", items: [{ question: "q", answer: "a" }] }),
  S({ type: "cta_price", slot: "cta_price", price: 1000 }),
];
const F = (o: Record<string, unknown> = {}) => buildClaimFacts({ productName: "미스트", brandName: "b", price: 1000, keyFeatures: "미스트", ...o } as never);
const proofOf = (xs: DetailSection[]) => xs.find((s) => s.type === "impact" && s.kind === "proof") as Extract<DetailSection, { type: "impact" }> | undefined;
const statOf = (xs: DetailSection[]) => xs.find((s) => s.type === "impact" && s.kind === "reviewstat") as Extract<DetailSection, { type: "impact" }> | undefined;

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };
  // 입력 없음 → 증빙 카드 없음(현재와 동일)
  const none = applyDisplayRules(base(), urls, { category: "화장품/뷰티", claimFacts: F() });
  eq("입력 없음: 증빙 없음", [!!proofOf(none.sections), !!statOf(none.sections)], [false, false]);
  eq("인증 문구만 있고 표지 없음", !!proofOf(applyDisplayRules(base(), urls, { category: "화장품/뷰티", claimFacts: F({ certifications: "비건, 무향" }) }).sections), false);
  // 인증·시험 입력: 그대로 + 출처
  const withCert = applyDisplayRules(base(), urls, { category: "화장품/뷰티", claimFacts: F({ certifications: "피부자극 테스트 완료(자체, n=32), 비건 인증, 무향" }) });
  const p = proofOf(withCert.sections);
  eq("인증 행", p?.stats?.map((r) => [r.tag, r.label, r.value]), [["시험 결과", "피부자극 테스트 완료", "자체, n=32"], ["인증", "비건 인증", "판매자 제공 정보"]]);
  // 위치: 근거 단계 앞(해결 구간 뒤), 히어로 직후 아님
  const at = withCert.sections.findIndex((s) => s.type === "impact" && s.kind === "proof");
  if (at < 2) fails.push("증빙 카드가 히어로 직후");
  // 규제 표현: 치료·완치 표현이 든 항목은 제외
  eq("규제 표현 제외", buildProofRows("여드름 치료 시험 결과, 피부자극 테스트 완료", "화장품/뷰티", F()).map((r) => r.label), ["피부자극 테스트 완료"]);
  // 후기: 5건 미만 건너뜀, 이상이면 건수·키워드별 언급 건수만(별점·% 없음)
  const ri = (n: number) => ({ commonPraises: ["촉촉해요", "휴대하기 좋아요"], commonComplaints: [], reviewLineCount: n, praiseMatchCounts: [7, 4] });
  eq("후기 4건 건너뜀", buildReviewStat(F({ reviewInsights: ri(4) }), "화장품/뷰티"), null);
  const st = buildReviewStat(F({ reviewInsights: ri(12) }), "화장품/뷰티");
  eq("후기 통계", [st?.text, st?.unit, st?.stats], ["12", "건", [{ label: "촉촉해요", value: "7건" }, { label: "휴대하기 좋아요", value: "4건" }]]);
  const joined = JSON.stringify(st);
  if (/별점|평점|★|%|점\b/.test(joined)) fails.push("후기 통계에 별점·비율 표기");
  const withReview = applyDisplayRules(base(), urls, { category: "화장품/뷰티", claimFacts: F({ reviewInsights: ri(12) }) });
  eq("후기 카드 삽입", !!statOf(withReview.sections), true);
  // 카테고리 한정·편집 모드·claimFacts 없음
  eq("전자 제외", !!proofOf(applyDisplayRules(base(), urls, { category: "전자제품", claimFacts: F({ certifications: "KC 인증" }) }).sections), false);
  eq("편집 모드 제외", !!proofOf(applyDisplayRules(base(), urls, { category: "화장품/뷰티", claimFacts: F({ certifications: "KC 인증" }), editing: true }).sections), false);
  eq("claimFacts 없음 제외", !!proofOf(applyDisplayRules(base(), urls, { category: "화장품/뷰티" }).sections), false);
  eq("sourceIndexes 길이", withCert.sourceIndexes.length, withCert.sections.length);
  // export: 같은 마크업
  const html = buildDetailPageHtml({ productName: "미스트", brandName: "b", category: "화장품/뷰티", sections: base(), imageUrls: urls, theme: getCategoryTheme("화장품/뷰티"), certifications: "피부자극 테스트 완료(자체, n=32)", claimFacts: F({ certifications: "피부자극 테스트 완료(자체, n=32)", reviewInsights: ri(12) }) });
  if (!/data-pz-impact="proof"/.test(html) || !/data-pz-impact="reviewstat"/.test(html)) fails.push("export에 증빙 마크업 없음");
  if (/:has\(|@container|text-wrap/.test([...html.matchAll(/<section data-pz-impact[\s\S]*?<\/section>/g)].map((m) => m[0]).join(""))) fails.push("증빙 마크업에 export 금지 기법");
  return fails;
}
