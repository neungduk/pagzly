import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { CreateAttemptInput, GenerationAttemptStore } from "@/lib/cost/attempt-store";
import type { GenerationAttemptRecord } from "@/lib/cost/types";

function mapRow(raw: Record<string, unknown>): GenerationAttemptRecord {
  return {
    id: String(raw.id),
    generationId: String(raw.generation_id),
    attemptNumber: Number(raw.attempt_number),
    provider: String(raw.provider),
    model: String(raw.model),
    status: raw.status as GenerationAttemptRecord["status"],
    estimatedCostUsd: Number(raw.estimated_cost_usd ?? 0),
    actualCostUsd: Number(raw.actual_cost_usd ?? 0),
    inputMegapixels: raw.input_megapixels != null ? Number(raw.input_megapixels) : null,
    outputMegapixels: raw.output_megapixels != null ? Number(raw.output_megapixels) : null,
    resolution: raw.resolution ? String(raw.resolution) : null,
    startedAt: String(raw.started_at),
    completedAt: raw.completed_at ? String(raw.completed_at) : null,
    errorMessage: raw.error_message ? String(raw.error_message) : null,
    createdAt: String(raw.created_at),
  };
}

type Mode = "user" | "service";

export class SupabaseGenerationAttemptStore implements GenerationAttemptStore {
  constructor(private readonly mode: Mode = "service") {}

  private async client() {
    if (this.mode === "service") return createServiceRoleClient();
    return await createClient();
  }

  async createAttempt(input: CreateAttemptInput): Promise<GenerationAttemptRecord> {
    const supabase = await this.client();
    const { data, error } = await supabase
      .from("image_generation_attempts")
      .insert({
        generation_id: input.generationId,
        attempt_number: input.attemptNumber,
        provider: input.provider,
        model: input.model,
        status: input.status,
        estimated_cost_usd: input.estimatedCostUsd,
        actual_cost_usd: input.actualCostUsd,
        input_megapixels: input.inputMegapixels ?? null,
        output_megapixels: input.outputMegapixels ?? null,
        resolution: input.resolution ?? null,
        started_at: input.startedAt,
        completed_at: input.completedAt ?? null,
        error_message: input.errorMessage ?? null,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`image_generation_attempts insert failed: ${error?.message ?? "unknown"}`);
    }
    return mapRow(data as Record<string, unknown>);
  }

  async listByGeneration(generationId: string): Promise<GenerationAttemptRecord[]> {
    const supabase = await this.client();
    const { data, error } = await supabase
      .from("image_generation_attempts")
      .select("*")
      .eq("generation_id", generationId)
      .order("attempt_number", { ascending: true });

    if (error || !data) return [];
    return data.map((r) => mapRow(r as Record<string, unknown>));
  }

  async sumActualCostByGeneration(generationId: string): Promise<number> {
    const rows = await this.listByGeneration(generationId);
    return Math.round(rows.reduce((s, r) => s + r.actualCostUsd, 0) * 1_000_000) / 1_000_000;
  }

  async listByUser(params: {
    userId: string;
    startDate: string;
    endDate: string;
  }): Promise<GenerationAttemptRecord[]> {
    const supabase = await this.client();
    const { data: jobs, error: jobErr } = await supabase
      .from("image_generation_jobs")
      .select("id")
      .eq("user_id", params.userId)
      .gte("created_at", params.startDate)
      .lte("created_at", params.endDate);

    if (jobErr || !jobs?.length) return [];
    const ids = jobs.map((j) => j.id as string);

    const { data, error } = await supabase
      .from("image_generation_attempts")
      .select("*")
      .in("generation_id", ids)
      .gte("created_at", params.startDate)
      .lte("created_at", params.endDate);

    if (error || !data) return [];
    return data.map((r) => mapRow(r as Record<string, unknown>));
  }

  async listByDay(date: string): Promise<GenerationAttemptRecord[]> {
    const start = `${date}T00:00:00.000Z`;
    const end = `${date}T23:59:59.999Z`;
    const supabase = await this.client();
    const { data, error } = await supabase
      .from("image_generation_attempts")
      .select("*")
      .gte("created_at", start)
      .lte("created_at", end);

    if (error || !data) return [];
    return data.map((r) => mapRow(r as Record<string, unknown>));
  }
}

export function createWorkerAttemptStore(): SupabaseGenerationAttemptStore {
  return new SupabaseGenerationAttemptStore("service");
}
