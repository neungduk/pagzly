/**
 * 레퍼런스 이미지 색상/무드 분석 — Haiku Vision.
 */

import Anthropic from "@anthropic-ai/sdk";
import { calculateClaudeCost, logClaudeCost } from "@/lib/claude-cost";
import { isTestMode } from "@/lib/test-mode";
import { HAIKU_VISION_MODEL } from "@/lib/vision-utils";

export type ReferenceAnalysis = {
  colorHex: string[];
  moodKeywords: string[];
};

const REFERENCE_FALLBACK: ReferenceAnalysis = {
  colorHex: ["#2F4858", "#E3A72E"],
  moodKeywords: ["클린", "미니멀", "차분한"],
};

function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) return `#${trimmed.toUpperCase()}`;
  return null;
}

function parseReferenceAnalysis(text: string): ReferenceAnalysis | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      colorHex?: unknown;
      moodKeywords?: unknown;
    };
    const colorHex = Array.isArray(parsed.colorHex)
      ? parsed.colorHex
          .map(String)
          .map(normalizeHex)
          .filter((v): v is string => Boolean(v))
          .slice(0, 5)
      : [];
    const moodKeywords = Array.isArray(parsed.moodKeywords)
      ? parsed.moodKeywords.map(String).filter(Boolean).slice(0, 6)
      : [];
    if (colorHex.length === 0 && moodKeywords.length === 0) return null;
    return {
      colorHex: colorHex.length > 0 ? colorHex : REFERENCE_FALLBACK.colorHex,
      moodKeywords: moodKeywords.length > 0 ? moodKeywords : REFERENCE_FALLBACK.moodKeywords,
    };
  } catch {
    return null;
  }
}

/** 레퍼런스 이미지에서 대표 색상·무드 키워드 추출 */
export async function analyzeReferenceImage(
  imageBuffer: Buffer,
  mediaType: "image/jpeg" | "image/png" = "image/jpeg",
): Promise<ReferenceAnalysis & { cost: number }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[reference-analysis] ANTHROPIC_API_KEY 없음 — 폴백 사용");
    return { ...REFERENCE_FALLBACK, cost: 0 };
  }

  if (isTestMode()) {
    console.log("[reference-analysis] TEST_MODE — Haiku Vision 스킵, 폴백 사용");
    return { ...REFERENCE_FALLBACK, cost: 0 };
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: HAIKU_VISION_MODEL,
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBuffer.toString("base64"),
              },
            },
            {
              type: "text",
              text: `이커머스 상세페이지 레퍼런스 이미지입니다. 판매 상품 사진이 아니라 참고용 무드/색감 보드로 보세요.
대표 색상 hex 2~4개와 무드 키워드 3~5개를 JSON만 반환하세요.

{
  "colorHex": ["#1A2B3C", "#E8D5C4"],
  "moodKeywords": ["맑은", "수분감", "미니멀"]
}`,
            },
          ],
        },
      ],
    });

    const cost = calculateClaudeCost(HAIKU_VISION_MODEL, message.usage);
    logClaudeCost("referenceAnalysis", HAIKU_VISION_MODEL, cost);
    console.log(`[cost] analyzeReferenceImage (Haiku): $${cost.toFixed(4)}`);

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { ...REFERENCE_FALLBACK, cost };
    }

    const parsed = parseReferenceAnalysis(textBlock.text);
    if (!parsed) {
      console.warn("[reference-analysis] 파싱 실패 — 폴백 사용");
      return { ...REFERENCE_FALLBACK, cost };
    }

    console.log(
      `[reference-analysis] colors=${parsed.colorHex.join(",")} mood=${parsed.moodKeywords.join(",")}`,
    );
    return { ...parsed, cost };
  } catch (error) {
    console.warn("[reference-analysis] 분석 실패 — 폴백 사용", error);
    return { ...REFERENCE_FALLBACK, cost: 0 };
  }
}

export function formatReferencePromptBlock(analysis: ReferenceAnalysis): string {
  return `## 레퍼런스 이미지 (색상/무드 우선 반영)
- 주요 색상: ${analysis.colorHex.join(", ")}
- 무드 키워드: ${analysis.moodKeywords.join(", ")}
카피·톤·비주얼 컨셉은 위 레퍼런스 색감/무드를 우선 반영하되, 상품 사실과 모순되면 안 됩니다.`;
}
