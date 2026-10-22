/**
 * 회귀 — 433차 1-2 임팩트 화면 템플릿: 새 문구·수치 없음(모든 글이 입력 섹션 문구), 숫자 게이트 통과 값만, 사진 없으면 건너뜀,
 * 연속 같은 템플릿 금지·최소 간격·종류별 상한, 편집 모드·claimFacts 없음 불변, export 마크업 포함·금지 CSS 없음. 호출 0.
 */
import { applyDisplayRules } from "../../lib/display-sections";
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";
import { buildClaimFacts } from "../../lib/numeric-claim-gate";
import { IMPACT_MIN_GAP_PX, estimateSectionHeight } from "../../lib/impact-templates";
import type { DetailSection } from "../../lib/types/generate";

export const name = "임팩트 템플릿 — 새 문구 없음·숫자 게이트·건너뜀·연속 금지·간격·상한·편집/claimFacts 없음 불변·export 동일·금지 CSS 없음";

const S = (o: Record<string, unknown>) => o as unknown as DetailSection;
const urls = Array.from({ length: 8 }, (_, i) => `https://example.com/p${i}.jpg`);
const full = (h: string, i: number) => S({ type: "image_text", slot: "detail_zoom", heading: h, body: `${h} 본문입니다.`, imageIndex: i, imagePosition: "left", layout: "full" });
const qp = (h: string, i: number) => S({ type: "image_text", slot: "quick_points", heading: h, body: `${h} 설명`, imageIndex: i, imagePosition: "left", layout: "compact" });
const build = (): DetailSection[] => [
  S({ type: "hero", slot: "hero", headline: "제목", subheadline: "미스트 30mL, 가볍게", imageIndex: 0, badge: "30mL" }),
  S({ type: "target_persona", slot: "target_persona", heading: "고민", personas: ["a", "b", "c"] }),
  S({ type: "checklist", slot: "checklist", heading: "확인", items: ["가볍다", "5사이즈 구성", "촉촉하다"] }),
  qp("굵은 립", 1), qp("큼직한 단추", 2), qp("넓은 브이넥", 3),
  S({ type: "image_text", slot: "feature_callout", heading: "마감", body: "본문", imageIndex: 4, imagePosition: "left", layout: "text_only", callout: "손목에서 흘러내리지 않게" }),
  S({ type: "highlight_box", slot: "highlight_box", heading: "요약", body: "본문" }),
  full("첫 사진", 4), S({ type: "stat_infographic", slot: "stat_infographic", heading: "수치", metrics: [{ label: "용량", value: "30mL" }] }),
  full("둘째 사진", 5), S({ type: "usage_steps", slot: "step_card", heading: "사용", steps: ["1", "2"] }),
  full("셋째 사진", 6), S({ type: "faq", slot: "faq", heading: "FAQ", items: [{ question: "q", answer: "a" }] }),
  S({ type: "cta_price", slot: "cta_price", price: 1000 }),
];
const F = (o: Record<string, unknown> = {}) => buildClaimFacts({ productName: "가디건", brandName: "b", price: 1000, targetCustomer: "", keyFeatures: "30mL 5사이즈 구성", ingredients: "", ...o } as never);

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };
  const input = build();
  const out = applyDisplayRules(input, urls, { category: "의류/패션", claimFacts: F() });
  const impacts = out.sections.filter((s) => s.type === "impact") as Array<Extract<DetailSection, { type: "impact" }>>;
  if (impacts.length === 0) fails.push("임팩트가 하나도 안 들어감");
  // 새 문구 없음: 모든 임팩트 글은 입력 섹션 문자열에 그대로 있다
  const pool = JSON.stringify(input);
  for (const s of impacts) for (const t of [s.text, s.unit, s.sub, s.body, ...(s.labels ?? []).flatMap((l) => l.split("\n"))]) if (t && !pool.includes(t)) fails.push(`${s.kind}: 입력에 없는 글 "${t}"`);
  // 같은 템플릿 연속 금지 + 최소 간격 + 상한
  const kinds = impacts.map((s) => s.kind);
  kinds.forEach((k, i) => { if (i > 0 && k === kinds[i - 1]) fails.push(`같은 템플릿 연속 ${k}`); });
  const cnt = (k: string) => kinds.filter((x) => x === k).length;
  if (cnt("statement") > 2 || cnt("number") > 1 || cnt("callout") > 1 || cnt("bleed") > 2 || cnt("split") > 2) fails.push(`종류별 상한 초과 ${kinds}`);
  let y = 0; const ys: number[] = [];
  out.sections.forEach((s) => { if (s.type === "impact") ys.push(y); y += estimateSectionHeight(s); });
  ys.forEach((v, i) => { if (i > 0 && v - ys[i - 1]! < IMPACT_MIN_GAP_PX - 400) fails.push("임팩트 간격 부족"); });
  // 히어로 바로 뒤에는 넣지 않음, 구매 카드·FAQ는 그대로
  if (out.sections[1]!.type === "impact") fails.push("히어로 바로 뒤 임팩트");
  eq("구매 카드 유지", out.sections[out.sections.length - 1]!.type, "cta_price");
  eq("sourceIndexes 길이", out.sourceIndexes.length, out.sections.length);
  // 숫자 게이트: 입력에 없는 수치가 든 항목은 number 후보가 되지 않는다
  const noNum = applyDisplayRules(input, urls, { category: "의류/패션", claimFacts: F({ keyFeatures: "가볍다" }) });
  if (noNum.sections.some((s) => s.type === "impact" && s.kind === "number" && s.unit === "사이즈")) fails.push("입력에 없는 수치로 number 생성");
  // 사진 없음: 이미지 URL이 없으면 사진 템플릿 없음
  const noPhoto = applyDisplayRules(input, [], { category: "의류/패션", claimFacts: F() });
  if (noPhoto.sections.some((s) => s.type === "impact" && (s.kind === "bleed" || s.kind === "split" || s.kind === "callout"))) fails.push("사진 없는데 사진 템플릿");
  // 불변: claimFacts 없음·편집 모드
  eq("claimFacts 없으면 임팩트 없음", applyDisplayRules(input, urls, { category: "의류/패션" }).sections.some((s) => s.type === "impact"), false);
  eq("편집 모드 임팩트 없음", applyDisplayRules(input, urls, { category: "의류/패션", claimFacts: F(), editing: true }).sections.some((s) => s.type === "impact"), false);
  // export: 같은 마크업·금지 CSS 없음
  const html = buildDetailPageHtml({ productName: "가디건", brandName: "b", category: "의류/패션", sections: input, imageUrls: urls, theme: getCategoryTheme("의류/패션"), claimFacts: F() });
  if (!/data-pz-impact="/.test(html)) fails.push("export에 임팩트 마크업 없음");
  const impactHtmlText = [...html.matchAll(/<section data-pz-impact[\s\S]*?<\/section>/g)].map((m) => m[0]).join("");
  if (/:has\(|@container|text-wrap/.test(impactHtmlText)) fails.push("임팩트 마크업에 export 금지 기법");
  return fails;
}
