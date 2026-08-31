/**
 * 상품 사진 Vision 분석 — app/api/generate/route.ts의 analyzeImagesWithClaude와
 * 동일한 Claude Haiku/Sonnet 호출 패턴 (generate 라우트는 수정하지 않음).
 */
import Anthropic from "@anthropic-ai/sdk";
import { COSMETICS_AI_PROMPT, isCosmeticsCategory } from "@/lib/cosmetics-compliance";
import { calculateClaudeCost, logClaudeCost } from "@/lib/claude-cost";
import { HAIKU_VISION_MODEL } from "@/lib/vision-utils";
import { isTestMode } from "@/lib/test-mode";

const CLAUDE_MODEL = "claude-sonnet-5";

async function fetchImageAsBase64(url: string): Promise<{ mediaType: "image/jpeg" | "image/png"; data: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`이미지를 불러오지 못했습니다: ${url}`);
  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const mediaType = contentType.includes("png") ? "image/png" : "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());
  return { mediaType, data: buffer.toString("base64") };
}

export async function analyzeSocialProductImages(params: {
  imageUrls: string[];
  productName: string;
  category: string;
  keyFeatures?: string | null;
}): Promise<{ analysis: string; cost: number }> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const testMode = isTestMode();
  const model = testMode ? HAIKU_VISION_MODEL : CLAUDE_MODEL;
  const urls = params.imageUrls.slice(0, Math.min(10, params.imageUrls.length));
  const payloads = await Promise.all(urls.map((url) => fetchImageAsBase64(url)));

  const imageBlocks = payloads.map((payload) => ({
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: payload.mediaType,
      data: payload.data,
    },
  }));

  const isCosmetics = isCosmeticsCategory(params.category);
  const cosmeticsNote = isCosmetics
    ? `\n\n${COSMETICS_AI_PROMPT}\n분석 시에도 의학적 효능·치료 표현은 사용하지 마세요.`
    : "";

  const message = await anthropic.messages.create({
    model,
    max_tokens: 1200,
    messages: [
      {
        role: "user",
        content: [
          ...imageBlocks,
          {
            type: "text",
            text: `당신은 이커머스 상품 분석 전문가입니다. 첨부된 상품 사진을 분석해 주세요.

상품명: ${params.productName}
카테고리: ${params.category}
${params.keyFeatures ? `핵심 특징: ${params.keyFeatures}` : ""}

다음을 한국어로 요약해 주세요:
1. 제품 색상·질감·형태
2. 인스타/블로그 콘텐츠에 강조할 USP 3가지
3. 각 사진(0부터)이 어떤 용도(전체샷/디테일/사용장면)에 적합한지${cosmeticsNote}`,
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude Vision 분석 결과를 받지 못했습니다.");
  }

  const cost = calculateClaudeCost(model, message.usage);
  logClaudeCost("socialMiniImageAnalysis", model, cost);
  return { analysis: textBlock.text, cost };
}
