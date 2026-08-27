import { randomUUID } from "crypto";
import type { CreateAttemptInput, GenerationAttemptStore } from "@/lib/cost/attempt-store";
import type { GenerationAttemptRecord } from "@/lib/cost/types";

/** 테스트·memory mode */
export class MemoryGenerationAttemptStore implements GenerationAttemptStore {
  private readonly attempts = new Map<string, GenerationAttemptRecord>();
  /** generationId → attempt ids */
  private readonly byGeneration = new Map<string, string[]>();

  async createAttempt(input: CreateAttemptInput): Promise<GenerationAttemptRecord> {
    const row: GenerationAttemptRecord = {
      id: randomUUID(),
      generationId: input.generationId,
      attemptNumber: input.attemptNumber,
      provider: input.provider,
      model: input.model,
      status: input.status,
      estimatedCostUsd: input.estimatedCostUsd,
      actualCostUsd: input.actualCostUsd,
      inputMegapixels: input.inputMegapixels ?? null,
      outputMegapixels: input.outputMegapixels ?? null,
      resolution: input.resolution ?? null,
      startedAt: input.startedAt,
      completedAt: input.completedAt ?? null,
      errorMessage: input.errorMessage ?? null,
      createdAt: new Date().toISOString(),
    };
    this.attempts.set(row.id, row);
    const list = this.byGeneration.get(input.generationId) ?? [];
    list.push(row.id);
    this.byGeneration.set(input.generationId, list);
    return row;
  }

  async listByGeneration(generationId: string): Promise<GenerationAttemptRecord[]> {
    const ids = this.byGeneration.get(generationId) ?? [];
    return ids
      .map((id) => this.attempts.get(id))
      .filter((a): a is GenerationAttemptRecord => a != null)
      .sort((a, b) => a.attemptNumber - b.attemptNumber);
  }

  async sumActualCostByGeneration(generationId: string): Promise<number> {
    const rows = await this.listByGeneration(generationId);
    return Math.round(rows.reduce((s, r) => s + r.actualCostUsd, 0) * 1_000_000) / 1_000_000;
  }

  async listByUser(_params: {
    userId: string;
    startDate: string;
    endDate: string;
  }): Promise<GenerationAttemptRecord[]> {
    // memory store는 generation↔user 조인 없음 — 전체 반환(테스트용). Query service가 job store와 join.
    return [...this.attempts.values()];
  }

  async listByDay(date: string): Promise<GenerationAttemptRecord[]> {
    return [...this.attempts.values()].filter((a) => a.createdAt.startsWith(date));
  }

  clear(): void {
    this.attempts.clear();
    this.byGeneration.clear();
  }
}

let memoryAttemptStore: MemoryGenerationAttemptStore | null = null;

export function getMemoryAttemptStore(): MemoryGenerationAttemptStore {
  if (!memoryAttemptStore) memoryAttemptStore = new MemoryGenerationAttemptStore();
  return memoryAttemptStore;
}

export function resetMemoryAttemptStore(): void {
  memoryAttemptStore?.clear();
  memoryAttemptStore = null;
}
