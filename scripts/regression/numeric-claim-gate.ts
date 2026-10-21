/**
 * 회귀 — 424차 1-1 숫자 주장 코드 게이트. 417·418·422·414·411차 저장 세션에서 나온 위반 문구를 케이스로 넣고(걸려야 함),
 * 입력에서 온 수치·개수·번호·"한 분"·"한 가지"는 통과해야 한다(오탐 방지). 호출 0, 순수 함수.
 */
import { applyDisplayRules } from "../../lib/display-sections";
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";
import { buildClaimFacts, checkText, claimFactsOf, numericClaimGate, stripViolatingSentences } from "../../lib/numeric-claim-gate";
import type { DetailSection } from "../../lib/types/generate";

export const name = "숫자 주장 코드 게이트 — 417·418·422·414·411 위반 문구 차단·입력 유래 수치 통과·차트 ✓/✗ 변환·섹션 제거·동일성";

const S = (o: Record<string, unknown>) => o as unknown as DetailSection;
const BEAUTY = buildClaimFacts({
  productName: "Dream Glow Camellia Essence Mist (드림 글로우 카멜리아 에센스 미스트)", brandName: "glowiest", price: 24000, targetCustomer: "건조함과 당김이 고민인 20~30대 여성",
  keyFeatures: "얼굴에 뿌려 수분을 보충하는 미스트\n끈적임 없는 가벼운 사용감\n휴대하기 좋은 30mL 미니 사이즈\n용량: 30mL\n사용법: 세안 후 얼굴에서 15cm 정도 떨어뜨려 뿌린다. 메이크업 위에도 사용 가능",
  ingredients: "1. 동백 추출물 2. 히알루론산 3. 판테놀 4. 병풀 추출물", wholesaleUrl: "배송비 3,000원, 5만원 이상 무료배송",
});
const FASHION = buildClaimFacts({
  productName: "노르디크 울 혼방 라운드 가디건", brandName: "노르디크로프트", price: 59000, targetCustomer: "30~40대",
  keyFeatures: "울 혼방 55% 아크릴 45%\n소매 립 마감", ingredients: "울 55% 아크릴 45%",
  wholesaleUrl: "사이즈 S(55) M(66) L(77) XL 2XL 총장 60 가슴 54 배송비 3,000원 6,000원",
});

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => { if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); };
  const gate = (facts: typeof BEAUTY, ...sections: DetailSection[]) => numericClaimGate(sections, facts);

  // ── 비교 차트(418·422): 입력에 없는 수치 → ✓/✗, 라벨·점검 표기는 유지 ──
  for (const [label, vals] of [["418", [[85, 55], [82, 48], [78, 60]]], ["422", [[82, 55], [85, 50], [80, 55]]]] as const) {
    const r = gate(BEAUTY, S({ type: "comparison_chart", slot: "comparison_chart", heading: "사용감으로 비교", ourLabel: "glowiest", baselineLabel: "일반 제품", unit: "%", presentationStyle: "bar", basis: "self_assessed", metrics: vals.map(([o, b], i) => ({ label: ["가벼운 마무리", "휴대 편의성", "촉촉한 사용감"][i], ourValue: o, baselineValue: b })) }));
    const c = r.sections[0] as unknown as { presentationStyle: string; metrics: Array<{ ourValue: number; baselineValue: number; label: string }>; basis: string };
    eq(`${label} 차트 → checklist`, [c.presentationStyle, c.metrics.map((m) => [m.ourValue, m.baselineValue]), c.basis], ["checklist", [[100, 0], [100, 0], [100, 0]], "self_assessed"]);
    if (!r.violations.some((v) => v.action === "chart_to_checklist")) fails.push(`${label}: 차트 위반 기록 없음`);
  }
  // 100/0(유무)과 입력에 있는 값은 그대로(414 차트)
  {
    const sec = S({ type: "comparison_chart", slot: "c", heading: "비교", ourLabel: "a", baselineLabel: "일반 제품", presentationStyle: "bar", basis: "self_assessed", metrics: [{ label: "울 혼방", ourValue: 100, baselineValue: 0 }, { label: "소매 립 마감", ourValue: 100, baselineValue: 0 }, { label: "5개 사이즈 운영", ourValue: 100, baselineValue: 0 }] });
    const r = gate(FASHION, sec);
    if (r.sections[0] !== sec || r.violations.length) fails.push(`414 차트(100/0·사이즈 5종)가 바뀜: ${JSON.stringify(r.violations)}`);
    const keep = gate(BEAUTY, S({ type: "comparison_chart", slot: "c", heading: "비교", ourLabel: "a", baselineLabel: "일반 제품", presentationStyle: "bar", basis: "measured", metrics: [{ label: "x", ourValue: 30, baselineValue: 15 }, { label: "y", ourValue: 30, baselineValue: 15 }] }));
    eq("입력에 있는 값(30·15)은 유지", (keep.sections[0] as unknown as { presentationStyle: string }).presentationStyle, "bar");
  }

  // ── 문장 속 수치 ──
  const sentence = (facts: typeof BEAUTY, text: string) => stripViolatingSentences(text, facts, new Set()).text;
  eq("417 '하루에 두 번' 문장 삭제", sentence(FASHION, "단추를 채우면 단정한 겉옷, 열면 여유 있는 걸침이 됩니다. 하루에 두 번, 다른 분위기로 입습니다."), "단추를 채우면 단정한 겉옷, 열면 여유 있는 걸침이 됩니다.");
  eq("418 '두 가지였습니다' 개발 서사 문장 삭제", sentence(BEAUTY, "glowiest는 30mL라는 작은 용량부터 정했습니다. 그래서 확인한 건 두 가지였습니다. 들고 다니며 뿌리기 좋은 크기입니다."), "glowiest는 30mL라는 작은 용량부터 정했습니다. 들고 다니며 뿌리기 좋은 크기입니다.");
  eq("418 '한 번 뿌리면' 빈도 표현 삭제", sentence(BEAUTY, "회의 사이, 지하철에서 내린 뒤. 가방에서 꺼내 한 번 뿌리면 공기가 한결 가벼워집니다."), "회의 사이, 지하철에서 내린 뒤.");
  eq("411 '3분' 삭제", checkText("아침 3분 코디", FASHION).bad, true);
  eq("입력의 15cm·30mL 통과", [checkText("얼굴에서 15cm 떨어뜨려 뿌립니다. 30mL 미니 사이즈", BEAUTY).bad, checkText("5만원 이상 무료배송, 배송비 3,000원", BEAUTY).bad], [false, false]);
  eq("번호 접두·01 통과", [checkText("STEP 01 세안", BEAUTY).bad, checkText("POINT 1", BEAUTY).bad, checkText("01 산뜻한 마무리", BEAUTY).bad, checkText("Q1. 질문", BEAUTY).bad], [false, false, false, false]);
  eq("'한 분'·'한 가지'·'한 벌'은 수치 주장이 아님", [checkText("수분이 필요한 분", BEAUTY).bad, checkText("건조한 분을 위한 한 분", BEAUTY).bad, checkText("색상은 크림 한 가지입니다", FASHION).bad, checkText("한 벌로 입습니다", FASHION).bad], [false, false, false, false]);
  eq("'두 개만 풀어' 개수 표현은 위반(입력 개수 아님)", checkText("실내에서는 두 개만 풀어 둡니다", FASHION).bad, true);
  eq("성분 개수(4)와 같은 '네 가지'는 통과, 다른 '세 가지'는 위반", [checkText("동백 추출물 등 네 가지를 담았습니다", BEAUTY).bad, checkText("세 가지를 담았습니다", BEAUTY).bad], [false, true]);
  eq("사이즈 라벨 수(S·M·L·XL·2XL=5)의 '5사이즈' 통과, '7사이즈' 위반", [checkText("S부터 2XL까지 5사이즈", FASHION).bad, checkText("7사이즈 운영", FASHION).bad], [false, true]);
  eq("섹션 항목 수와 같은 '세 가지'", checkText("한 벌로 세 가지", BEAUTY, new Set([3])).bad, false);

  // ── 섹션 처리: 문장 삭제·제목 사전 대체·항목 삭제·섹션 제거 ──
  {
    const r = gate(FASHION,
      S({ type: "usage_steps", slot: "step_card", heading: "아침 3분 코디", steps: ["셔츠 위에: 얇은 이너 위에 걸칩니다.", "단추 여밈: 추운 날은 끝까지, 실내에서는 두 개만 풀어 둡니다."] }),
      S({ type: "highlight_box", slot: "h", heading: "한 벌로 세 가지", cards: [{ title: "겉옷", body: "단추를 채우면 단정합니다. 하루에 두 번, 다른 분위기로 입습니다." }, { title: "걸침", body: "열면 여유 있습니다." }, { title: "이너", body: "얇게 겹칩니다." }] }),
      S({ type: "faq", slot: "faq", heading: "자주 묻는 질문", items: [{ question: "하루에 세 번 입나요?", answer: "네 두 번 입어요." }] }),
      S({ type: "brand_story", slot: "b", heading: "브랜드", body: "계절이 바뀔 때 손이 가는 옷을 생각합니다." }),
    );
    const steps = r.sections[0] as unknown as { heading: string; steps: string[] };
    eq("411 제목 → 고정 사전", steps.heading, "사용 방법");
    eq("414 '두 개만' 단계는 라벨만 남아 항목 삭제", steps.steps, ["셔츠 위에: 얇은 이너 위에 걸칩니다."]);
    const hb = r.sections[1] as unknown as { heading: string; cards: Array<{ body: string }> };
    eq("'세 가지' 제목은 카드 3장과 같아 유지", hb.heading, "한 벌로 세 가지");
    eq("카드 본문에서 위반 문장만 삭제", hb.cards[0]!.body, "단추를 채우면 단정합니다.");
    eq("FAQ가 모두 위반이면 섹션 제거", r.keptIndexes, [0, 1, 3]);
    if (!r.violations.some((v) => v.action === "section_removed" && v.type === "faq")) fails.push("faq 제거 기록 없음");
  }
  // 주석 라벨 35mL·1.18 FL OZ(418) 제거, 30mL은 유지
  {
    const r = gate(BEAUTY, S({ type: "image_text", slot: "size_options", heading: "작은 용량", body: "휴대하기 좋은 30mL 사이즈입니다.", annotations: [{ label: "mL 표기", xPct: 42, yPct: 78 }, { label: "35mL 표기", xPct: 42, yPct: 70 }, { label: "1.18 FL OZ 표기", xPct: 42, yPct: 60 }, { label: "30mL 표기", xPct: 10, yPct: 10 }] }));
    eq("418 주석 라벨", (r.sections[0] as unknown as { annotations: Array<{ label: string }> }).annotations.map((a) => a.label), ["mL 표기", "30mL 표기"]);
  }
  // 히어로 제목에 수치 → 입력 상품명(새 문구를 만들지 않음)
  {
    const r = gate(BEAUTY, S({ type: "hero", slot: "hero", headline: "하루 3번, 수분을 채우세요", subheadline: "30mL 휴대용 미스트", badge: "30mL 미니" }));
    const h = r.sections[0] as unknown as { headline: string; subheadline: string };
    eq("히어로 제목 → 상품명", h.headline, "Dream Glow Camellia Essence Mist (드림 글로우 카멜리아 에센스 미스트)");
    eq("히어로 부제(입력 수치)는 유지", h.subheadline, "30mL 휴대용 미스트");
  }
  // 강조 문구가 지워진 문장에 있으면 같이 정리
  {
    const r = gate(BEAUTY, S({ type: "image_text", slot: "t", heading: "질감", body: "가벼운 사용감입니다. 하루에 세 번 뿌리세요.", emphasis: "하루에 세 번 뿌리세요" }));
    eq("강조 문구 정리", [(r.sections[0] as unknown as { body: string }).body, (r.sections[0] as unknown as { emphasis: string }).emphasis], ["가벼운 사용감입니다.", ""]);
  }
  // 건드리지 않는 섹션·동일성
  {
    const spec = S({ type: "spec_table", slot: "s", heading: "상품 정보", rows: [{ label: "용량", value: "35mL" }, { label: "무게", value: "999g" }] });
    const clean = S({ type: "checklist", slot: "c", heading: "체크", items: ["30mL 휴대", "15cm 거리"] });
    const caution = S({ type: "caution", slot: "k", heading: "주의", body: "개봉 후 6개월 이내 사용" });
    const r = gate(BEAUTY, spec, clean, caution);
    eq("표·주의는 건드리지 않음, 위반 없는 섹션은 같은 객체", [r.sections[0] === spec, r.sections[1] === clean, r.sections[2] === caution, r.violations.length], [true, true, true, 0]);
  }
  // 전부 지워지는 입력 → 섹션 제거와 번호 매핑
  {
    const r = gate(BEAUTY, S({ type: "checklist", slot: "c", heading: "체크", items: ["하루에 세 번", "2주 만에"] }), S({ type: "brand_story", slot: "b", heading: "소개", body: "수분을 담는 브랜드입니다." }));
    eq("체크리스트 전부 위반 → 제거, 뒤 섹션 번호 유지", r.keptIndexes, [1]);
  }
  // ── 표시 규칙·export 연결: 게이트는 라이브·export 공통 함수(applyDisplayRules)에서 한 번, 편집 모드·facts 없음은 원문 ──
  {
    const secs = (): DetailSection[] => [
      S({ type: "hero", slot: "hero", headline: "수분 미스트", subheadline: "30mL", imageIndex: 0 }),
      S({ type: "brand_story", slot: "b", heading: "소개", body: "수분을 담은 브랜드입니다. 하루에 세 번 뿌리세요." }),
      S({ type: "checklist", slot: "c", heading: "체크", items: ["하루에 두 번", "2주 만에"] }),
      S({ type: "faq", slot: "faq", heading: "FAQ", items: [{ question: "용량은?", answer: "30mL입니다." }] }),
    ];
    const urls = ["https://example.com/a.jpg"];
    const off = applyDisplayRules(secs(), urls, { category: "화장품/뷰티" });
    if (!JSON.stringify(off.sections).includes("세 번") || off.sections.length !== 4) fails.push("facts 없음인데 문구가 바뀜");
    const on = applyDisplayRules(secs(), urls, { category: "화장품/뷰티", claimFacts: BEAUTY });
    const onText = JSON.stringify(on.sections);
    if (onText.includes("세 번") || onText.includes("두 번") || onText.includes("2주")) fails.push("표시 규칙에서 위반 문구가 남음");
    eq("체크리스트 제거 후 원본 번호 매핑", on.sourceIndexes, [0, 1, 3]);
    const edit = applyDisplayRules(secs(), urls, { category: "화장품/뷰티", claimFacts: BEAUTY, editing: true });
    if (!JSON.stringify(edit.sections).includes("세 번") || edit.sections.length !== 4) fails.push("편집 모드에서 문구가 바뀜");
    // export: 같은 facts를 넘기면 위반 문구가 HTML에 없다
    const mk = (facts?: typeof BEAUTY) => buildDetailPageHtml({ productName: "p", brandName: "b", category: "화장품/뷰티", sections: secs(), imageUrls: urls, theme: getCategoryTheme("화장품/뷰티"), claimFacts: facts });
    if (!mk().includes("세 번") || mk(BEAUTY).includes("세 번") || mk(BEAUTY).includes("2주 만에")) fails.push("export 게이트 연결이 다름");
    // 캐시: 같은 입력 객체는 같은 facts
    const input = { productName: "x", price: 1000 };
    if (claimFactsOf(input) !== claimFactsOf(input) || claimFactsOf(null) !== undefined) fails.push("facts 캐시가 다름");
  }
  return fails;
}
