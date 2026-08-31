import type { DetailSection } from "@/lib/types/generate";

/** 섹션 type별 추천 후속 수정 지시 (정적 — AI 호출 없음) */
const SUGGESTIONS_BY_TYPE: Partial<Record<DetailSection["type"], string[]>> = {
  hero: ["헤드라인을 더 짧게", "혜택을 숫자로 강조", "톤을 더 캐주얼하게"],
  checklist: ["포인트를 더 짧게", "숫자·수치를 강조", "고객 관점 문장으로"],
  image_text: ["본문을 2문장으로 압축", "제목을 더 임팩트 있게", "사용 장면을 구체적으로"],
  spec_table: ["표 항목을 더 간결하게", "단위를 명확히", "없는 수치는 '판매자 확인'으로"],
  usage_steps: ["단계 설명을 한 줄로", "동사로 시작하게", "순서 번호는 유지"],
  gallery: ["갤러리 제목을 짧게", "캡션 톤을 통일", "제품명 반복 줄이기"],
  caution: ["주의 문구를 부드럽게", "핵심 1줄만 남기기", "법적 표현은 유지"],
  cta_price: ["CTA 문구를 행동 유도형으로", "가격 표기를 더 눈에 띄게", "뱃지 문구를 짧게"],
  comparison_table: ["비교 항목을 3개로 줄여", "우리 제품 열을 강조", "라벨을 더 짧게"],
  comparison_chart: ["차트 설명을 한 줄로", "수치 근거 없으면 삭제", "제목만 임팩트 있게"],
  highlight_box: ["강조 문구를 1문장으로", "숫자가 있으면 앞에", "과장 표현 제거"],
  step_card: ["각 단계 제목 6자 이내", "본문 1문장으로", "STEP 톤 통일"],
  color_variation: ["색상명을 더 짧게", "옵션 설명 추가", "제목을 컬러 강조형으로"],
  stat_infographic: ["수치 근거 없는 항목 삭제", "라벨을 4자 이내로", "제목을 데이터 중심으로"],
  illustration_banner: ["오버레이 문구를 짧게", "컨셉 키워드만 남기기", "본문 1문장으로"],
  faq: ["답변을 2문장 이내로", "질문을 고객 말투로", "근거 없으면 '판매자 문의'"],
  target_persona: ["타깃을 한 문장으로", "페르소나 이름 제거", "니즈를 구체적으로"],
  brand_story: ["스토리를 3문장으로", "브랜드명만 강조", "감성 톤 유지"],
  review_highlight: ["칭찬을 1줄로 압축", "중복 표현 제거", "제목을 신뢰형으로"],
  custom_gif: ["GIF 섹션 제목만 수정", "설명 문구 추가", "제목을 사용 장면 중심으로"],
  ai_disclosure: ["고지 문구를 짧게", "법적 톤 유지", "한 줄로 요약"],
};

const DEFAULT_SUGGESTIONS = ["더 짧게 줄여줘", "혜택을 강조해줘", "톤을 부드럽게"];

export function getPatchSuggestions(section: DetailSection | undefined): string[] {
  if (!section) return DEFAULT_SUGGESTIONS;
  return SUGGESTIONS_BY_TYPE[section.type] ?? DEFAULT_SUGGESTIONS;
}

export type PatchChatMessage = {
  role: "user" | "assistant" | "error";
  text: string;
  timestamp: number;
};
