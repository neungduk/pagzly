import { NextResponse } from "next/server";
import { generateLifestyleShots } from "@/lib/generate-lifestyle-shots";
import { createClient } from "@/lib/supabase/server";
import { productImageProtectedUntil } from "@/lib/product-image-protection";
import { uploadPngBuffer } from "@/lib/upload-png";

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

    const body = (await request.json()) as {
      productImageUrl?: string;
      referenceStoragePath?: string;
      category?: string;
      productName?: string;
      brandName?: string | null;
      targetCustomer?: string | null;
      keyFeatures?: string | null;
      productSizeHint?: string | null;
      enableAiLifestyleShots?: boolean;
      uploadCount?: number;
      draftToken?: string | null;
    };

    if (!body.productImageUrl || !body.referenceStoragePath || !body.productName || !body.category) {
      return NextResponse.json(
        { error: "productImageUrl, referenceStoragePath, productName, category가 필요합니다." },
        { status: 400 },
      );
    }

    if (body.enableAiLifestyleShots !== true) {
      console.log("[generate-lifestyle-shots] skipped — enableAiLifestyleShots not true");
      return NextResponse.json({ shots: [], cost: 0, skipped: "opt_in_required" });
    }

    const uploadCount = body.uploadCount ?? 1;

    const { shots, totalCost } = await generateLifestyleShots({
      productImageUrl: body.productImageUrl,
      referenceStoragePath: body.referenceStoragePath,
      category: body.category,
      productName: body.productName,
      brandName: body.brandName,
      targetCustomer: body.targetCustomer,
      keyFeatures: body.keyFeatures,
      productSizeHint: body.productSizeHint,
      uploadCount,
      userId: user.id,
      draftToken: body.draftToken,
      uploadPng: async (storagePath, buffer) => {
        const result = await uploadPngBuffer(supabase, storagePath, buffer);
        if ("error" in result) return { error: result.error };
        return { publicUrl: result.publicUrl, path: result.path };
      },
    });

    for (const shot of shots) {
      const { error: insertError } = await supabase.from("product_images").insert({
        user_id: user.id,
        storage_path: shot.path,
        image_url: shot.url,
        image_uploaded_at: new Date().toISOString(),
        protected_until: productImageProtectedUntil(),
      });
      if (insertError) {
        console.warn("[generate-lifestyle-shots] product_images insert:", insertError.message);
      }
    }

    return NextResponse.json({
      shots,
      cost: totalCost,
    });
  } catch (error) {
    console.error("[generate-lifestyle-shots]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "일상샷 생성 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
