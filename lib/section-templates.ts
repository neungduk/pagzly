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
  // required 슬롯 중 "짧은 구성" 모드에서도 반드시 남길 전환 핵심만 core.
  // 미지정 시 core. "extra"는 짧은 구성에서만 제외, 긴 구성에는 영향 없음.
  shortTier?: "core" | "extra";
};

export type TemplateCategory =
  | "화장품/뷰티"
  | "패션/의류"
  | "식품"
  | "전자/가전"
  | "생활/리빙"
  | "반려동물";

const BEAUTY: SlotDefinition[] = [
  { slot: "hero", type: "hero", required: true, note: "히어로 (제품 단독/사용 컷, 4:5)" },
  {
    slot: "brand_story",
    type: "brand_story",
    required: false,
    note: "brandName이 입력되지 않았으면 이 슬롯 전체를 생략. 입력된 브랜드명 기반으로만 작성, 없는 브랜드 히스토리·수상내역 지어내지 말 것",
  },
  { slot: "checklist", type: "checklist", required: true, note: "핵심 포인트 3~4개" },
  {
    slot: "quick_points",
    type: "image_text",
    required: true,
    shortTier: "extra",
    repeatable: true,
    minCount: 2,
    maxCount: 4,
    note: "짧은 미니 포인트 2~4개, layout: 'compact'로 채울 것. 사진은 작은 텍스처/디테일 컷, 헤딩은 8자 내외, 본문은 1문장",
  },
  {
    slot: "target_persona",
    type: "target_persona",
    required: false,
    note: "targetCustomer·keyFeatures 입력 기반으로만 작성",
  },
  {
    slot: "feature_callout",
    type: "image_text",
    required: true,
    note: "핵심 성분/효과 1가지를 사진+말풍선으로 강조. layout:\"callout\" 필수, callout 12~18자, heading 8자 내외, body 1~2문장. 효능 단정 금지",
  },
  {
    slot: "ingredient_highlight",
    type: "image_text",
    required: true,
    shortTier: "extra",
    note: "핵심 성분/기능 (1:1). 텍스처·원료가 보이는 컷을 배정",
  },
  {
    slot: "texture_feel",
    type: "image_text",
    required: false,
    note: "질감/사용감 (1:1). 매크로 텍스처 컷을 배정",
  },
  {
    slot: "highlight_box",
    type: "highlight_box",
    required: true,
    note: "핵심 효과/성분 3가지를 카드 3장으로 요약(각 title 6자 내외 + body 1~2문장). checklist(핵심 포인트 나열)와 달리 이 3가지는 서로 구분되는 효과/성분 축이어야 함(예: 진정/보습/장벽 강화). 가장 강조하고 싶은 내용을 2번째(가운데) 카드에 배치 — 가운데 카드는 서버가 자동으로 진하게 강조 처리함",
  },
  {
    slot: "illustration_banner",
    type: "illustration_banner",
    required: false,
    note: "컨셉 장식 일러스트 배너 (16:9). heading+body가 이미지 위에 오버레이되므로 body도 함께 작성. illustrationUrl은 비워 둠",
  },
  {
    slot: "step_card",
    type: "step_card",
    required: true,
    note: "사용법 단계(3단계 권장). 각 단계에 실제 상품 사진(imageIndex)을 배정하고 title(6자 내외)+body(1문장)로 구성. STEP 태그는 렌더러가 자동으로 붙이므로 title에 'STEP 01' 등을 직접 쓰지 말 것",
  },
  {
    slot: "gallery",
    type: "gallery",
    required: true,
    note: "두 컷 이상 비교·멀티컷 (3:4). 사진이 많으면 서로 다른 각도 4장까지",
    minCount: 2,
    maxCount: 4,
  },
  {
    slot: "stat_infographic",
    type: "stat_infographic",
    required: false,
    note: "입력 데이터에 실제 수치 근거가 있을 때만 채움. 근거 없으면 이 섹션 자체를 생략(판매자 확인 필요 금지, 수치 지어내기 금지). metrics 3~5개, 비율형은 style:\"bar\"+percent(0~100 막대) 또는 style:\"ring\"(원형 게이지), 절대 수치(시간·중량·개수 등)는 style:\"number\"로 percent 없이 큰 숫자 강조. basis는 measured/self_assessed",
  },
  {
    slot: "comparison_chart",
    type: "comparison_chart",
    required: false,
    note: "입력에 실측 근거가 있으면 basis:\"measured\", 없으면 basis:\"self_assessed\"로 채우되 baselineLabel은 \"일반 제품\"만 사용(특정 브랜드명 금지). 근거·추정 둘 다 불가하면 슬롯 생략.",
  },
  {
    slot: "spec_table",
    type: "spec_table",
    required: true,
    note: "용량/성분/사용기한",
  },
  {
    slot: "faq",
    type: "faq",
    required: false,
    minCount: 3,
    maxCount: 5,
    note: "답변은 입력된 상품 정보(keyFeatures·ingredients·certifications)에 근거한 것만. 근거 없는 질문은 답변에 '판매자에게 문의해주세요'로 표시, 효능·의학적 답변 단정 금지",
  },
  {
    slot: "caution",
    type: "caution",
    required: true,
    note: "주의사항 (식약처 표현 검수 대상 — 효능 단정 표현 금지)",
  },
  { slot: "packaging_design", type: "image_text", required: true, shortTier: "extra", note: "패키지/용기 디자인 (1:1)" },
  {
    slot: "how_it_works",
    type: "image_text",
    required: true,
    shortTier: "extra",
    note: "작용 원리/사용 후 변화 설명 (1:1). 근거 없는 효능 단정 금지, 사용감 중심으로 서술",
  },
  {
    slot: "size_options",
    type: "image_text",
    required: true,
    shortTier: "extra",
    note: "용량/사이즈 옵션 안내 (1:1). 옵션 정보가 입력에 없으면 일반적인 용량 표기로 작성",
  },
  {
    slot: "customer_scenario",
    type: "image_text",
    required: true,
    shortTier: "extra",
    note: "실사용 상황/데일리 루틴 제안 (4:5)",
  },
  {
    slot: "shipping_info",
    type: "spec_table",
    required: false,
    note: "배송비/배송기간/교환·환불 안내. 구체적 수치가 입력에 없으면 '판매자 정책을 확인해주세요'로 값 채움 (기존 spec_table 규칙과 동일)",
  },
  {
    slot: "ai_disclosure",
    type: "ai_disclosure",
    required: true,
    note: "AI 생성 콘텐츠 고지. heading/body는 서버가 고정 문구로 채움 — DeepSeek는 슬롯만 포함하거나 생략해도 됨",
  },
  { slot: "cta_price", type: "cta_price", required: true, note: "가격/구매 정보" },
];

const FASHION: SlotDefinition[] = [
  { slot: "hero", type: "hero", required: true, note: "히어로 (착장 컷, 4:5)" },
  {
    slot: "brand_story",
    type: "brand_story",
    required: false,
    note: "brandName이 입력되지 않았으면 이 슬롯 전체를 생략. 입력된 브랜드명 기반으로만 작성, 없는 브랜드 히스토리·수상내역 지어내지 말 것",
  },
  { slot: "checklist", type: "checklist", required: true, note: "핏/소재 핵심 포인트" },
  {
    slot: "quick_points",
    type: "image_text",
    required: true,
    shortTier: "extra",
    repeatable: true,
    minCount: 2,
    maxCount: 4,
    note: "짧은 미니 포인트 2~4개, layout: 'compact'로 채울 것. 사진은 작은 텍스처/디테일 컷, 헤딩은 8자 내외, 본문은 1문장",
  },
  {
    slot: "target_persona",
    type: "target_persona",
    required: false,
    note: "targetCustomer·keyFeatures 입력 기반으로만 작성",
  },
  {
    slot: "feature_callout",
    type: "image_text",
    required: true,
    note: "핏/소재 핵심 1가지를 사진+말풍선으로 강조. layout:\"callout\" 필수, callout 12~18자, heading 8자 내외, body 1~2문장",
  },
  {
    slot: "detail_zoom",
    type: "image_text",
    required: true,
    shortTier: "extra",
    note: "원단/봉제/디테일 확대 (1:1). 매크로·클로즈업이면 감각 카피와 잘 맞습니다",
  },
  {
    slot: "highlight_box",
    type: "highlight_box",
    required: true,
    note: "핏/소재/디테일 3가지를 카드 3장으로 요약(각 title 6자 내외 + body 1~2문장). checklist와 다른 축으로 구성하고, 가장 강조하고 싶은 내용을 2번째(가운데) 카드에 배치",
  },
  {
    slot: "model_multicut",
    type: "gallery",
    required: true,
    note: "다양한 각도/포즈 (3:4). 업로드 사진이 많으면 최대 6장까지 서로 다른 컷",
    minCount: 2,
    maxCount: 6,
  },
  {
    slot: "step_card",
    type: "step_card",
    required: true,
    note: "착용/코디 3단계. 각 단계에 실제 상품 사진(imageIndex) 배정, title 6자 내외 + body 1문장. STEP 태그는 렌더러가 자동 부착",
  },
  {
    slot: "stat_infographic",
    type: "stat_infographic",
    required: false,
    note: "입력 데이터에 실제 수치 근거가 있을 때만 채움. 근거 없으면 생략. metrics 3~5개, style:\"bar\"+percent 또는 style:\"number\"",
  },
  {
    slot: "size_table",
    type: "spec_table",
    required: true,
    note: "사이즈표 + 모델 착용 사이즈. 호칭(S/M/L)만으로 cm을 지어내지 말 것. 실측·모델 정보가 입력에 없으면 '판매자 확인 필요'로 표시",
  },
  {
    slot: "faq",
    type: "faq",
    required: false,
    minCount: 3,
    maxCount: 5,
    note: "답변은 입력된 상품 정보(keyFeatures·ingredients·certifications)에 근거한 것만. 근거 없는 질문은 답변에 '판매자에게 문의해주세요'로 표시, 효능·의학적 답변 단정 금지",
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
    slot: "illustration_banner",
    type: "illustration_banner",
    required: false,
    note: "컨셉 장식 일러스트 배너 (16:9). heading+body가 이미지 위에 오버레이되므로 body도 함께 작성. illustrationUrl은 비워 둠",
  },
  {
    slot: "care_info",
    type: "caution",
    required: true,
    note: "세탁/보관 방법",
  },
  {
    slot: "fabric_composition",
    type: "image_text",
    required: true,
    shortTier: "extra",
    note: "원단 구성/마감 확대 (detail_zoom과 다른 각도, 1:1)",
  },
  {
    slot: "fit_guide",
    type: "image_text",
    required: true,
    shortTier: "extra",
    note: "핏 가이드 — 타이트/루즈 등 착용감 설명 (4:5)",
  },
  { slot: "packaging_design", type: "image_text", required: true, shortTier: "extra", note: "포장/배송 패키지 소개 (1:1)" },
  {
    slot: "seasonal_styling",
    type: "image_text",
    required: true,
    shortTier: "extra",
    note: "계절별 활용 제안 (4:5)",
  },
  {
    slot: "shipping_info",
    type: "spec_table",
    required: false,
    note: "배송비/배송기간/교환·환불 안내. 구체적 수치가 입력에 없으면 '판매자 정책을 확인해주세요'로 값 채움 (기존 spec_table 규칙과 동일)",
  },
  {
    slot: "ai_disclosure",
    type: "ai_disclosure",
    required: true,
    note: "AI 생성 콘텐츠 고지. heading/body는 서버가 고정 문구로 채움 — DeepSeek는 슬롯만 포함하거나 생략해도 됨",
  },
  { slot: "cta_price", type: "cta_price", required: true, note: "가격/구매 정보" },
];

const FOOD: SlotDefinition[] = [
  { slot: "hero", type: "hero", required: true, note: "히어로 (완성/플레이팅 컷, 4:5)" },
  {
    slot: "brand_story",
    type: "brand_story",
    required: false,
    note: "brandName이 입력되지 않았으면 이 슬롯 전체를 생략. 입력된 브랜드명 기반으로만 작성, 없는 브랜드 히스토리·수상내역 지어내지 말 것",
  },
  { slot: "checklist", type: "checklist", required: true, note: "맛/원재료 핵심 포인트" },
  {
    slot: "quick_points",
    type: "image_text",
    required: true,
    shortTier: "extra",
    repeatable: true,
    minCount: 2,
    maxCount: 4,
    note: "짧은 미니 포인트 2~4개, layout: 'compact'로 채울 것. 사진은 작은 텍스처/디테일 컷, 헤딩은 8자 내외, 본문은 1문장",
  },
  {
    slot: "target_persona",
    type: "target_persona",
    required: false,
    note: "targetCustomer·keyFeatures 입력 기반으로만 작성",
  },
  {
    slot: "feature_callout",
    type: "image_text",
    required: true,
    note: "맛/원재료 핵심 1가지를 사진+말풍선으로 강조. layout:\"callout\" 필수, callout 12~18자, heading 8자 내외, body 1~2문장. 효능 단정 금지",
  },
  {
    slot: "ingredient_highlight",
    type: "image_text",
    required: true,
    shortTier: "extra",
    note: "원재료/원산지 강조 (1:1)",
  },
  {
    slot: "texture_closeup",
    type: "image_text",
    required: false,
    note: "조직감/단면 확대 (1:1). 질감이 잘 보이는 매크로/클로즈업 사진을 올리면 감각적 카피와 자연스럽게 매칭됩니다",
  },
  {
    slot: "highlight_box",
    type: "highlight_box",
    required: true,
    note: "맛/원재료/품질 3가지를 카드 3장으로 요약(각 title 6자 내외 + body 1~2문장). checklist와 다른 축, 가장 강조할 내용은 2번째 카드",
  },
  {
    slot: "illustration_banner",
    type: "illustration_banner",
    required: false,
    note: "컨셉 장식 일러스트 배너 (16:9). heading+body가 이미지 위에 오버레이되므로 body도 함께 작성. illustrationUrl은 비워 둠",
  },
  {
    slot: "cooking_steps",
    type: "usage_steps",
    required: false,
    note: "조리법/섭취방법 (가공식품에만 해당)",
  },
  {
    slot: "step_card",
    type: "step_card",
    required: true,
    note: "조리/섭취 3단계. 각 단계에 실제 상품 사진(imageIndex) 배정, title 6자 내외 + body 1문장. STEP 태그는 렌더러가 자동 부착",
  },
  {
    slot: "packaging",
    type: "gallery",
    required: true,
    note: "포장/보관 상태 (3:4). 사진이 많으면 최대 4장",
    minCount: 1,
    maxCount: 4,
  },
  {
    slot: "stat_infographic",
    type: "stat_infographic",
    required: false,
    note: "입력 데이터에 실제 수치 근거가 있을 때만 채움. 근거 없으면 이 섹션 자체를 생략(판매자 확인 필요 금지, 수치 지어내기 금지). metrics 3~5개, 비율형은 style:\"bar\"+percent(0~100 막대) 또는 style:\"ring\"(원형 게이지), 절대 수치(시간·중량·개수 등)는 style:\"number\"로 percent 없이 큰 숫자 강조. basis는 measured/self_assessed",
  },
  {
    slot: "comparison_chart",
    type: "comparison_chart",
    required: false,
    note: "입력에 실측 근거가 있으면 basis:\"measured\", 없으면 basis:\"self_assessed\"로 채우되 baselineLabel은 \"일반 제품\"만 사용(특정 브랜드명 금지). 근거·추정 둘 다 불가하면 슬롯 생략.",
  },
  {
    slot: "nutrition_table",
    type: "spec_table",
    required: true,
    note: "영양성분표 + 알레르기 정보. 원산지·알레르기·보관은 입력·식품 고시 근거만 사용. 없는 함량·%·인증을 지어내지 말고 '판매자 확인 필요'로 표시",
  },
  {
    slot: "faq",
    type: "faq",
    required: false,
    minCount: 3,
    maxCount: 5,
    note: "답변은 입력된 상품 정보(keyFeatures·ingredients·certifications)에 근거한 것만. 근거 없는 질문은 답변에 '판매자에게 문의해주세요'로 표시, 효능·의학적 답변 단정 금지",
  },
  {
    slot: "caution",
    type: "caution",
    required: true,
    note: "유통기한/보관방법/알레르기 경고. 효능을 암시하는 과장 표현 금지",
  },
  {
    slot: "sourcing_story",
    type: "image_text",
    required: true,
    shortTier: "extra",
    note: "원산지/제조 과정 소개 (1:1). 입력에 없는 사실은 지어내지 말 것",
  },
  {
    slot: "serving_suggestion",
    type: "image_text",
    required: true,
    shortTier: "extra",
    note: "서빙/플레이팅 제안 (4:5)",
  },
  { slot: "packaging_design", type: "image_text", required: true, shortTier: "extra", note: "포장 상세 (1:1)" },
  { slot: "storage_tip", type: "image_text", required: true, shortTier: "extra", note: "보관 팁 (1:1)" },
  {
    slot: "shipping_info",
    type: "spec_table",
    required: false,
    note: "배송비/배송기간/교환·환불 안내. 구체적 수치가 입력에 없으면 '판매자 정책을 확인해주세요'로 값 채움 (기존 spec_table 규칙과 동일)",
  },
  {
    slot: "ai_disclosure",
    type: "ai_disclosure",
    required: true,
    note: "AI 생성 콘텐츠 고지. heading/body는 서버가 고정 문구로 채움 — DeepSeek는 슬롯만 포함하거나 생략해도 됨",
  },
  { slot: "cta_price", type: "cta_price", required: true, note: "가격/구매 정보" },
];

const ELECTRONICS: SlotDefinition[] = [
  { slot: "hero", type: "hero", required: true, note: "히어로 (제품 단독 컷, 4:5)" },
  {
    slot: "brand_story",
    type: "brand_story",
    required: false,
    note: "brandName이 입력되지 않았으면 이 슬롯 전체를 생략. 입력된 브랜드명 기반으로만 작성, 없는 브랜드 히스토리·수상내역 지어내지 말 것",
  },
  { slot: "checklist", type: "checklist", required: true, note: "핵심 스펙 3~4개" },
  {
    slot: "quick_points",
    type: "image_text",
    required: true,
    shortTier: "extra",
    repeatable: true,
    minCount: 2,
    maxCount: 4,
    note: "짧은 미니 포인트 2~4개, layout: 'compact'로 채울 것. 사진은 작은 텍스처/디테일 컷, 헤딩은 8자 내외, 본문은 1문장",
  },
  {
    slot: "target_persona",
    type: "target_persona",
    required: false,
    note: "targetCustomer·keyFeatures 입력 기반으로만 작성",
  },
  {
    slot: "feature_callout",
    type: "image_text",
    required: true,
    shortTier: "extra",
    note: "핵심 기능 1가지를 사진+말풍선으로 강조. layout:\"callout\" 필수, callout 12~18자, heading 8자 내외, body 1~2문장. 입력 스펙만",
  },
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
    slot: "highlight_box",
    type: "highlight_box",
    required: true,
    note: "핵심 스펙/기능 3가지를 카드 3장으로 요약(각 title 6자 내외 + body 1~2문장). checklist와 다른 축, 가장 강조할 내용은 2번째 카드",
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
    slot: "stat_infographic",
    type: "stat_infographic",
    required: false,
    note: "입력 데이터에 실제 수치 근거가 있을 때만 채움. 근거 없으면 이 섹션 자체를 생략(판매자 확인 필요 금지, 수치 지어내기 금지). metrics 3~5개, 비율형은 style:\"bar\"+percent(0~100 막대) 또는 style:\"ring\"(원형 게이지), 절대 수치(시간·중량·개수 등)는 style:\"number\"로 percent 없이 큰 숫자 강조. basis는 measured/self_assessed",
  },
  {
    slot: "comparison_chart",
    type: "comparison_chart",
    required: false,
    note: "입력에 실측 근거가 있으면 basis:\"measured\", 없으면 basis:\"self_assessed\"로 채우되 baselineLabel은 \"일반 제품\"만 사용(특정 브랜드명 금지). 근거·추정 둘 다 불가하면 슬롯 생략.",
  },
  {
    slot: "spec_table",
    type: "spec_table",
    required: true,
    note: "전체 스펙 표 — 규격/전력/호환성. 입력 데이터에 없는 수치는 공란 처리",
  },
  {
    slot: "faq",
    type: "faq",
    required: false,
    minCount: 3,
    maxCount: 5,
    note: "답변은 입력된 상품 정보(keyFeatures·ingredients·certifications)에 근거한 것만. 근거 없는 질문은 답변에 '판매자에게 문의해주세요'로 표시, 효능·의학적 답변 단정 금지",
  },
  {
    slot: "package_contents",
    type: "image_text",
    required: true,
    note: "구성품 안내 (1:1). 가능하면 플랫레이에 가까운 컷",
  },
  {
    slot: "step_card",
    type: "step_card",
    required: true,
    note: "설치/사용 3단계. 각 단계에 실제 상품 사진(imageIndex) 배정, title 6자 내외 + body 1문장. STEP 태그는 렌더러가 자동 부착",
  },
  {
    slot: "illustration_banner",
    type: "illustration_banner",
    required: false,
    note: "컨셉 장식 일러스트 배너 (16:9). heading+body가 이미지 위에 오버레이되므로 body도 함께 작성. illustrationUrl은 비워 둠",
  },
  {
    slot: "warranty_caution",
    type: "caution",
    required: true,
    note: "A/S, 주의사항",
  },
  { slot: "design_detail", type: "image_text", required: true, shortTier: "extra", note: "디자인/마감 디테일 (1:1)" },
  {
    slot: "connectivity",
    type: "image_text",
    required: true,
    shortTier: "extra",
    note: "연결성/호환성 안내 (1:1). 입력에 없는 스펙은 지어내지 말 것",
  },
  {
    slot: "install_scenario",
    type: "image_text",
    required: true,
    shortTier: "extra",
    note: "실사용/설치 장면 (4:5)",
  },
  {
    slot: "shipping_info",
    type: "spec_table",
    required: false,
    note: "배송비/배송기간/교환·환불 안내. 구체적 수치가 입력에 없으면 '판매자 정책을 확인해주세요'로 값 채움 (기존 spec_table 규칙과 동일)",
  },
  {
    slot: "ai_disclosure",
    type: "ai_disclosure",
    required: true,
    note: "AI 생성 콘텐츠 고지. heading/body는 서버가 고정 문구로 채움 — DeepSeek는 슬롯만 포함하거나 생략해도 됨",
  },
  { slot: "cta_price", type: "cta_price", required: true, note: "가격/구매 정보" },
];

const PET: SlotDefinition[] = [
  { slot: "hero", type: "hero", required: true, note: "히어로 (제품·패키지 또는 반려동물 사용 컷, 4:5)" },
  {
    slot: "brand_story",
    type: "brand_story",
    required: false,
    note: "brandName이 입력되지 않았으면 생략. 보호자·반려동물 신뢰를 짧게, 없는 수상·연혁 지어내지 말 것",
  },
  { slot: "checklist", type: "checklist", required: true, note: "안전·성분·사용법 핵심 3~4개. 질병 치료·예방 단정 금지" },
  {
    slot: "quick_points",
    type: "image_text",
    required: true,
    shortTier: "extra",
    repeatable: true,
    minCount: 2,
    maxCount: 4,
    note: "짧은 미니 포인트 2~4개, layout: 'compact'. 성분표·용량·주의 문구 컷 활용",
  },
  {
    slot: "target_persona",
    type: "target_persona",
    required: false,
    note: "어떤 반려동물·보호자에게 맞는지. targetCustomer·keyFeatures 입력 기반만",
  },
  {
    slot: "feature_callout",
    type: "image_text",
    required: true,
    note: "성분·안전 1가지를 사진+말풍선으로. layout:\"callout\" 필수. 입력 성분만",
  },
  {
    slot: "material_feature",
    type: "image_text",
    required: true,
    shortTier: "extra",
    note: "주요 성분·원료 (1:1). 없는 영양·함량 % 지어내지 말 것",
  },
  {
    slot: "usage_scenario",
    type: "image_text",
    required: true,
    note: "급여·사용 장면 (4:5). 반려동물과 함께하는 장면",
  },
  {
    slot: "highlight_box",
    type: "highlight_box",
    required: true,
    note: "성분·안전·사용법 3가지 카드. checklist와 다른 축, 2번째 카드에 가장 강조할 내용",
  },
  {
    slot: "gallery",
    type: "gallery",
    required: true,
    shortTier: "extra",
    note: "제품·성분 라벨·급여 장면 (3:4). 최대 5장",
    minCount: 2,
    maxCount: 5,
  },
  {
    slot: "step_card",
    type: "step_card",
    required: true,
    note: "급여·사용 3단계. 체중별 급여량은 입력 수치가 있을 때만",
  },
  {
    slot: "stat_infographic",
    type: "stat_infographic",
    required: false,
    note: "입력에 실제 수치 근거가 있을 때만. 영양 % 날조 금지",
  },
  {
    slot: "spec_table",
    type: "spec_table",
    required: true,
    note: "급여량·적합 연령·주요 성분·원산지. 없으면 판매자 확인 필요",
  },
  {
    slot: "faq",
    type: "faq",
    required: false,
    minCount: 3,
    maxCount: 5,
    note: "급여·보관·알레르기. 입력 근거만. 질병 치료 답변 단정 금지",
  },
  {
    slot: "caution",
    type: "caution",
    required: true,
    note: "반려동물 안전·급여 주의. 수의학적 처방·치료 효과 단정 금지",
  },
  { slot: "material_detail", type: "image_text", required: true, shortTier: "extra", note: "성분표·라벨 클로즈업 (1:1)" },
  {
    slot: "usage_scenario_extra",
    type: "image_text",
    required: false,
    note: "추가 사용·보관 장면 (4:5)",
  },
  { slot: "packaging_design", type: "image_text", required: true, shortTier: "extra", note: "패키지·용량·구성 (1:1)" },
  { slot: "care_tip", type: "image_text", required: true, shortTier: "extra", note: "보관·취급 (1:1)" },
  {
    slot: "shipping_info",
    type: "spec_table",
    required: false,
    note: "배송비/배송기간/교환·환불. 수치 없으면 판매자 정책 확인",
  },
  {
    slot: "ai_disclosure",
    type: "ai_disclosure",
    required: true,
    note: "AI 생성 콘텐츠 고지. heading/body는 서버가 고정 문구로 채움",
  },
  { slot: "cta_price", type: "cta_price", required: true, note: "가격/구매 정보" },
];

const HOME_FALLBACK: SlotDefinition[] = [
  { slot: "hero", type: "hero", required: true, note: "히어로 (4:5)" },
  {
    slot: "brand_story",
    type: "brand_story",
    required: false,
    note: "brandName이 입력되지 않았으면 이 슬롯 전체를 생략. 입력된 브랜드명 기반으로만 작성, 없는 브랜드 히스토리·수상내역 지어내지 말 것",
  },
  { slot: "checklist", type: "checklist", required: true, note: "핵심 포인트 3~4개" },
  {
    slot: "quick_points",
    type: "image_text",
    required: true,
    shortTier: "extra",
    repeatable: true,
    minCount: 2,
    maxCount: 4,
    note: "짧은 미니 포인트 2~4개, layout: 'compact'로 채울 것. 사진은 작은 텍스처/디테일 컷, 헤딩은 8자 내외, 본문은 1문장",
  },
  {
    slot: "target_persona",
    type: "target_persona",
    required: false,
    note: "targetCustomer·keyFeatures 입력 기반으로만 작성",
  },
  {
    slot: "feature_callout",
    type: "image_text",
    required: true,
    note: "소재/기능 핵심 1가지를 사진+말풍선으로 강조. layout:\"callout\" 필수, callout 12~18자, heading 8자 내외, body 1~2문장",
  },
  {
    slot: "material_feature",
    type: "image_text",
    required: true,
    shortTier: "extra",
    note: "소재/기능 강조 (1:1)",
  },
  {
    slot: "usage_scenario",
    type: "image_text",
    required: false,
    note: "실사용 장면 (4:5)",
  },
  {
    slot: "highlight_box",
    type: "highlight_box",
    required: true,
    note: "소재/기능/디자인 3가지를 카드 3장으로 요약(각 title 6자 내외 + body 1~2문장). checklist와 다른 축, 가장 강조할 내용은 2번째 카드",
  },
  {
    slot: "illustration_banner",
    type: "illustration_banner",
    required: false,
    note: "컨셉 장식 일러스트 배너 (16:9). heading+body가 이미지 위에 오버레이되므로 body도 함께 작성. illustrationUrl은 비워 둠",
  },
  {
    slot: "gallery",
    type: "gallery",
    required: true,
    note: "다양한 각도/구성 (3:4). 사진이 많으면 최대 5장",
    minCount: 2,
    maxCount: 5,
  },
  {
    slot: "step_card",
    type: "step_card",
    required: true,
    note: "사용/관리 3단계. 각 단계에 실제 상품 사진(imageIndex) 배정, title 6자 내외 + body 1문장. STEP 태그는 렌더러가 자동 부착",
  },
  {
    slot: "stat_infographic",
    type: "stat_infographic",
    required: false,
    note: "입력 데이터에 실제 수치 근거가 있을 때만 채움. 근거 없으면 생략. metrics 3~5개",
  },
  {
    slot: "spec_table",
    type: "spec_table",
    required: true,
    note: "사이즈/소재/구성",
  },
  {
    slot: "faq",
    type: "faq",
    required: false,
    minCount: 3,
    maxCount: 5,
    note: "답변은 입력된 상품 정보(keyFeatures·ingredients·certifications)에 근거한 것만. 근거 없는 질문은 답변에 '판매자에게 문의해주세요'로 표시, 효능·의학적 답변 단정 금지",
  },
  {
    slot: "caution",
    type: "caution",
    required: false,
    note: "사용 시 주의사항",
  },
  { slot: "material_detail", type: "image_text", required: true, shortTier: "extra", note: "소재 클로즈업 (1:1)" },
  {
    slot: "usage_scenario_extra",
    type: "image_text",
    required: true,
    shortTier: "extra",
    note: "추가 실사용 장면 (4:5)",
  },
  { slot: "packaging_design", type: "image_text", required: true, shortTier: "extra", note: "포장/구성 안내 (1:1)" },
  { slot: "care_tip", type: "image_text", required: true, note: "관리/세척 방법 (1:1)" },
  {
    slot: "shipping_info",
    type: "spec_table",
    required: false,
    note: "배송비/배송기간/교환·환불 안내. 구체적 수치가 입력에 없으면 '판매자 정책을 확인해주세요'로 값 채움 (기존 spec_table 규칙과 동일)",
  },
  {
    slot: "ai_disclosure",
    type: "ai_disclosure",
    required: true,
    note: "AI 생성 콘텐츠 고지. heading/body는 서버가 고정 문구로 채움 — DeepSeek는 슬롯만 포함하거나 생략해도 됨",
  },
  { slot: "cta_price", type: "cta_price", required: true, note: "가격/구매 정보" },
];

export const CATEGORY_SLOT_TEMPLATES: Record<TemplateCategory, SlotDefinition[]> = {
  "화장품/뷰티": BEAUTY,
  "패션/의류": FASHION,
  "식품": FOOD,
  "전자/가전": ELECTRONICS,
  "생활/리빙": HOME_FALLBACK,
  "반려동물": PET,
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
  "반려동물": "반려동물",
  "기타": "생활/리빙",
};

export type SlotLength = "short" | "long";

export function resolveTemplateCategory(category: string): TemplateCategory {
  return CATEGORY_TO_TEMPLATE[category] ?? "생활/리빙";
}

/**
 * 카테고리별 카피 길이·리듬 규율 프롬프트 블록.
 * 기존에는 화장품/뷰티에만 이 규율이 있었고 다른 카테고리는 정성적 가이드만
 * 있어서 카피가 길어지는 경향이 있었다 (27차, 2026-08-26).
 * 공통 슬롯 규율 + 카테고리 전용 슬롯 규율을 합쳐서 반환한다.
 */
export function buildSectionLengthGuide(category: string): string {
  const common = `- hero headline: 한 줄, 공백 포함 22자 이내, 핵심 강점 1개만.
- hero subheadline: 헤드라인을 보충하는 1문장. 상품명만 반복하지 말 것.
- checklist items: 각 14자 내외.
- image_text body (ingredient_highlight, texture_feel, detail_zoom, texture_closeup, feature_detail 등): 2~3문장, 짧은 문장 + 설명 문장을 교차. 가능하면 **고객 인용 → #해시태그 헤드라인 → 입력 근거 수치** 3단 흐름(근거 없으면 해당 단계 생략).
- feature_callout: layout 반드시 "callout". callout 12~18자(말풍선), heading 8자 내외, body 1~2문장.
- step_card: 각 단계 title 6자 내외 + body 1문장. STEP 태그는 서버가 자동으로 붙이므로 title에 STEP 01 등을 쓰지 말 것.
- highlight_box: 카드 3장, title 6자 내외 + body 1~2문장. checklist와 다른 축으로 구성하고, 가장 강조하고 싶은 내용을 2번째 카드에.
- quick_points: layout 반드시 "compact". heading 8자 내외, body 1문장. compact layout은 사진이 작아지므로 텍스트도 짧게.`;

  if (category === "화장품/뷰티") {
    return `\n\n## 화장품 카피 길이·컨셉 정합\n${common}\n- ingredient_highlight body: 2~3문장.\n- texture_feel body: 2문장.\n- spec_table 값에 없는 % 수치를 만들지 말 것 (임상 막대용 가짜 데이터 금지).\n- 시각 컨셉과 모순 금지: 쿨링/진정이면 따뜻·온기·골드 카피 금지. 수분이면 오일리·번들 표현 금지. 클렌징이면 보습 도포를 주효능처럼 쓰지 말 것.`;
  }

  if (category === "의류/패션") {
    return `\n\n## 패션/의류 카피 길이·컨셉 정합\n${common}\n- color_variation 옵션 label: 색상명 + 짧은 수식 (예: "차콜 그레이"), 4~8자.\n- coordination body: 코디 장면 묘사 1~2문장 (예: "데님과 매치하면 캐주얼하게, 슬랙스와 매치하면 포멀하게").\n- fabric_composition(spec_table): 소재/혼용율은 입력에 있는 값만 쓰고, 없으면 "판매자 확인 필요".\n- size_table: 호칭(S/M/L)만으로 cm을 지어내지 말 것. 실측이 입력에 없으면 "판매자 확인 필요".\n- fit_guide body: 핏 설명 2문장 이내 (예: "루즈핏이라 한 치수 크게 나옵니다. 편안한 착용감을 원하시면 정사이즈를 추천해요.").`;
  }

  if (category === "식품/건강기능식품") {
    return `\n\n## 식품 카피 길이·컨셉 정합\n${common}\n- cooking_steps: 각 단계 title 6자 내외 + body 1문장.\n- sourcing_story body: 원산지/생산 배경 2~3문장, 과장 없이 사실 위주. **입력·고시에 없는 원산지 지어내기 금지.**\n- serving_suggestion body: 섭취/제공 장면 1~2문장.\n- storage_tip body: 보관 방법 1문장. **입력에 없으면 "판매자 확인 필요".**\n- nutrition_table / spec_table: 알레르기·원산지·보관은 입력·고시 근거만.`;
  }

  if (category === "전자제품") {
    return `\n\n## 전자/가전 카피 길이·컨셉 정합\n${common}\n- feature_detail body: 기능 1개당 2문장 이내. 헤드라인 숫자 훅은 입력에 있는 수치만.\n- package_contents body: 구성품 1~2문장, 없는 구성품 지어내지 말 것.\n- connectivity / install_scenario body: 호환·설치 정보는 입력 스펙만, 각 2문장 이내.\n- comparison_table: 없는 스펙·벤치마크 날조 금지.`;
  }

  if (category === "생활용품") {
    return `\n\n## 생활용품 카피 길이·컨셉 정합\n${common}\n- material_feature / material_detail body: 각 2문장 이내, 내구성 수치는 입력에 있을 때만.\n- usage_scenario / usage_scenario_extra body: 사용 장면 1~2문장, 한 섹션에 주장 하나.\n- care_tip body: 관리·세척 1문장.`;
  }

  if (category === "반려동물") {
    return `\n\n## 반려동물 카피 길이·컨셉 정합\n${common}\n- 보호자 관점(안전·성분·사용법) 중심. 질병 치료·예방·수명 연장 단정 금지.\n- material_feature body: 입력된 성분·원산지만 2~3문장.\n- usage_scenario / usage_scenario_extra body: 급여·사용 장면 1~2문장. 체중별 급여량은 입력 수치가 있을 때만.\n- care_tip body: 보관·취급 1문장.\n- spec_table: 없는 영양·함량 %를 만들지 말 것.`;
  }

  return `\n\n## 카피 길이·리듬 정합\n${common}`;
}

/**
 * 짧은 구성: required 슬롯 중 shortTier가 "extra"로 표시되지 않은 것만.
 * (shortTier 미지정 = core — 기존 동작과 동일)
 * repeatable은 minCount개 템플릿 행으로 펼침.
 */
function applyShortTemplate(template: SlotDefinition[]): SlotDefinition[] {
  const result: SlotDefinition[] = [];
  for (const def of template) {
    if (!def.required) continue;
    if (def.shortTier === "extra") continue;
    const rowCount = def.repeatable && def.minCount ? def.minCount : 1;
    for (let i = 0; i < rowCount; i++) {
      result.push({ ...def, repeatable: false });
    }
  }
  return result;
}

export function getSlotTemplate(
  category: string,
  length: SlotLength = "long",
): SlotDefinition[] {
  const template = CATEGORY_SLOT_TEMPLATES[resolveTemplateCategory(category)];
  if (length === "long") return template;
  return applyShortTemplate(template);
}

/** UI 힌트용 — 실제 생성될 슬롯(섹션) 개수 */
export function countSlotSections(category: string, length: SlotLength = "long"): number {
  return getSlotTemplate(category, length).length;
}

export function getSlotImageRatio(slot: SlotDefinition): string {
  return SLOT_IMAGE_RATIO[slot.slot] ?? SLOT_IMAGE_RATIO[slot.type] ?? "aspect-square";
}
