import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateBackdrop } from "@/lib/photo-enhance";
import { extractProductTheme } from "@/lib/color-extract";
import { getCategoryTheme } from "@/lib/category-theme";
import { generateConceptBrief, type ConceptBrief } from "@/lib/concept-brief";

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
      category,
      productName,
      brandName,
      imageUrls,
      price,
      keyFeatures,
      ingredients,
      targetCustomer,
    } = (await request.json()) as {
      category?: string;
      productName?: string;
      brandName?: string | null;
      imageUrls?: string[];
      price?: number;
      keyFeatures?: string | null;
      ingredients?: string | null;
      targetCustomer?: string | null;
    };

    if (!category || !productName) {
      return NextResponse.json(
        { error: "category, productName이 필요합니다." },
        { status: 400 },
      );
    }

    // 배경 생성 프롬프트에 상품 고유 색감을 반영하기 위해, 업로드된 원본
    // 사진에서 먼저 색을 뽑아본다. 실패(무채색 상품, 사진 없음 등)하면
    // 카테고리 기본 테마로 폴백 — 배경 생성 자체를 막지 않는다.
    const { brief: conceptBrief, cost: conceptBriefCost } = await generateConceptBrief({
      category,
      productName,
      brandName: brandName ?? null,
      price,
      keyFeatures: keyFeatures ?? null,
      ingredients: ingredients ?? null,
      targetCustomer: targetCustomer ?? null,
    });

    let theme = getCategoryTheme(category);
    if (imageUrls?.length) {
      try {
        const extracted = await extractProductTheme(imageUrls);
        if (extracted) theme = { ...theme, ...extracted };
      } catch (err) {
        console.warn("[generate-backdrop] 색상 추출 실패, 카테고리 기본 테마로 폴백", err);
      }
    }

    const { buffer: backdropBuffer, cost: backdropCost, shadow } = await generateBackdrop(
      category,
      productName,
      brandName ?? null,
      theme,
      imageUrls?.[0],
      conceptBrief,
    );
    const backdropDataUrl = `data:image/png;base64,${backdropBuffer.toString("base64")}`;

    return NextResponse.json({
      backdropDataUrl,
      cost: backdropCost + conceptBriefCost,
      conceptBriefCost,
      backdropCost,
      shadowAnalysis: shadow,
      conceptBrief,
    });
  } catch (error) {
    console.error("[generate-backdrop]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "배경 생성 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
