/**
 * 161차 — comparison_chart 슬롯 확장 / checklist / tradeoff_card 검증.
 * 실행: npx tsx scripts/161cha-verify.ts
 */
import fs from "fs";
import path from "path";
import { getSlotTemplate, buildSectionLengthGuide } from "../lib/section-templates";
import {
  sanitizeComparisonChartSection,
  comparisonChecklistPresent,
} from "../lib/comparison-chart-guard";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { getCategoryTheme } from "../lib/category-theme";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "161cha-export");

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });

  // A — slots present
  for (const cat of ["의류/패션", "반려동물", "생활용품"] as const) {
    const slots = getSlotTemplate(cat, "long").map((s) => `${s.type}:${s.slot}`);
    assert(
      slots.includes("comparison_chart:comparison_chart"),
      `${cat} missing comparison_chart — ${slots.join(",")}`,
    );
    console.log(`[A] ${cat} has comparison_chart ✓`);
  }
  assert(
    getSlotTemplate("생활용품", "long").some((s) => s.type === "tradeoff_card"),
    "HOME missing tradeoff_card",
  );
  console.log("[A] 생활용품 has tradeoff_card ✓");

  // length guides mention comparison
  for (const cat of ["의류/패션", "반려동물", "생활용품"]) {
    const g = buildSectionLengthGuide(cat);
    assert(g.includes("comparison_chart"), `${cat} length guide missing comparison_chart`);
  }
  assert(buildSectionLengthGuide("생활용품").includes("tradeoff_card"), "home guide missing tradeoff");
  assert(buildSectionLengthGuide("화장품/뷰티").includes("2문장 상한"), "E: common density tighten missing");
  console.log("[A/E] length guides ok ✓");

  // B — checklist sanitize
  const checklist = sanitizeComparisonChartSection({
    type: "comparison_chart",
    slot: "comparison_chart",
    heading: "성분 비교",
    ourLabel: "우리 제품",
    baselineLabel: "브랜드X", // should force whitelist
    presentationStyle: "checklist",
    basis: "measured",
    basisNote: "판매자 스펙",
    metrics: [
      { label: "신선육 포함", ourValue: 1, baselineValue: 0 },
      { label: "분말 첨가", ourValue: 0, baselineValue: 80 },
    ],
  });
  assert(checklist.baselineLabel === "일반 제품", "baseline not forced");
  assert(checklist.presentationStyle === "checklist", "style lost");
  assert(checklist.metrics[0]!.ourValue === 100 && checklist.metrics[0]!.baselineValue === 0, "flag norm");
  assert(comparisonChecklistPresent(100) && !comparisonChecklistPresent(0), "present helper");
  console.log("[B] checklist sanitize ✓");

  const bar = sanitizeComparisonChartSection({
    type: "comparison_chart",
    slot: "comparison_chart",
    heading: "신축성",
    ourLabel: "우리 제품",
    baselineLabel: "업계 평균",
    presentationStyle: "bar",
    basis: "self_assessed",
    metrics: [{ label: "신축성", ourValue: 72, baselineValue: 45 }],
  });
  assert(bar.basisNote?.includes("자체 평가"), "self_assessed disclaimer");
  assert(bar.metrics[0]!.ourValue === 72, "bar values preserved");
  console.log("[B] bar sanitize ✓");

  // C + B export HTML
  const fashionChart: DetailSection = {
    type: "comparison_chart",
    slot: "comparison_chart",
    heading: "원단 비교",
    ourLabel: "이 제품",
    baselineLabel: "일반 제품",
    presentationStyle: "bar",
    unit: "%",
    basis: "measured",
    basisNote: "판매자 제공 원단 스펙",
    metrics: [
      { label: "신축성", ourValue: 35, baselineValue: 12 },
      { label: "세탁 후 수축률(낮을수록 좋음 역표기 금지 — 유지율)", ourValue: 98, baselineValue: 90 },
    ],
  };
  const petChecklist: DetailSection = {
    type: "comparison_chart",
    slot: "comparison_chart",
    heading: "급여 포인트 비교",
    ourLabel: "이 사료",
    baselineLabel: "일반 제품",
    presentationStyle: "checklist",
    basis: "measured",
    basisNote: "성분표 기준",
    metrics: [
      { label: "신선육 포함", ourValue: 100, baselineValue: 0 },
      { label: "통째 동물 사용", ourValue: 100, baselineValue: 0 },
      { label: "분말 첨가", ourValue: 0, baselineValue: 100 },
    ],
  };
  const tradeoff: DetailSection = {
    type: "tradeoff_card",
    slot: "tradeoff_card",
    heading: "이런 공간에 맞아요",
    recommendFor: ["원룸·투룸에 퀸 사이즈를 넣는 분", "단단한 지지감을 선호하는 분"],
    considerIf: ["매트리스 두께 22cm — 침대 프레임 높이를 먼저 확인해 주세요", "메모리폼 특유의 체온감이 부담이면 통기 커버를 함께 검토하세요"],
  };
  const emptyTradeoff: DetailSection = {
    type: "tradeoff_card",
    slot: "tradeoff_card",
    heading: "빈 카드",
    recommendFor: [],
    considerIf: [],
  };

  const theme = getCategoryTheme("생활용품");
  const htmlRich = buildDetailPageHtml({
    productName: "161 검증 매트리스",
    brandName: "PLAIN HOME",
    category: "생활용품",
    price: 390000,
    imageUrls: ["/qa-fixtures/living/01.png"],
    sections: [
      {
        type: "hero",
        slot: "hero",
        headline: "단단한 밤",
        subheadline: "검증용",
        imageIndex: 0,
      },
      fashionChart,
      petChecklist,
      tradeoff,
      emptyTradeoff,
    ],
    theme,
  });
  assert(htmlRich.includes("COMPARE"), "export missing COMPARE");
  assert(htmlRich.includes("✓") && htmlRich.includes("✗"), "export missing checklist marks");
  assert(htmlRich.includes("FIT CHECK"), "export missing tradeoff");
  assert(htmlRich.includes("이런 분께 추천"), "export missing recommend");
  // empty tradeoff should not render FIT CHECK twice without content — count FIT CHECK = 1
  const fitCount = (htmlRich.match(/FIT CHECK/g) || []).length;
  assert(fitCount === 1, `expected 1 FIT CHECK, got ${fitCount}`);
  fs.writeFileSync(path.join(OUT, "161cha-rich.html"), htmlRich, "utf8");
  console.log("[B/C] export rich ✓ → 161cha-rich.html");

  // omit path: no comparison when no metrics (renderer would skip empty — export still renders empty metrics list; AI omit is template note)
  const htmlOmit = buildDetailPageHtml({
    productName: "단품",
    brandName: null,
    category: "의류/패션",
    price: 29000,
    imageUrls: ["/qa-fixtures/fashion/01.png"],
    sections: [
      {
        type: "hero",
        slot: "hero",
        headline: "가벼운 티",
        imageIndex: 0,
      },
      {
        type: "checklist",
        slot: "checklist",
        heading: "포인트",
        items: ["면 100%"],
      },
    ],
    theme: getCategoryTheme("의류/패션"),
  });
  assert(!htmlOmit.includes("COMPARE"), "omit path should have no comparison");
  fs.writeFileSync(path.join(OUT, "161cha-omit.html"), htmlOmit, "utf8");
  console.log("[A] omit path (no chart section) ✓");

  // E — before/after snippet for density
  fs.writeFileSync(
    path.join(OUT, "161cha-copy-density-diff.txt"),
    [
      "BEFORE (160): image_text body … 2~3문장",
      "AFTER  (161): image_text body … 2문장 상한",
      "ingredient_highlight / texture_feel / sourcing_story / material_feature: 2문장으로 정렬",
      "근거: draph.art 숏폼·미니멀 트렌드 + 기존 Pagzly 짧은 카피 규율 강화",
    ].join("\n"),
    "utf8",
  );

  // D skip note
  fs.writeFileSync(
    path.join(OUT, "161cha-height-length-skip.md"),
    [
      "# 신장 대비 기장 다이어그램 — 스킵",
      "",
      "- 기존 `fashion-size-diagram`이 size_table의 기장/총장을 이미 실루엣에 표시.",
      "- UNIQLO형(신장 구간별 기장)은 판매자 입력에 `모델키`+`기장` 다중 구간이 거의 없음(리뷰 세션/스펙 샘플에서 동시 입력 0건).",
      "- 기장만 있을 때 평균 신장(163/173)에 억지 매핑하면 핏 환각 → anti-hallucination과 충돌.",
      "- **구현 안 함.** 162차: 판매자 UI에 신장 구간 실측 입력 필드가 생기면 재검토.",
    ].join("\n"),
    "utf8",
  );

  console.log("161cha verify OK");
}

main();
