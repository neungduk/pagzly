/**
 * Generation job store 환경 설정.
 * IMAGE_JOB_STORE=supabase | memory (기본 memory)
 */

export type ImageJobStoreMode = "memory" | "supabase";

export class ImageJobStoreConfigError extends Error {
  readonly code = "IMAGE_JOB_STORE_CONFIG";

  constructor(message: string) {
    super(message);
    this.name = "ImageJobStoreConfigError";
  }
}

export function getImageJobStoreMode(): ImageJobStoreMode {
  return process.env.IMAGE_JOB_STORE === "supabase" ? "supabase" : "memory";
}

export function isSupabaseJobStore(): boolean {
  return getImageJobStoreMode() === "supabase";
}

/** Worker·Storage 업로드에 service role 필요 여부 */
export function assertImageJobStoreConfig(options?: { requireWorker?: boolean }): void {
  if (!isSupabaseJobStore()) return;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    throw new ImageJobStoreConfigError(
      "IMAGE_JOB_STORE=supabase requires NEXT_PUBLIC_SUPABASE_URL.",
    );
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
    throw new ImageJobStoreConfigError(
      "IMAGE_JOB_STORE=supabase requires NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  if (options?.requireWorker && !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw new ImageJobStoreConfigError(
      "IMAGE_JOB_STORE=supabase requires SUPABASE_SERVICE_ROLE_KEY for background worker " +
        "(job claim/update + Storage upload). Set it in server environment only — " +
        "never NEXT_PUBLIC_ or client bundle.",
    );
  }
}

/** Storage 경로 — 기존 images bucket 재사용 */
export function generationOutputStoragePath(userId: string, jobId: string, index = 0): string {
  if (index === 0) {
    return `${userId}/generations/${jobId}.png`;
  }
  return `${userId}/generations/${jobId}-${index}.png`;
}

export const GENERATION_STORAGE_BUCKET = "images" as const;
