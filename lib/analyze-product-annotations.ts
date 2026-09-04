import Anthropic from "@anthropic-ai/sdk";
import { calculateClaudeCost, logClaudeCost } from "@/lib/claude-cost";
import { isTestMode } from "@/lib/test-mode";
import { HAIKU_VISION_MODEL } from "@/lib/vision-utils";
import {
  areAnnotationsReliable,
  sanitizeAnnotations,
  type ImageAnnotation,
} from "@/lib/product-annotations";

export type AnnotationDomain = "electronics" | "cosmetics";

function buildAnnotationPrompt(domain: AnnotationDomain, hints: string[]): string {
  if (domain === "cosmetics") {
    return `화장품·뷰티 제품 사진에서 아래 힌트와 관련된 **물리적으로 보이는** 구조·재질·표기 위치를 찾아 주석 좌표를 JSON으로만 반환하세요.
힌트: ${hints.join(", ")}

{
  "annotations": [
    { "label": "8자 이내 한국어 라벨", "xPct": 0-100, "yPct": 0-100 }
  ],
  "confidence": "high" | "low"
}

규칙:
- 이미지 좌상단 기준 xPct/yPct (0~100)
- 실제로 보이는 부위만, 최대 4개
- 라벨은 물리 특징만: 예) 노즐, 캡, 보틀, 글라스, 오일층, mL 표기, 펌프
- **금지:** 효능·효과·사용 결과 (보습, 속건조, 장벽 강화, 24시간, 미백, 주름 개선 등)
- 위치를 확신할 수 없으면 confidence:"low" 와 빈 annotations
- 제품 밖 빈 공간이나 엉뚱한 곳에 찍지 말 것`;
  }

  return `전자제품 사진에서 아래 기능/부품이 보이는 위치를 찾아 주석 좌표를 JSON으로만 반환하세요.
기능 힌트: ${hints.join(", ")}

{
  "annotations": [
    { "label": "8자 이내 한국어 라벨", "xPct": 0-100, "yPct": 0-100 }
  ],
  "confidence": "high" | "low"
}

규칙:
- 이미지 좌상단 기준 xPct/yPct (0~100)
- 실제로 보이는 부위만, 최대 4개
- 위치를 확신할 수 없으면 confidence:"low" 와 빈 annotations
- 제품 밖 빈 공간이나 엉뚱한 곳에 찍지 말 것`;
}

export async function analyzeProductAnnotations(
  imageBuffer: Buffer,
  featureHints: string[],
  options?: { domain?: AnnotationDomain },
): Promise<{ annotations: ImageAnnotation[]; reliable: boolean; cost: number }> {
  if (!process.env.ANTHROPIC_API_KEY || isTestMode()) {
    if (isTestMode()) {
      console.log("[annotations] TEST_MODE — Vision 주석 분석 스킵");
    }
    return { annotations: [], reliable: false, cost: 0 };
  }

  const hints = featureHints.filter(Boolean).slice(0, 4);
  if (hints.length === 0) {
    return { annotations: [], reliable: false, cost: 0 };
  }

  const domain = options?.domain ?? "electronics";

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
                media_type: "image/jpeg",
                data: imageBuffer.toString("base64"),
              },
            },
            {
              type: "text",
              text: buildAnnotationPrompt(domain, hints),
            },
          ],
        },
      ],
    });

    const cost = calculateClaudeCost(HAIKU_VISION_MODEL, message.usage);
    logClaudeCost("productAnnotations", HAIKU_VISION_MODEL, cost);

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { annotations: [], reliable: false, cost };
    }

    const fenced = textBlock.text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = (fenced?.[1] ?? textBlock.text).trim();
    const parsed = JSON.parse(raw) as { annotations?: unknown; confidence?: string };
    const annotations = sanitizeAnnotations(parsed.annotations);
    const reliable = parsed.confidence === "high" && areAnnotationsReliable(annotations);
    console.log(
      `[annotations] domain=${domain} confidence=${parsed.confidence ?? "unknown"} reliable=${reliable} count=${annotations.length}`,
    );
    return { annotations: reliable ? annotations : [], reliable, cost };
  } catch (error) {
    console.warn("[analyzeProductAnnotations] 실패 — 주석 레이아웃 생략", error);
    return { annotations: [], reliable: false, cost: 0 };
  }
}
