import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enhanceProductImage } from "@/lib/photo-enhance";
import type { ConceptBrief } from "@/lib/concept-brief";
import { productImageProtectedUntil } from "@/lib/product-image-protection";

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

    const {
      imageUrl,
      storagePath,
      backdropDataUrl,
      shadowAnalysis,
      conceptBrief,
      applyDecor,
      decorDataUrl,
      theme,
      keepOriginal,
      pathSuffix,
      productName,
      backdropAlreadyComposited,
    } = (await request.json()) as {
      imageUrl?: string;
      storagePath?: string;
      backdropDataUrl?: string;
      shadowAnalysis?: import("@/lib/vision-utils").ShadowAnalysis;
      conceptBrief?: ConceptBrief;
      applyDecor?: boolean;
      decorDataUrl?: string;
      theme?: { accent: string; baseNeutral: string; deepAccent: string };
      keepOriginal?: boolean;
      pathSuffix?: string;
      /** rembg 전 상품 영역 preCrop용 — 손·팔·배경 플레이트 제거에 필요 */
      productName?: string;
      backdropAlreadyComposited?: boolean;
    };

    if (!imageUrl || !storagePath || !backdropDataUrl) {
      return NextResponse.json(
        { error: "imageUrl, storagePath, backdropDataUrl이 모두 필요합니다." },
        { status: 400 },
      );
    }

    let backdropBuffer: Buffer;
    if (backdropDataUrl.startsWith("data:")) {
      const base64Data = backdropDataUrl.split(",")[1];
      if (!base64Data) {
        return NextResponse.json(
          { error: "backdropDataUrl 형식이 올바르지 않습니다." },
          { status: 400 },
        );
      }
      backdropBuffer = Buffer.from(base64Data, "base64");
    } else {
      const backdropRes = await fetch(backdropDataUrl);
      if (!backdropRes.ok) {
        return NextResponse.json(
          { error: "선택한 배경 이미지를 불러오지 못했습니다." },
          { status: 400 },
        );
      }
      backdropBuffer = Buffer.from(await backdropRes.arrayBuffer());
    }

    let decorBuffer: Buffer | undefined;
    if (decorDataUrl) {
      const decorBase64 = decorDataUrl.split(",")[1];
      if (decorBase64) {
        decorBuffer = Buffer.from(decorBase64, "base64");
      }
    }

    const {
      buffer: enhancedBuffer,
      cost,
      decorBuffer: newDecorBuffer,
      decorCost,
      claudeCost,
    } = await enhanceProductImage(imageUrl, backdropBuffer, {
      shadowHint: shadowAnalysis,
      conceptBrief,
      applyDecor: applyDecor ?? false,
      decorBuffer,
      theme,
      productName: productName?.trim() || undefined,
      backdropAlreadyComposited: backdropAlreadyComposited ?? false,
    });

    const decorDataUrlOut =
      newDecorBuffer != null
        ? `data:image/png;base64,${newDecorBuffer.toString("base64")}`
        : decorDataUrl;

    const suffix = pathSuffix?.replace(/[^a-zA-Z0-9_-]/g, "") || "enhanced";
    const enhancedPath = storagePath.replace(/\.[^./]+$/, "") + `-${suffix}.png`;

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

    if (keepOriginal) {
      const { error: insertError } = await supabase.from("product_images").insert({
        user_id: user.id,
        storage_path: enhancedPath,
        image_url: publicUrlData.publicUrl,
        image_uploaded_at: new Date().toISOString(),
        protected_until: productImageProtectedUntil(),
      });
      if (insertError) {
        console.error("[enhance-image] extra product_images insert error", insertError);
      }
    } else {
      const { error: updateError } = await supabase
        .from("product_images")
        .update({
          storage_path: enhancedPath,
          image_url: publicUrlData.publicUrl,
          protected_until: productImageProtectedUntil(),
        })
        .eq("user_id", user.id)
        .eq("storage_path", storagePath);

      if (updateError) {
        console.error("[enhance-image] product_images update error", updateError);
      }

      // 30차 후속: 원본 storage 파일은 삭제하지 않는다.
      // 예전에 remove(storagePath) 하면 draft 세션이 옛 URL을 들고 재승인할 때
      // flux가 404 → 전체 무보정 폴백이 났다. 원본은 orphan cleanup/protected_until로 정리.
    }

    return NextResponse.json({
      enhancedUrl: publicUrlData.publicUrl,
      enhancedPath,
      cost,
      decorCost: decorCost ?? 0,
      claudeCost: claudeCost ?? 0,
      decorDataUrl: decorDataUrlOut,
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
