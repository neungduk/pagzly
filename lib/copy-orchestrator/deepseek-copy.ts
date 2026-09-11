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
  detectAiTellOveruse,
  detectCopyHallucinations,
  detectGenericCliches,
  detectSentenceLengthMonotony,
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

/** 116차 — 문체 루브릭 (환각 금지와 별도). dry-run/스모크용 export */
export function buildStyleRubricBlock(): string {
  return `
## 문체 루브릭 (톤·리듬)
- 헤드라인은 짧게: mainHeadline은 한국어 기준 대략 25자 내외, 한 문장에 개념 하나만. 줄바꿈해도 리듬이 살아야 함.
- mainHeadline은 가능하면 problemStatement와 대구를 이루게: "불편함(문제) → 해결" 구조를 한 문장 또는 줄바꿈된 두 구절로. 예: "매번 반복되던 OOO / 이제 한 번이면 끝" 형태. 단, problemStatement/solutionStatement가 입력 keyFeatures/description에서 뽑아낼 근거가 없으면 억지로 문제를 지어내지 말고 기존처럼 담백한 설명형 헤드라인으로 두세요 (문제 있는 제품만 대비형, 없으면 강제 금지). 경쟁사·타 제품을 겨냥한 불안 조성·폄훼는 금지.
- 추상적 형용사 대신 구체적 어휘: "최고의", "완벽한", "특별한", "놀라운" 같은 빈 형용사보다, 입력된 사실(성분/질감/사용 장면)과 Claude copyTone 앵커에서 나온 구체적 단어를 쓰세요.
- 문장 리듬 변화: 같은 길이의 문장을 반복하지 말고 짧은 문장과 긴 문장을 섞으세요.
- 진부한 AI-카피 클리셰 금지 (표현만 바꿀 것, 사실 관계는 유지):
  "이제 고민은 그만", "당신을 위한 선택", "완벽한 선택", "새로운 시작", "여기 있습니다",
  "지금 바로 만나보세요", "당신의 피부를 위한", "더 이상 망설이지 마세요", "오늘부터 달라집니다",
  "경험해보세요", "만나보세요"를 CTA/헤드라인뿐 아니라 본문(problemStatement·solutionStatement·
  benefit·featureDescription·sections[].body·faq[].answer)에도 쓰지 마세요.
- 163차 — "AI가 쓴 티"가 나는 접속어·형용사 남용 금지: "또한", "이처럼", "이러한", "이를 통해",
  "따라서", "한편", "이를", "마침내" 같은 접속 부사를 문장 서두에 습관적으로 반복하지 마세요
  (한 번 정도는 괜찮지만, 여러 섹션이 같은 접속어로 시작하면 기계적으로 보입니다). 문장은
  접속어 없이 바로 이어지거나, 매번 다른 방식으로 연결하세요. "다양한", "중요한", "효과적인",
  "기반으로", "관련된" 같은 두루뭉술한 형용사·표현도 반복해서 쓰지 말고, 대신 입력에 있는
  구체적인 사실(성분명·수치·장면)로 바로 서술하세요.
- 164차 — 문장 길이를 의식적으로 들쭉날쭉하게: problemStatement·solutionStatement·benefit·
  featureDescription·sections[].body·faq[].answer 같은 본문에서, 문장 길이가 전부 비슷하면
  기계적으로 읽힙니다("AI가 쓴 글이 어색한 이유는 문장 길이가 다 비슷해서다"). 아주 짧은
  한 마디(예: "그게 다예요.")와 조금 긴 설명 문장을 의도적으로 섞어서, 사람이 숨 쉬듯 강약을
  주며 쓴 것처럼 만드세요. 모든 문장을 비슷한 글자 수·비슷한 구조("~습니다"로만 끝나는 식)로
  맞추지 마세요.
- Claude가 준 copyTone 앵커(감각 어휘·장면)를 헤드라인·본문에 실제로 반영하세요.
- ingredients/keyFeatures/certifications 중 "무첨가", "무향", "파라벤 프리", "알코올 프리",
  "free" 등 안전/제외 관련 표현이 입력에 literal하게 있으면, checklist 또는 feature_callout 중
  하나에 "불필요한 ○○을 넣지 않았습니다" 식의 짧은 안심 문장을 1개만 반영해도 됩니다.
  입력에 없는 성분·위험 요소를 언급하거나, 타 제품·경쟁사를 겨냥한 비교·폄훼·불안 조성은
  절대 금지합니다. 입력에 해당 표현이 literal하게 없으면 이 항목은 시도하지 마세요 — 억지로
  "무첨가일 것 같다"는 식으로 추정하지 마세요.
`.trim();
}

export function buildDeepSeekPrompt(
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

${buildStyleRubricBlock()}

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
  clicheWarnings: string[];
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
              "You output only valid JSON for e-commerce detail copy. No HTML. No invented claims. Avoid generic AI marketing clichés.",
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
  let clicheWarnings: string[] = [];

  // 163차 — 마케팅 클리셰 + "AI 티" 접속어/형용사 남용을 함께 판단.
  // 164차 — 문장 길이 균일성(리듬)도 같은 합산 게이트에 포함.
  // 성격이 다른 문제라 별도 함수로 탐지하되, 재시도 여부는 합산 개수로 결정.
  const acceptOrThrowCliches = (candidate: DetailPageCopy) => {
    const clicheHits = detectGenericCliches(candidate);
    const aiTellHits = detectAiTellOveruse(candidate);
    const monotonyHits = detectSentenceLengthMonotony(candidate);
    const hits = [...clicheHits, ...aiTellHits, ...monotonyHits];
    if (hits.length >= 2) {
      throw new CopyValidationError([
        `generic clichés / AI-tell overuse (≥2): ${hits.join(" | ")}`,
      ]);
    }
    return hits;
  };

  try {
    const first = await callOnce();
    rawText = first.rawText;
    usage = first.usage;
    costAcc += calculateDeepSeekCost(usage);
    copy = validateDetailPageCopy(parseJsonLoose(rawText));
    clicheWarnings = acceptOrThrowCliches(copy);
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
    // 재시도 한도 소진 — 클리셰/AI-tell/문장 리듬 문제가 남아도 추가 호출 없이 경고만
    clicheWarnings = [
      ...detectGenericCliches(copy),
      ...detectAiTellOveruse(copy),
      ...detectSentenceLengthMonotony(copy),
    ];
    if (clicheWarnings.length >= 2) {
      console.warn(
        `[deepseek-copy] clichés/AI-tell remain after retry: ${clicheWarnings.join(" | ")}`,
      );
    }
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
    clicheWarnings,
    rawText,
  };
}
