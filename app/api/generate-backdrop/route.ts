import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateBackdrop, generateBackdropViaBria, getBackdropProvider } from "@/lib/photo-enhance";
import { extractProductTheme } from "@/lib/color-extract";
import { getCategoryTheme } from "@/lib/category-theme";
import { generateConceptBrief } from "@/lib/concept-brief";
import { isTestMode } from "@/lib/test-mode";
import { logForceRegenerateStatus } from "@/lib/force-regenerate";

export async function POST(request: Request) {
  try {
    logForceRegenerateStatus();
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

    const provider = getBackdropProvider(category);
    console.log(`[generate-backdrop] BACKDROP_PROVIDER=${provider}`);
    const { buffer, candidateUrls, cost: backdropCost, shadow, claudeCost, autoPicked } =
      provider === "bria"
        ? await generateBackdropViaBria(
            category,
            productName,
            brandName ?? null,
            theme,
            imageUrls?.[0],
            conceptBrief,
          )
        : await generateBackdrop(
            category,
            productName,
            brandName ?? null,
            theme,
            imageUrls?.[0],
            conceptBrief,
          );

    let backdropDataUrl: string | undefined;
    if (buffer) {
      backdropDataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
    }

    let storedCandidateUrls = candidateUrls;
    if (candidateUrls.length > 0) {
      storedCandidateUrls = [];
      const stamp = Date.now();
      for (let i = 0; i < candidateUrls.length; i += 1) {
        const response = await fetch(candidateUrls[i]);
        if (!response.ok) continue;
        const fileBuffer = Buffer.from(await response.arrayBuffer());
        const path = `${user.id}/backdrop-candidates/${stamp}-${i}.png`;
        const { error: uploadError } = await supabase.storage.from("images").upload(path, fileBuffer, {
          contentType: "image/png",
          upsert: true,
        });
        if (uploadError) {
          console.warn("[generate-backdrop] 후보 업로드 실패, 원본 URL 유지:", uploadError.message);
          storedCandidateUrls.push(candidateUrls[i]);
          continue;
        }
        const { data: publicData } = supabase.storage.from("images").getPublicUrl(path);
        storedCandidateUrls.push(publicData.publicUrl);
      }
    }

    return NextResponse.json({
      backdropDataUrl,
      candidateUrls: storedCandidateUrls,
      autoPicked,
      cost: backdropCost + conceptBriefCost,
      conceptBriefCost,
      backdropCost,
      claudeCost,
      shadowAnalysis: shadow,
      conceptBrief,
      testMode: isTestMode(),
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
