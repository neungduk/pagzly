import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enhanceProductImage } from "@/lib/photo-enhance";

const STORAGE_BUCKET = "images";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN이 설정되지 않았습니다." },
        { status: 500 },
      );
    }

    const { imageUrl, storagePath, category } = (await request.json()) as {
      imageUrl?: string;
      storagePath?: string;
      category?: string;
    };

    if (!imageUrl || !storagePath || !category) {
      return NextResponse.json(
        { error: "imageUrl, storagePath, category가 모두 필요합니다." },
        { status: 400 },
      );
    }

    const enhancedBuffer = await enhanceProductImage(imageUrl, category);
    const enhancedPath = storagePath.replace(/\.[^./]+$/, "") + "-enhanced.png";

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(enhancedPath, enhancedBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`보정 이미지 업로드 실패: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(enhancedPath);

    // product_images 테이블의 원본 행을 보정본 경로/URL로 갱신
    // (원본을 새로 insert하지 않고 같은 행을 업데이트 — 3일 자동삭제 추적이 계속 이어지도록)
    const { error: updateError } = await supabase
      .from("product_images")
      .update({
        storage_path: enhancedPath,
        image_url: publicUrlData.publicUrl,
      })
      .eq("user_id", user.id)
      .eq("storage_path", storagePath);

    if (updateError) {
      console.error("[enhance-image] product_images update error", updateError);
    }

    // 원본 파일은 더 이상 필요 없으니 정리 (실패해도 치명적이지 않으므로 로그만)
    const { error: removeError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);

    if (removeError) {
      console.error("[enhance-image] original remove error", removeError);
    }

    return NextResponse.json({
      enhancedUrl: publicUrlData.publicUrl,
      enhancedPath,
    });
  } catch (error) {
    console.error("[enhance-image]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "이미지 보정 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
