import type { ConceptBrief } from "@/lib/concept-brief";
import type { ConceptIconMap } from "@/lib/concept-icons";

export type PhotoCostBreakdown = {
  conceptBrief?: number;
  backdrop?: number;
  sectionBackdrops?: number;
  enhance?: number;
  decor?: number;
  lifestyle?: number;
  effects?: number;
  icons?: number;
  illustrations?: number;
  claude?: number;
  referenceAnalysis?: number;
  reviewInsights?: number;
};

export type ReferenceAnalysisInput = {
  colorHex: string[];
  moodKeywords: string[];
};

export type ReviewInsightsInput = {
  commonPraises: string[];
  commonComplaints: string[];
};

export type SlotLength = "short" | "long";

export type GenerateMode = "draft" | "final";

export type ProductInput = {
  category: string;
  /** 짧은 구성: required 슬롯만. 기본 long */
  length?: SlotLength;
  /**
   * draft: DeepSeek 카피까지. final(기본): 전체 조립.
   * draftSections가 있으면 final에서 카피 재생성 없이 일러스트+조립만.
   */
  mode?: GenerateMode;
  /** final 모드 — draft에서 받은 sections */
  draftSections?: DetailSection[];
  draftHeadlines?: string[];
  draftDescription?: string;
  draftFeatures?: string[];
  draftHowToUse?: string;
  draftCaution?: string;
  draftToken?: string;
  imageUrls: string[];
  imagePaths: string[];
  /**
   * 업로드 사진 역할 태그 (imageUrls와 동일 길이).
   * hero=대표/착장, detail=디테일, lifestyle=코디/사용, package=패키지, other=기타
   */
  imageRoles?: import("@/lib/image-roles").ProductImageRole[];
  productName: string;
  brandName?: string | null;
  price: number;
  targetCustomer?: string | null;
  keyFeatures?: string | null;
  ingredients?: string | null;
  certifications?: string | null;
  competitorUrl?: string | null;
  // URL이 아니라, 판매자가 1688/도매꾹 원본 상품 페이지에서 직접 복사해
  // 붙여넣은 텍스트(상품명/스펙/설명). 필드명은 하위 호환을 위해 유지.
  wholesaleUrl?: string | null;
  /** 레퍼런스 무드/색상 참고 이미지 (Supabase Storage URL) */
  referenceImageUrl?: string | null;
  /** 고객 리뷰 엑셀/txt (Supabase Storage URL) */
  reviewFileUrl?: string | null;
  /** 기획안 PDF/DOCX (Supabase Storage URL) */
  planningDocUrl?: string | null;
  /** 서버 분석 결과 — generate-backdrop/generate에서 채움 */
  referenceAnalysis?: ReferenceAnalysisInput | null;
  reviewInsights?: ReviewInsightsInput | null;
  planningDocText?: string | null;
  photoProcessingCost?: number;
  conceptBrief?: ConceptBrief;
  photoCostBreakdown?: PhotoCostBreakdown;
  /** TEST_MODE: 원본 파일명+크기 지문으로 비전 분석 캐시 키를 고정 */
  imageCacheKey?: string;
  /**
   * 판매자가 직접 보유한 GIF (Supabase Storage URL). AI로 새로 생성하지 않고
   * 원본 그대로 hero 섹션 바로 뒤에 삽입한다 (토큰/비용 절감 목적).
   */
  customGifUrl?: string | null;
  /** AI 재생성 등 — 기존 products 행 id가 있으면 insert 대신 update */
  productId?: string | null;
};

// slot: lib/section-templates.ts가 카테고리별로 고정한 슬롯 이름
// (예: "ingredient_highlight", "size_table"). AI는 이 값을 새로 짓지 않고,
// 해당 위치의 템플릿이 지정한 slot 이름을 그대로 채워 넣는다. 서버는 응답을
// 받은 뒤 slot 순서가 템플릿과 일치하는지 검증한다.
export type HeroSection = {
  type: "hero";
  slot: string;
  headline: string;
  subheadline?: string;
  imageIndex: number;
  /**
   * hero 코너 리본 뱃지 — AI가 새로 짓지 않는다. 서버가 조립 단계에서
   * cta_price.badges의 "사실 기반 키워드" 중 하나를 그대로 재사용해 채운다
   * (design-brief 제안 D). 근거 없는 "베스트/인기" 문구 금지 원칙 유지.
   */
  badge?: string;
};

export type ChecklistSection = {
  type: "checklist";
  slot: string;
  heading: string;
  items: string[];
  /** gallery/image_text 직후에 붙는 체크리스트 — 상단 여백·헤어라인 생략 */
  compactFollow?: boolean;
  /**
   * 페이지 전체에서 옅은 A/B 배경 패턴만 반복되는 단조로움을 깨는 강조 색면
   * 블록(패턴 C, deepAccent 솔리드 + 텍스트 반전). AI가 정하지 않고 서버가
   * app/api/generate/route.ts 정규화 단계에서 페이지당 정확히 1개 섹션에만
   * true를 주입한다(19차 Part B 신규).
   */
  boldBlock?: boolean;
};

export type ImageTextSection = {
  type: "image_text";
  slot: string;
  heading: string;
  body: string;
  imageIndex: number;
  imagePosition: "left" | "right";
  /** 기본 "full" = 기존 풀사이즈 이미지+텍스트. "compact" = 작은 썸네일+텍스트 한 줄. "callout" = 사진 위 말풍선 강조 */
  layout?: "full" | "compact" | "callout";
  /** layout:"callout"일 때 사진 위 말풍선에 표시할 짧은 강조 문구 (12~18자 권장) */
  callout?: string;
};

export type SpecTableSection = {
  type: "spec_table";
  slot: string;
  heading: string;
  rows: { label: string; value: string }[];
};

export type UsageStepsSection = {
  type: "usage_steps";
  slot: string;
  heading: string;
  steps: string[];
};

export type GallerySection = {
  type: "gallery";
  slot: string;
  heading: string;
  imageIndexes: number[];
};

export type CautionSection = {
  type: "caution";
  slot: string;
  heading: string;
  body: string;
};

export type CtaPriceSection = {
  type: "cta_price";
  slot: string;
  price: number;
  targetCustomer?: string | null;
  badges?: string[];
};

// 스펙 비교(경쟁사/이전 모델 대비) 전용 2열 비교표.
export type ComparisonTableSection = {
  type: "comparison_table";
  slot: string;
  heading: string;
  columns: [string, string];
  rows: { label: string; values: [string, string] }[];
};

/**
 * 수치 기반 "우리 제품 vs 비교 대상" 바 차트. comparison_table(불린/텍스트 2열
 * 표)과 달리 실제 막대 길이로 비교하는 용도. 컴플라이언스상 baselineLabel은
 * 반드시 COMPARISON_CHART_BASELINE_LABELS 화이트리스트 값만 허용 — 서버가
 * app/api/generate/route.ts 정규화 단계에서 강제 치환한다 (19차 신규).
 */
export type ComparisonChartSection = {
  type: "comparison_chart";
  slot: string;
  heading: string;
  /** 기본 "우리 제품" 또는 브랜드명. 실제 자사 제품 지칭이라 자유롭게 허용. */
  ourLabel: string;
  /** 서버가 화이트리스트로 강제 — "일반 제품" | "업계 평균" | "타 제품" 중 하나만 최종 허용. */
  baselineLabel: string;
  /** 값 단위 표시. 기본 "%". */
  unit?: string;
  /** 2~4개 권장. */
  metrics: { label: string; ourValue: number; baselineValue: number }[];
  /** 이 차트 전체 수치의 출처. */
  basis: "measured" | "self_assessed";
  /** measured면 출처 한 줄(예: "자체 성분 테스트, 2026.08"), self_assessed면
   * 서버가 고정 디스클레이머로 강제 주입하므로 비워 응답해도 됨. */
  basisNote?: string;
};

/**
 * 페이지메이커 리서치(19차 Part C) 기반 "3열 하이라이트 박스" — 가운데 카드를
 * 진하게 강조한 카드 그리드. checklist(아이콘+한 줄)보다 정보량이 많은 핵심
 * 효과/성분 요약용. 가운데 카드 강조는 AI가 정하지 않고 렌더러가 자동으로
 * deepAccent 솔리드 배경 + 텍스트 반전으로 처리한다(boldBlock과 동일한 원칙 —
 * 서버/렌더러가 결정, AI는 관여하지 않음).
 */
export type HighlightBoxSection = {
  type: "highlight_box";
  slot: string;
  heading: string;
  /** 2~4개 허용, 3개 권장. 가운데(중앙) 카드가 렌더러에 의해 자동 강조됨. */
  cards: { title: string; body: string }[];
  /**
   * 페이지 전체 색면 강조 블록(패턴 C). AI가 정하지 않고 서버가 페이지당 1개 highlight_box에
   * boldBlock을 배정할 수 있다 (checklist boldBlock과 동일 원칙).
   */
  boldBlock?: boolean;
};

/**
 * 페이지메이커 리서치(19차 Part C) 기반 "사진+태그 스텝 카드" — usage_steps
 * (아이콘+한 줄, 사진 없음)를 대체하는 포토 기반 포맷. 각 단계에 실제 상품
 * 사진(imageIndex)을 배정하고 사진 위에 STEP 태그를 오버레이한다. tag 문자열은
 * AI가 만들지 않고 렌더러가 "STEP 0N"으로 자동 생성한다.
 */
export type StepCardSection = {
  type: "step_card";
  slot: string;
  heading: string;
  /** 3단계 권장. */
  steps: { title: string; body: string; imageIndex: number }[];
};

// 컬러/옵션별 스와치 + 착용컷. 패션의 color_variation 슬롯 전용.
export type ColorVariationSection = {
  type: "color_variation";
  slot: string;
  heading: string;
  options: { label: string; colorHex: string; imageIndex: number }[];
};

export type StatInfographicSection = {
  type: "stat_infographic";
  slot: string;
  heading: string;
  /**
   * style: "bar" (기본값) — 비율/점유율처럼 0~100% 막대로 보여줄 수치.
   * style: "number" — 재생시간·중량·인증 개수처럼 퍼센트가 아닌 절대 수치를
   * 큰 숫자 카드로 강조. percent는 style이 "bar"일 때만 의미가 있다.
   * style: "ring" — bar와 동일하게 percent(0~100) 기반이지만 원형 게이지로
   * 강조 표시. 한 섹션에 3개 style을 섞어도 됨(19차 신규).
   * basis — 이 수치의 출처. "measured"(판매자 입력 실측) | "self_assessed"
   * (AI 자체 평가치, 실측 아님). style이 "bar"|"ring"일 때만 의미 있음.
   * 하나라도 self_assessed면 렌더러가 섹션 하단에 디스클레이머 캡션을 표시한다.
   */
  metrics: {
    label: string;
    value: string;
    percent?: number;
    style?: "bar" | "number" | "ring";
    basis?: "measured" | "self_assessed";
  }[];
  /**
   * style:"bar" 막대 강조 스타일. "emphasis"면 deepAccent 굵은 막대(PM 스타일).
   * AI가 정하지 않고 서버가 bar metrics가 있을 때 자동 설정한다.
   */
  barAccent?: "default" | "emphasis";
};

export type IllustrationBannerSection = {
  type: "illustration_banner";
  slot: string;
  heading?: string;
  /** 1~2문장 분위기/설득 카피 — 이미지 위 오버레이 */
  body?: string;
  /** 서버가 generateIllustrationBanner() 후 채움. DeepSeek은 비워 둠 */
  illustrationUrl: string;
};

export type FaqSection = {
  type: "faq";
  slot: string;
  heading: string;
  items: { question: string; answer: string }[];
};

export type TargetPersonaSection = {
  type: "target_persona";
  slot: string;
  heading: string;
  personas: string[];
};

export type BrandStorySection = {
  type: "brand_story";
  slot: string;
  heading: string;
  body: string;
};

/** AI 생성 콘텐츠 고지 — 카피는 서버가 고정 문구로 주입 */
export type AiDisclosureSection = {
  type: "ai_disclosure";
  slot: string;
  heading: string;
  body: string;
};

/**
 * 판매자가 직접 업로드한 GIF를 그대로 삽입하는 섹션. AI가 만들지 않고
 * 서버가 body.customGifUrl로 조립 단계에서 주입한다 (SECTION_TYPE_SHAPES 대상 아님).
 */
export type CustomGifSection = {
  type: "custom_gif";
  slot: string;
  heading?: string;
  gifUrl: string;
};

/**
 * 판매자가 올린 실제 리뷰 파일에서 뽑은 "자주 언급된 장점" 요약 카드.
 * AI가 지어낸 카피가 아니라 lib/review-insights.ts가 원문 리뷰에서 추출한
 * 실데이터이며, 서버가 조립 단계에서 주입한다 (AI는 이 섹션을 생성하지 않음).
 * praises는 원문 그대로의 인용문이 아니라 여러 리뷰에서 반복된 내용의 요약이므로,
 * 렌더링 시 특정 인물이 말한 것처럼(가짜 이름·별점 등) 표시하지 않는다.
 */
export type ReviewHighlightSection = {
  type: "review_highlight";
  slot: string;
  heading: string;
  praises: string[];
};

export type DetailSection =
  | HeroSection
  | ChecklistSection
  | ImageTextSection
  | SpecTableSection
  | UsageStepsSection
  | GallerySection
  | CautionSection
  | CtaPriceSection
  | ComparisonTableSection
  | ComparisonChartSection
  | HighlightBoxSection
  | StepCardSection
  | ColorVariationSection
  | StatInfographicSection
  | IllustrationBannerSection
  | FaqSection
  | TargetPersonaSection
  | BrandStorySection
  | AiDisclosureSection
  | CustomGifSection
  | ReviewHighlightSection;

export type GeneratedCopy = {
  sections: DetailSection[];
  headlines: string[];
  description: string;
  features: string[];
  howToUse: string;
  caution: string;
};

export type ComplianceReplacement = {
  original: string;
  replacement: string;
  count: number;
};

export type ExtractedTheme = {
  accent: string;
  accentSoft: string;
  accentText: string;
  heroScrimFrom: string;
  baseNeutral: string;
  deepAccent: string;
};

export type GenerateResponse = GeneratedCopy & {
  imageAnalysis: string;
  mfdsReviewed?: boolean;
  replacements?: ComplianceReplacement[];
  productId: string;
  theme?: ExtractedTheme | null;
  // 경쟁사/1688·도매꾹 URL 자동 분석에 실패한 경우의 사유 안내
  // (예: 봇 차단, 타임아웃). 성공했거나 URL을 입력하지 않았으면 빈 배열.
  urlAnalysisNotices?: string[];
  qaSummary?: string;
  conceptIcons?: ConceptIconMap;
  photoCostBreakdown?: PhotoCostBreakdown;
  generationCost?: number;
  testMode?: boolean;
  imageUrls?: string[];
  referenceAnalysis?: ReferenceAnalysisInput | null;
  reviewInsights?: ReviewInsightsInput | null;
  planningDocText?: string | null;
};

/** /api/generate mode=draft 응답 */
export type DraftGenerateResponse = GeneratedCopy & {
  draftToken: string;
  imageAnalysis: string;
  mfdsReviewed?: boolean;
  replacements?: ComplianceReplacement[];
  theme?: ExtractedTheme | null;
  urlAnalysisNotices?: string[];
  qaSummary?: string;
  photoCostBreakdown?: PhotoCostBreakdown;
  draftGenerationCost?: number;
  testMode?: boolean;
  imageUrls?: string[];
  referenceAnalysis?: ReferenceAnalysisInput | null;
  reviewInsights?: ReviewInsightsInput | null;
  planningDocText?: string | null;
};
