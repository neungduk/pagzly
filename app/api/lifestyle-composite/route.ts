import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { compositeProductOnLifestylePhoto } from "@/lib/lifestyle-product-composite";
import { isTestMode } from "@/lib/test-mode";
import { uploadPngBuffer } from "@/lib/upload-png";

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

    const body = (await request.json()) as {
      lifestyleImageUrl?: string;
      productImageUrl?: string;
      category?: string;
      productName?: string;
      storageBasePath?: string;
    };

    const lifestyleImageUrl = body.lifestyleImageUrl?.trim();
    const productImageUrl = body.productImageUrl?.trim();
    const category = body.category?.trim() ?? "기타";
    const productName = body.productName?.trim() ?? "product";

    if (!lifestyleImageUrl || !productImageUrl) {
      return NextResponse.json(
        { error: "lifestyleImageUrl과 productImageUrl이 필요합니다." },
        { status: 400 },
      );
    }

    if (isTestMode()) {
      console.log("[lifestyle-composite] TEST_MODE — 원본 라이프스타일 반환 ($0)");
      return NextResponse.json({
        url: lifestyleImageUrl,
        path: null,
        cost: 0,
        composited: false,
        fromTestMode: true,
      });
    }

    const result = await compositeProductOnLifestylePhoto({
      lifestyleImageUrl,
      productImageUrl,
      category,
      productName,
    });

    if (!result.composited || result.url === lifestyleImageUrl) {
      return NextResponse.json({
        url: lifestyleImageUrl,
        path: null,
        cost: result.cost,
        composited: false,
        fallbackReason: result.fallbackReason ?? "합성 생략",
      });
    }

    const res = await fetch(result.url);
    if (!res.ok) {
      return NextResponse.json({
        url: lifestyleImageUrl,
        path: null,
        cost: result.cost,
        composited: false,
        fallbackReason: "합성 결과 다운로드 실패",
      });
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const base = body.storageBasePath?.replace(/\.[^./]+$/, "") ?? `${user.id}/lifestyle-composite`;
    const storagePath = `${base}-${Date.now()}.png`;
    const uploaded = await uploadPngBuffer(supabase, storagePath, buffer);
    if ("error" in uploaded) {
      return NextResponse.json({
        url: result.url,
        path: null,
        cost: result.cost,
        composited: true,
        warning: uploaded.error,
      });
    }

    return NextResponse.json({
      url: uploaded.publicUrl,
      path: uploaded.path,
      cost: result.cost,
      composited: true,
    });
  } catch (error) {
    console.error("[lifestyle-composite]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "라이프스타일 합성 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
