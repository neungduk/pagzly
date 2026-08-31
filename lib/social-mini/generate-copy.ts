/**
 * 인스타·블로그 미니용 DeepSeek 카피 — deepseek-copy.ts 호출 패턴 동일.
 */
import { COSMETICS_AI_PROMPT, isCosmeticsCategory } from "@/lib/cosmetics-compliance";
import { FOOD_AI_PROMPT, isFoodCategory } from "@/lib/food-compliance";
import type { DetailSection, GeneratedCopy } from "@/lib/types/generate";

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_MODEL = process.env.COPY_DEEPSEEK_MODEL ?? "deepseek-v4-flash";

export type SocialMiniCopyJson = {
  headline: string;
  subheadline?: string;
  checklistHeading: string;
  checklistItems: string[];
  sceneHeading: string;
  sceneBody: string;
  usageHeading: string;
  usageSteps: string[];
  ctaBadges: string[];
  description: string;
  features: string[];
  howToUse: string;
  caution: string;
};

function buildPrompt(params: {
  productName: string;
  category: string;
  keyFeatures?: string | null;
  imageAnalysis: string;
}): string {
  const compliance = isCosmeticsCategory(params.category)
    ? `\n## 화장품 광고 기준\n${COSMETICS_AI_PROMPT}`
    : isFoodCategory(params.category)
      ? `\n## 식품 표시광고 기준\n${FOOD_AI_PROMPT}`
      : "";

  return `당신은 한국 이커머스 SNS·블로그 카피라이터입니다.
인스타 피드·티스토리/블로그에 바로 쓸 수 있는 짧은 카피 JSON만 작성하세요.
HTML 금지. 입력에 없는 수치·인증·후기·별점·판매량을 지어내지 마세요.
${compliance}

## 상품
- 이름: ${params.productName}
- 카테고리: ${params.category || "기타"}
${params.keyFeatures ? `- 핵심 특징: ${params.keyFeatures}` : ""}

## 사진 분석
${params.imageAnalysis}

## 출력 JSON 스키마 (키 이름 그대로)
{
  "headline": "후킹 한 줄 (12~24자)",
  "subheadline": "보조 한 줄 (선택)",
  "checklistHeading": "핵심 포인트 제목",
  "checklistItems": ["포인트 3~4개, 각 1문장"],
  "sceneHeading": "연출/사용 장면 제목",
  "sceneBody": "연출 장면 설명 2~3문장",
  "usageHeading": "사용법/활용 제목",
  "usageSteps": ["단계 2~3개"],
  "ctaBadges": ["구매 유도 배지 2~3개 — 과장·허위 금지"],
  "description": "블로그 도입부 2~3문장",
  "features": ["특징 2~3개"],
  "howToUse": "사용/활용 안내 1~2문장",
  "caution": "주의/보관 1문장 (없으면 일반 안내)"
}`;
}

function parseSocialCopy(raw: string): SocialMiniCopyJson {
  const parsed = JSON.parse(raw) as Partial<SocialMiniCopyJson>;
  if (!parsed.headline?.trim() || !parsed.checklistItems?.length) {
    throw new Error("미니 카피 JSON 형식이 올바르지 않습니다.");
  }
  return {
    headline: parsed.headline.trim(),
    subheadline: parsed.subheadline?.trim(),
    checklistHeading: parsed.checklistHeading?.trim() || "핵심 포인트",
    checklistItems: (parsed.checklistItems ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, 4),
    sceneHeading: parsed.sceneHeading?.trim() || "이런 순간에",
    sceneBody: parsed.sceneBody?.trim() || "",
    usageHeading: parsed.usageHeading?.trim() || "이렇게 활용해 보세요",
    usageSteps: (parsed.usageSteps ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, 3),
    ctaBadges: (parsed.ctaBadges ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, 3),
    description: parsed.description?.trim() || parsed.headline.trim(),
    features: (parsed.features ?? parsed.checklistItems ?? []).slice(0, 4).map(String),
    howToUse: parsed.howToUse?.trim() || (parsed.usageSteps ?? []).join(" "),
    caution: parsed.caution?.trim() || "제품 특성에 맞게 사용해 주세요.",
  };
}

export function buildSocialMiniSections(
  copy: SocialMiniCopyJson,
  imageCount: number,
): DetailSection[] {
  const idx = (n: number) => Math.min(n, Math.max(0, imageCount - 1));
  return [
    {
      type: "hero",
      slot: "social_hero",
      headline: copy.headline,
      subheadline: copy.subheadline,
      imageIndex: idx(0),
      badge: copy.ctaBadges[0],
    },
    {
      type: "checklist",
      slot: "social_points",
      heading: copy.checklistHeading,
      items: copy.checklistItems,
    },
    {
      type: "image_text",
      slot: "social_scene",
      heading: copy.sceneHeading,
      body: copy.sceneBody,
      imageIndex: idx(1),
      imagePosition: "right",
      layout: "full",
    },
    {
      type: "usage_steps",
      slot: "social_usage",
      heading: copy.usageHeading,
      steps: copy.usageSteps.length > 0 ? copy.usageSteps : ["상품을 확인하고 일상에 활용해 보세요."],
    },
    {
      type: "cta_price",
      slot: "social_cta",
      price: 0,
      badges: copy.ctaBadges.length > 0 ? copy.ctaBadges : ["지금 만나보세요"],
    },
  ];
}

export async function generateSocialMiniCopy(params: {
  productName: string;
  category: string;
  keyFeatures?: string | null;
  imageAnalysis: string;
  imageCount: number;
}): Promise<{ copy: GeneratedCopy; deepSeekCost: number }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY가 설정되지 않았습니다.");

  const response = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      temperature: 0.45,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Output only valid JSON for social mini copy. No HTML. No invented claims.",
        },
        { role: "user", content: buildPrompt(params) },
      ],
    }),
  });

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message ?? `DeepSeek API ${response.status}`);
  }

  const rawText = data.choices?.[0]?.message?.content ?? "";
  const parsed = parseSocialCopy(rawText);
  const sections = buildSocialMiniSections(parsed, params.imageCount);

  const copy: GeneratedCopy = {
    sections,
    headlines: [parsed.headline],
    description: parsed.description,
    features: parsed.features,
    howToUse: parsed.howToUse,
    caution: parsed.caution,
  };

  const usage = data.usage;
  const deepSeekCost =
    usage != null
      ? Math.round(
          (((usage.prompt_tokens ?? 0) / 1_000_000) * 0.14 +
            ((usage.completion_tokens ?? 0) / 1_000_000) * 0.28) *
            1_000_000,
        ) / 1_000_000
      : 0;

  return { copy, deepSeekCost };
}
