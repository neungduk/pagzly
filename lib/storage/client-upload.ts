import type { SupabaseClient } from "@supabase/supabase-js";
import { STORAGE_BUCKET } from "@/lib/storage/policy";
import { storagePublicBase } from "@/lib/storage/public-url";

/**
 * 459차 — 브라우저 직접 업로드. 공개 주소(NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL)가 없으면 **지금과 정확히 같은 Supabase 호출**,
 * 있으면 서버(`/api/storage/upload-url`)에서 서명 주소를 받아 PUT한다. 오류는 던지지 않고 `{ error }`로 돌려줘 호출부의 기존 메시지를 유지한다.
 */
export type ClientUploadResult = { publicUrl: string; path: string } | { error: string };

export async function uploadImage(
  supabase: SupabaseClient,
  file: File | Blob,
  opts: { path: string; contentType?: string; upsert?: boolean },
  env?: Record<string, string | undefined>,
  fetchImpl: typeof fetch = fetch,
): Promise<ClientUploadResult> {
  if (!storagePublicBase(env)) {
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(opts.path, file, { contentType: opts.contentType, upsert: opts.upsert ?? false });
    if (error) return { error: error.message };
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(opts.path);
    return { publicUrl: data.publicUrl, path: opts.path };
  }
  const contentType = opts.contentType || (file as File).type || "application/octet-stream";
  const sign = await fetchImpl("/api/storage/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: opts.path, contentType, size: file.size }),
  });
  const signed = (await sign.json().catch(() => ({}))) as { url?: string; headers?: Record<string, string>; publicUrl?: string; path?: string; error?: string };
  if (!sign.ok || !signed.url || !signed.publicUrl || !signed.path) return { error: signed.error ?? `서명 주소 발급 실패(${sign.status})` };
  const put = await fetchImpl(signed.url, { method: "PUT", headers: signed.headers ?? { "Content-Type": contentType }, body: file });
  if (!put.ok) return { error: `업로드 실패(${put.status})` };
  return { publicUrl: signed.publicUrl, path: signed.path };
}

/** 롤백용 삭제: Supabase 모드는 기존 호출, r2 모드는 서버 `DELETE /api/storage/remove`(본인 접두사만) */
export async function removeUploaded(
  supabase: SupabaseClient,
  paths: string[],
  env?: Record<string, string | undefined>,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  if (!storagePublicBase(env)) {
    await supabase.storage.from(STORAGE_BUCKET).remove(paths);
    return;
  }
  await fetchImpl("/api/storage/remove", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paths }) }).catch(() => undefined);
}
