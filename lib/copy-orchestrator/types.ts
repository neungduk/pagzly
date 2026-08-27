/**
 * STEP 9 — Claude structure + DeepSeek copy types.
 * HTML 금지 — content/data JSON만.
 */

export const COPY_SECTION_TYPES = [
  "HERO",
  "PROBLEM",
  "SOLUTION",
  "BENEFIT",
  "FEATURE",
  "USAGE",
  "SOCIAL_PROOF",
  "FAQ",
  "CTA",
  "COMPARISON",
  "CAUTION",
] as const;

export type CopySectionType = (typeof COPY_SECTION_TYPES)[number];

export type CopyStructureSection = {
  order: number;
  type: CopySectionType;
  purpose: string;
  copyDirection: string;
};

/** Claude가 만드는 상세페이지 구조/분석 */
export type PageStructurePlan = {
  productAnalysis: string;
  targetCustomerAnalysis: string;
  usps: string[];
  pageStructure: CopyStructureSection[];
  copyTone: string;
};

export type CopyFaqItem = {
  question: string;
  answer: string;
};

export type CopySection = {
  type: CopySectionType;
  title: string;
  body: string;
};

/**
 * DeepSeek가 채우는 카피 JSON.
 * HTML 없음 — 앱이 렌더링.
 */
export type DetailPageCopy = {
  mainHeadline: string;
  subHeadline: string;
  problemStatement: string;
  solutionStatement: string;
  benefit: string;
  feature: string;
  featureDescription: string;
  socialProofPlaceholder: string;
  faq: CopyFaqItem[];
  cta: string;
  /** AIDA 섹션 배열 — type enum만 허용 */
  sections: CopySection[];
  /** 하위 호환 alias */
  headline?: string;
};

export type CopyProductInput = {
  productName: string;
  category: string;
  description?: string | null;
  brandName?: string | null;
  keyFeatures?: string | null;
  ingredients?: string | null;
  certifications?: string | null;
  targetCustomer?: string | null;
  price?: number | null;
  productImageUrls?: string[];
};

export const PAGE_STRUCTURE_MIN_SECTIONS = 5;
export const PAGE_STRUCTURE_MAX_SECTIONS = 10;
