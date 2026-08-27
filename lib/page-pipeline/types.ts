/**
 * STEP 10 — Unified Pagzly detail-page generation types.
 * AI produces data only; renderer builds HTML/UI.
 */

import type { DetailPageCopy, PageStructurePlan } from "@/lib/copy-orchestrator/types";
import type { ImagePlan } from "@/lib/image-router/orchestrator/image-plan-types";
import type { DetailSection } from "@/lib/types/generate";

export const PAGE_GENERATION_STATUSES = [
  "QUEUED",
  "ANALYZING",
  "PLANNING",
  "GENERATING_COPY",
  "GENERATING_IMAGES",
  "EVALUATING_IMAGES",
  "REGENERATING",
  "RENDERING",
  "COMPLETED",
  "FAILED",
] as const;

export type PageGenerationStatus = (typeof PAGE_GENERATION_STATUSES)[number];

/** Progress percent by status (FAILED keeps last known progress). */
export const PAGE_GENERATION_PROGRESS: Record<PageGenerationStatus, number> = {
  QUEUED: 0,
  ANALYZING: 10,
  PLANNING: 20,
  GENERATING_COPY: 35,
  GENERATING_IMAGES: 60,
  EVALUATING_IMAGES: 75,
  REGENERATING: 85,
  RENDERING: 95,
  COMPLETED: 100,
  FAILED: 0,
};

export type PageProductData = {
  productName: string;
  category: string;
  brandName?: string | null;
  description?: string | null;
  keyFeatures?: string | null;
  ingredients?: string | null;
  certifications?: string | null;
  targetCustomer?: string | null;
  price?: number | null;
  productImageUrls: string[];
};

export type PageImageAsset = {
  order: number;
  role: string;
  url: string;
  provider: string;
  model: string;
  costUsd: number;
  qualityScore?: number | null;
  regenerated: boolean;
};

export type PageGenerationCostBreakdown = {
  claudeStructureUsd: number;
  claudeImagePlanUsd: number;
  deepSeekCopyUsd: number;
  imagesUsd: number;
  regenerateUsd: number;
  totalUsd: number;
};

export type PageGenerationMetadata = {
  totalGenerationTimeMs: number;
  totalImageCount: number;
  totalRetryCount: number;
  totalAiCostUsd: number;
  costBreakdown: PageGenerationCostBreakdown;
  imageProvidersUsed: string[];
  modelsUsed: string[];
  qualityScores: number[];
  warnings: string[];
  budgetUsd: number;
  budgetExceeded: boolean;
};

/**
 * Structured page payload — never contains raw HTML from AI.
 * renderer(PageData) → HTML/UI
 */
export type PageData = {
  product: PageProductData;
  copy: DetailPageCopy;
  structure: PageStructurePlan;
  imagePlan: ImagePlan;
  /** Production renderer sections */
  sections: DetailSection[];
  images: PageImageAsset[];
  /** Parallel array for DetailSectionRenderer / buildDetailPageHtml */
  imageUrls: string[];
  metadata: PageGenerationMetadata;
};

export type PageGenerationJob = {
  id: string;
  status: PageGenerationStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  warnings: string[];
  /** Running cost accumulator (USD) */
  spentUsd: number;
  budgetUsd: number;
  pageData?: PageData;
  /** Absolute or relative path to rendered HTML (E2E / preview) */
  renderedHtmlPath?: string;
  renderedHtmlUrl?: string;
};

export type PagePipelineInput = {
  product: PageProductData;
  /** Soft $ cap — abort when projected spend would exceed */
  budgetUsd?: number;
  /** Cap images generated from plan (cost control) */
  maxImages?: number;
  userId?: string;
  draftToken?: string;
  /** Directory to write HTML + JSON artifacts */
  outputDir?: string;
  onStatusChange?: (job: PageGenerationJob) => void;
};

export function progressForStatus(
  status: PageGenerationStatus,
  previousProgress = 0,
): number {
  if (status === "FAILED") return previousProgress;
  return PAGE_GENERATION_PROGRESS[status];
}
