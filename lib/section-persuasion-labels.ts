import type { DetailSection } from "@/lib/types/generate";

/** 섹션 type → 판매자 전용 "설득 프레임워크" 라벨. 고정 매핑, AI 미개입.
 *  후커블의 페르수전 태그 시스템을 참고하되, 두려움 조성 표현("반박 제거" 등)은 배제. */
export const SECTION_FRAMEWORK_LABEL: Partial<Record<DetailSection["type"], string>> = {
  hero: "후킹",
  checklist: "소구점 요약",
  image_text: "소구점 상세",
  highlight_box: "핵심 강조",
  step_card: "단계 설명",
  usage_steps: "사용 안내",
  spec_table: "신뢰 정보",
  comparison_table: "스펙 비교",
  comparison_chart: "근거 비교",
  tradeoff_card: "구매 판단",
  stat_infographic: "수치 근거",
  review_highlight: "사회적 증거",
  faq: "질문 대응",
  target_persona: "타겟 공감",
  brand_story: "브랜드 서사",
  color_variation: "옵션 안내",
  illustration_banner: "컨셉 연출",
  gallery: "비주얼 강화",
  caution: "안전 고지",
  ai_disclosure: "투명 고지",
  custom_gif: "동적 연출",
  cta_price: "구매 유도",
  // canvas: 사용자 자유 편집 영역이라 라벨 없음(의도적 생략)
};

export function getSectionFrameworkLabel(type: DetailSection["type"]): string | undefined {
  return SECTION_FRAMEWORK_LABEL[type];
}
