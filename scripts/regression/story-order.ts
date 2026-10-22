/**
 * 회귀 — 433차 1-1 스토리 순서 엔진: 단계 순서(훅→공감→해결→근거→사용→정보→신뢰→구매), 질문형 체크리스트는 히어로 직후 금지,
 * 섹션 추가·삭제·문구 변경 없음(같은 객체 참조), 단계 모르는 섹션은 앞 묶음에 붙음, 편집 모드·claimFacts 없음·비대상 카테고리·flag off는 불변. 호출 0.
 */
import { applyStoryOrder, isQuestionChecklist, storyOrderOn, storyStageOf } from "../../lib/detail-story-order";
import { applyDisplayRules } from "../../lib/display-sections";
import { buildClaimFacts } from "../../lib/numeric-claim-gate";
import type { DetailSection } from "../../lib/types/generate";

export const name = "스토리 순서 엔진 — 단계 정렬·질문형 체크리스트 뒤로·참조 보존·건너뜀·편집/비대상/flag off 불변";

const S = (o: Record<string, unknown>) => o as unknown as DetailSection;
const hero = S({ type: "hero", slot: "hero", headline: "제목", subheadline: "부제", imageIndex: 0 });
const persona = S({ type: "target_persona", slot: "target_persona", heading: "이런 고민", personas: ["a", "b", "c"] });
const brand = S({ type: "brand_story", slot: "brand_story", heading: "브랜드", body: "본문" });
const qcheck = S({ type: "checklist", slot: "checklist", heading: "Q. 이런 고민이 남아 있나요?", items: ["가", "나", "다"] });
const check = S({ type: "checklist", slot: "checklist", heading: "먼저 확인한 것", items: ["가", "나", "다"] });
const point = (h: string) => S({ type: "image_text", slot: "quick_points", heading: h, body: "본문", imageIndex: 1, imagePosition: "left", layout: "compact" });
const evidence = S({ type: "image_text", slot: "ingredient_highlight", heading: "성분", body: "본문", imageIndex: 2, imagePosition: "left", layout: "full" });
const usage = S({ type: "usage_steps", slot: "step_card", heading: "사용", steps: ["1", "2"] });
const banner = S({ type: "illustration_banner", slot: "illustration_banner", heading: "배너" });
const spec = S({ type: "spec_table", slot: "spec_table", heading: "스펙", rows: [{ label: "a", value: "b" }] });
const faq = S({ type: "faq", slot: "faq", heading: "FAQ", items: [{ question: "q", answer: "a" }] });
const cta = S({ type: "cta_price", slot: "cta_price", price: 1000 });
const stageNames = (xs: DetailSection[]) => xs.map((s) => storyStageOf(s));

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };

  // 1) 단계 정렬: 어지러운 입력 → 단계 오름차순, 같은 단계 안은 입력 순서
  const messy = [hero, usage, spec, point("p1"), evidence, persona, faq, brand, cta];
  const r = applyStoryOrder(messy).sections;
  const stages = stageNames(r) as number[];
  eq("단계 오름차순", stages, [...stages].sort((a, b) => a - b));
  eq("같은 참조·같은 개수", [...r].sort().map((s) => messy.includes(s)), r.map(() => true));
  eq("개수 보존", r.length, messy.length);
  eq("구매가 맨 끝·히어로가 맨 앞", [r[0], r[r.length - 1]], [hero, cta]);
  // 2) 질문형 체크리스트: 히어로 직후 금지(공감이 없을 때), 공감이 있으면 공감 뒤
  eq("질문형 판별", [isQuestionChecklist(qcheck), isQuestionChecklist(check)], [true, false]);
  const noPersona = applyStoryOrder([hero, qcheck, point("p1"), point("p2"), cta]).sections;
  eq("공감 없으면 해결 첫 섹션 뒤", noPersona.map((s) => (s.type === "checklist" ? "Q" : s.type)), ["hero", "image_text", "Q", "image_text", "cta_price"]);
  const withPersona = applyStoryOrder([hero, brand, qcheck, persona, cta]).sections;
  eq("공감 뒤 질문형 체크리스트", withPersona.map((s) => s.type), ["hero", "target_persona", "checklist", "brand_story", "cta_price"]);
  // 3) 단계 모르는 섹션은 앞 묶음에 붙어 같이 움직임
  const stick = applyStoryOrder([hero, point("p1"), banner, persona, cta]).sections;
  eq("장식 배너는 앞 묶음", stick.map((s) => s.type), ["hero", "target_persona", "image_text", "illustration_banner", "cta_price"]);
  // 4) 건너뜀: 해당 단계 섹션이 없어도 오류 없이 나머지 순서만
  eq("빈 단계 건너뜀", applyStoryOrder([hero, spec, point("p1"), cta]).sections.map((s) => s.type), ["hero", "image_text", "spec_table", "cta_price"]);
  // 5) 이미 순서가 맞으면 입력 배열 그대로(moves 0)
  const ok = [hero, persona, check, brand, point("p1"), evidence, usage, spec, faq, cta];
  const same = applyStoryOrder(ok);
  eq("이미 정렬됨", [same.sections === ok, same.moves], [true, 0]);
  // 6) 히어로가 맨 앞이 아니면 불변
  const nohero = [persona, hero, cta];
  eq("히어로 앞이 아니면 불변", applyStoryOrder(nohero).sections === nohero, true);

  // 7) applyDisplayRules: 뷰티는 재정렬, 편집 모드·claimFacts 없음·전자(비대상)·flag off(storyOrderOn)는 불변
  const facts = buildClaimFacts({ productName: "미스트", brandName: "b", price: 1000, targetCustomer: "", keyFeatures: "미스트", ingredients: "" } as never);
  const input = [hero, brand, persona, qcheck, point("p1"), cta].map((s) => ({ ...s })) as DetailSection[];
  const kinds = (xs: DetailSection[]) => xs.map((s) => s.type);
  const beauty = applyDisplayRules(input, ["https://example.com/a.jpg", "https://example.com/b.jpg"], { category: "화장품/뷰티", claimFacts: facts });
  const kb = kinds(beauty.sections);
  if (kb.indexOf("target_persona") > kb.indexOf("brand_story")) fails.push("뷰티: 공감이 해결보다 먼저여야 함");
  eq("뷰티 개수 보존", beauty.sections.length, input.length);
  eq("sourceIndexes 순열", [...beauty.sourceIndexes].sort((a, b) => a - b), input.map((_, i) => i));
  const off = applyDisplayRules(input, ["https://example.com/a.jpg"], { category: "화장품/뷰티" });
  eq("claimFacts 없음 불변(persona가 히어로 뒤로만)", kinds(off.sections).slice(0, 3), ["hero", "target_persona", "brand_story"]);
  const elec = applyDisplayRules(input, ["https://example.com/a.jpg"], { category: "전자제품", claimFacts: facts });
  const elecOff = applyDisplayRules(input, ["https://example.com/a.jpg"], { category: "전자제품" });
  eq("비대상 카테고리 불변", kinds(elec.sections), kinds(elecOff.sections));
  eq("편집 모드 불변", kinds(applyDisplayRules(input, ["https://example.com/a.jpg"], { category: "화장품/뷰티", claimFacts: facts, editing: true }).sections), kinds(applyDisplayRules(input, ["https://example.com/a.jpg"], { category: "화장품/뷰티", editing: true }).sections));
  eq("flag off는 비대상과 같음", [storyOrderOn("화장품/뷰티", false), storyOrderOn("화장품/뷰티", true), storyOrderOn("전자제품", true)], [false, true, false]);
  return fails;
}
