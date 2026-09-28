import type { DetailSection } from "@/lib/types/generate";

/**
 * 라이브 미리보기(?capture=)와 export 검증 스크립트(scripts/255cha-*)가 같은 mock을 쓰도록
 * 분리한 픽스처. page.tsx는 "use client" + next/navigation이라 tsx 스크립트에서 직접 import 불가.
 */

export const parityMeta = {
  category: "화장품/뷰티",
  brandName: "AURA LAB",
  productName: "히알루론 수분 크림",
};

/** 128차 — circle-pair 바로 다음 comparison_chart (병합 성공) */
export const capture128CircleThenChartSections: DetailSection[] = [
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
export const capture128ChartThenCircleSections: DetailSection[] = [
  capture128CircleThenChartSections[0]!,
  capture128CircleThenChartSections[2]!,
  capture128CircleThenChartSections[1]!,
  capture128CircleThenChartSections[3]!,
];

/** 128차 — 인접하지 않음(사이에 checklist) → 병합 금지 */
export const capture128NonAdjacentSections: DetailSection[] = [
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

const LONG_HEADING =
  "아침에 바른 수분감이 저녁까지 그대로 남아 있도록 히알루론산 세 가지 분자량을 겹겹이 설계한 데일리 수분 크림 이야기";
const LONG_BODY =
  "건조한 사무실 공기 속에서도 오후 세 시쯤 당김이 올라오지 않도록 저분자·중분자·고분자 히알루론산을 순서대로 배합했습니다. " +
  "피부 표면에는 얇은 보습막을, 결 사이사이에는 촉촉함을 채워 화장이 들뜨지 않게 도와줍니다. " +
  "끈적임 없이 흡수되는 젤 크림 제형이라 아침 메이크업 전에도, 자기 전 마지막 단계에도 부담 없이 쓰실 수 있어요. " +
  "향료를 넣지 않아 민감한 날에도 편하게 손이 가고, 판테놀을 더해 거칠어진 결을 부드럽게 정돈합니다.";

/** 255차 항목 1 — 긴 헤딩/본문으로 line-clamp 적용 지점 전수 비교 */
export const capture255ClampSections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: LONG_HEADING,
    subheadline: LONG_BODY,
    imageIndex: 0,
    badge: "무향",
  },
  {
    type: "image_text",
    slot: "key_benefit",
    layout: "full",
    heading: LONG_HEADING,
    body: LONG_BODY,
    imageIndex: 1,
    imagePosition: "left",
  },
  {
    type: "image_text",
    slot: "texture_detail",
    layout: "annotated",
    heading: LONG_HEADING,
    body: LONG_BODY,
    imageIndex: 2,
    imagePosition: "right",
    annotations: [
      { label: "젤 크림 제형", xPct: 30, yPct: 40 },
      { label: "무향", xPct: 70, yPct: 60 },
    ],
  },
  {
    type: "image_text",
    slot: "feature_callout",
    layout: "callout",
    heading: LONG_HEADING,
    body: LONG_BODY,
    callout: "하루 종일 촉촉",
    imageIndex: 3,
    imagePosition: "left",
  },
  {
    type: "image_text",
    slot: "usage_scenario",
    layout: "full",
    heading: LONG_HEADING,
    body: LONG_BODY,
    imageIndex: 1,
    imagePosition: "left",
  },
  {
    type: "highlight_box",
    slot: "highlight_box",
    heading: `HYDRA ${LONG_HEADING}`,
    cards: [
      { title: "저분자", body: "속까지" },
      { title: "중분자", body: "결 사이" },
      { title: "고분자", body: "표면 보습막" },
    ],
  },
  {
    type: "comparison_chart",
    slot: "comparison_chart",
    heading: LONG_HEADING,
    ourLabel: "AURA LAB",
    baselineLabel: "일반 제품",
    unit: "%",
    basis: "measured",
    basisNote: "자체 보습 테스트, 2026.08",
    metrics: [
      { label: "보습 지속", ourValue: 82, baselineValue: 55 },
      { label: "흡수감", ourValue: 76, baselineValue: 60 },
    ],
  },
  {
    type: "caution",
    slot: "caution",
    heading: LONG_HEADING,
    body: LONG_BODY,
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 28900,
    targetCustomer: "속건조 고민",
    badges: ["무향", "데일리"],
  },
];

/** 255차 항목 2 — 사진 배정 실패 시 text_only (imageIndex는 원본 값 유지 — assign-section-images와 동일) */
export const capture255TextOnlySections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "속건조, 오늘부터 덜 신경 쓰세요",
    subheadline: "히알루론 수분 크림",
    imageIndex: 0,
  },
  {
    type: "checklist",
    slot: "checklist",
    heading: "이런 분께 맞아요",
    items: ["오후 당김", "화장 들뜸", "무향 선호"],
  },
  {
    type: "image_text",
    slot: "packaging_design",
    layout: "text_only",
    heading: "매일 손이 가는 튜브 패키지",
    body: "한 손으로 짜 쓰는 튜브라 아침 준비가 빨라집니다.\n뚜껑을 열 필요 없는 원터치 캡이에요.",
    imageIndex: 2,
    imagePosition: "left",
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 28900,
    badges: ["무향"],
  },
];

/** 255차 항목 3 — lib/section-inserts.ts insertSellerTrustEvidence와 동일 형태 */
export const capture255TrustEvidenceSections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "속건조, 오늘부터 덜 신경 쓰세요",
    subheadline: "히알루론 수분 크림",
    imageIndex: 0,
  },
  {
    type: "highlight_box",
    slot: "seller_trust_evidence",
    heading: "",
    boldBlock: true,
    cards: [{ title: "올리브영 수분크림 부문 3주 연속 판매 1위", body: "" }],
  },
  {
    type: "highlight_box",
    slot: "seller_trust_evidence",
    heading: "판매자가 직접 확인한 근거",
    cards: [{ title: "누적 재구매율 38%", body: "2026년 1~8월 자사몰 주문 기준" }],
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 28900,
    badges: ["무향"],
  },
];

/** 255차 항목 4 — basisNote 없이 basis:self_assessed */
export const capture255SelfAssessedSections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "속건조, 오늘부터 덜 신경 쓰세요",
    subheadline: "히알루론 수분 크림",
    imageIndex: 0,
  },
  {
    type: "comparison_chart",
    slot: "comparison_chart",
    heading: "일반 제품과 무엇이 다른가요",
    ourLabel: "AURA LAB",
    baselineLabel: "일반 제품",
    unit: "%",
    basis: "self_assessed",
    metrics: [
      { label: "안정성", ourValue: 78, baselineValue: 55 },
      { label: "사용감", ourValue: 72, baselineValue: 58 },
    ],
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 28900,
    badges: ["무향"],
  },
];
