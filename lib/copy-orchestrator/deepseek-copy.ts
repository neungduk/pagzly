import { COSMETICS_AI_PROMPT, isCosmeticsCategory } from "@/lib/cosmetics-compliance";
import { FOOD_AI_PROMPT, isFoodCategory } from "@/lib/food-compliance";
import {
  COPY_SECTION_TYPES,
  type CopyProductInput,
  type DetailPageCopy,
  type PageStructurePlan,
} from "@/lib/copy-orchestrator/types";
import {
  CopyValidationError,
  detectCopyHallucinations,
  parseJsonLoose,
  validateDetailPageCopy,
} from "@/lib/copy-orchestrator/validate-copy";

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_MODEL = process.env.COPY_DEEPSEEK_MODEL ?? "deepseek-v4-flash";

/** DeepSeek v4 flash 단가 (generate route와 동일 계열) */
function calculateDeepSeekCost(usage: unknown): number {
  const u = usage as {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_cache_hit_tokens?: number;
    prompt_cache_miss_tokens?: number;
  } | null;
  if (!u) return 0;
  const cacheHit = u.prompt_cache_hit_tokens ?? 0;
  const input = u.prompt_tokens ?? 0;
  const cacheMiss = u.prompt_cache_miss_tokens ?? Math.max(0, input - cacheHit);
  const output = u.completion_tokens ?? 0;
  const inputCost = (cacheHit / 1_000_000) * 0.028 + (cacheMiss / 1_000_000) * 0.14;
  const outputCost = (output / 1_000_000) * 0.28;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

function buildAntiHallucinationBlock(product: CopyProductInput): string {
  return `
## 환각 금지 (필수)
- 입력에 없는 효능·효과·인증·수치·판매량·별점·후기·임상 결과를 만들지 마세요.
- 인증 필드가 비어 있으면 식약처/FDA/ISO 등 인증을 언급하지 마세요.
- socialProofPlaceholder는 실제 후기 문장이 아니라 플레이스홀더만 쓰세요.
  예: "[고객 후기 영역 — 실제 후기 연동 예정]"
- % 수치는 keyFeatures/ingredients/certifications/description에 명시된 경우만 사용.
- HTML/CSS/Markdown 태그를 출력하지 마세요. 순수 JSON 텍스트만.
- 가격을 임의로 할인·특가 표현하지 마세요.${
    product.price != null ? ` (가격 사실: ${product.price}원)` : ""
  }
`.trim();
}

function buildDeepSeekPrompt(
  product: CopyProductInput,
  structure: PageStructurePlan,
): string {
  const compliance = isCosmeticsCategory(product.category)
    ? `\n## 화장품 광고 기준\n${COSMETICS_AI_PROMPT}`
    : isFoodCategory(product.category)
      ? `\n## 식품 표시광고 기준\n${FOOD_AI_PROMPT}`
      : "";

  const structureBlock = structure.pageStructure
    .map(
      (s) =>
        `${s.order}. type=${s.type}\n   목적: ${s.purpose}\n   카피 방향: ${s.copyDirection}`,
    )
    .join("\n");

  return `당신은 한국 이커머스 상세페이지 카피라이터입니다.
Claude가 만든 구조/분석/카피 방향을 따라 **최종 카피 JSON**만 작성하세요.
HTML을 절대 생성하지 마세요. content/data만 출력합니다.
${compliance}

${buildAntiHallucinationBlock(product)}

## 상품 정보
상품명: ${product.productName}
카테고리: ${product.category}
${product.brandName ? `브랜드: ${product.brandName}` : ""}
${product.description ? `설명: ${product.description}` : ""}
${product.keyFeatures ? `특징: ${product.keyFeatures}` : ""}
${product.ingredients ? `성분/소재: ${product.ingredients}` : ""}
${product.certifications ? `인증: ${product.certifications}` : "인증: 없음"}
${product.targetCustomer ? `타겟: ${product.targetCustomer}` : ""}
${product.price != null ? `가격: ${product.price}` : ""}

## Claude 분석
상품 분석: ${structure.productAnalysis}
타겟 분석: ${structure.targetCustomerAnalysis}
USP: ${structure.usps.join(" / ")}
톤: ${structure.copyTone}

## Claude 페이지 구조 (순서·type 유지)
${structureBlock}

## 출력 JSON schema (반드시 준수)
{
  "mainHeadline": "string",
  "subHeadline": "string",
  "problemStatement": "string",
  "solutionStatement": "string",
  "benefit": "string",
  "feature": "string",
  "featureDescription": "string",
  "socialProofPlaceholder": "string",
  "faq": [{ "question": "string", "answer": "string" }],
  "cta": "string",
  "sections": [
    { "type": "PROBLEM", "title": "string", "body": "string" }
  ]
}

규칙:
- sections[].type은 다음만 허용: ${COPY_SECTION_TYPES.join(", ")}
- sections는 Claude pageStructure 순서를 따르고, 각 type에 맞는 title/body를 채우세요.
- faq는 2~4개. 입력에 없는 스펙을 답변에 넣지 마세요.
- cta는 짧은 행동 유도 문장.
- JSON만 출력.`;
}

export type DeepSeekCopyResult = {
  copy: DetailPageCopy;
  model: string;
  deepSeekCostUsd: number;
  hallucinationWarnings: string[];
  rawText: string;
};

/**
 * DeepSeek — Claude 구조 기반 실제 카피 생성 (HTML 없음).
 */
export async function generateDetailCopyWithDeepSeek(
  product: CopyProductInput,
  structure: PageStructurePlan,
): Promise<DeepSeekCopyResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not configured");

  const prompt = buildDeepSeekPrompt(product, structure);

  async function callOnce(): Promise<{ rawText: string; usage: unknown }> {
    const response = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You output only valid JSON for e-commerce detail copy. No HTML. No invented claims.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: unknown;
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new Error(data.error?.message ?? `DeepSeek API ${response.status}`);
    }

    const rawText = data.choices?.[0]?.message?.content ?? "";
    if (!rawText.trim()) {
      throw new CopyValidationError(["DeepSeek returned empty content"]);
    }
    return { rawText, usage: data.usage };
  }

  let rawText = "";
  let usage: unknown = null;
  let copy: DetailPageCopy;
  let costAcc = 0;

  try {
    const first = await callOnce();
    rawText = first.rawText;
    usage = first.usage;
    costAcc += calculateDeepSeekCost(usage);
    copy = validateDetailPageCopy(parseJsonLoose(rawText));
  } catch (firstErr) {
    console.warn(
      "[deepseek-copy] invalid — retry once:",
      firstErr instanceof Error ? firstErr.message : firstErr,
    );
    const second = await callOnce();
    rawText = second.rawText;
    usage = second.usage;
    costAcc += calculateDeepSeekCost(usage);
    copy = validateDetailPageCopy(parseJsonLoose(rawText));
  }

  let hallucinationWarnings = detectCopyHallucinations(copy, product);

  // soft sanitize: if social proof looks fabricated, force placeholder
  if (hallucinationWarnings.some((w) => w.includes("socialProofPlaceholder"))) {
    copy = {
      ...copy,
      socialProofPlaceholder: "[고객 후기 영역 — 실제 후기 연동 예정]",
    };
    hallucinationWarnings = detectCopyHallucinations(copy, product);
  }

  const deepSeekCostUsd = Math.round(costAcc * 1_000_000) / 1_000_000;
  console.log(`[cost] deepseek/detailCopy (${DEEPSEEK_MODEL}): $${deepSeekCostUsd.toFixed(4)}`);

  return {
    copy,
    model: DEEPSEEK_MODEL,
    deepSeekCostUsd,
    hallucinationWarnings,
    rawText,
  };
}
