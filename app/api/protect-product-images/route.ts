import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { productImageProtectedUntil } from "@/lib/product-image-protection";

/**
 * 승인/최종 생성 직전 orphan 원본의 protected_until을 연장한다 (30차).
 * body: { imagePaths: string[] }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = (await request.json()) as { imagePaths?: string[] };
    const imagePaths = (body.imagePaths ?? []).filter(Boolean);
    if (imagePaths.length === 0) {
      return NextResponse.json({ error: "imagePaths가 필요합니다." }, { status: 400 });
    }

    const protectedUntil = productImageProtectedUntil();
    const { data, error } = await supabase
      .from("product_images")
      .update({ protected_until: protectedUntil })
      .eq("user_id", user.id)
      .in("storage_path", imagePaths)
      .select("id");

    if (error) {
      console.error("[protect-product-images]", error);
      return NextResponse.json(
        { error: "이미지 보호 갱신에 실패했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      updated: data?.length ?? 0,
      protectedUntil,
    });
  } catch (error) {
    console.error("[protect-product-images]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "이미지 보호 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
