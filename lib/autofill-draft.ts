import { analyzePhotosForAutofillDraft } from "@/lib/autofill-photo-vision";

const DEEPSEEK_MODEL = "deepseek-v4-flash";
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

const DEEPSEEK_COST_PER_MILLION = {
  inputCacheHit: 0.0028,
  inputCacheMiss: 0.14,
  output: 0.28,
} as const;

export type AutofillDraftInput = {
  category: string;
  productName: string;
  brandName?: string | null;
  /** 업로드된 공개 URL — 있으면 폼 단계 Vision 분석 후 초안에 반영 */
  imageUrls?: string[];
};

export type AutofillDraft = {
  keyFeatures: string;
  targetCustomer: string;
};

export type AutofillDraftResult = {
  draft: AutofillDraft;
  cost: number;
  visionCost: number;
  deepseekCost: number;
  visionImageCount: number;
};

function calculateDeepSeekCost(usage: unknown): number {
  if (!usage || typeof usage !== "object") return 0;
  const u = usage as Record<string, number | undefined>;
  const cacheHitTokens = u.prompt_cache_hit_tokens ?? 0;
  const inputTokens = u.input_tokens ?? u.prompt_tokens ?? 0;
  const cacheMissTokens = u.prompt_cache_miss_tokens ?? Math.max(0, inputTokens - cacheHitTokens);
  const outputTokens = u.output_tokens ?? u.completion_tokens ?? 0;
  return (
    (cacheHitTokens / 1_000_000) * DEEPSEEK_COST_PER_MILLION.inputCacheHit +
    (cacheMissTokens / 1_000_000) * DEEPSEEK_COST_PER_MILLION.inputCacheMiss +
    (outputTokens / 1_000_000) * DEEPSEEK_COST_PER_MILLION.output
  );
}

function normalizeDraft(raw: unknown): AutofillDraft {
  if (!raw || typeof raw !== "object") {
    return { keyFeatures: "", targetCustomer: "" };
  }
  const o = raw as Record<string, unknown>;
  return {
    keyFeatures: typeof o.keyFeatures === "string" ? o.keyFeatures.trim() : "",
    targetCustomer: typeof o.targetCustomer === "string" ? o.targetCustomer.trim() : "",
  };
}

const EMPTY_DRAFT: AutofillDraft = { keyFeatures: "", targetCustomer: "" };

async function generateAutofillDraftDeepSeek(
  input: AutofillDraftInput,
  photoVisualNotes: string,
): Promise<{ draft: AutofillDraft; cost: number }> {
  if (!process.env.DEEPSEEK_API_KEY) {
    console.warn("[autofill-draft] DEEPSEEK_API_KEY 없음 — 빈 초안 반환");
    return { draft: EMPTY_DRAFT, cost: 0 };
  }

  const photoBlock = photoVisualNotes.trim()
    ? `

## 사진에서 확인된 특징
${photoVisualNotes.trim()}

위 사진 근거를 **핵심 특징** 초안에 반영하세요. 사진에 없는 내용은 넣지 마세요.`
    : "";

  const prompt = `당신은 이커머스 상품 등록 폼 초안 작성 도우미입니다.
아래 상품명·카테고리${photoVisualNotes.trim() ? "·사진 분석" : ""}만 보고 **초안**을 JSON으로만 반환하세요.

## 입력
- 카테고리: ${input.category}
- 상품명: ${input.productName}
${input.brandName ? `- 브랜드: ${input.brandName}` : ""}${photoBlock}

## 출력 형식 (JSON만)
{
  "keyFeatures": "핵심 특징/강조 포인트 초안 (2~3문장, 한국어)",
  "targetCustomer": "타겟 고객 초안 (1문장, 한국어)"
}

## 필수 규칙
- 사진 분석이 있으면 **보이는 색상·형태·디자인·소재 느낌**을 keyFeatures에 구체적으로 반영.
- 사진 분석이 없으면 상품명·카테고리에서 유추 가능한 **통념 수준** 표현만.
- 구체적 수치(임상 %, 판매량), 성분명, 인증 마크, 원산지, 특허 번호 등 **근거 없는 사실은 절대 만들지 말 것**.
- 성분/소재, 인증/수상 내용은 작성하지 말 것.
- 확신이 없으면 해당 필드를 빈 문자열 ""로 두세요.`;

  try {
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
        temperature: 0.5,
      }),
    });

    const rawBody = await response.text();
    if (!response.ok) {
      console.warn("[autofill-draft] DeepSeek 오류:", rawBody.slice(0, 200));
      return { draft: EMPTY_DRAFT, cost: 0 };
    }

    const data = JSON.parse(rawBody) as {
      choices?: { message?: { content?: string } }[];
      usage?: unknown;
    };
    const cost = calculateDeepSeekCost(data.usage);
    console.log(`[cost] generateAutofillDraft deepseek: $${cost.toFixed(4)}`);

    const content = data.choices?.[0]?.message?.content;
    if (!content) return { draft: EMPTY_DRAFT, cost };

    const parsed = JSON.parse(content) as unknown;
    return { draft: normalizeDraft(parsed), cost };
  } catch (error) {
    console.warn("[autofill-draft] DeepSeek 실패 — 빈 초안 반환", error);
    return { draft: EMPTY_DRAFT, cost: 0 };
  }
}

/** 70차 — 사진 Vision(선택) + DeepSeek 초안. 성분·인증 제외 */
export async function generateAutofillDraft(
  input: AutofillDraftInput,
): Promise<AutofillDraftResult> {
  let photoVisualNotes = "";
  let visionCost = 0;
  let visionImageCount = 0;

  const urls = input.imageUrls?.map((u) => u.trim()).filter(Boolean) ?? [];
  if (urls.length > 0) {
    const vision = await analyzePhotosForAutofillDraft({
      imageUrls: urls,
      productName: input.productName,
      category: input.category,
    });
    photoVisualNotes = vision.visualNotes;
    visionCost = vision.cost;
    visionImageCount = vision.imageCount;
  }

  const { draft, cost: deepseekCost } = await generateAutofillDraftDeepSeek(
    input,
    photoVisualNotes,
  );

  return {
    draft,
    cost: visionCost + deepseekCost,
    visionCost,
    deepseekCost,
    visionImageCount,
  };
}

/** @deprecated generateAutofillDraft 사용 */
export const generateAutofillDraftFromPhotos = generateAutofillDraft;
