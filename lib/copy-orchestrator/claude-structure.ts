import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import { calculateClaudeCost, logClaudeCost } from "@/lib/claude-cost";
import { COSMETICS_AI_PROMPT, isCosmeticsCategory } from "@/lib/cosmetics-compliance";
import { FOOD_AI_PROMPT, isFoodCategory } from "@/lib/food-compliance";
import {
  COPY_SECTION_TYPES,
  PAGE_STRUCTURE_MAX_SECTIONS,
  PAGE_STRUCTURE_MIN_SECTIONS,
  type CopyProductInput,
  type PageStructurePlan,
} from "@/lib/copy-orchestrator/types";
import {
  CopyValidationError,
  parseJsonLoose,
  validatePageStructurePlan,
} from "@/lib/copy-orchestrator/validate-copy";

const DEFAULT_MODEL = process.env.COPY_STRUCTURE_CLAUDE_MODEL ?? "claude-sonnet-5";

type ImagePayload = {
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  data: string;
};

async function loadImagePayload(source: string): Promise<ImagePayload> {
  if (source.startsWith("data:")) {
    const match = source.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/i);
    if (!match) throw new Error("Unsupported data URL");
    return {
      mediaType: match[1]!.toLowerCase() as ImagePayload["mediaType"],
      data: match[2]!,
    };
  }
  if (source.startsWith("http://") || source.startsWith("https://")) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`fetch image ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0]!.trim().toLowerCase();
    const mediaType = (
      ct === "image/png" || ct === "image/gif" || ct === "image/webp" ? ct : "image/jpeg"
    ) as ImagePayload["mediaType"];
    return { mediaType, data: buf.toString("base64") };
  }
  if (!fs.existsSync(source)) throw new Error(`image not found: ${source}`);
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

export function buildStructureSystemPrompt(product: CopyProductInput): string {
  return buildSystemPrompt(product);
}

function buildSystemPrompt(product: CopyProductInput): string {
  const compliance = isCosmeticsCategory(product.category)
    ? `\n${COSMETICS_AI_PROMPT}`
    : isFoodCategory(product.category)
      ? `\n${FOOD_AI_PROMPT}`
      : "";

  return `You are a Korean e-commerce detail-page strategist (NOT a copywriter).
Your job is analysis + page structure only. Do NOT write final marketing copy sentences.
Do NOT invent certifications, clinical results, sales numbers, reviews, or medical claims.${compliance}

Return ONLY valid JSON:
{
  "productAnalysis": "...",
  "targetCustomerAnalysis": "...",
  "usps": ["..."],
  "copyTone": "...",
  "pageStructure": [
    {
      "order": 1,
      "type": "HERO",
      "purpose": "섹션 목적 (한국어)",
      "copyDirection": "카피 작성 방향 가이드 (한국어, 최종 문장 쓰지 말 것)"
    }
  ]
}

Rules:
- pageStructure length ${PAGE_STRUCTURE_MIN_SECTIONS}–${PAGE_STRUCTURE_MAX_SECTIONS}
- type MUST be one of: ${COPY_SECTION_TYPES.join(", ")}
- Always include HERO early and CTA near the end
- Include PROBLEM and SOLUTION when relevant
- SOCIAL_PROOF purpose should say placeholder only (no fabricated reviews)
- Base USP only on provided product fields and visible product image facts
- Keep purpose and copyDirection under 120 Korean characters each
- Keep productAnalysis / targetCustomerAnalysis under 280 characters each
- usps: 3–5 short phrases
- copyTone (필수·구체화): 한 단어 톤("친근함")으로 끝내지 말 것.
  상품 사실(성분·질감·사용 장면·카테고리)에 근거한 **스타일 앵커 2~3개**를 쓰세요.
  각 앵커는 카피라이터가 문장에 바로 쓸 수 있는 감각 어휘·장면이어야 합니다.
  예: 미스트 → "가볍다 / 산뜻하다 / 화장 위 뿌리는 순간" ;
  세럼 → "촉촉한 층 / 흡수 후 보습막 / 아침 스킨케어 루틴" ;
  식품 → "한 스푼의 고소함 / 아침 테이블 / 담백한 뒷맛".
  추상 형용사만 나열("프리미엄·고급·특별한")하는 copyTone은 금지.
- Valid compact JSON only — no markdown, no trailing commas, no HTML`;
}

function buildUserText(product: CopyProductInput): string {
  return `Analyze and plan detail-page structure.

상품명: ${product.productName}
카테고리: ${product.category}
${product.brandName ? `브랜드: ${product.brandName}` : ""}
${product.description ? `설명: ${product.description}` : ""}
${product.keyFeatures ? `특징: ${product.keyFeatures}` : ""}
${product.ingredients ? `성분/소재: ${product.ingredients}` : ""}
${product.certifications ? `인증(입력된 것만): ${product.certifications}` : "인증: (입력 없음 — 지어내지 말 것)"}
${product.targetCustomer ? `타겟: ${product.targetCustomer}` : ""}
${product.price != null ? `가격: ${product.price}` : ""}`;
}

export type ClaudeStructureResult = {
  structure: PageStructurePlan;
  model: string;
  claudeCostUsd: number;
  rawText: string;
};

/**
 * Claude Orchestrator — 상품 분석 + 상세페이지 구조.
 * 최종 카피는 DeepSeek가 작성한다.
 */
export async function planPageStructureWithClaude(
  product: CopyProductInput,
  options?: { anthropic?: Anthropic; model?: string; maxTokens?: number },
): Promise<ClaudeStructureResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey && !options?.anthropic) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const anthropic = options?.anthropic ?? new Anthropic({ apiKey });
  const model = options?.model ?? DEFAULT_MODEL;

  const imageUrls = (product.productImageUrls ?? []).slice(0, 3);
  const payloads = await Promise.all(imageUrls.map((u) => loadImagePayload(u)));
  const imageBlocks = payloads.map((p) => ({
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: p.mediaType,
      data: p.data,
    },
  }));

  const message = await anthropic.messages.create({
    model,
    max_tokens: options?.maxTokens ?? 1800,
    system: buildSystemPrompt(product),
    messages: [
      {
        role: "user",
        content: [...imageBlocks, { type: "text", text: buildUserText(product) }],
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new CopyValidationError(["Claude returned no text"]);
  }

  let rawText = textBlock.text;
  let structure: PageStructurePlan;
  let extraCost = 0;

  try {
    structure = validatePageStructurePlan(parseJsonLoose(rawText));
  } catch (firstErr) {
    console.warn(
      "[copy-structure] invalid JSON — repair once:",
      firstErr instanceof Error ? firstErr.message : firstErr,
    );
    const repair = await anthropic.messages.create({
      model,
      max_tokens: options?.maxTokens ?? 1800,
      system: buildSystemPrompt(product),
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks,
            {
              type: "text",
              text:
                `${buildUserText(product)}\n\n` +
                "Regenerate the FULL structure JSON from scratch. " +
                "Strict valid JSON only. Short fields. No markdown fences.",
            },
          ],
        },
        {
          role: "user",
          content:
            `Previous attempt failed: ${firstErr instanceof Error ? firstErr.message : String(firstErr)}. ` +
            "Return ONLY one valid JSON object.",
        },
      ],
    });
    const repairText = repair.content.find((b) => b.type === "text");
    if (!repairText || repairText.type !== "text") throw firstErr;
    rawText = repairText.text;
    try {
      structure = validatePageStructurePlan(parseJsonLoose(rawText));
    } catch (repairErr) {
      console.error(
        "[copy-structure] repair still invalid. snippet:",
        rawText.slice(0, 500),
      );
      throw repairErr;
    }
    extraCost = calculateClaudeCost(model, repair.usage);
    logClaudeCost("copyStructureRepair", model, extraCost);
  }

  const claudeCostUsd = calculateClaudeCost(model, message.usage) + extraCost;
  logClaudeCost("copyStructure", model, claudeCostUsd);

  return { structure, model, claudeCostUsd, rawText };
}
