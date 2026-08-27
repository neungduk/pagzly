import type { ImageAspectRatio, ImageResolution, ImageTaskType } from "@/lib/image-router/types";

/** 비동기 generation job API 상태 */
export type GenerationJobStatus =
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "BUDGET_EXCEEDED";

export type GenerationInputImage = {
  url: string;
  path?: string;
};

export type GenerationOutputImage = {
  url: string;
  width: number;
  height: number;
  storagePath?: string;
};

export type CreateGenerationRequest = {
  taskType: ImageTaskType;
  prompt: string;
  inputImages?: GenerationInputImage[];
  aspectRatio?: ImageAspectRatio;
  resolution?: ImageResolution;
  qualityLevel?: "standard" | "premium";
  pageId?: string | null;
  draftToken?: string | null;
  idempotencyKey?: string | null;
};

export type CreateGenerationResponse = {
  id: string;
  status: GenerationJobStatus;
  progress: number;
  duplicate?: boolean;
};

export type GenerationStatusResponse = {
  id: string;
  status: GenerationJobStatus;
  progress: number;
  outputs: GenerationOutputImage[];
  error: string | null;
  retryCount?: number;
  estimatedCost?: number;
  actualCost?: number;
  generationTimeMs?: number | null;
};

export function progressForStatus(status: GenerationJobStatus): number {
  switch (status) {
    case "QUEUED":
      return 0;
    case "PROCESSING":
      return 50;
    case "COMPLETED":
      return 100;
    case "CANCELLED":
      return 0;
    case "FAILED":
    case "BUDGET_EXCEEDED":
      return 100;
    default:
      return 0;
  }
}

export function toApiStatus(raw: string): GenerationJobStatus {
  const upper = raw.toUpperCase();
  if (
    upper === "QUEUED" ||
    upper === "PROCESSING" ||
    upper === "COMPLETED" ||
    upper === "FAILED" ||
    upper === "CANCELLED" ||
    upper === "BUDGET_EXCEEDED"
  ) {
    return upper;
  }
  if (raw === "queued") return "QUEUED";
  if (raw === "running") return "PROCESSING";
  if (raw === "succeeded") return "COMPLETED";
  if (raw === "failed") return "FAILED";
  if (raw === "budget_exceeded") return "BUDGET_EXCEEDED";
  return "FAILED";
}
