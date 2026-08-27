import type { GenerationAttemptRecord } from "@/lib/cost/types";

export type CreateAttemptInput = {
  generationId: string;
  attemptNumber: number;
  provider: string;
  model: string;
  status: GenerationAttemptRecord["status"];
  estimatedCostUsd: number;
  actualCostUsd: number;
  inputMegapixels?: number | null;
  outputMegapixels?: number | null;
  resolution?: string | null;
  startedAt: string;
  completedAt?: string | null;
  errorMessage?: string | null;
};

export interface GenerationAttemptStore {
  createAttempt(input: CreateAttemptInput): Promise<GenerationAttemptRecord>;
  listByGeneration(generationId: string): Promise<GenerationAttemptRecord[]>;
  sumActualCostByGeneration(generationId: string): Promise<number>;
  listByUser(params: {
    userId: string;
    startDate: string;
    endDate: string;
  }): Promise<GenerationAttemptRecord[]>;
  listByDay(date: string): Promise<GenerationAttemptRecord[]>;
}
