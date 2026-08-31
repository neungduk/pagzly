import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  SOCIAL_MINI_MAX_PHOTOS,
  SOCIAL_MINI_MIN_PHOTOS,
  TOKEN_COST_SOCIAL_MINI,
} from "@/lib/cost/saas-pricing-config";
import { getCategoryTheme } from "@/lib/category-theme";
import { extractProductTheme } from "@/lib/color-extract";
import { isCosmeticsCategory, reviewCosmeticsCopy } from "@/lib/cosmetics-compliance";
import { isFoodCategory, reviewFoodCopy } from "@/lib/food-compliance";
import { enhanceProductImage, generateBackdrop } from "@/lib/photo-enhance";
import { productImageProtectedUntil } from "@/lib/product-image-protection";
import { analyzeSocialProductImages } from "@/lib/social-mini/analyze-images";
import { generateSocialMiniCopy } from "@/lib/social-mini/generate-copy";
import type { GeneratedCopy } from "@/lib/types/generate";

const STORAGE_BUCKET = "images";

type SocialGenerateBody = {
  productName?: string;
  category?: string;
  keyFeatures?: string | null;
  imageUrls?: string[];
  imagePaths?: string[];
};

async function fetchBackdropBuffer(result: Awaited<ReturnType<typeof generateBackdrop>>): Promise<Buffer> {
  if (result.buffer) return result.buffer;
  const url = result.candidateUrls[0];
  if (!url) throw new Error("배경 이미지를 생성하지 못했습니다.");
  const res = await fetch(url);
  if (!res.ok) throw new Error("배경 이미지를 불러오지 못했습니다.");
  return Buffer.from(await res.arrayBuffer());
}

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

    const body = (await request.json()) as SocialGenerateBody;
    const productName = body.productName?.trim();
    const category = body.category?.trim() || "기타";
    const imageUrls = body.imageUrls ?? [];
    const imagePaths = body.imagePaths ?? [];

    if (!productName) {
      return NextResponse.json({ error: "상품명을 입력해 주세요." }, { status: 400 });
    }

    if (imageUrls.length < SOCIAL_MINI_MIN_PHOTOS) {
      return NextResponse.json(
        { error: `사진을 최소 ${SOCIAL_MINI_MIN_PHOTOS}장 이상 업로드해 주세요.` },
        { status: 400 },
      );
    }

    if (imageUrls.length > SOCIAL_MINI_MAX_PHOTOS) {
      return NextResponse.json(
        { error: `사진은 최대 ${SOCIAL_MINI_MAX_PHOTOS}장까지 업로드할 수 있습니다.` },
        { status: 400 },
      );
    }

    const { data: creditRow } = await supabase
      .from("user_credits")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    const balance = creditRow?.balance ?? 0;
    if (balance < TOKEN_COST_SOCIAL_MINI) {
      return NextResponse.json(
        { error: "insufficient_credits", balance, required: TOKEN_COST_SOCIAL_MINI },
        { status: 402 },
      );
    }

    let theme = getCategoryTheme(category);
    try {
      const extracted = await extractProductTheme(imageUrls);
      if (extracted) theme = { ...theme, ...extracted };
    } catch (err) {
      console.warn("[generate-social] 색상 추출 실패", err);
    }

    const { analysis: imageAnalysis, cost: analysisCost } = await analyzeSocialProductImages({
      imageUrls,
      productName,
      category,
      keyFeatures: body.keyFeatures,
    });

    const backdropResult = await generateBackdrop(
      category,
      productName,
      null,
      theme,
      imageUrls[0],
      undefined,
    );
    const backdropBuffer = await fetchBackdropBuffer(backdropResult);

    const enhancedUrls: string[] = [];
    const enhancedPaths: string[] = [];
    let enhanceCost = 0;

    for (let i = 0; i < imageUrls.length; i += 1) {
      const sourceUrl = imageUrls[i]!;
      const sourcePath = imagePaths[i] ?? `${user.id}/social/${i}`;
      const { buffer, cost, claudeCost } = await enhanceProductImage(sourceUrl, backdropBuffer, {
        theme,
        productName,
      });
      enhanceCost += cost + claudeCost;

      const enhancedPath = sourcePath.replace(/\.[^./]+$/, "") + "-social-enhanced.png";
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(enhancedPath, buffer, { contentType: "image/png", upsert: true });

      if (uploadError) {
        throw new Error(`보정 이미지 업로드 실패: ${uploadError.message}`);
      }

      const { data: publicUrl } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(enhancedPath);
      enhancedUrls.push(publicUrl.publicUrl);
      enhancedPaths.push(enhancedPath);

      await supabase.from("product_images").insert({
        user_id: user.id,
        storage_path: enhancedPath,
        image_url: publicUrl.publicUrl,
        image_uploaded_at: new Date().toISOString(),
        protected_until: productImageProtectedUntil(),
      });
    }

    const { copy: rawCopy, deepSeekCost } = await generateSocialMiniCopy({
      productName,
      category,
      keyFeatures: body.keyFeatures,
      imageAnalysis,
      imageCount: enhancedUrls.length,
    });

    let savedCopy: GeneratedCopy = rawCopy;
    let mfdsReviewed = false;
    let replacements: { original: string; replacement: string; count: number }[] = [];

    if (isCosmeticsCategory(category)) {
      const reviewed = reviewCosmeticsCopy(rawCopy);
      savedCopy = reviewed.copy;
      mfdsReviewed = reviewed.mfdsReviewed;
      replacements = reviewed.replacements;
    } else if (isFoodCategory(category)) {
      const reviewed = reviewFoodCopy(rawCopy);
      savedCopy = reviewed.copy;
      mfdsReviewed = reviewed.mfdsReviewed;
      replacements = reviewed.replacements;
    }

    const generationCost =
      Math.round(
        (analysisCost + backdropResult.cost + backdropResult.claudeCost + enhanceCost + deepSeekCost) *
          1_000_000,
      ) / 1_000_000;

    const { data: savedProduct, error: insertError } = await supabase
      .from("products")
      .insert({
        user_id: user.id,
        kind: "social_mini",
        category,
        product_name: productName,
        brand_name: null,
        price: 0,
        target_customer: null,
        key_features: body.keyFeatures?.trim() || null,
        ingredients: null,
        certifications: null,
        competitor_url: null,
        wholesale_url: null,
        image_urls: enhancedUrls,
        headlines: savedCopy.headlines,
        description: savedCopy.description,
        features: savedCopy.features,
        how_to_use: savedCopy.howToUse,
        caution: savedCopy.caution,
        image_analysis: imageAnalysis,
        mfds_reviewed: mfdsReviewed,
        replacements,
        sections: savedCopy.sections,
        generation_cost: generationCost,
      })
      .select("id")
      .single();

    if (insertError || !savedProduct) {
      console.error("[generate-social] insert error", insertError);
      return NextResponse.json({ error: "결과 저장에 실패했습니다." }, { status: 500 });
    }

    if (enhancedPaths.length) {
      await supabase
        .from("product_images")
        .update({ product_id: savedProduct.id })
        .eq("user_id", user.id)
        .in("storage_path", enhancedPaths);
    }

    const serviceClient = createServiceRoleClient();
    const { error: deductError } = await serviceClient.rpc("deduct_credits", {
      p_user_id: user.id,
      p_amount: TOKEN_COST_SOCIAL_MINI,
      p_reason: "completion",
      p_reference_id: savedProduct.id,
    });

    if (deductError) {
      console.error("[generate-social] deduct_credits failed:", deductError);
    }

    return NextResponse.json({
      productId: savedProduct.id,
      sections: savedCopy.sections,
      imageUrls: enhancedUrls,
      imagePaths: enhancedPaths,
      productName,
      category,
      description: savedCopy.description,
      features: savedCopy.features,
      howToUse: savedCopy.howToUse,
      caution: savedCopy.caution,
      mfdsReviewed,
      replacements,
      generationCost,
    });
  } catch (error) {
    console.error("[generate-social]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "미니 생성 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
