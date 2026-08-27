import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  progressForStatus,
  toApiStatus,
  type GenerationInputImage,
  type GenerationOutputImage,
} from "@/lib/image-router/jobs/generation-api-types";
import type {
  CreateImageJobInput,
  ImageGenerationJobRow,
  ImageJobStore,
  UpdateImageJobInput,
} from "@/lib/image-router/jobs/types";

function mapRow(raw: Record<string, unknown>): ImageGenerationJobRow {
  const inputImages = raw.input_images as GenerationInputImage[] | null;
  const outputImages = raw.output_images as GenerationOutputImage[] | null;
  return {
    id: String(raw.id),
    user_id: String(raw.user_id),
    product_id: raw.product_id ? String(raw.product_id) : null,
    draft_token: raw.draft_token ? String(raw.draft_token) : null,
    task_type: String(raw.task_type),
    provider: String(raw.provider),
    model: String(raw.model),
    idempotency_key: raw.idempotency_key ? String(raw.idempotency_key) : null,
    prompt: raw.prompt ? String(raw.prompt) : null,
    input_images: inputImages,
    output_images: outputImages,
    input_image_count: Number(raw.input_image_count ?? 0),
    output_image_count: Number(raw.output_image_count ?? 0),
    estimated_cost: Number(raw.estimated_cost ?? 0),
    actual_cost: raw.actual_cost != null ? Number(raw.actual_cost) : null,
    generation_time_ms: raw.generation_time_ms != null ? Number(raw.generation_time_ms) : null,
    status: toApiStatus(String(raw.status)),
    progress: Number(raw.progress ?? progressForStatus(toApiStatus(String(raw.status)))),
    error_message: raw.error_message ? String(raw.error_message) : null,
    input_metadata: (raw.input_metadata as Record<string, unknown>) ?? null,
    output_urls: Array.isArray(raw.output_urls) ? (raw.output_urls as string[]) : null,
    retry_count: Number(raw.retry_count ?? 0),
    started_at: raw.started_at ? String(raw.started_at) : null,
    completed_at: raw.completed_at ? String(raw.completed_at) : null,
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
  };
}

function buildUpdatePayload(patch: UpdateImageJobInput): Record<string, unknown> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status != null) {
    payload.status = patch.status;
    if (patch.progress == null) payload.progress = progressForStatus(patch.status);
  }
  if (patch.progress != null) payload.progress = patch.progress;
  if (patch.outputUrls != null) payload.output_urls = patch.outputUrls;
  if (patch.outputImages != null) payload.output_images = patch.outputImages;
  if (patch.actualCost != null) payload.actual_cost = patch.actualCost;
  if (patch.estimatedCost != null) payload.estimated_cost = patch.estimatedCost;
  if (patch.generationTimeMs != null) payload.generation_time_ms = patch.generationTimeMs;
  if (patch.errorMessage !== undefined) payload.error_message = patch.errorMessage;
  if (patch.retryCount != null) payload.retry_count = patch.retryCount;
  if (patch.outputImageCount != null) payload.output_image_count = patch.outputImageCount;
  if (patch.startedAt !== undefined) payload.started_at = patch.startedAt;
  if (patch.completedAt !== undefined) payload.completed_at = patch.completedAt;
  if (patch.provider != null) payload.provider = patch.provider;
  if (patch.model != null) payload.model = patch.model;
  return payload;
}

type StoreMode = "user" | "service";

export class SupabaseImageJobStore implements ImageJobStore {
  constructor(private readonly mode: StoreMode = "user") {}

  private async client() {
    if (this.mode === "service") return createServiceRoleClient();
    return await createClient();
  }

  async createJob(input: CreateImageJobInput): Promise<ImageGenerationJobRow> {
    const supabase = await this.client();
    const { data, error } = await supabase
      .from("image_generation_jobs")
      .insert({
        user_id: input.userId,
        product_id: input.productId ?? null,
        draft_token: input.draftToken ?? input.request.draftToken ?? null,
        task_type: input.request.taskType,
        provider: input.route.providerId,
        model: input.route.model,
        idempotency_key: input.request.idempotencyKey ?? null,
        input_image_count: input.inputImages.length,
        estimated_cost: input.estimatedCost,
        status: "QUEUED",
        progress: 0,
        prompt: input.prompt,
        input_images: input.inputImages,
        input_metadata: {
          aspectRatio: input.request.aspectRatio,
          resolution: input.request.resolution,
          qualityLevel: input.request.qualityLevel,
        },
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`image_generation_jobs insert failed: ${error?.message ?? "unknown"}`);
    }
    return mapRow(data as Record<string, unknown>);
  }

  async updateJob(jobId: string, patch: UpdateImageJobInput): Promise<ImageGenerationJobRow | null> {
    const supabase = await this.client();
    const { data, error } = await supabase
      .from("image_generation_jobs")
      .update(buildUpdatePayload(patch))
      .eq("id", jobId)
      .select("*")
      .single();

    if (error || !data) {
      console.error("[image-job-store] update failed:", error?.message);
      return null;
    }
    return mapRow(data as Record<string, unknown>);
  }

  async getJob(jobId: string): Promise<ImageGenerationJobRow | null> {
    const supabase = await this.client();
    const { data, error } = await supabase
      .from("image_generation_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (error || !data) return null;
    return mapRow(data as Record<string, unknown>);
  }

  async findByIdempotency(
    userId: string,
    idempotencyKey: string,
  ): Promise<ImageGenerationJobRow | null> {
    const supabase = await this.client();
    const { data, error } = await supabase
      .from("image_generation_jobs")
      .select("*")
      .eq("user_id", userId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (error || !data) return null;
    return mapRow(data as Record<string, unknown>);
  }

  async listByScope(params: {
    userId: string;
    productId?: string | null;
    draftToken?: string | null;
  }): Promise<ImageGenerationJobRow[]> {
    const supabase = await this.client();
    let query = supabase.from("image_generation_jobs").select("*").eq("user_id", params.userId);

    if (params.productId) query = query.eq("product_id", params.productId);
    else if (params.draftToken) query = query.eq("draft_token", params.draftToken);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map((row) => mapRow(row as Record<string, unknown>));
  }

  async claimJob(jobId: string): Promise<ImageGenerationJobRow | null> {
    const supabase = await this.client();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("image_generation_jobs")
      .update({
        status: "PROCESSING",
        progress: 50,
        started_at: now,
        updated_at: now,
        error_message: null,
      })
      .eq("id", jobId)
      .eq("status", "QUEUED")
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[image-job-store] claim failed:", error.message);
      return null;
    }
    if (!data) return null;
    return mapRow(data as Record<string, unknown>);
  }

  async requeueJob(
    jobId: string,
    retryCount: number,
    errorMessage: string,
  ): Promise<ImageGenerationJobRow | null> {
    return this.updateJob(jobId, {
      status: "QUEUED",
      progress: 0,
      retryCount,
      errorMessage,
      startedAt: null,
      completedAt: null,
    });
  }
}

export function createUserJobStore(): SupabaseImageJobStore {
  return new SupabaseImageJobStore("user");
}

export function createWorkerJobStore(): SupabaseImageJobStore {
  return new SupabaseImageJobStore("service");
}
