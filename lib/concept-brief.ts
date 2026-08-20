/**
 * 상품별 시각 컨셉 브리프 — 이후 배경/장식/카피/아이콘 생성 프롬프트에 공통 주입.
 */

import { resolvePhotographyTemplate } from "@/lib/backdrop-prompt-templates";

const DEEPSEEK_MODEL = "deepseek-v4-flash";
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

const DEEPSEEK_COST_PER_MILLION = {
  inputCacheHit: 0.0028,
  inputCacheMiss: 0.14,
  output: 0.28,
} as const;

export type ConceptBrief = {
  theme: string;
  motif_keywords: string[];
  mood: string;
  /** flux-fill-dev / flux-schnell 배경·장식 프롬프트용 영문 힌트 */
  backdrop_hint: string;
  /** DeepSeek 카피 톤 가이드 (한국어) */
  copy_tone: string;
  /** 장식 그래픽 생성용 영문 프롬프트 조각 */
  decor_prompt: string;
  /** 원형 배지 아이콘 스타일 (영문) */
  icon_style: string;
};

export type ConceptBriefInput = {
  category: string;
  productName: string;
  brandName?: string | null;
  price?: number;
  keyFeatures?: string | null;
  ingredients?: string | null;
  targetCustomer?: string | null;
  referenceAnalysis?: { colorHex: string[]; moodKeywords: string[] };
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

const FALLBACK_BY_CATEGORY: Record<string, ConceptBrief> = {
  "화장품/뷰티": {
    theme: "수분/물방울",
    motif_keywords: ["물방울", "청량감", "촉촉함", "은은한 빛"],
    mood: "시원하고 맑은",
    backdrop_hint: "soft side lighting, diffused window light, shallow depth of field, condensation droplets on glass, dewy marble sheen, empty hydration studio, no product",
    copy_tone: "촉촉하고 산뜻한 수분 케어 톤. 과장 없이 피부 결에 대한 공감.",
    decor_prompt: "soft side lighting, condensation droplets on glass, dewy surface sheen, no text, no product",
    icon_style: "minimal water droplet and sparkle badge icon, soft circular frame",
  },
};

function fallbackBrief(category: string): ConceptBrief {
  return FALLBACK_BY_CATEGORY[category] ?? {
    theme: "클린 스튜디오",
    motif_keywords: ["부드러운 빛", "미니멀", "자연스러운 질감"],
    mood: "깔끔하고 신뢰감 있는",
    backdrop_hint: "clean minimal studio with soft natural light and subtle texture",
    copy_tone: "명확하고 신뢰감 있는 상품 설명 톤.",
    decor_prompt: "soft light rays and minimal abstract shapes",
    icon_style: "minimal flat circular badge icon with simple geometric symbol",
  };
}

function normalizeBrief(raw: unknown, category: string): ConceptBrief {
  const base = fallbackBrief(category);
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const motifs = Array.isArray(o.motif_keywords)
    ? o.motif_keywords.map(String).filter(Boolean).slice(0, 6)
    : base.motif_keywords;
  return {
    theme: String(o.theme ?? base.theme),
    motif_keywords: motifs.length > 0 ? motifs : base.motif_keywords,
    mood: String(o.mood ?? base.mood),
    backdrop_hint: String(o.backdrop_hint ?? base.backdrop_hint),
    copy_tone: String(o.copy_tone ?? base.copy_tone),
    decor_prompt: String(o.decor_prompt ?? base.decor_prompt),
    icon_style: String(o.icon_style ?? base.icon_style),
  };
}

/** DeepSeek으로 상품별 시각 컨셉 브리프 생성 */
export async function generateConceptBrief(
  input: ConceptBriefInput,
): Promise<{ brief: ConceptBrief; cost: number }> {
  if (!process.env.DEEPSEEK_API_KEY) {
    const brief = fallbackBrief(input.category);
    console.warn("[concept-brief] DEEPSEEK_API_KEY 없음 — 카테고리 폴백 사용");
    return { brief, cost: 0 };
  }

  const prompt = `당신은 이커머스 상세페이지 아트 디렉터입니다.
아래 상품 정보를 바탕으로, 페이지 전체에 일관되게 적용할 **시각 컨셉 브리프**를 JSON으로만 반환하세요.

## 상품 정보
- 카테고리: ${input.category}
- 상품명: ${input.productName}
${input.brandName ? `- 브랜드: ${input.brandName}` : ""}
${input.price ? `- 판매가: ₩${input.price.toLocaleString()}` : ""}
${input.keyFeatures ? `- 핵심 특징: ${input.keyFeatures}` : ""}
${input.ingredients ? `- 성분/소재: ${input.ingredients}` : ""}
${input.targetCustomer ? `- 타겟: ${input.targetCustomer}` : ""}
${input.referenceAnalysis ? `
## 레퍼런스 이미지 분석 (visual concept에 이 색상/무드를 우선 반영)
- 주요 색상: ${input.referenceAnalysis.colorHex.join(", ")}
- 무드 키워드: ${input.referenceAnalysis.moodKeywords.join(", ")}
카테고리 fallback보다 레퍼런스 무드를 우선하되, 상품 정보와 모순되면 안 됩니다.` : ""}

## 출력 형식 (JSON만, 다른 텍스트 금지)
{
  "theme": "한국어 테마명 (예: 수분/물방울, 따뜻한 원재료, 테크 미니멀)",
  "motif_keywords": ["한국어 또는 영문 모티프 3~5개"],
  "mood": "한국어 무드 한 줄 (예: 시원하고 맑은)",
  "backdrop_hint": "영문 — 촬영 용어로 조명/구도/질감을 구체적으로 (soft side lighting, shallow depth of field, condensation on glass 등). 추상어 moist/luxurious만 쓰지 말 것. product 없음",
  "copy_tone": "한국어 — 카피라이터 톤 가이드",
  "decor_prompt": "영문 — 물방울/미스트 등도 촬영 용어로 (no text, no product)",
  "icon_style": "영문 — 원형 배지 아이콘 스타일 (flat, minimal, single motif)"
}

카테고리에 맞는 전문 상세페이지 수준의 통일된 컨셉을 제안하세요.
화장품/뷰티면 theme은 아래 중 하나에 가깝게 고르세요 (여러 개를 섞지 말 것).
- 수분/보습 — 물방울, 촉촉, 맑은. 조명: soft side lighting, diffused light. 질감: 유리 결로, 표면 반사광
- 진정/쿨링 — 민트, 시원, 미스트 (따뜻·골드·온기 표현 금지). 조명: cool diffused high-key
- 영양/농축 — 오일, 골드, 크리미. 조명: soft side lighting + warm bounce
- 클렌징 — 거품, 버블, 세안. 조명: bright diffused high-key
backdrop_hint와 decor_prompt는 영문만, 상품·텍스트·로고 없이.`;

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
        temperature: 0.6,
      }),
    });

    const rawBody = await response.text();
    if (!response.ok) {
      console.warn("[concept-brief] DeepSeek 오류, 폴백 사용:", rawBody.slice(0, 200));
      return { brief: fallbackBrief(input.category), cost: 0 };
    }

    const data = JSON.parse(rawBody) as {
      choices?: { message?: { content?: string } }[];
      usage?: unknown;
    };
    const cost = calculateDeepSeekCost(data.usage);
    console.log(`[cost] generateConceptBrief: $${cost.toFixed(4)}`);

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return { brief: fallbackBrief(input.category), cost };
    }

    const parsed = JSON.parse(content) as unknown;
    const brief = normalizeBrief(parsed, input.category);
    console.log(`[concept-brief] theme="${brief.theme}" motifs=${brief.motif_keywords.join(",")}`);
    return { brief, cost };
  } catch (error) {
    console.warn("[concept-brief] 생성 실패, 폴백 사용", error);
    return { brief: fallbackBrief(input.category), cost: 0 };
  }
}

/** 이미지/카피 프롬프트에 주입할 공통 컨셉 문장 */
export function formatConceptPromptBlock(brief: ConceptBrief): string {
  const photography = resolvePhotographyTemplate(brief);
  return `Visual concept theme: "${brief.theme}". Mood: ${brief.mood}. Motif elements: ${brief.motif_keywords.join(", ")}. ${brief.backdrop_hint}. Photography: lighting=${photography.lighting}; composition=${photography.composition}; texture=${photography.texture}`;
}

/** DeepSeek 카피 프롬프트용 한국어 블록 */
export function formatConceptCopyBlock(brief: ConceptBrief): string {
  return `## 시각 컨셉 (페이지 전체 일관성 — 카피도 이 톤을 따르세요)
- 테마: ${brief.theme}
- 무드: ${brief.mood}
- 모티프: ${brief.motif_keywords.join(", ")}
- 카피 톤: ${brief.copy_tone}
헤드라인·본문·배지 문구가 위 컨셉과 시각적으로 같은 세계관을 유지하도록 작성하세요.
카피는 이미지 연출과 모순되면 안 됩니다. 예: 쿨링/진정 테마인데 따뜻·온기·골드 카피,
수분 테마인데 오일리·번들거림, 클렌징 테마인데 보습 도포를 주효능처럼 쓰기.`;
}
