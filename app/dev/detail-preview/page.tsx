"use client";

import { useRef, useState } from "react";
import { notFound } from "next/navigation";
import DetailActionBar, { type DetailToolTab } from "@/components/DetailActionBar";
import DetailSectionRenderer from "@/components/DetailSectionRenderer";
import BlogPostPanel from "@/components/BlogPostPanel";
import InstagramFeedPanel from "@/components/InstagramFeedPanel";
import ToastBanner from "@/components/ToastBanner";
import type { BlogBlockOverride, BlogPostGlobalOverride } from "@/lib/blog-post";
import type { InstagramSlideOverride } from "@/lib/instagram-feed";
import type { DetailSection } from "@/lib/types/generate";
import { validateImageFile } from "@/lib/image-upload";
import { resolveHeadlineFontKind } from "@/lib/detail-typography";

const initialImageUrls = [
  "/iteration-fixtures/01.jpg",
  "/iteration-fixtures/02.jpg",
  "/iteration-fixtures/03.jpg",
  "/iteration-fixtures/04.jpg",
];

const initialSections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "속건조, 오늘부터 덜 신경 쓰세요",
    subheadline: "히알루론 수분 크림",
    imageIndex: 0,
    badge: "무향",
  },
  {
    type: "brand_story",
    slot: "brand_story",
    heading: "브랜드가 지키는 한 가지",
    body: "복잡한 루틴이 아니라, 매일 쓸 수 있는 수분 레이어를 목표로 만들었습니다.",
  },
  {
    type: "checklist",
    slot: "checklist",
    heading: "이 크림이 하는 일",
    items: ["가벼운 젤", "속당김 케어", "무향", "아침·저녁"],
  },
  {
    type: "target_persona",
    slot: "target_persona",
    heading: "이런 분께",
    personas: ["속건조가 고민인 분", "무향을 선호하는 분", "메이크업 전 케어"],
  },
  {
    type: "image_text",
    slot: "feature_callout",
    layout: "callout",
    callout: "수분 레이어",
    heading: "POINT",
    body: "메이크업 전에도 부담 없이 레이어링할 수 있는 가벼운 제형입니다.",
    imageIndex: 1,
    imagePosition: "left",
  },
  {
    type: "image_text",
    slot: "ingredient_highlight",
    heading: "수분을 붙잡는 히알루론산",
    body: "겉만 번들거리지 않습니다. 피부 결 사이에 수분을 남기는 가벼운 제형이에요.",
    imageIndex: 1,
    imagePosition: "left",
  },
  {
    type: "highlight_box",
    slot: "highlight_box",
    heading: "3가지 강점",
    cards: [
      { title: "수분", body: "히알루론산으로 속당김 케어" },
      { title: "가벼움", body: "끈적임 없는 젤 제형" },
      { title: "무향", body: "향료 없이 데일리 사용" },
    ],
  },
  {
    type: "step_card",
    slot: "step_card",
    heading: "사용법",
    steps: [
      { title: "세안", body: "세안 후 피부결을 정리합니다.", imageIndex: 2 },
      { title: "도포", body: "볼·이마에 소량 올립니다.", imageIndex: 3 },
    ],
  },
  {
    type: "gallery",
    slot: "gallery",
    heading: "실제 사용 장면",
    imageIndexes: [0, 1, 2, 3],
  },
  {
    type: "stat_infographic",
    slot: "stat_infographic",
    heading: "수치로 보는 핵심 포인트",
    metrics: [
      { label: "수분감", value: "가벼운 젤", style: "number" },
      { label: "무향", value: "100%", percent: 100, style: "bar", basis: "self_assessed" },
    ],
    barAccent: "emphasis",
  },
  {
    type: "spec_table",
    slot: "spec_table",
    heading: "제품 정보",
    rows: [
      { label: "용량", value: "50ml" },
      { label: "제형", value: "젤 크림" },
      { label: "향", value: "무향" },
      { label: "원산지", value: "국내" },
    ],
  },
  {
    type: "faq",
    slot: "faq",
    heading: "자주 묻는 질문",
    items: [
      {
        question: "민감성 피부도 사용 가능한가요?",
        answer: "개인차가 있으니 패치 테스트 후 사용해 주세요.",
      },
      {
        question: "메이크업 전에 쓸 수 있나요?",
        answer: "얇게 레이어링하면 메이크업 전 사용에 적합합니다.",
      },
    ],
  },
  {
    type: "caution",
    slot: "caution",
    heading: "사용 시 주의",
    body: "상처·염증 부위에는 사용하지 마세요. 이상 반응이 있으면 사용을 중단하세요.",
  },
  {
    type: "image_text",
    slot: "customer_scenario",
    heading: "아침 루틴",
    body: "출근 전 3분, 속당김 없이 메이크업을 시작하세요.",
    imageIndex: 3,
    imagePosition: "left",
  },
  {
    type: "spec_table",
    slot: "shipping_info",
    heading: "배송·교환 안내",
    rows: [
      { label: "배송비", value: "구매 금액·지역에 따라 달라질 수 있습니다" },
      { label: "배송기간", value: "판매자 확인 필요" },
    ],
  },
  {
    type: "ai_disclosure",
    slot: "ai_disclosure",
    heading: "AI 생성 고지",
    body: "이 상세페이지의 텍스트·이미지 일부는 AI가 생성·보정했습니다.",
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 32900,
    targetCustomer: "20~30대 여성",
    badges: ["무향", "당일발송", "KC 인증"],
  },
];

/** 56차 캡처용 — 패션 + 55차 UI 3종(사이즈 다이어그램·퀵팩트·앵커) 검증 */
const capture56Sections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "데일리에 맞는 오버핏 실루엣",
    subheadline: "에센셜 코튼 티셔츠",
    imageIndex: 0,
    badge: "면 100%",
  },
  {
    type: "brand_story",
    slot: "brand_story",
    heading: "미니멀 라인의 기준",
    body: "불필요한 장식 없이 소재와 핏만으로 말하는 데일리웨어를 만듭니다.",
  },
  {
    type: "checklist",
    slot: "checklist",
    heading: "핏 포인트",
    items: ["20수 순면", "오버핏", "4색 컬러", "사계절"],
  },
  {
    type: "spec_table",
    slot: "spec_table",
    heading: "제품 정보",
    rows: [
      { label: "소재", value: "면 100%" },
      { label: "원산지", value: "국내" },
      { label: "색상", value: "3종" },
      { label: "제조사", value: "NEUTRAL LINE" },
    ],
  },
  {
    type: "gallery",
    slot: "model_multicut",
    heading: "착장 컷",
    imageIndexes: [0, 1, 2, 3],
  },
  {
    type: "step_card",
    slot: "step_card",
    heading: "코디 가이드",
    steps: [
      { title: "데님", body: "캐주얼 데일리룩.", imageIndex: 1 },
      { title: "슬랙스", body: "포멀한 오피스룩.", imageIndex: 2 },
    ],
  },
  {
    type: "spec_table",
    slot: "size_table",
    heading: "사이즈 안내",
    rows: [
      { label: "어깨너비", value: "48cm" },
      { label: "가슴단면", value: "52cm" },
      { label: "총장", value: "68cm" },
      { label: "소매길이", value: "62cm" },
      { label: "모델 착용", value: "판매자 확인 필요" },
    ],
  },
  {
    type: "faq",
    slot: "faq",
    heading: "자주 묻는 질문",
    items: [
      {
        question: "세탁 방법은 어떻게 되나요?",
        answer: "찬물 단독 세탁을 권장합니다.",
      },
      {
        question: "핏은 어떤가요?",
        answer: "오버핏이라 한 치수 크게 나옵니다.",
      },
    ],
  },
  {
    type: "spec_table",
    slot: "shipping_info",
    heading: "배송·교환 안내",
    rows: [
      { label: "배송비", value: "3,000원 (5만원 이상 무료)" },
      { label: "배송기간", value: "2~3영업일" },
    ],
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 39000,
    targetCustomer: "20~40대 데일리룩",
    badges: ["면 100%", "당일발송"],
  },
];

const capture56Meta = {
  category: "의류/패션",
  brandName: "NEUTRAL LINE",
  productName: "에센셜 코튼 티셔츠",
};

/** 57차 B — 식품 크기비교 다이어그램 캡처용 */
const capture57FoodSections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "집에서 즐기는 프리미엄 스테이크",
    subheadline: "와규 스테이크",
    imageIndex: 0,
    badge: "냉동",
  },
  {
    type: "brand_story",
    slot: "brand_story",
    heading: "한 끼의 품격",
    body: "좋은 원육만으로 완성하는 홈쿡 스테이크 라인입니다.",
  },
  {
    type: "spec_table",
    slot: "spec_table",
    heading: "제품 정보",
    rows: [
      { label: "가로", value: "16.5cm" },
      { label: "세로", value: "6.5cm" },
      { label: "중량", value: "200g" },
      { label: "원산지", value: "국내" },
    ],
  },
  {
    type: "gallery",
    slot: "gallery",
    heading: "구성",
    imageIndexes: [0, 1, 2],
  },
  {
    type: "faq",
    slot: "faq",
    heading: "자주 묻는 질문",
    items: [{ question: "해동 방법은?", answer: "냉장 해동 12시간을 권장합니다." }],
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 18900,
    targetCustomer: "홈쿡족",
    badges: ["냉동배송"],
  },
];

const capture57FoodMeta = {
  category: "식품/건강기능식품",
  brandName: "한그릇 키친",
  productName: "와규 스테이크",
};

/** 57차 B — 전자제품 크기비교 다이어그램 캡처용 */
const capture57ElectronicsSections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "작지만 강한 사운드",
    subheadline: "AURA ONE Pro",
    imageIndex: 0,
    badge: "ANC",
  },
  {
    type: "brand_story",
    slot: "brand_story",
    heading: "사운드의 새 기준",
    body: "출퇴근과 운동을 위한 컴팩트한 오픈형 이어버드.",
  },
  {
    type: "spec_table",
    slot: "spec_table",
    heading: "제품 정보",
    rows: [
      { label: "가로", value: "5.8cm" },
      { label: "높이", value: "3.2cm" },
      { label: "지름", value: "4.1cm" },
      { label: "무게", value: "58g" },
    ],
  },
  {
    type: "gallery",
    slot: "gallery",
    heading: "구성",
    imageIndexes: [0, 1, 2],
  },
  {
    type: "faq",
    slot: "faq",
    heading: "자주 묻는 질문",
    items: [{ question: "방수 등급은?", answer: "IPX5 생활방수를 지원합니다." }],
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 189000,
    targetCustomer: "20~40대",
    badges: ["KC 인증"],
  },
];

const capture57ElectronicsMeta = {
  category: "전자제품",
  brandName: "NORA AUDIO",
  productName: "AURA ONE Pro",
};

/** 122차 — 생활용품 QA 픽스처 (PLAIN HOME / 린넨 데코 쿠션 — qa-fixtures 이미지와 정합) */
const capture58LivingSections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "소파 위에 작은 안식처가 필요할 때",
    subheadline: "린넨 데코 쿠션",
    imageIndex: 0,
    badge: "2p 세트",
  },
  {
    type: "brand_story",
    slot: "brand_story",
    heading: "손으로 고른 일상 텍스타일",
    body: "PLAIN HOME은 장식보다 쓰임에 집중합니다. 소파에 올렸을 때 부담 없는 색과 린넨 혼방의 손감만 남깁니다.",
  },
  {
    type: "checklist",
    slot: "checklist",
    heading: "이 쿠션이 하는 일",
    items: ["린넨 혼방 커버", "분리 세탁 가능", "소프트 필링", "2p 기본 구성"],
  },
  {
    type: "spec_table",
    slot: "spec_table",
    heading: "제품 정보",
    rows: [
      { label: "사이즈", value: "45×45cm" },
      { label: "소재", value: "린넨 혼방" },
      { label: "구성", value: "쿠션 2p 세트" },
      { label: "색상", value: "오트밀 · 스카이" },
    ],
  },
  {
    type: "gallery",
    slot: "gallery",
    heading: "실사용 컷",
    imageIndexes: [0, 1, 2, 3],
  },
  {
    type: "faq",
    slot: "faq",
    heading: "자주 묻는 질문",
    items: [
      {
        question: "커버만 세탁할 수 있나요?",
        answer: "지퍼형 커버입니다. 중성 세제·약하게 세탁 후 그늘에서 건조해 주세요.",
      },
    ],
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 34900,
    targetCustomer: "거실·침실 소파",
    badges: ["2p 세트", "당일발송"],
  },
];

const capture58LivingMeta = {
  category: "생활용품",
  brandName: "PLAIN HOME",
  productName: "린넨 데코 쿠션",
};

/** 122차 — 반려동물 QA 픽스처 (PAW FRIEND / 강아지 리드줄 — qa-fixtures 이미지와 정합) */
const capture58PetSections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "산책이 더 가벼워지는 이유",
    subheadline: "강아지 리드줄",
    imageIndex: 0,
    badge: "대형견용",
  },
  {
    type: "brand_story",
    slot: "brand_story",
    heading: "반려동물의 일상을 단순하게",
    body: "PAW FRIEND는 복잡한 장식 대신, 대형견도 안심하고 잡는 견고한 그립과 반사 스티치로 매일의 산책을 만듭니다.",
  },
  {
    type: "checklist",
    slot: "checklist",
    heading: "이 리드줄이 하는 일",
    items: ["대형견 대응", "반사 스티치", "메탈 카라비너", "하네스 호환"],
  },
  {
    type: "spec_table",
    slot: "spec_table",
    heading: "제품 정보",
    rows: [
      { label: "길이", value: "150cm" },
      { label: "소재", value: "나일론 · 메탈 클립" },
      { label: "대상", value: "중·대형견" },
      { label: "호환", value: "하네스 · 목줄 고리" },
    ],
  },
  {
    type: "gallery",
    slot: "gallery",
    heading: "구성 · 디테일",
    imageIndexes: [0, 1, 2, 3],
  },
  {
    type: "faq",
    slot: "faq",
    heading: "자주 묻는 질문",
    items: [
      {
        question: "대형견에도 써도 되나요?",
        answer: "중·대형견용으로 설계했습니다. 하네스 고리에 연결해 사용하는 것을 권장합니다.",
      },
    ],
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 28900,
    targetCustomer: "매일 산책하는 보호자",
    badges: ["대형견용", "반사 스티치"],
  },
];

const capture58PetMeta = {
  category: "반려동물",
  brandName: "PAW FRIEND",
  productName: "강아지 리드줄",
};

/** 60차 — compact image_text 2개 이상 (square/circle 교차) */
const capture60Sections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "속건조, 오늘부터 덜 신경 쓰세요",
    subheadline: "히알루론 수분 크림",
    imageIndex: 0,
    badge: "무향",
  },
  {
    type: "image_text",
    slot: "feature_callout",
    layout: "compact",
    heading: "무향 케어",
    body: "향료 없이 데일리로 쓰기 좋은 가벼운 제형입니다.",
    imageIndex: 1,
    imagePosition: "left",
  },
  {
    type: "image_text",
    slot: "ingredient_highlight",
    layout: "compact",
    heading: "3중 레이어",
    body: "히알루론산 레이어가 속당김을 케어합니다.",
    imageIndex: 2,
    imagePosition: "right",
  },
  {
    type: "image_text",
    slot: "texture_detail",
    layout: "compact",
    heading: "젤 크림 제형",
    body: "끈적임 없이 흡수되는 워터리 텍스처.",
    imageIndex: 3,
    imagePosition: "left",
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 32900,
    targetCustomer: "20~30대 여성",
    badges: ["무향", "당일발송"],
  },
];

const capture60Meta = {
  category: "화장품/뷰티",
  brandName: "AURA LAB",
  productName: "히알루론 수분 크림",
};

/** 59차 — 전자제품 annotated 주석 mock */
const capture59Sections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "작지만 강한 사운드",
    subheadline: "AURA ONE Pro",
    imageIndex: 0,
    badge: "ANC",
  },
  {
    type: "brand_story",
    slot: "brand_story",
    heading: "사운드의 새 기준",
    body: "출퇴근과 운동을 위한 컴팩트한 오픈형 이어버드.",
  },
  {
    type: "image_text",
    slot: "feature_detail",
    layout: "annotated",
    heading: "듀얼 드라이버 구조",
    body: "저음과 고음을 분리 재생해 밸런스 있는 사운드를 제공합니다.",
    imageIndex: 1,
    imagePosition: "left",
    annotations: [
      { label: "ANC 드라이버", xPct: 32, yPct: 38 },
      { label: "이어팁", xPct: 72, yPct: 58 },
      { label: "터치 센서", xPct: 48, yPct: 24 },
    ],
  },
  {
    type: "spec_table",
    slot: "spec_table",
    heading: "제품 정보",
    rows: [
      { label: "무게", value: "58g" },
      { label: "배터리", value: "최대 8시간" },
      { label: "방수", value: "IPX5" },
    ],
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 189000,
    targetCustomer: "20~40대",
    badges: ["KC 인증"],
  },
];

const capture59Meta = {
  category: "전자제품",
  brandName: "NORA AUDIO",
  productName: "AURA ONE Pro",
};

/** 65차 — circle-pair (성분 2개 mock) */
const capture65Sections: DetailSection[] = (() => {
  const specIdx = initialSections.findIndex((s) => s.type === "spec_table" && s.slot === "spec_table");
  const circlePair: DetailSection = {
    type: "image_text",
    slot: "ingredient_circle_pair",
    layout: "circle-pair",
    heading: "",
    body: "",
    imageIndex: 1,
    imagePosition: "left",
    circlePair: [
      { imageUrl: "/iteration-fixtures/02.jpg", label: "히알루론산" },
      { imageUrl: "/iteration-fixtures/03.jpg", label: "판테놀" },
    ],
  };
  if (specIdx < 0) return [...initialSections, circlePair];
  return [
    ...initialSections.slice(0, specIdx),
    circlePair,
    ...initialSections.slice(specIdx),
  ];
})();

const capture65Meta = {
  category: "화장품/뷰티",
  brandName: "AURA LAB",
  productName: "히알루론 수분 크림",
};

/** 69차 — circle-solo (성분 1개 mock) */
const capture69SoloSections: DetailSection[] = (() => {
  const specIdx = initialSections.findIndex((s) => s.type === "spec_table" && s.slot === "spec_table");
  const circleSolo: DetailSection = {
    type: "image_text",
    slot: "ingredient_circle_solo",
    layout: "circle-solo",
    heading: "",
    body: "",
    imageIndex: 1,
    imagePosition: "left",
    circleSolo: { imageUrl: "/iteration-fixtures/02.jpg", label: "히알루론산" },
  };
  if (specIdx < 0) return [...initialSections, circleSolo];
  return [
    ...initialSections.slice(0, specIdx),
    circleSolo,
    ...initialSections.slice(specIdx),
  ];
})();

const capture69SoloMeta = capture65Meta;

/** 124차 — comparison_chart self_assessed 디스클레이머 가시성 */
const capture124ComparisonSections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "속건조, 오늘부터 덜 신경 쓰세요",
    subheadline: "히알루론 수분 크림",
    imageIndex: 0,
    badge: "무향",
  },
  {
    type: "comparison_chart",
    slot: "comparison_chart",
    heading: "일반 제품과 무엇이 다른가요",
    ourLabel: "AURA LAB",
    baselineLabel: "일반 제품",
    unit: "%",
    basis: "self_assessed",
    basisNote: "자체 평가 기준 (개인차가 있을 수 있어요)",
    metrics: [
      { label: "안정성", ourValue: 78, baselineValue: 55 },
      { label: "자극감", ourValue: 42, baselineValue: 60 },
      { label: "사용감", ourValue: 72, baselineValue: 58 },
    ],
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 28900,
    targetCustomer: "속건조 고민",
    badges: ["무향", "데일리"],
  },
];

const capture124ComparisonMeta = capture65Meta;

/** 128차 — circle-pair 바로 다음 comparison_chart (병합 성공) */
const capture128CircleThenChartSections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "성분과 비교가 한눈에",
    subheadline: "히알루론 수분 크림",
    imageIndex: 0,
    badge: "무향",
  },
  {
    type: "image_text",
    slot: "ingredient_circle_pair",
    layout: "circle-pair",
    heading: "",
    body: "",
    imageIndex: 1,
    imagePosition: "left",
    circlePair: [
      { imageUrl: "/iteration-fixtures/02.jpg", label: "히알루론산" },
      { imageUrl: "/iteration-fixtures/03.jpg", label: "판테놀" },
    ],
  },
  {
    type: "comparison_chart",
    slot: "comparison_chart",
    heading: "일반 제품과 무엇이 다른가요",
    ourLabel: "AURA LAB",
    baselineLabel: "일반 제품",
    unit: "%",
    basis: "self_assessed",
    basisNote: "자체 평가 기준 (개인차가 있을 수 있어요)",
    metrics: [
      { label: "안정성", ourValue: 78, baselineValue: 55 },
      { label: "자극감", ourValue: 42, baselineValue: 60 },
      { label: "사용감", ourValue: 72, baselineValue: 58 },
    ],
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 28900,
    targetCustomer: "속건조 고민",
    badges: ["무향", "데일리"],
  },
];

/** 128차 — comparison_chart 바로 다음 circle-pair (순서 반전 병합) */
const capture128ChartThenCircleSections: DetailSection[] = [
  capture128CircleThenChartSections[0]!,
  capture128CircleThenChartSections[2]!,
  capture128CircleThenChartSections[1]!,
  capture128CircleThenChartSections[3]!,
];

/** 128차 — 인접하지 않음(사이에 checklist) → 병합 금지 */
const capture128NonAdjacentSections: DetailSection[] = [
  capture128CircleThenChartSections[0]!,
  capture128CircleThenChartSections[1]!,
  {
    type: "checklist",
    slot: "checklist",
    heading: "사이에 낀 섹션",
    items: ["병합되면 안 됩니다", "각자 독립 렌더"],
  },
  capture128CircleThenChartSections[2]!,
  capture128CircleThenChartSections[3]!,
];

const capture128Meta = capture65Meta;

/**
 * 129차 — far chart에 applyIngredientCircleVisual 적용 후 결과와 동일:
 * circle이 comparison_chart 바로 앞 → 128 combo 발동.
 */
const capture129AfterApplyFarSections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "성분과 비교가 한눈에",
    subheadline: "히알루론 수분 크림",
    imageIndex: 0,
    badge: "무향",
  },
  {
    type: "image_text",
    slot: "ingredient_circle_pair",
    layout: "circle-pair",
    heading: "",
    body: "",
    imageIndex: 1,
    imagePosition: "left",
    circlePair: [
      { imageUrl: "/iteration-fixtures/02.jpg", label: "히알루론산" },
      { imageUrl: "/iteration-fixtures/03.jpg", label: "판테놀" },
    ],
  },
  {
    type: "comparison_chart",
    slot: "comparison_chart",
    heading: "일반 제품과 무엇이 다른가요",
    ourLabel: "AURA LAB",
    baselineLabel: "일반 제품",
    unit: "%",
    basis: "self_assessed",
    basisNote: "자체 평가 기준 (개인차가 있을 수 있어요)",
    metrics: [
      { label: "안정성", ourValue: 78, baselineValue: 55 },
      { label: "자극감", ourValue: 42, baselineValue: 60 },
      { label: "사용감", ourValue: 72, baselineValue: 58 },
    ],
  },
  {
    type: "checklist",
    slot: "checklist",
    heading: "멀리 떨어져 있던 filler",
    items: ["원래 chart↔spec 거리 5+"],
  },
  {
    type: "spec_table",
    slot: "spec_table",
    heading: "제품 정보",
    rows: [{ label: "용량", value: "50ml" }],
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 28900,
    targetCustomer: "속건조 고민",
    badges: ["무향", "데일리"],
  },
];

const capture129Meta = capture65Meta;

/** 131차 — review_highlight praises만 (concerns 없음, 회귀) */
const capture131PraisesOnlySections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "속건조, 오늘부터 덜 신경 쓰세요",
    subheadline: "히알루론 수분 크림",
    imageIndex: 0,
    badge: "무향",
  },
  {
    type: "review_highlight",
    slot: "review_highlight",
    heading: "실제 구매자들이 자주 남긴 이야기",
    praises: [
      "끈적임 없이 흡수돼요",
      "향이 없어서 데일리로 쓰기 좋아요",
      "아침 메이크업 전에 부담이 적어요",
    ],
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 28900,
    targetCustomer: "속건조 고민",
    badges: ["무향", "데일리"],
  },
];

/** 131차 — praises + concerns (신규 블록) */
const capture131WithConcernsSections: DetailSection[] = [
  {
    ...capture131PraisesOnlySections[0]!,
  },
  {
    type: "review_highlight",
    slot: "review_highlight",
    heading: "실제 구매자들이 자주 남긴 이야기",
    praises: [
      "끈적임 없이 흡수돼요",
      "향이 없어서 데일리로 쓰기 좋아요",
      "아침 메이크업 전에 부담이 적어요",
    ],
    concerns: [
      "용량이 조금 아쉽다는 의견이 있어요",
      "겨울엔 보습이 부족하다는 후기도 있습니다",
    ],
  },
  {
    ...capture131PraisesOnlySections[2]!,
  },
];

/** 131차 — 리뷰 섹션 없음 (미업로드 회귀: CTA만) */
const capture131NoReviewSections: DetailSection[] = [
  capture131PraisesOnlySections[0]!,
  capture131PraisesOnlySections[2]!,
];

const capture131Meta = capture65Meta;

/** 133차 — sourceReviewCount 캡션 */
const capture133WithCountSections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "속건조, 오늘부터 덜 신경 쓰세요",
    subheadline: "히알루론 수분 크림",
    imageIndex: 0,
    badge: "무향",
  },
  {
    type: "review_highlight",
    slot: "review_highlight",
    heading: "실제 구매자들이 자주 남긴 이야기",
    praises: ["끈적임 없이 흡수돼요", "무향이라 데일리로 쓰기 좋아요"],
    concerns: ["용량이 조금 아쉽다는 의견이 있어요"],
    sourceReviewCount: 6,
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 28900,
    targetCustomer: "속건조 고민",
    badges: ["무향"],
  },
];

/** 135차 — praise/complaint 매칭 카운트 배지 (0건은 배지 숨김) */
const capture135MatchBadgesSections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "속건조, 오늘부터 덜 신경 쓰세요",
    subheadline: "히알루론 수분 크림",
    imageIndex: 0,
    badge: "무향",
  },
  {
    type: "review_highlight",
    slot: "review_highlight",
    heading: "실제 구매자들이 자주 남긴 이야기",
    praises: [
      "끈적임 없이 흡수돼요",
      "무향이라 데일리로 쓰기 좋아요",
      "원문에 없는 장점 요약",
    ],
    concerns: ["용량이 조금 아쉽다는 의견이 있어요", "원문에 없는 불만"],
    sourceReviewCount: 6,
    praiseMatchCounts: [2, 1, 0],
    complaintMatchCounts: [1, 0],
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 28900,
    targetCustomer: "속건조 고민",
    badges: ["무향"],
  },
];

/** 137차 — 리뷰 축 measured comparison + evidenceQuotes */
const capture137AxisMeasuredSections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "속건조, 오늘부터 덜 신경 쓰세요",
    subheadline: "히알루론 수분 크림",
    imageIndex: 0,
    badge: "무향",
  },
  {
    type: "comparison_chart",
    slot: "comparison_chart",
    heading: "실제 후기에서 자주 언급된 점",
    ourLabel: "AURA LAB",
    baselineLabel: "일반 제품",
    unit: "%",
    basis: "measured",
    basisNote: "실제 업로드 리뷰 텍스트 기반 언급 비율(가정 기준선 50 대비)",
    metrics: [
      { label: "수분감", ourValue: 20, baselineValue: 50 },
      { label: "흡수", ourValue: 20, baselineValue: 50 },
      { label: "무향", ourValue: 20, baselineValue: 50 },
    ],
    evidenceQuotes: [
      {
        label: "수분감",
        quotes: [
          "수분감이 오래가요. 건조한 피부에 바르니 하루 종일 촉촉합니다.",
          "수분감이 좋아요. 아침에도 당김이 덜합니다.",
        ],
      },
      {
        label: "흡수",
        quotes: [
          "흡수가 빠르고 끈적임이 거의 없어요. 아침 루틴에 좋아요.",
          "흡수가 빨라서 화장 전에 쓰기 좋습니다.",
        ],
      },
      {
        label: "무향",
        quotes: [
          "무향이라 민감한 피부에도 자극 없이 사용 중입니다.",
          "무향이라 데일리로 쓰기 편합니다.",
        ],
      },
    ],
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 28900,
    targetCustomer: "속건조 고민",
    badges: ["무향"],
  },
];

/** 137차 — 리뷰 없음 / self_assessed만 (근거 토글 없음) */
const capture137NoReviewSections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "속건조, 오늘부터 덜 신경 쓰세요",
    subheadline: "히알루론 수분 크림",
    imageIndex: 0,
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 28900,
    targetCustomer: "속건조 고민",
    badges: [],
  },
];

/** 133차 — 전자제품 spec_table KC 인증 있음 (enrich 후와 동일 형태) */
const capture133ElectronicsCertSections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "먼지 걱정 없는 하루",
    subheadline: "무선 청소기",
    imageIndex: 0,
  },
  {
    type: "spec_table",
    slot: "spec_table",
    heading: "상품 정보",
    rows: [
      { label: "브랜드", value: "AURA" },
      { label: "제조사", value: "AURA" },
      { label: "모델명", value: "VC-100" },
      { label: "KC 인증", value: "KC인증 12345" },
      { label: "정격전압", value: "21.6V" },
      { label: "품질보증", value: "1년" },
      { label: "제조국", value: "한국" },
    ],
  },
];

/** 133차 — KC 행 없음 */
const capture133ElectronicsNoCertSections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "먼지 걱정 없는 하루",
    subheadline: "무선 청소기",
    imageIndex: 0,
  },
  {
    type: "spec_table",
    slot: "spec_table",
    heading: "상품 정보",
    rows: [
      { label: "브랜드", value: "AURA" },
      { label: "제조사", value: "AURA" },
      { label: "모델명", value: "VC-100" },
      { label: "정격전압", value: "21.6V" },
      { label: "품질보증", value: "1년" },
      { label: "제조국", value: "한국" },
    ],
  },
];

const capture133Meta = {
  category: "전자제품",
  brandName: "AURA",
  productName: "무선 청소기",
};

/** 160차 — 소음(dB) + 방수(IPX) 기준표 다이어그램 + 각주 중복 재사용 캡처 */
const capture160NoiseIpSections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "도서관보다 조용한 공기",
    subheadline: "AURA PURE Mini",
    imageIndex: 0,
    badge: "24dB",
  },
  {
    type: "spec_table",
    slot: "spec_table",
    heading: "제품 정보",
    rows: [
      { label: "소음도", value: "24dB" },
      { label: "방수등급", value: "IPX5" },
      { label: "소비전력", value: "28W" },
      { label: "필터", value: "H13 HEPA" },
    ],
  },
  {
    type: "stat_infographic",
    slot: "stat_infographic",
    heading: "임상으로 확인한 변화",
    barAccent: "emphasis",
    metrics: [
      {
        label: "유해균 감소",
        value: "92%",
        percent: 92,
        style: "bar",
        basis: "measured",
        sourceNote: "한국화학융합시험연구원, 2025.11, n=48",
      },
      {
        label: "냄새 개선",
        value: "86%",
        percent: 86,
        style: "bar",
        basis: "measured",
        sourceNote: "한국화학융합시험연구원, 2025.11, n=48",
      },
      {
        label: "만족도",
        value: "94%",
        percent: 94,
        style: "bar",
        basis: "measured",
        sourceNote: "한국화학융합시험연구원, 2025.11, n=48",
      },
      {
        label: "피부 자극 없음",
        value: "100%",
        percent: 100,
        style: "bar",
        basis: "measured",
        sourceNote: "피부임상연구센터, 2026.01, n=32",
      },
    ],
  },
  {
    type: "image_text",
    slot: "ingredient_highlight",
    heading: "나이아신아마이드 5%",
    body: "피부 장벽을 케어하는 핵심 성분으로, 속당김을 덜 느끼게 돕는 가벼운 제형입니다.",
    imageIndex: 1,
    imagePosition: "left",
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 129000,
    targetCustomer: "원룸·소형 공간",
    badges: ["KC 인증"],
  },
];

const capture160NoiseIpMeta = {
  category: "전자제품",
  brandName: "AURA AIR",
  productName: "AURA PURE Mini",
};

const capture160FoodFootnoteMeta = {
  category: "식품/건강기능식품",
  brandName: "VITAL LAB",
  productName: "프로바이오틱스 30억",
};

const capture160BeautyIngredientMeta = {
  category: "화장품/뷰티",
  brandName: "AURA LAB",
  productName: "나이아신아마이드 세럼",
};

/** 69차 — spec_table 3장 썸네일 + 배경 틴트 */
const capture69SpecMultiSections: DetailSection[] = initialSections.map((section) =>
  section.type === "spec_table" && section.slot === "spec_table"
    ? { ...section, imageIndexes: [1, 2, 3] }
    : section,
);

const capture69SpecMultiMeta = capture65Meta;

type CapturePreset = {
  sections: DetailSection[];
  category: string;
  brandName: string;
  productName: string;
  /** 121차 — capture=58-* 전용 카테고리 이미지. 없으면 iteration-fixtures */
  imageUrls?: string[];
};

const QA_FIXTURE_COSMETICS = [
  "/qa-fixtures/cosmetics/01.jpg",
  "/qa-fixtures/cosmetics/02.jpg",
  "/qa-fixtures/cosmetics/03.jpg",
  "/qa-fixtures/cosmetics/04.jpg",
];
const QA_FIXTURE_FASHION = [
  "/qa-fixtures/fashion/01.png",
  "/qa-fixtures/fashion/02.png",
  "/qa-fixtures/fashion/03.png",
  "/qa-fixtures/fashion/04.png",
];
const QA_FIXTURE_FOOD = [
  "/qa-fixtures/food/01.png",
  "/qa-fixtures/food/02.png",
  "/qa-fixtures/food/03.png",
  "/qa-fixtures/food/04.png",
];
const QA_FIXTURE_ELECTRONICS = [
  "/qa-fixtures/electronics/01.png",
  "/qa-fixtures/electronics/02.png",
  "/qa-fixtures/electronics/03.png",
  "/qa-fixtures/electronics/04.png",
];
const QA_FIXTURE_LIVING = [
  "/qa-fixtures/living/01.png",
  "/qa-fixtures/living/02.png",
  "/qa-fixtures/living/03.png",
  "/qa-fixtures/living/04.png",
];
const QA_FIXTURE_PET = [
  "/qa-fixtures/pet/01.png",
  "/qa-fixtures/pet/02.png",
  "/qa-fixtures/pet/03.png",
  "/qa-fixtures/pet/04.png",
];

/** 58차 — 6카테고리 baseNeutral 캡처용 */
const CAPTURE58_PRESETS: Record<string, CapturePreset> = {
  "58-fashion": {
    sections: capture56Sections,
    ...capture56Meta,
    imageUrls: QA_FIXTURE_FASHION,
  },
  "58-cosmetics": {
    sections: initialSections,
    category: "화장품/뷰티",
    brandName: "AURA LAB",
    productName: "히알루론 수분 크림",
    imageUrls: QA_FIXTURE_COSMETICS,
  },
  "58-food": {
    sections: capture57FoodSections,
    ...capture57FoodMeta,
    imageUrls: QA_FIXTURE_FOOD,
  },
  "58-electronics": {
    sections: capture57ElectronicsSections,
    ...capture57ElectronicsMeta,
    imageUrls: QA_FIXTURE_ELECTRONICS,
  },
  "58-living": {
    sections: capture58LivingSections,
    ...capture58LivingMeta,
    imageUrls: QA_FIXTURE_LIVING,
  },
  "58-pet": {
    sections: capture58PetSections,
    ...capture58PetMeta,
    imageUrls: QA_FIXTURE_PET,
  },
};

function resolveCapturePreset(): CapturePreset | null {
  if (typeof window === "undefined") return null;
  const capture = new URLSearchParams(window.location.search).get("capture");
  if (capture === "1") return { sections: capture56Sections, ...capture56Meta };
  if (capture === "57-food") return { sections: capture57FoodSections, ...capture57FoodMeta };
  if (capture === "57-electronics") {
    return { sections: capture57ElectronicsSections, ...capture57ElectronicsMeta };
  }
  if (capture && CAPTURE58_PRESETS[capture]) return CAPTURE58_PRESETS[capture]!;
  if (capture === "60-compact-shapes") return { sections: capture60Sections, ...capture60Meta };
  if (capture === "59-electronics") return { sections: capture59Sections, ...capture59Meta };
  if (capture === "65-circle-pair") return { sections: capture65Sections, ...capture65Meta };
  if (capture === "65-no-ingredients") return { sections: initialSections, ...capture65Meta };
  if (capture === "69-circle-solo") return { sections: capture69SoloSections, ...capture69SoloMeta };
  if (capture === "124-comparison") {
    return { sections: capture124ComparisonSections, ...capture124ComparisonMeta };
  }
  if (capture === "128-circle-then-chart") {
    return { sections: capture128CircleThenChartSections, ...capture128Meta };
  }
  if (capture === "128-chart-then-circle") {
    return { sections: capture128ChartThenCircleSections, ...capture128Meta };
  }
  if (capture === "128-non-adjacent") {
    return { sections: capture128NonAdjacentSections, ...capture128Meta };
  }
  if (capture === "129-after-apply-far") {
    return { sections: capture129AfterApplyFarSections, ...capture129Meta };
  }
  if (capture === "131-praises-only") {
    return { sections: capture131PraisesOnlySections, ...capture131Meta };
  }
  if (capture === "131-with-concerns") {
    return { sections: capture131WithConcernsSections, ...capture131Meta };
  }
  if (capture === "131-no-review") {
    return { sections: capture131NoReviewSections, ...capture131Meta };
  }
  if (capture === "133-with-count") {
    return {
      sections: capture133WithCountSections,
      category: "화장품/뷰티",
      brandName: "AURA LAB",
      productName: "히알루론 수분 크림",
    };
  }
  if (capture === "135-match-badges") {
    return {
      sections: capture135MatchBadgesSections,
      category: "화장품/뷰티",
      brandName: "AURA LAB",
      productName: "히알루론 수분 크림",
    };
  }
  if (capture === "137-axis-measured") {
    return {
      sections: capture137AxisMeasuredSections,
      category: "화장품/뷰티",
      brandName: "AURA LAB",
      productName: "히알루론 수분 크림",
    };
  }
  if (capture === "137-no-review") {
    return {
      sections: capture137NoReviewSections,
      category: "화장품/뷰티",
      brandName: "AURA LAB",
      productName: "히알루론 수분 크림",
    };
  }
  if (capture === "133-electronics-cert") {
    return { sections: capture133ElectronicsCertSections, ...capture133Meta };
  }
  if (capture === "133-electronics-nocert") {
    return { sections: capture133ElectronicsNoCertSections, ...capture133Meta };
  }
  if (capture === "160-noise-ip") {
    return {
      sections: capture160NoiseIpSections,
      ...capture160NoiseIpMeta,
      imageUrls: QA_FIXTURE_ELECTRONICS,
    };
  }
  if (capture === "160-footnote-dedupe") {
    return {
      sections: capture160NoiseIpSections,
      ...capture160FoodFootnoteMeta,
      imageUrls: QA_FIXTURE_FOOD,
    };
  }
  if (capture === "160-ingredient-note") {
    return {
      sections: capture160NoiseIpSections,
      ...capture160BeautyIngredientMeta,
      imageUrls: QA_FIXTURE_COSMETICS,
    };
  }
  if (capture === "69-spec-multi") {
    return { sections: capture69SpecMultiSections, ...capture69SpecMultiMeta };
  }
  return null;
}

function readCaptureMode(): boolean {
  return resolveCapturePreset() !== null;
}

export default function DetailPreviewPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturePreset] = useState(resolveCapturePreset);
  const captureMode = capturePreset !== null;
  const [sections, setSections] = useState(() =>
    capturePreset ? capturePreset.sections : initialSections,
  );
  const [imageUrls, setImageUrls] = useState(
    () => capturePreset?.imageUrls ?? initialImageUrls,
  );
  const [editMode, setEditMode] = useState(false);
  const [toolTab, setToolTab] = useState<DetailToolTab>("edit");
  const [replaceImageIndex, setReplaceImageIndex] = useState(0);
  const [aiText, setAiText] = useState("");
  const [patchIndex, setPatchIndex] = useState(0);
  const [patchInstruction, setPatchInstruction] = useState("");
  const [hiddenIndexes, setHiddenIndexes] = useState<number[]>([]);
  const [feedOverrides, setFeedOverrides] = useState<Record<string, InstagramSlideOverride>>({});
  const [blogBlockOverrides, setBlogBlockOverrides] = useState<Record<string, BlogBlockOverride>>(
    {},
  );
  const [blogGlobalOverrides, setBlogGlobalOverrides] = useState<BlogPostGlobalOverride>({});
  const [toast, setToast] = useState<{ message: string; tone: "error" | "info" | "ok" } | null>(
    null,
  );

  const previewCategory = capturePreset?.category ?? "화장품/뷰티";
  const previewBrandName = capturePreset?.brandName ?? "테스트 브랜드";
  const previewProductName = capturePreset?.productName ?? "히알루론 수분 크림";

  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  function handleTabChange(next: DetailToolTab) {
    setToolTab(next);
    if (next === "edit" || next === "patch") setEditMode(true);
    if (next === "instagram" || next === "blog") setEditMode(false);
  }

  function handleReorder(from: number, to: number) {
    if (to < 0 || to >= sections.length) return;
    setSections((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      return next;
    });
  }

  function handleToggleHidden(index: number) {
    setHiddenIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  }

  const visibleOriginalIndexes = sections
    .map((_, i) => i)
    .filter((i) => !hiddenIndexes.includes(i));
  const visibleSections = visibleOriginalIndexes.map((i) => sections[i]!);

  function handleAiGenerate() {
    const trimmed = aiText.trim();
    if (!trimmed) {
      setToast({
        tone: "info",
        message:
          "1688/도매꾹 원본 상품명·스펙·설명을 붙여넣은 뒤 다시 시도해 주세요. 빈 상태에서는 AI를 호출하지 않습니다.",
      });
      return;
    }
    setToast({
      tone: "info",
      message: "프리뷰에서는 과금 API를 호출하지 않습니다. 결과 페이지에서 생성 요청을 사용하세요.",
    });
  }

  return (
    <div className="min-h-full bg-paper pb-24">
      <div
        data-preview-chrome
        className="sticky top-0 z-30 mx-auto max-w-[430px] space-y-3 bg-paper/95 px-3 py-3 backdrop-blur-md"
        style={captureMode ? { display: "none" } : undefined}
      >
        <p className="text-center text-xs text-ink/45">
          /dev/detail-preview — 레이아웃·버튼 확인용
        </p>
        <DetailActionBar
          tab={toolTab}
          onTabChange={handleTabChange}
          editMode={editMode}
          onToggleEdit={() => setEditMode((v) => !v)}
          onSave={() => {
            setEditMode(false);
            setToast({ tone: "ok", message: "수정 내용이 저장되었습니다." });
          }}
          onUploadClick={() => fileInputRef.current?.click()}
          replaceImageIndex={replaceImageIndex}
          imageCount={imageUrls.length}
          onReplaceIndexChange={setReplaceImageIndex}
          aiText={aiText}
          onAiTextChange={setAiText}
          onAiSubmit={handleAiGenerate}
          patchIndex={patchIndex}
          onPatchIndexChange={setPatchIndex}
          patchInstruction={patchInstruction}
          onPatchInstructionChange={setPatchInstruction}
          onPatchSubmit={() =>
            setToast({
              tone: "info",
              message: "프리뷰에서는 섹션 AI API를 호출하지 않습니다. 결과 페이지에서 사용하세요.",
            })
          }
          sections={sections}
          hiddenIndexes={hiddenIndexes}
          onReorder={handleReorder}
          onToggleHidden={handleToggleHidden}
          category={previewCategory}
          feedProductName={previewProductName}
          feedImageUrls={imageUrls}
          blogProductName={previewProductName}
          blogCategory={previewCategory}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            const error = validateImageFile(file);
            if (error) {
              setToast({ tone: "error", message: error });
              return;
            }
            const url = URL.createObjectURL(file);
            setImageUrls((prev) => {
              const next = [...prev];
              const target = Math.min(replaceImageIndex, next.length - 1);
              next[target] = url;
              return next;
            });
            setToast({ tone: "ok", message: "미리보기에 반영했습니다." });
          }}
        />
      </div>
      {toolTab === "instagram" ? (
        <div className="mx-auto max-w-[430px] border-x border-line bg-paper p-3 shadow-sm">
          <InstagramFeedPanel
            variant="workspace"
            productName={previewProductName}
            brandName={previewBrandName}
            sections={visibleSections}
            imageUrls={imageUrls}
            overrides={feedOverrides}
            onOverridesChange={setFeedOverrides}
          />
        </div>
      ) : toolTab === "blog" ? (
        <div className="mx-auto max-w-[430px] border-x border-line bg-paper p-3 shadow-sm">
          <BlogPostPanel
            variant="workspace"
            productName={previewProductName}
            brandName={previewBrandName}
            category={previewCategory}
            sections={visibleSections}
            imageUrls={imageUrls}
            description="속건조를 잡아주는 고보습 수분 크림입니다."
            features={["히알루론산 고함량", "무향·저자극", "끈적임 없는 마무리"]}
            howToUse="세안 후 토너 다음 단계에서 적당량을 펴 발라 주세요."
            caution="눈 주위를 피하고, 이상 반응 시 사용을 중단하세요."
            price={32900}
            blockOverrides={blogBlockOverrides}
            onBlockOverridesChange={setBlogBlockOverrides}
            globalOverrides={blogGlobalOverrides}
            onGlobalOverridesChange={setBlogGlobalOverrides}
          />
        </div>
      ) : (
        <div
          className="mx-auto max-w-[430px] overflow-x-hidden border-x border-line bg-paper shadow-sm"
          data-pagzly-preview
          data-headline-face={resolveHeadlineFontKind(previewCategory)}
        >
          <DetailSectionRenderer
            sections={visibleSections}
            imageUrls={imageUrls}
            category={previewCategory}
            brandName={previewBrandName}
            productName={previewProductName}
            edit={{
              enabled: editMode,
              onChange: (displayIndex, section) => {
                const originalIndex = visibleOriginalIndexes[displayIndex];
                if (originalIndex === undefined) return;
                setSections((prev) =>
                  prev.map((item, i) => (i === originalIndex ? section : item)),
                );
              },
              onReplaceImage: (imageIndex) => {
                setReplaceImageIndex(imageIndex);
                setToolTab("upload");
                fileInputRef.current?.click();
              },
              onRequestAiPatch: (index) => {
                setPatchIndex(index);
                setEditMode(true);
                setToolTab("patch");
              },
            }}
          />
        </div>
      )}
      {toast && (
        <ToastBanner
          message={toast.message}
          tone={toast.tone}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
