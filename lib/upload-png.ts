import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";

const STORAGE_BUCKET = "images";

/** Sharp로 PNG 재인코딩 후 Supabase Storage에 업로드 (Bad Request 방지) */
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

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, png, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  return { publicUrl: data.publicUrl, path: storagePath };
}
