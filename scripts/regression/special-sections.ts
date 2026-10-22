/**
 * 회귀 — 436차 1-3 유형 특화 섹션: 입력 요건이 안 맞으면 불변, 레시피가 허용하지 않은 종류는 안 만듦, 문구·값은 입력 그대로(타임라인 단계·스와치 색상명·칩 월 항목·스펙 값·사이즈 원문),
 * 사이즈 막대 길이는 비율이되 값은 원문, export 마크업 동일·금지 CSS 없음. 호출 0.
 */
import { applyDisplayRules } from "../../lib/display-sections";
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";
import { buildClaimFacts } from "../../lib/numeric-claim-gate";
import { RECIPES } from "../../lib/archetype-recipes";
import { parseMeasures, planSpecials, splitIngredients } from "../../lib/special-sections";
import type { DetailSection } from "../../lib/types/generate";

export const name = "유형 특화 섹션 — 입력 요건·레시피 허용·불변·입력 문구 그대로·막대 값 원문·export 동일";

const S = (o: Record<string, unknown>) => o as unknown as DetailSection;
const urls = ["https://example.com/a.jpg", "https://example.com/b.jpg"];
const hero = S({ type: "hero", slot: "hero", headline: "제목", subheadline: "부제", imageIndex: 0 });
const cta = S({ type: "cta_price", slot: "cta_price", price: 1000 });
const mid = S({ type: "highlight_box", slot: "highlight_box", heading: "요약", body: "본문" });
const F = (o: Record<string, unknown> = {}) => buildClaimFacts({ productName: "상품", brandName: "b", price: 1000, keyFeatures: "상품", ...o } as never);
type Imp = Extract<DetailSection, { type: "impact" }>;
const kinds = (xs: DetailSection[]) => xs.filter((s): s is Imp => s.type === "impact").map((s) => s.kind);

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };
  const idx = (n: number) => Array.from({ length: n }, (_, i) => i);
  const run1 = (secs: DetailSection[], recipe: (typeof RECIPES)[keyof typeof RECIPES] | null, facts = F()) => planSpecials(secs, idx(secs.length), { recipe, facts });
  // 타임라인: 3~6단계만, 문구 그대로, 단계 섹션을 대신함
  const steps = ["세안 후 사용", "15cm 거리에서 분사", "가볍게 두드리기"];
  const t1 = run1([hero, S({ type: "usage_steps", slot: "step_card", heading: "사용법", steps }), mid, cta], RECIPES["beauty-skincare"]);
  eq("타임라인 문구 그대로", (t1.sections[1] as Imp).labels, steps);
  eq("타임라인이 사용 단계를 대신", t1.sections.some((s) => s.type === "usage_steps"), false);
  eq("2단계는 불변", run1([hero, S({ type: "usage_steps", slot: "step_card", heading: "사용법", steps: ["a", "b"] }), mid, cta], RECIPES["beauty-skincare"]).placed.length, 0);
  eq("레시피 미허용(전자)은 불변", run1([hero, S({ type: "usage_steps", slot: "step_card", heading: "사용법", steps }), mid, cta], RECIPES["tech-mobile"]).placed.length, 0);
  eq("레시피 없음(유형 미정)은 불변", run1([hero, S({ type: "usage_steps", slot: "step_card", heading: "사용법", steps }), mid, cta], null).placed.length, 0);
  // 스와치: 색상값 유효·≥3
  const opt = (label: string, colorHex: string) => ({ label, colorHex, imageIndex: 0 });
  const sw = run1([hero, mid, S({ type: "color_variation", slot: "color_variation", heading: "색상", options: [opt("레드", "#FF0000"), opt("블루", "#0000FF"), opt("그린", "#00AA00")] }), cta], RECIPES["fashion-top"]);
  eq("스와치 라벨·색 그대로", (sw.sections.find((s) => s.type === "impact") as Imp)?.stats, [{ label: "레드", value: "#FF0000" }, { label: "블루", value: "#0000FF" }, { label: "그린", value: "#00AA00" }]);
  eq("색 2개는 불변", run1([hero, mid, S({ type: "color_variation", slot: "color_variation", heading: "색상", options: [opt("레드", "#FF0000"), opt("블루", "#0000FF")] }), cta], RECIPES["fashion-top"]).placed.length, 0);
  eq("잘못된 색상값은 제외", run1([hero, mid, S({ type: "color_variation", slot: "color_variation", heading: "색상", options: [opt("레드", "red"), opt("블루", "#0000FF"), opt("그린", "#00AA00")] }), cta], RECIPES["fashion-top"]).placed.length, 0);
  // 칩 월: 번호 목록 파싱, ≥4
  eq("번호 목록 분리", splitIngredients("1. 동백 추출물 2. 히알루론산 3. 판테놀 4. 병풀 추출물"), ["동백 추출물", "히알루론산", "판테놀", "병풀 추출물"]);
  eq("쉼표 목록 분리", splitIngredients("정제수, 글리세린, 나이아신아마이드, 판테놀"), ["정제수", "글리세린", "나이아신아마이드", "판테놀"]);
  const cw = run1([hero, mid, S({ type: "image_text", slot: "ingredient_highlight", heading: "성분", body: "본문", imageIndex: 0, imagePosition: "left", layout: "full" }), mid, cta], RECIPES["beauty-skincare"], F({ ingredients: "정제수, 글리세린, 나이아신아마이드, 판테놀" }));
  eq("칩 월 항목=입력", (cw.sections.find((s) => s.type === "impact") as Imp)?.labels, ["정제수", "글리세린", "나이아신아마이드", "판테놀"]);
  eq("성분 3개는 불변", run1([hero, mid, mid, cta], RECIPES["beauty-skincare"], F({ ingredients: "정제수, 글리세린, 판테놀" })).placed.length, 0);
  // 스펙 스트립: 숫자 값 ≥3, 게이트(입력에 없는 수치는 제외)
  const specRows = [{ label: "노이즈 캔슬링", value: "42dB" }, { label: "배터리", value: "9시간" }, { label: "무게", value: "5.3g" }, { label: "방수", value: "IPX5" }];
  const ss = run1([hero, mid, S({ type: "spec_table", slot: "spec_table", heading: "스펙", rows: specRows }), cta], RECIPES["tech-mobile"], F({ keyFeatures: "42dB 9시간 5.3g IPX5" }));
  eq("스펙 스트립 값=입력", (ss.sections.find((s) => s.type === "impact") as Imp)?.stats, specRows);
  eq("입력에 없는 수치는 제외되어 ≥3 못 채움", run1([hero, mid, S({ type: "spec_table", slot: "spec_table", heading: "스펙", rows: specRows }), cta], RECIPES["tech-mobile"], F({ keyFeatures: "좋은 제품" })).placed.length, 0);
  eq("배송 스펙표는 대상 아님", run1([hero, mid, S({ type: "spec_table", slot: "shipping_info", heading: "배송", rows: specRows }), cta], RECIPES["tech-mobile"], F({ keyFeatures: "42dB 9시간 5.3g IPX5" })).placed.length, 0);
  // 사이즈 막대: 사이즈 라벨 행만, 공통 항목, 값 원문
  eq("측정값 파싱", parseMeasures("총장 60 · 어깨너비 54.5"), { 총장: { v: 60, raw: "60" }, 어깨너비: { v: 54.5, raw: "54.5" } });
  const sizeRows = [{ label: "브랜드", value: "노르" }, { label: "S", value: "총장 60 · 가슴단면 58" }, { label: "M", value: "총장 62 · 가슴단면 60" }, { label: "L", value: "총장 64 · 가슴단면 62" }];
  const sb = run1([hero, mid, S({ type: "spec_table", slot: "size_table", heading: "사이즈", rows: sizeRows }), cta], RECIPES["fashion-top"]);
  const bars = (sb.sections.find((s) => s.type === "impact") as Imp)?.bars;
  eq("막대 항목", bars?.map((b) => b.metric), ["총장", "가슴단면"]);
  eq("막대 값 원문", bars?.[0]?.rows.map((r) => [r.size, r.raw]), [["S", "60"], ["M", "62"], ["L", "64"]]);
  eq("사이즈 행 2개는 불변", run1([hero, mid, S({ type: "spec_table", slot: "size_table", heading: "사이즈", rows: sizeRows.slice(0, 3) }), cta], RECIPES["fashion-top"]).placed.length, 0);
  // 전체 표시 + export 동일
  const secs = [hero, S({ type: "target_persona", slot: "target_persona", heading: "고민", personas: ["a 고민", "b 고민", "c 고민"] }), S({ type: "usage_steps", slot: "step_card", heading: "사용법", steps }), mid, S({ type: "spec_table", slot: "size_table", heading: "사이즈", rows: sizeRows }), cta];
  const facts = F({ productName: "코튼 티셔츠", keyFeatures: "반팔 티셔츠" });
  const out = applyDisplayRules(secs, urls, { category: "의류/패션", claimFacts: facts, brandName: "b" });
  eq("패션 상의: 사이즈 막대", kinds(out.sections).includes("sizebars"), true);
  const html = buildDetailPageHtml({ productName: "코튼 티셔츠", brandName: "b", category: "의류/패션", sections: secs, imageUrls: urls, theme: getCategoryTheme("의류/패션"), claimFacts: facts });
  if (!/data-pz-impact="sizebars"/.test(html)) fails.push("export에 사이즈 막대 없음");
  if (/:has\(|@container|text-wrap/.test([...html.matchAll(/<section data-pz-impact[\s\S]*?<\/section>/g)].map((m) => m[0]).join(""))) fails.push("특화 마크업에 export 금지 기법");
  return fails;
}
