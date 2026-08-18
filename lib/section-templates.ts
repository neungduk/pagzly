// 카테고리별 고정 섹션 슬롯 순서 (review 문서 "3. 섹션 순서 템플릿" 참고).
// AI(DeepSeek)는 이 슬롯 순서/종류를 즉흥적으로 바꾸지 않고, 각 슬롯 안에
// 들어갈 콘텐츠(카피/이미지 선택)만 채운다. "선택" 슬롯은 상품 특성상
// 불필요하면 생략 가능하지만, 순서 자체는 유지한다.

import type { DetailSection } from "@/lib/types/generate";
import { SLOT_IMAGE_RATIO } from "@/lib/design-tokens";

export type SlotDefinition = {
  slot: string;
  type: DetailSection["type"];
  required: boolean;
  note: string; // 프롬프트에 그대로 노출되는 한글 슬롯 설명
  minCount?: number; // gallery/repeatable 슬롯의 최소 이미지·항목 수
  maxCount?: number; // gallery/repeatable 슬롯의 최대 이미지·항목 수
  repeatable?: boolean; // true면 같은 slot을 여러 섹션(연속)으로 나눠 채울 수 있음
};

export type TemplateCategory =
  | "화장품/뷰티"
  | "패션/의류"
  | "식품"
  | "전자/가전"
  | "생활/리빙";

const BEAUTY: SlotDefinition[] = [
  { slot: "hero", type: "hero", required: true, note: "히어로 (제품 단독/사용 컷, 4:5)" },
  { slot: "checklist", type: "checklist", required: true, note: "핵심 포인트 3~4개" },
  {
    slot: "ingredient_highlight",
    type: "image_text",
    required: true,
    note: "핵심 성분/기능 (1:1). 텍스처·원료가 보이는 컷을 배정",
  },
  {
    slot: "texture_feel",
    type: "image_text",
    required: false,
    note: "질감/사용감 (1:1). 매크로 텍스처 컷을 배정",
  },
  { slot: "usage_steps", type: "usage_steps", required: true, note: "사용법 단계. STEP 01/02/03 구조로 3단계 권장" },
  {
    slot: "gallery",
    type: "gallery",
    required: true,
    note: "두 컷 비교 구조 (3:4). 카피는 상품 고유. 레이아웃만 나란히",
    minCount: 2,
    maxCount: 2,
  },
  {
    slot: "spec_table",
    type: "spec_table",
    required: true,
    note: "용량/성분/사용기한",
  },
  {
    slot: "caution",
    type: "caution",
    required: true,
    note: "주의사항 (식약처 표현 검수 대상 — 효능 단정 표현 금지)",
  },
  { slot: "cta_price", type: "cta_price", required: true, note: "가격/구매 정보" },
];

const FASHION: SlotDefinition[] = [
  { slot: "hero", type: "hero", required: true, note: "히어로 (착장 컷, 4:5)" },
  { slot: "checklist", type: "checklist", required: true, note: "핏/소재 핵심 포인트" },
  {
    slot: "detail_zoom",
    type: "image_text",
    required: true,
    note: "원단/봉제/디테일 확대 (1:1)",
  },
  {
    slot: "model_multicut",
    type: "gallery",
    required: true,
    note: "다양한 각도/포즈 (3:4)",
    minCount: 2,
    maxCount: 3,
  },
  {
    slot: "size_table",
    type: "spec_table",
    required: true,
    note: "사이즈표 + 모델 착용 사이즈. 실측 데이터가 없는 항목은 지어내지 말고 '판매자 확인 필요'로 표시",
  },
  {
    slot: "color_variation",
    type: "color_variation",
    required: false,
    note: "컬러별 스와치 + 착용컷 (1:1)",
  },
  {
    slot: "coordination",
    type: "image_text",
    required: false,
    note: "코디 제안, 다른 아이템과 매치 (4:5)",
  },
  {
    slot: "care_info",
    type: "caution",
    required: true,
    note: "세탁/보관 방법",
  },
  { slot: "cta_price", type: "cta_price", required: true, note: "가격/구매 정보" },
];

const FOOD: SlotDefinition[] = [
  { slot: "hero", type: "hero", required: true, note: "히어로 (완성/플레이팅 컷, 4:5)" },
  { slot: "checklist", type: "checklist", required: true, note: "맛/원재료 핵심 포인트" },
  {
    slot: "ingredient_highlight",
    type: "image_text",
    required: true,
    note: "원재료/원산지 강조 (1:1)",
  },
  {
    slot: "texture_closeup",
    type: "image_text",
    required: false,
    note: "조직감/단면 확대 (1:1)",
  },
  {
    slot: "cooking_steps",
    type: "usage_steps",
    required: false,
    note: "조리법/섭취방법 (가공식품에만 해당)",
  },
  {
    slot: "packaging",
    type: "gallery",
    required: true,
    note: "포장/보관 상태 (3:4)",
    minCount: 1,
    maxCount: 2,
  },
  {
    slot: "nutrition_table",
    type: "spec_table",
    required: true,
    note: "영양성분표 + 알레르기 정보",
  },
  {
    slot: "caution",
    type: "caution",
    required: true,
    note: "유통기한/보관방법/알레르기 경고. 효능을 암시하는 과장 표현 금지",
  },
  { slot: "cta_price", type: "cta_price", required: true, note: "가격/구매 정보" },
];

const ELECTRONICS: SlotDefinition[] = [
  { slot: "hero", type: "hero", required: true, note: "히어로 (제품 단독 컷, 4:5)" },
  { slot: "checklist", type: "checklist", required: true, note: "핵심 스펙 3~4개" },
  {
    slot: "feature_detail",
    type: "image_text",
    required: true,
    note: "기능별 확대/작동 예시 (1:1). 기능이 여러 개면 이 슬롯을 연속으로 반복 가능. 헤드라인에 재생시간·출력 등 숫자 훅이 있으면 짧게 넣기",
    repeatable: true,
    minCount: 1,
    maxCount: 3,
  },
  {
    slot: "comparison_table",
    type: "comparison_table",
    required: false,
    note: "스펙 비교 또는 이전 모델 대비. 입력에 없는 수치는 지어내지 말 것. 2열 비교 구조만 채움",
  },
  {
    slot: "usage_scenario",
    type: "image_text",
    required: false,
    note: "실사용 장면 (4:5)",
  },
  {
    slot: "spec_table",
    type: "spec_table",
    required: true,
    note: "전체 스펙 표 — 규격/전력/호환성. 입력 데이터에 없는 수치는 공란 처리",
  },
  {
    slot: "package_contents",
    type: "image_text",
    required: true,
    note: "구성품 안내 (1:1). 가능하면 플랫레이에 가까운 컷",
  },
  {
    slot: "warranty_caution",
    type: "caution",
    required: true,
    note: "A/S, 주의사항",
  },
  { slot: "cta_price", type: "cta_price", required: true, note: "가격/구매 정보" },
];

const HOME_FALLBACK: SlotDefinition[] = [
  { slot: "hero", type: "hero", required: true, note: "히어로 (4:5)" },
  { slot: "checklist", type: "checklist", required: true, note: "핵심 포인트 3~4개" },
  {
    slot: "material_feature",
    type: "image_text",
    required: true,
    note: "소재/기능 강조 (1:1)",
  },
  {
    slot: "usage_scenario",
    type: "image_text",
    required: false,
    note: "실사용 장면 (4:5)",
  },
  {
    slot: "gallery",
    type: "gallery",
    required: true,
    note: "다양한 각도/구성 (3:4)",
    minCount: 2,
    maxCount: 2,
  },
  {
    slot: "spec_table",
    type: "spec_table",
    required: true,
    note: "사이즈/소재/구성",
  },
  {
    slot: "caution",
    type: "caution",
    required: false,
    note: "사용 시 주의사항",
  },
  { slot: "cta_price", type: "cta_price", required: true, note: "가격/구매 정보" },
];

export const CATEGORY_SLOT_TEMPLATES: Record<TemplateCategory, SlotDefinition[]> = {
  "화장품/뷰티": BEAUTY,
  "패션/의류": FASHION,
  "식품": FOOD,
  "전자/가전": ELECTRONICS,
  "생활/리빙": HOME_FALLBACK,
};

// 상품 등록 폼의 category 값(lib/category-theme.ts의 CATEGORY_THEMES 키)을
// 5개 상위 템플릿 카테고리로 매핑한다. 매핑에 없는 카테고리는 모두
// "생활/리빙" 폴백 템플릿을 쓴다 (그 외 잡화 포함).
const CATEGORY_TO_TEMPLATE: Record<string, TemplateCategory> = {
  "화장품/뷰티": "화장품/뷰티",
  "의류/패션": "패션/의류",
  "식품/건강기능식품": "식품",
  "전자제품": "전자/가전",
  "생활용품": "생활/리빙",
  "반려동물": "생활/리빙",
  "기타": "생활/리빙",
};

export function resolveTemplateCategory(category: string): TemplateCategory {
  return CATEGORY_TO_TEMPLATE[category] ?? "생활/리빙";
}

export function getSlotTemplate(category: string): SlotDefinition[] {
  return CATEGORY_SLOT_TEMPLATES[resolveTemplateCategory(category)];
}

export function getSlotImageRatio(slot: SlotDefinition): string {
  return SLOT_IMAGE_RATIO[slot.slot] ?? SLOT_IMAGE_RATIO[slot.type] ?? "aspect-square";
}
