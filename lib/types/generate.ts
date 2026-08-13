export type ProductInput = {
  category: string;
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
  wholesaleUrl?: string | null;
};

export type HeroSection = {
  type: "hero";
  headline: string;
  subheadline?: string;
  imageIndex: number;
};

export type ChecklistSection = {
  type: "checklist";
  heading: string;
  items: string[];
};

export type ImageTextSection = {
  type: "image_text";
  heading: string;
  body: string;
  imageIndex: number;
  imagePosition: "left" | "right";
};

export type SpecTableSection = {
  type: "spec_table";
  heading: string;
  rows: { label: string; value: string }[];
};

export type UsageStepsSection = {
  type: "usage_steps";
  heading: string;
  steps: string[];
};

export type GallerySection = {
  type: "gallery";
  heading: string;
  imageIndexes: number[];
};

export type CautionSection = {
  type: "caution";
  heading: string;
  body: string;
};

export type CtaPriceSection = {
  type: "cta_price";
  price: number;
  targetCustomer?: string | null;
  badges?: string[];
};

export type DetailSection =
  | HeroSection
  | ChecklistSection
  | ImageTextSection
  | SpecTableSection
  | UsageStepsSection
  | GallerySection
  | CautionSection
  | CtaPriceSection;

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
};

export type GenerateResponse = GeneratedCopy & {
  imageAnalysis: string;
  mfdsReviewed?: boolean;
  replacements?: ComplianceReplacement[];
  productId: string;
  theme?: ExtractedTheme | null;
};
