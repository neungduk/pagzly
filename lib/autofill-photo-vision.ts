import Anthropic from "@anthropic-ai/sdk";
import { calculateClaudeCost, logClaudeCost } from "@/lib/claude-cost";
import { HAIKU_VISION_MODEL } from "@/lib/vision-utils";

import { pickAutofillVisionUrls } from "@/lib/autofill-vision-pick";

const AUTOFILL_VISION_MAX_TOKENS = 450;

async function fetchImageAsBase64(
  url: string,
): Promise<{ mediaType: "image/jpeg" | "image/png"; data: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`이미지를 불러오지 못했습니다: ${url}`);
  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const mediaType = contentType.includes("png") ? "image/png" : "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());
  return { mediaType, data: buffer.toString("base64") };
}

/**
 * 70차 — 폼 단계 전용 가벼운 Vision 분석.
 * 정식 생성의 analyzeImagesWithClaude()와 분리 (Haiku, 2~4장, 짧은 출력).
 */
export async function analyzePhotosForAutofillDraft(params: {
  imageUrls: string[];
  productName: string;
  category: string;
}): Promise<{ visualNotes: string; cost: number; imageCount: number }> {
  const picked = pickAutofillVisionUrls(params.imageUrls);
  if (picked.length === 0) {
    return { visualNotes: "", cost: 0, imageCount: 0 };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[autofill-photo-vision] ANTHROPIC_API_KEY 없음 — Vision 생략");
    return { visualNotes: "", cost: 0, imageCount: 0 };
  }

  const payloads = await Promise.all(picked.map((url) => fetchImageAsBase64(url)));
  const imageBlocks = payloads.map((payload) => ({
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: payload.mediaType,
      data: payload.data,
    },
  }));

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await anthropic.messages.create({
    model: HAIKU_VISION_MODEL,
    max_tokens: AUTOFILL_VISION_MAX_TOKENS,
    messages: [
      {
        role: "user",
        content: [
          ...imageBlocks,
          {
            type: "text",
            text: `이커머스 상품 등록 폼 초안용으로, 첨부 사진(${picked.length}장)에서 **눈에 보이는 것만** 짧게 나열하세요.

상품명(참고): ${params.productName}
카테고리: ${params.category}

## 출력 (한국어, 5~8개 불릿, 각 1줄)
- 색상·마감·재질/소재 느낌
- 형태·디자인·패턴·포장
- 사진에서 보이는 사용 장면/구도 (있을 때만)

## 금지 (엄격)
- 성분명·함량·인증·KC·원산지·수치·임상 결과
- 라벨·성분표·포장 문구를 읽어 추측하는 것 (OCR 금지)
- 사진에 없는 효능·타겟·가격 정보

확실하지 않으면 해당 항목은 쓰지 마세요.`,
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  const visualNotes =
    textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
  const cost = calculateClaudeCost(HAIKU_VISION_MODEL, message.usage);
  logClaudeCost("autofillPhotoVision", HAIKU_VISION_MODEL, cost);
  console.log(
    `[autofill-photo-vision] ${picked.length}장 분석 완료 (${visualNotes.length}자)`,
  );

  return { visualNotes, cost, imageCount: picked.length };
}
