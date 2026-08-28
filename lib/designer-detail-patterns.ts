import type { DetailSection } from "@/lib/types/generate";
import { resolveTemplateCategory } from "@/lib/section-templates";

/**
 * 전문 디자이너·2026 쇼핑몰 CRO 리서치를 AI 프롬프트·후처리에 주입.
 * 근거: 후커블/GENCY 워크플로, 스마트스토어 860px 가이드, LaonGEN 이미지 순서.
 */

/** 풀폭 사진 + 하단 짧은 카피 (카드/패널 없음) — DTC·패션 상세에서 가장 흔한 리듬 */
export const EDITORIAL_BLEED_SLOTS = new Set([
  "usage_scenario",
  "usage_scenario_extra",
  "coordination",
  "seasonal_styling",
  "customer_scenario",
  "serving_suggestion",
  "install_scenario",
  "material_feature",
  "lifestyle_shot",
  "usage_scene",
]);

export function shouldUseEditorialBleed(section: DetailSection): boolean {
  if (section.type !== "image_text") return false;
  if (section.layout === "compact" || section.layout === "callout") return false;
  return EDITORIAL_BLEED_SLOTS.has(section.slot);
}

/** 디자이너 상세의 전형적 스토리 아크 (8~12 스크롤 구간 권장) */
export function buildDesignerPatternGuide(category: string): string {
  const template = resolveTemplateCategory(category);
  const fashion =
    category === "의류/패션"
      ? `
- 패션 사진 순서: ①착장(히어로) → ②디테일(원단·봉제) → ③코디(장면) → ④패키지/택.
- 같은 팩샷 각도 반복 금지. coordination·usage_scenario는 코디/착장 컷에 맞는 imageIndex.
- size_table·fabric_composition은 입력 실측만. 없으면 "판매자 확인 필요".`
      : "";
  const food =
    category === "식품/건강기능식품"
      ? `
- 식품 이미지 순서: ①완성/플레이팅 → ②원재료 클로즈업 → ③먹는 장면 → ④패키지/라벨.
- 원산지·알레르기·보관은 입력·고시 근거만. 없는 영양 % 금지.`
      : "";

  return `

## 디자이너 상세페이지 리듬 (2026 모바일·마켓 CRO)
- **한 화면 한 메시지**: 섹션마다 주장 1개. headline은 15자 내외(모바일 한 줄), body는 2~3문장·줄간격 넉넉히.
- **사진 우선**: 텍스트보다 사진이 먼저 시선을 잡게. usage/coordination/serving 슬롯은 풀폭 사진 + 짧은 하단 카피.
- **카드 남발 금지**: checklist·highlight_box만 카드형. image_text 본문은 패널 테두리 없이 여백으로 구분.
- **신뢰 흐름**: 핵심 포인트 → 사용 장면 → 수치(근거 있을 때만) → 고시표 → 주의 → CTA.
- **길이**: 필수 슬롯 위주 8~12개 스크롤 구간. 비슷한 image_text 4개 연속 시 각기 다른 각도·장면.
- 템플릿 카테고리: ${template}${fashion}${food}`;
}

/** 생성 후 image_text에 디자이너 레이아웃 힌트 주입 (슬롯 순서 변경 없음) */
export function applyDesignerLayoutRhythm(sections: DetailSection[]): DetailSection[] {
  return sections.map((section) => {
    if (section.type !== "image_text") return section;
    if (section.layout === "compact" || section.layout === "callout") return section;
    if (EDITORIAL_BLEED_SLOTS.has(section.slot)) {
      return { ...section, layout: "full" as const };
    }
    return section;
  });
}
