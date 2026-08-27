import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import { calculateClaudeCost, logClaudeCost } from "@/lib/claude-cost";
import {
  IMAGE_PLAN_ASPECT_RATIOS,
  IMAGE_PLAN_DEFAULT_TARGET,
  IMAGE_PLAN_MAX_ITEMS,
  IMAGE_PLAN_MIN_ITEMS,
  IMAGE_PLAN_QUALITY_LEVELS,
  IMAGE_PLAN_TASK_TYPES,
  type ImagePlan,
  type ImagePlanProductInput,
} from "@/lib/image-router/orchestrator/image-plan-types";
import {
  ImagePlanValidationError,
  parseImagePlanJson,
  validateImagePlan,
} from "@/lib/image-router/orchestrator/validate-image-plan";

const DEFAULT_PLAN_MODEL = process.env.IMAGE_PLAN_CLAUDE_MODEL ?? "claude-sonnet-5";

type ImagePayload = { mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"; data: string };

async function loadImagePayload(source: string): Promise<ImagePayload> {
  if (source.startsWith("data:")) {
    const match = source.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/i);
    if (!match) throw new Error("Unsupported data URL for image plan");
    return {
      mediaType: match[1]!.toLowerCase() as ImagePayload["mediaType"],
      data: match[2]!,
    };
  }

  if (source.startsWith("http://") || source.startsWith("https://")) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`Failed to fetch product image: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0]!.trim().toLowerCase();
    const mediaType = (
      ct === "image/png" || ct === "image/gif" || ct === "image/webp" ? ct : "image/jpeg"
    ) as ImagePayload["mediaType"];
    return { mediaType, data: buf.toString("base64") };
  }

  if (!fs.existsSync(source)) {
    throw new Error(`Product image not found: ${source}`);
  }
  const buf = fs.readFileSync(source);
  const lower = source.toLowerCase();
  const mediaType: ImagePayload["mediaType"] = lower.endsWith(".png")
    ? "image/png"
    : lower.endsWith(".webp")
      ? "image/webp"
      : lower.endsWith(".gif")
        ? "image/gif"
        : "image/jpeg";
  return { mediaType, data: buf.toString("base64") };
}

function buildSystemPrompt(): string {
  return `You are an e-commerce detail-page art director for Pagzly.
You plan which AI-generated images are needed for a product detail page.

Return ONLY valid JSON matching this shape:
{
  "imagePlan": [
    {
      "order": 1,
      "taskType": "HERO_PRODUCT",
      "purpose": "...",
      "prompt": "...",
      "qualityLevel": "PREMIUM",
      "aspectRatio": "3:4"
    }
  ]
}

Rules:
- imagePlan length MUST be between ${IMAGE_PLAN_MIN_ITEMS} and ${IMAGE_PLAN_MAX_ITEMS} (prefer ${IMAGE_PLAN_DEFAULT_TARGET}).
- taskType MUST be one of: ${IMAGE_PLAN_TASK_TYPES.join(", ")}
- qualityLevel MUST be one of: ${IMAGE_PLAN_QUALITY_LEVELS.join(", ")}
- aspectRatio MUST be one of: ${IMAGE_PLAN_ASPECT_RATIOS.join(", ")}
- Do NOT invent other taskType values.
- HERO_PRODUCT should usually be order 1 with qualityLevel PREMIUM.
- prompts must be detailed English image-generation prompts that preserve product identity (shape, packaging, logo, brand, colors).
- purpose should be short Korean (1 sentence) explaining why the image is needed on the detail page.
- Prefer BACKGROUND_REPLACEMENT / PRODUCT_EDIT when editing the uploaded product photo; use HERO_PRODUCT / PRODUCT_ONLY / LIFESTYLE for new compositions.
- No markdown, no commentary — JSON only.`;
}

function buildUserText(product: ImagePlanProductInput): string {
  return `Plan detail-page images for this product.

상품명: ${product.productName}
카테고리: ${product.category}
${product.brandName ? `브랜드: ${product.brandName}` : ""}
${product.description ? `상품 설명: ${product.description}` : ""}
${product.keyFeatures ? `주요 특징: ${product.keyFeatures}` : ""}
${product.ingredients ? `성분/소재: ${product.ingredients}` : ""}
${product.targetCustomer ? `타겟: ${product.targetCustomer}` : ""}
${product.price != null ? `가격: ${product.price}` : ""}

첨부 이미지 ${product.productImageUrls.length}장을 참고해 imagePlan을 작성하세요.`;
}

export type ClaudeImagePlanResult = {
  plan: ImagePlan;
  model: string;
  claudeCostUsd: number;
  rawText: string;
};

/**
 * Claude Orchestrator — 상품 이미지+정보 → validated imagePlan.
 * 상세페이지 조립은 하지 않는다.
 */
export async function planImagesWithClaude(
  product: ImagePlanProductInput,
  options?: {
    anthropic?: Anthropic;
    model?: string;
    maxTokens?: number;
  },
): Promise<ClaudeImagePlanResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey && !options?.anthropic) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const anthropic = options?.anthropic ?? new Anthropic({ apiKey });
  const model = options?.model ?? DEFAULT_PLAN_MODEL;

  const payloads = await Promise.all(
    product.productImageUrls.slice(0, 4).map((url) => loadImagePayload(url)),
  );

  const imageBlocks = payloads.map((payload) => ({
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: payload.mediaType,
      data: payload.data,
    },
  }));

  const message = await anthropic.messages.create({
    model,
    max_tokens: options?.maxTokens ?? 2500,
    system: buildSystemPrompt(),
    messages: [
      {
        role: "user",
        content: [
          ...imageBlocks,
          { type: "text", text: buildUserText(product) },
        ],
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new ImagePlanValidationError(["Claude returned no text content"]);
  }

  const rawText = textBlock.text;
  let plan: ImagePlan;
  try {
    plan = validateImagePlan(parseImagePlanJson(rawText));
  } catch (firstErr) {
    console.warn(
      "[image-plan] invalid JSON — asking Claude to repair once:",
      firstErr instanceof Error ? firstErr.message : firstErr,
    );
    const repair = await anthropic.messages.create({
      model,
      max_tokens: options?.maxTokens ?? 2500,
      system: buildSystemPrompt(),
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks,
            { type: "text", text: buildUserText(product) },
          ],
        },
        { role: "assistant", content: rawText },
        {
          role: "user",
          content:
            "Your previous response was invalid JSON or failed schema validation. " +
            `Error: ${firstErr instanceof Error ? firstErr.message : String(firstErr)}. ` +
            "Return ONLY corrected valid JSON for imagePlan. No markdown.",
        },
      ],
    });
    const repairText = repair.content.find((b) => b.type === "text");
    if (!repairText || repairText.type !== "text") {
      throw firstErr;
    }
    plan = validateImagePlan(parseImagePlanJson(repairText.text));
    const repairCost = calculateClaudeCost(model, repair.usage);
    logClaudeCost("imagePlanRepair", model, repairCost);
    const totalCost = calculateClaudeCost(model, message.usage) + repairCost;
    return { plan, model, claudeCostUsd: totalCost, rawText: repairText.text };
  }

  const claudeCostUsd = calculateClaudeCost(model, message.usage);
  logClaudeCost("imagePlan", model, claudeCostUsd);

  return { plan, model, claudeCostUsd, rawText };
}
