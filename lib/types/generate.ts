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

export type GeneratedCopy = {
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

export type GenerateResponse = GeneratedCopy & {
  imageAnalysis: string;
  mfdsReviewed?: boolean;
  replacements?: ComplianceReplacement[];
  productId: string;
};
