import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  COSMETICS_AI_PROMPT,
  isCosmeticsCategory,
  reviewCosmeticsCopy,
} from "@/lib/cosmetics-compliance";
import type { GeneratedCopy, ProductInput } from "@/lib/types/generate";
import { createClient } from "@/lib/supabase/server";

const CLAUDE_MODEL = "claude-sonnet-5";
const DEEPSEEK_MODEL = "deepseek-v4-flash";
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

async function fetchImageAsBase64(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`이미지를 불러올 수 없습니다: ${url}`);
  }

  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const mediaType = contentType.includes("png") ? "image/png" : "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());

  return {
    mediaType: mediaType as "image/jpeg" | "image/png",
    data: buffer.toString("base64"),
  };
}

async function analyzeImagesWithClaude(
  anthropic: Anthropic,
  imageUrls: string[],
  productInfo: ProductInput,
) {
  const imageBlocks = await Promise.all(
    imageUrls.map(async (url) => {
      const { mediaType, data } = await fetchImageAsBase64(url);
      return {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: mediaType,
          data,
        },
      };
    }),
  );

  const isCosmetics = isCosmeticsCategory(productInfo.category);
  const cosmeticsNote = isCosmetics
    ? `\n\n${COSMETICS_AI_PROMPT}\n분석 시에도 의학적 효능·치료 표현은 사용하지 마세요.`
    : "";

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: [
          ...imageBlocks,
          {
            type: "text",
            text: `당신은 이커머스 상품 분석 전문가입니다. 첨부된 상품 사진을 분석해 주세요.

상품명: ${productInfo.productName}
카테고리: ${productInfo.category}
${productInfo.brandName ? `브랜드: ${productInfo.brandName}` : ""}
${productInfo.keyFeatures ? `사용자 입력 특징: ${productInfo.keyFeatures}` : ""}
${productInfo.ingredients ? `성분/소재: ${productInfo.ingredients}` : ""}

다음 항목을 한국어로 상세히 분석해 주세요:
1. 제품 색상 (정확한 색상명)
2. 질감/소재 (보이는 질감, 마감, 재질)
3. 시각적 특징 (형태, 디자인, 패턴, 포장 등)
4. 전반적인 인상 및 타겟 고객에게 어필할 포인트
5. 상세페이지에 강조하면 좋을 USP${cosmeticsNote}

각 사진이 몇 번째로 첨부되었는지(0부터 시작하는 순서)도 함께 기억해 두세요.
이후 상세페이지 섹션을 구성할 때 어떤 사진이 어떤 용도(전체샷/질감클로즈업/사용장면 등)로
적합한지 판단하는 데 사용됩니다.`,
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude Vision 분석 결과를 받지 못했습니다.");
  }

  return textBlock.text;
}

async function generateCopyWithDeepSeek(
  productInfo: ProductInput,
  imageAnalysis: string,
  imageCount: number,
): Promise<GeneratedCopy> {
  const isCosmetics = isCosmeticsCategory(productInfo.category);
  const cosmeticsGuide = isCosmetics
    ? `\n\n## 식약처 화장품 광고 기준 (필수)\n${COSMETICS_AI_PROMPT}`
    : "";

  const prompt = `당신은 한국 이커머스 상세페이지 기획자 겸 카피라이터입니다.
아래 상품 정보와 AI 이미지 분석 결과를 바탕으로, 이 상품에 맞는 상세페이지를
"섹션 배열"로 직접 설계하세요. 상품마다 강조할 포인트가 다르므로
(화장품이면 성분/사용감, 전자제품이면 스펙, 의류면 소재/핏 등),
정해진 틀에 맞추지 말고 이 상품에 실제로 필요한 섹션만 고르세요.

## 상품 정보
- 상품명: ${productInfo.productName}
- 카테고리: ${productInfo.category}
- 판매가: ₩${productInfo.price.toLocaleString()}
${productInfo.brandName ? `- 브랜드: ${productInfo.brandName}` : ""}
${productInfo.targetCustomer ? `- 타겟 고객: ${productInfo.targetCustomer}` : ""}
${productInfo.keyFeatures ? `- 핵심 특징: ${productInfo.keyFeatures}` : ""}
${productInfo.ingredients ? `- 성분/소재: ${productInfo.ingredients}` : ""}
${productInfo.certifications ? `- 인증/수상: ${productInfo.certifications}` : ""}
${productInfo.competitorUrl ? `- 경쟁사 URL: ${productInfo.competitorUrl}` : ""}
- 업로드된 사진 수: ${imageCount}장 (인덱스 0 ~ ${imageCount - 1})

## AI 이미지 분석 결과
${imageAnalysis}

## 사용 가능한 섹션 타입 (이 중에서만 골라 8~10개, 순서는 자유)
- hero: { type, headline, subheadline?, imageIndex } — 첫 화면. 반드시 1개, 배열 맨 앞.
- checklist: { type, heading, items[] } — 핵심 특징 체크리스트
- image_text: { type, heading, body, imageIndex, imagePosition: "left"|"right" } — 사진+설명 (성분 설명, 사용감, 디자인 포인트 등에 활용, 여러 개 가능)
- spec_table: { type, heading, rows: [{label, value}] } — 성분표/스펙표/사이즈표 등 (해당 카테고리에 의미있을 때만)
- usage_steps: { type, heading, steps[] } — 사용 방법 단계
- gallery: { type, heading, imageIndexes[] } — 남은 사진들을 모아 보여주는 갤러리
- caution: { type, heading, body } — 주의사항 (반드시 1개 포함)
- cta_price: { type, price, targetCustomer?, badges[]? } — 가격/타겟/뱃지 강조 (반드시 1개 포함)

imageIndex는 0 ~ ${imageCount - 1} 범위 안에서만 사용하고, 가능하면 여러 사진을 골고루 활용하세요.
사진이 ${imageCount}장뿐이라면 여러 섹션에서 같은 인덱스를 재사용해도 됩니다.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.
{
  "sections": [ ...위 타입 중 8~10개... ],
  "headlines": ["헤드라인1", "헤드라인2", "헤드라인3"],
  "description": "상품 설명 (2~3문단)",
  "features": ["특징1", "특징2", "특징3", "특징4"],
  "howToUse": "사용 방법 요약",
  "caution": "주의사항 요약"
}

headlines/description/features/howToUse/caution은 목록·검색 화면에 쓰이는 요약용이니
sections 안의 내용과 자연스럽게 일치하도록 작성하세요.${cosmeticsGuide}`;

  const response = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API 오류: ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek API 응답이 비어 있습니다.");
  }

  const parsed = JSON.parse(content) as GeneratedCopy;

  if (
    !Array.isArray(parsed.sections) ||
    parsed.sections.length === 0 ||
    !Array.isArray(parsed.headlines) ||
    typeof parsed.description !== "string" ||
    !Array.isArray(parsed.features) ||
    typeof parsed.howToUse !== "string" ||
    typeof parsed.caution !== "string"
  ) {
    throw new Error("DeepSeek 응답 형식이 올바르지 않습니다.");
  }

  const clampIndex = (i: number) =>
    Number.isInteger(i) && i >= 0 && i < imageCount ? i : 0;

  parsed.sections = parsed.sections.map((section) => {
    if (section.type === "hero" || section.type === "image_text") {
      return { ...section, imageIndex: clampIndex(section.imageIndex) };
    }
    if (section.type === "gallery") {
      return {
        ...section,
        imageIndexes: section.imageIndexes
          .map(clampIndex)
          .filter((v, i, arr) => arr.indexOf(v) === i),
      };
    }
    return section;
  });

  return parsed;
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

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." },
        { status: 500 },
      );
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: "DEEPSEEK_API_KEY가 설정되지 않았습니다." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as ProductInput;

    if (!body.productName || !body.category || !body.price) {
      return NextResponse.json(
        { error: "필수 상품 정보가 누락되었습니다." },
        { status: 400 },
      );
    }

    if (!body.imageUrls?.length) {
      return NextResponse.json(
        { error: "상품 사진이 필요합니다." },
        { status: 400 },
      );
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const imageAnalysis = await analyzeImagesWithClaude(
      anthropic,
      body.imageUrls.slice(0, 5),
      body,
    );

    const generated = await generateCopyWithDeepSeek(
      body,
      imageAnalysis,
      Math.min(body.imageUrls.length, 5),
    );

    const isCosmetics = isCosmeticsCategory(body.category);
    const finalCopy = isCosmetics ? reviewCosmeticsCopy(generated) : null;
    const copyToSave = finalCopy ? finalCopy.copy : generated;
    const mfdsReviewed = finalCopy?.mfdsReviewed ?? false;
    const replacements = finalCopy?.replacements ?? [];

    const { data: savedProduct, error: insertError } = await supabase
      .from("products")
      .insert({
        user_id: user.id,
        category: body.category,
        product_name: body.productName,
        brand_name: body.brandName ?? null,
        price: body.price,
        target_customer: body.targetCustomer ?? null,
        key_features: body.keyFeatures ?? null,
        ingredients: body.ingredients ?? null,
        certifications: body.certifications ?? null,
        competitor_url: body.competitorUrl ?? null,
        wholesale_url: body.wholesaleUrl ?? null,
        image_urls: body.imageUrls,
        headlines: copyToSave.headlines,
        description: copyToSave.description,
        features: copyToSave.features,
        how_to_use: copyToSave.howToUse,
        caution: copyToSave.caution,
        image_analysis: imageAnalysis,
        mfds_reviewed: mfdsReviewed,
        replacements,
        sections: copyToSave.sections,
      })
      .select("id")
      .single();

    if (insertError || !savedProduct) {
      console.error("[generate] product insert error", insertError);
      return NextResponse.json(
        { error: `상품 저장 실패: ${insertError?.message ?? "알 수 없는 오류"}` },
        { status: 500 },
      );
    }

    if (body.imagePaths?.length) {
      const { error: linkError } = await supabase
        .from("product_images")
        .update({ product_id: savedProduct.id })
        .eq("user_id", user.id)
        .in("storage_path", body.imagePaths);

      if (linkError) {
        console.error("[generate] product_images link error", linkError);
      }
    }

    return NextResponse.json({
      ...copyToSave,
      imageAnalysis,
      mfdsReviewed,
      replacements,
      productId: savedProduct.id as string,
    });
  } catch (error) {
    console.error("[generate]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "상세페이지 생성 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
