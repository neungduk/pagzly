import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const STORAGE_BUCKET = "images";

Deno.serve(async () => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase environment variables are not configured.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const cutoff = threeDaysAgo.toISOString();
    const nowIso = new Date().toISOString();

    // product_id가 null인(= 완성된 상품으로 이어지지 않은) 이미지만
    // 정리 대상으로 삼는다. 상품 저장이 완료된 이미지는 영구 보존한다.
    // 30차: protected_until이 아직 미래면 생성 세션 중이므로 제외.
    const { data: expiredImages, error: fetchError } = await supabase
      .from("product_images")
      .select("id, storage_path, protected_until")
      .is("product_id", null)
      .lt("image_uploaded_at", cutoff)
      .or(`protected_until.is.null,protected_until.lt."${nowIso}"`);

    if (fetchError) {
      throw fetchError;
    }

    if (!expiredImages?.length) {
      return new Response(JSON.stringify({ deleted: 0, message: "No expired images" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const paths = expiredImages.map((row) => row.storage_path);
    const ids = expiredImages.map((row) => row.id);

    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(paths);

    if (storageError) {
      console.error("[cleanup-expired-images] storage error:", storageError);
    }

    const { error: deleteError } = await supabase
      .from("product_images")
      .delete()
      .in("id", ids);

    if (deleteError) {
      throw deleteError;
    }

    return new Response(
      JSON.stringify({
        deleted: ids.length,
        paths,
        cutoff,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[cleanup-expired-images]", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Cleanup failed",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
