import type { DetailSection } from "@/lib/types/generate";

/** 섹션 타입 → AIDA/역할 한 줄 (draft UI·프롬프트 공용). */
export function getSectionAidaPhase(type: DetailSection["type"] | string): string {
  switch (type) {
    case "hero":
      return "AIDA-A (Attention): 시선 훅";
    case "checklist":
      return "AIDA-I (Interest): 고민·니즈 환기";
    case "highlight_box":
      return "AIDA-I (Interest): 핵심 효과 3축 요약";
    case "cta_price":
      return "AIDA-A (Action): 구매 유도";
    case "usage_steps":
    case "step_card":
      return "AIDA-D (Desire): 사용법·기대 결과";
    case "caution":
    case "spec_table":
    case "stat_infographic":
    case "comparison_chart":
    case "comparison_table":
    case "faq":
    case "ai_disclosure":
      return "신뢰 보조: 사실·근거";
    case "brand_story":
      return "AIDA-I (Interest): 브랜드 맥락";
    case "target_persona":
      return "AIDA-I (Interest): 이런 분께";
    case "illustration_banner":
      return "AIDA-D (Desire): 컨셉 분위기";
    case "custom_gif":
      return "AIDA-D (Desire): 움직임 연출";
    case "review_highlight":
      return "신뢰 보조: 실제 후기 요약";
    default:
      return "AIDA-D (Desire): 차별점·사용 장면";
  }
}

export function getSectionAidaShort(type: DetailSection["type"] | string): string {
  const full = getSectionAidaPhase(type);
  const m = full.match(/^([A-Z\-]+(?:\s*\([^)]+\))?)/);
  return m?.[1] ?? full.split(":")[0] ?? full;
}
