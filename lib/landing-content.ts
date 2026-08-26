/** 랜딩 페이지와 AI 상담봇이 공유하는 서비스 설명·요금·FAQ 데이터 */

export type LandingFeature = {
  title: string;
  description: string;
};

export type LandingProcessStep = {
  step: string;
  title: string;
  description: string;
};

export type LandingPlan = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted: boolean;
  cta: string;
};

export type LandingFaq = {
  question: string;
  answer: string;
};

export const LANDING_HERO_DESCRIPTION =
  "Pagzly는 상품 사진 한 장으로 색감·카피·레이아웃을 자동 완성합니다. 디자이너를 구하고, 시안을 주고받고, 수정을 기다리는 동안 오늘의 매출은 다시 오지 않습니다.";

export const LANDING_PIPELINE_DESCRIPTION =
  "색 추출, 카피 작성, 레이아웃 구성까지 2~3분. 디자이너 시안을 기다리는 동안 놓치는 주문을 줄이세요.";

export const LANDING_PRICING_INTRO =
  "규모에 맞는 플랜을 선택하세요. 언제든 업그레이드할 수 있습니다.";

export const LANDING_CTA_NOTE = "신용카드 없이 시작 · 언제든 해지 가능";

export const LANDING_FEATURES: LandingFeature[] = [
  {
    title: "AI 자동 생성",
    description:
      "상품 사진만 업로드하면 AI가 카피, 레이아웃, 디자인까지 자동으로 완성합니다.",
  },
  {
    title: "완성 즉시 다운로드",
    description:
      "완성된 상세페이지를 고해상도 이미지로 바로 다운로드해, 스마트스토어·쿠팡 등 어디든 즉시 등록할 수 있습니다.",
  },
  {
    title: "직접 편집 가능",
    description:
      "AI가 만든 결과물을 그대로 쓰거나, 텍스트·이미지·섹션을 자유롭게 수정할 수 있습니다.",
  },
];

export const LANDING_PROCESS_STEPS: LandingProcessStep[] = [
  {
    step: "01",
    title: "업로드",
    description:
      "상품 사진을 최소 7장·최대 10장까지 올려주세요. 스마트폰으로 찍은 사진이면 충분합니다.",
  },
  {
    step: "02",
    title: "색·카피 자동 분석",
    description:
      "AI가 사진에서 색상을 추출하고, 카테고리에 맞는 카피와 레이아웃을 자동으로 구성합니다.",
  },
  {
    step: "03",
    title: "완성",
    description:
      "2~3분 안에 상세페이지가 완성됩니다. 바로 다운로드하거나 정보를 수정해 다시 생성하세요.",
  },
];

export const LANDING_PLANS: LandingPlan[] = [
  {
    name: "무료",
    price: "0",
    period: "월",
    description: "Pagzly를 처음 시작하는 분께",
    features: ["월 3회 생성", "기본 템플릿", "워터마크 포함"],
    highlighted: false,
    cta: "무료로 시작",
  },
  {
    name: "스타터",
    price: "19,900",
    period: "월",
    description: "소규모 셀러를 위한 플랜",
    features: [
      "월 30회 생성",
      "프리미엄 템플릿",
      "고해상도 이미지 즉시 다운로드",
      "워터마크 제거",
    ],
    highlighted: true,
    cta: "스타터 시작하기",
  },
  {
    name: "그로스",
    price: "49,000",
    period: "월",
    description: "성장하는 비즈니스를 위한 플랜",
    features: [
      "무제한 생성",
      "모든 템플릿",
      "고해상도 이미지 즉시 다운로드",
      "우선 AI 처리",
      "팀 협업 (3명)",
    ],
    highlighted: false,
    cta: "그로스 시작하기",
  },
];

export const LANDING_FAQS: LandingFaq[] = [
  {
    question: "스튜디오에서 찍은 사진이 아니어도 되나요?",
    answer:
      "네, 스마트폰으로 찍은 사진이면 충분합니다. AI가 배경을 자동으로 제거하고 화질을 보정한 뒤, 상품 고유의 색감에 맞춘 새 스튜디오 배경을 생성해 자연스러운 상세페이지로 완성해 드립니다.",
  },
  {
    question: "생성된 카피와 이미지, 저작권 문제는 없나요?",
    answer:
      "생성되는 카피와 배경 이미지는 요청마다 새로 만들어지는 결과물입니다. 다만 업로드하시는 상품 사진 자체는 반드시 본인이 촬영했거나 사용 권한이 있는 사진만 올려주세요.",
  },
  {
    question: "완성된 페이지를 스마트스토어·쿠팡에 바로 쓸 수 있나요?",
    answer:
      "완성된 상세페이지는 이미지 파일로 바로 다운로드할 수 있습니다. 스마트스토어, 쿠팡을 비롯한 어떤 판매 채널의 상세페이지 등록란에도 그대로 업로드하실 수 있습니다.",
  },
  {
    question: "화장품·식품인데 광고 문구 규제가 걱정돼요.",
    answer:
      "화장품·식품 카테고리는 식약처 표시광고 기준을 자동으로 검수합니다. 효능을 단정하거나 과장된 표현이 감지되면 순화된 문구로 자동 교체하고, 어떤 부분이 바뀌었는지 결과 화면에서 확인할 수 있습니다.",
  },
  {
    question: "결과물이 마음에 안 들면 수정할 수 있나요?",
    answer:
      "언제든 '정보 수정'에서 상품 정보나 사진을 바꿔 다시 생성할 수 있습니다. 완성된 페이지는 이미지로 다운로드해 다른 곳에 자유롭게 활용하실 수 있습니다.",
  },
  {
    question: "사진은 몇 장까지, 어떤 형식으로 올릴 수 있나요?",
    answer:
      "JPG·PNG 형식으로 최소 7장·최대 10장까지 업로드할 수 있습니다. AI는 그중 서로 다른 사진 최소 7장을 상세페이지에 사용합니다. 다양한 각도의 사진을 올릴수록 갤러리·디테일·인스타 피드가 더 풍성해집니다.",
  },
  {
    question: "인스타그램 피드용 이미지도 만들 수 있나요?",
    answer:
      "네. 결과 화면에서 '인스타 피드용 만들기'를 누르면 상세페이지 카피·사진으로 1080×1080 피드 카드를 만들고 PNG로 바로 저장할 수 있습니다.",
  },
];
