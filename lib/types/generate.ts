import type { ConceptBrief } from "@/lib/concept-brief";
import type { ConceptIconMap } from "@/lib/concept-icons";

export type PhotoCostBreakdown = {
  conceptBrief?: number;
  backdrop?: number;
  sectionBackdrops?: number;
  enhance?: number;
  decor?: number;
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
};

export type ChecklistSection = {
  type: "checklist";
  slot: string;
  heading: string;
  items: string[];
  /** gallery/image_text 직후에 붙는 체크리스트 — 상단 여백·헤어라인 생략 */
  compactFollow?: boolean;
};

export type ImageTextSection = {
  type: "image_text";
  slot: string;
  heading: string;
  body: string;
  imageIndex: number;
  imagePosition: "left" | "right";
  /** 기본 "full" = 기존 풀사이즈 이미지+텍스트. "compact" = 작은 썸네일+텍스트 한 줄 */
  layout?: "full" | "compact";
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
  metrics: { label: string; value: string; percent: number }[];
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
  | ColorVariationSection
  | StatInfographicSection
  | IllustrationBannerSection
  | FaqSection
  | TargetPersonaSection
  | BrandStorySection
  | AiDisclosureSection;

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
