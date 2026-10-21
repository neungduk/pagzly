/**
 * 회귀 — 427차 1-2 비교 차트 제거·자동 대체. 판매자 비교 입력이 없으면 차트·표를 빼고(번호 매핑 유지), 있으면 입력 그대로의 비교표 하나만 두며,
 * 대체 큐(후기→소재·성분→케어→사용 팁→추천 대상→남는 사진→FAQ)는 입력 근거가 있을 때만·중복 없이·오탐 없이 동작한다. 호출 0.
 */
import { applyDisplayRules } from "../../lib/display-sections";
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";
import { buildClaimFacts } from "../../lib/numeric-claim-gate";
import { isComparativeClaim, applyComparisonPolicy } from "../../lib/comparison-policy";
import { normalizeComparisonRows } from "../../lib/comparison-input";
import { displayStateOf, normalizeDisplayState, withDisplayState } from "../../lib/saved-display";
import { computeDemotedSectionIndexes } from "../../lib/section-display-budget";
import { pickBackfill, splitInputItems, type BackfillKind } from "../../lib/section-backfill";
import type { DetailSection } from "../../lib/types/generate";

export const name = "비교 차트 제거·자동 대체 — 입력 없음 제거·입력 있으면 그대로 유지·대체 큐 근거/중복/오탐·저장 복원·표시 예산·export 동일";

const S = (o: Record<string, unknown>) => o as unknown as DetailSection;
const chart = () =>
  S({
    type: "comparison_chart", slot: "comparison_chart", heading: "일반 제품과 비교", ourLabel: "우리", baselineLabel: "일반 제품", unit: "%", presentationStyle: "bar", basis: "self_assessed",
    metrics: [{ label: "가벼움", ourValue: 85, baselineValue: 55 }, { label: "휴대성", ourValue: 82, baselineValue: 48 }],
  });
const base = (): DetailSection[] => [
  S({ type: "hero", slot: "hero", headline: "수분 미스트", subheadline: "촉촉", imageIndex: 0 }),
  S({ type: "stat_infographic", slot: "stat_infographic", heading: "제품 정보", metrics: [{ label: "용량", value: "30mL" }, { label: "형태", value: "미스트" }] }),
  chart(),
  S({ type: "faq", slot: "faq", heading: "FAQ", items: [{ question: "용량은?", answer: "30mL입니다." }] }),
  S({ type: "cta_price", slot: "cta_price", price: 24000 }),
];
const urls = ["https://example.com/a.jpg"];
const F = (o: Record<string, unknown> = {}) =>
  buildClaimFacts({ productName: "미스트", brandName: "b", price: 24000, targetCustomer: "", keyFeatures: "얼굴에 뿌리는 30mL 미스트", ingredients: "", ...o } as never);

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };
  const types = (x: { sections: DetailSection[] }) => x.sections.map((s) => s.type);
  const kindOf = (r: ReturnType<typeof pickBackfill>) => (r && "kind" in r ? r.kind : null);
  const sectionOf = (r: ReturnType<typeof pickBackfill>) => (r && "section" in r ? (r.section as unknown as Record<string, unknown>) : null);

  // ── 입력 없음: 차트 제거, 번호 매핑 유지 ──
  {
    const on = applyDisplayRules(base(), urls, { category: "화장품/뷰티", claimFacts: F() });
    eq("차트 제거", types(on), ["hero", "stat_infographic", "faq", "cta_price"]);
    eq("원본 번호 매핑", on.sourceIndexes, [0, 1, 3, 4]);
    if (!on.policyChanges?.some((c) => c.type === "removed" && c.sectionType === "comparison_chart")) fails.push("제거 기록 없음");
    const all = ["hero", "stat_infographic", "comparison_chart", "faq", "cta_price"];
    eq("claimFacts 없음 → 그대로", types(applyDisplayRules(base(), urls, { category: "화장품/뷰티" })), all);
    eq("편집 모드 → 그대로", types(applyDisplayRules(base(), urls, { category: "화장품/뷰티", claimFacts: F(), editing: true })), all);
    const tbl = S({ type: "comparison_table", slot: "comparison_table", heading: "스펙 비교", columns: ["우리", "이전 모델"], rows: [{ label: "무게", values: ["가벼움", "무거움"] }] });
    eq("비교표 제거", types(applyDisplayRules([...base().slice(0, 2), tbl, ...base().slice(3)], urls, { category: "전자/가전", claimFacts: F() })), ["hero", "stat_infographic", "faq", "cta_price"]);
  }

  // ── 입력 있음: 입력 그대로의 비교표 하나, 같은 자리 ──
  {
    const rows = normalizeComparisonRows([
      { label: "무향료", ours: "있음", other: "없음" },
      { label: "용량", ours: "30mL", other: "50mL" },
      { label: "빈 행", ours: "", other: "x" },
    ]);
    eq("정규화(빈 칸 행 제외)", rows.length, 2);
    const facts = F({ comparisonRows: rows });
    const on = applyDisplayRules(base(), urls, { category: "화장품/뷰티", claimFacts: facts });
    eq("판매자 표 위치", types(on), ["hero", "stat_infographic", "comparison_table", "faq", "cta_price"]);
    const t = on.sections[2] as unknown as { rows: Array<{ label: string; values: string[] }> };
    eq("입력 그대로(비교 대상, 우리 제품 순)", t.rows.map((r) => [r.label, ...r.values]), [["무향료", "없음", "있음"], ["용량", "50mL", "30mL"]]);
    eq("강조 열은 우리 제품", (on.sections[2] as unknown as { columns: string[] }).columns, ["일반 제품", "우리 제품"]);
    if (JSON.stringify(on.sections).includes("85") || JSON.stringify(on.sections).includes("일반 제품과 비교")) fails.push("AI 차트 수치/제목이 남음");
    const mk = (facts2: ReturnType<typeof F>) =>
      buildDetailPageHtml({ productName: "p", brandName: "b", category: "화장품/뷰티", sections: base(), imageUrls: urls, theme: getCategoryTheme("화장품/뷰티"), claimFacts: facts2 });
    const html = mk(facts);
    if (!html.includes("무향료") || !html.includes("50mL") || html.includes("일반 제품과 비교")) fails.push("export가 판매자 표를 그대로 쓰지 않음");
    const htmlNone = mk(F());
    if (htmlNone.includes("일반 제품과 비교") || htmlNone.includes("가벼움")) fails.push("export에 입력 없는 차트가 남음");
    eq("1행은 부족", types(applyDisplayRules(base(), urls, { category: "화장품/뷰티", claimFacts: F({ comparisonRows: [{ label: "a", ours: "b", other: "c" }] }) })), ["hero", "stat_infographic", "faq", "cta_price"]);
  }

  // ── 비교 전제 문장 ──
  {
    for (const t of ["일반 제품보다 훨씬 가볍습니다.", "다른 제품과 달리 끈적임이 없어요.", "업계 평균 대비 높은 만족도", "시중 미스트에 비해 입자가 고와요", "경쟁사 제품보다 좋아요"]) {
      if (!isComparativeClaim(t)) fails.push(`비교 문장을 못 잡음: ${t}`);
    }
    for (const t of ["30mL 미니 사이즈로 휴대하기 좋아요.", "사이즈 비교표를 확인하세요.", "세안 후 뿌려 주세요.", "기본 라운드넥에 세미오버핏입니다.", "다른 색상도 있어요."]) {
      if (isComparativeClaim(t)) fails.push(`오탐: ${t}`);
    }
    const secs = [...base().slice(0, 2), S({ type: "brand_story", slot: "brand_story", heading: "소개", body: "수분을 담았어요. 일반 제품보다 가볍습니다. 매일 쓰기 좋아요." }), ...base().slice(3)];
    const out = applyDisplayRules(secs, urls, { category: "화장품/뷰티", claimFacts: F() });
    const bs = out.sections.find((s) => s.type === "brand_story") as unknown as { body: string };
    eq("비교 문장만 삭제", bs.body, "수분을 담았어요. 매일 쓰기 좋아요.");
  }

  // ── 대체 큐 ──
  {
    const sections = base().filter((s) => s.type !== "comparison_chart");
    const pick = (o: Record<string, unknown>, secs: DetailSection[] = sections, skip: ReadonlySet<BackfillKind> = new Set()) =>
      pickBackfill(secs, { category: "의류/패션", source: F(o).source }, skip);
    eq("근거 없음 → 사진 후보(마지막 단계에서 판단)", pick({}), { kind: "photos", pending: true });
    const withReview = pick({ reviewInsights: { commonPraises: ["착용감이 편해요", "가벼워요", "촉촉해요"], commonComplaints: ["용량이 작아요"], reviewLineCount: 40 }, ingredients: "a, b", keyFeatures: "보관: 서늘한 곳" });
    eq("후기 우선", [kindOf(withReview), sectionOf(withReview)?.praises], ["review", ["착용감이 편해요", "가벼워요", "촉촉해요"]]);
    eq("장점 1개는 안 만듦", kindOf(pick({ reviewInsights: { commonPraises: ["하나뿐"] } })), "photos");
    const dupReview = pick({ reviewInsights: { commonPraises: ["가", "나"] } }, [...sections, S({ type: "review_highlight", slot: "review_highlight", heading: "후기", praises: ["x"] })]);
    eq("후기 있으면 중복 안 함", kindOf(dupReview), "photos");
    eq("괄호 속 쉼표", splitInputItems("면 100% (싱글 저지, 20수), 폴리 5%"), ["면 100% (싱글 저지, 20수)", "폴리 5%"]);
    eq("번호 목록", splitInputItems("1. 동백 추출물 2. 히알루론산"), ["동백 추출물", "히알루론산"]);
    const mat = pick({ ingredients: "울 30%, 아크릴 55%, 나일론 15%" });
    eq("소재 항목 그대로", [kindOf(mat), sectionOf(mat)?.items], ["material", ["울 30%", "아크릴 55%", "나일론 15%"]]);
    const fabric = S({ type: "image_text", slot: "fabric_composition", heading: "원단", body: "x", imageIndex: 1, imagePosition: "left" });
    eq("원단 섹션 있으면 소재 안 함", kindOf(pick({ ingredients: "울 30%, 아크릴 55%" }, [...sections, fabric])), "photos");
    const careYes = pick({ keyFeatures: "소매 립 마감, 찬물 단독 세탁, 그늘에서 자연 건조" });
    eq("케어 조각 그대로", [kindOf(careYes), sectionOf(careYes)?.items], ["care", ["찬물 단독 세탁", "그늘에서 자연 건조"]]);
    eq("피부 건조함은 케어 아님", kindOf(pick({ keyFeatures: "피부 고민: 건조함, 당김. 메이크업 위에도 사용 가능" })), "photos");
    eq("사용 팁", kindOf(pick({ keyFeatures: "사용법: 세안 후 15cm 거리에서 뿌린다" })), "tip");
    const usage = S({ type: "usage_steps", slot: "usage_steps", heading: "사용법", steps: [] });
    eq("사용법 섹션 있으면 팁 안 함", kindOf(pick({ keyFeatures: "사용법: 세안 후 뿌린다" }, [...sections, usage])), "photos");
    const aud = pick({ targetCustomer: "20대 직장인" });
    eq("추천 대상", [kindOf(aud), sectionOf(aud)?.personas], ["audience", ["20대 직장인"]]);
    eq("이미 쓴 종류는 건너뜀", kindOf(pick({ ingredients: "a, b" }, sections, new Set<BackfillKind>(["material"]))), "photos");
    const low = pickBackfill(sections, { category: "생활용품", source: F({ reviewInsights: { commonPraises: ["가", "나"] } }).source });
    eq("저관여 + 근거형 섹션 있으면 후기 생략", kindOf(low), "photos");
  }

  // ── 남는 사진: 새 사진이 2장 이상일 때만, 같은 컷 중복은 제외 ──
  {
    const five = ["u0", "u1", "u2", "u3", "u4"];
    const secs = [
      S({ type: "hero", slot: "hero", headline: "h", subheadline: "s", imageIndex: 0 }),
      S({ type: "stat_infographic", slot: "stat_infographic", heading: "정보", metrics: [{ label: "a", value: "1" }, { label: "b", value: "2" }] }),
      chart(),
      S({ type: "spec_table", slot: "spec_table", heading: "스펙", rows: [{ label: "a", value: "b" }] }),
      S({ type: "cta_price", slot: "cta_price", price: 1000 }),
    ];
    const run1 = (hash: Record<string, string>) => applyDisplayRules(secs, five, { category: "의류/패션", imageHashByUrl: hash, claimFacts: F() });
    const g = run1({}).sections.find((s) => s.type === "gallery") as unknown as { imageIndexes: number[] } | undefined;
    if (!g || g.imageIndexes.join() !== "1,2,3,4") fails.push(`남는 사진 갤러리: ${JSON.stringify(g)}`);
    if (run1({ u0: "H", u1: "H", u2: "H", u3: "H", u4: "H" }).sections.some((s) => s.type === "gallery")) fails.push("같은 컷 중복으로 갤러리를 만듦");
  }

  // ── 저장·복원 ──
  {
    const display = normalizeDisplayState({ comparisonRows: [{ label: "가", ours: "나", other: "다" }, { label: "라", ours: "마", other: "바" }, { label: "", ours: "x", other: "y" }] });
    eq("저장 정규화", display?.comparisonRows?.length, 2);
    const merged = withDisplayState({ conceptBrief: 0.01 } as never, display);
    eq("복원", displayStateOf(merged)?.comparisonRows, display?.comparisonRows);
    eq("다른 display 키를 덮어쓰지 않음", displayStateOf(withDisplayState(merged, { stylePackId: "clean-1" }))?.comparisonRows?.length, 2);
    eq("빈 비교 입력", normalizeDisplayState({ comparisonRows: [] }), undefined);
  }

  // ── 표시 예산: 차트가 빠질 입력이면 차트가 근거 1자리를 차지하지 않는다 ──
  {
    const secs = [chart(), S({ type: "stat_infographic", slot: "stat_infographic", heading: "정보", metrics: [{ label: "a", value: "1" }, { label: "b", value: "2" }] })];
    eq("기본: 차트가 1자리", computeDemotedSectionIndexes("생활용품", secs), [1]);
    eq("차트 제거 입력: 통계가 1자리", computeDemotedSectionIndexes("생활용품", secs, { chartRemoved: true }), []);
  }

  // ── 정책 직접 호출 ──
  eq("sourceIndexes", applyComparisonPolicy(base(), F(), { category: "화장품/뷰티", imageCount: 3 }).sourceIndexes, [0, 1, 3, 4]);
  return fails;
}
