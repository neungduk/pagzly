import type { SupabaseClient } from "@supabase/supabase-js";
import { STORAGE_BUCKET } from "@/lib/storage/policy";
import type { PutObjectInput, StorageProvider } from "@/lib/storage/types";

/**
 * 459차 — 지금의 `supabase.storage.from("images")` 호출을 그대로 감싼다(기본 동작 불변).
 * upload 인자는 `{ contentType, upsert }`만 넘긴다: cacheControl 힌트는 R2 전용이라 여기서는 무시한다(Supabase 기본 캐시 값 유지).
 */
export function createSupabaseProvider(supabase: SupabaseClient, bucket: string = STORAGE_BUCKET): StorageProvider {
  return {
    name: "supabase",
    async putObject(input: PutObjectInput) {
      const opts: { contentType?: string; upsert?: boolean } = {};
      if (input.contentType !== undefined) opts.contentType = input.contentType;
      if (input.upsert !== undefined) opts.upsert = input.upsert;
      const { error } = await supabase.storage.from(bucket).upload(input.path, input.body as never, opts);
      return { error: error ? { message: error.message } : null };
    },
    getPublicUrl(path: string) {
      return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    },
    async removeObjects(paths: string[]) {
      const { error } = await supabase.storage.from(bucket).remove(paths);
      return { error: error ? { message: error.message } : null };
    },
    async createUploadTarget() {
      return null;
    },
  };
}
