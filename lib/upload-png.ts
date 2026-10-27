import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getStorage } from "@/lib/storage";
import { CACHE_SHORT } from "@/lib/storage/policy";

/** Sharp로 PNG 재인코딩 후 이미지 저장소(기본 Supabase Storage)에 업로드 (Bad Request 방지) */
export async function uploadPngBuffer(
  supabase: SupabaseClient,
  storagePath: string,
  input: Buffer,
): Promise<{ publicUrl: string; path: string } | { error: string }> {
  let png: Buffer;
  try {
    const meta = await sharp(input).metadata();
    if (!meta.width || !meta.height) {
      return { error: "invalid image dimensions" };
    }
    png = await sharp(input).png().toBuffer();
  } catch {
    return { error: "png encode failed" };
  }

  if (png.length < 128) {
    return { error: "png buffer too small" };
  }

  // 459차: lib/storage 경유(기본 supabase = 이전과 같은 호출). 호출부가 정하는 경로는 upsert로 덮어쓸 수 있어 캐시는 짧게
  const storage = getStorage(supabase);
  const { error: uploadError } = await storage.putObject({ path: storagePath, body: png, contentType: "image/png", upsert: true, cacheControl: CACHE_SHORT });

  if (uploadError) {
    return { error: uploadError.message };
  }

  return { publicUrl: storage.getPublicUrl(storagePath), path: storagePath };
}
