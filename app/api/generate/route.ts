import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  COSMETICS_AI_PROMPT,
  isCosmeticsCategory,
  reviewCosmeticsCopy,
} from "@/lib/cosmetics-compliance";
import { FOOD_AI_PROMPT, isFoodCategory, reviewFoodCopy } from "@/lib/food-compliance";
import type { DetailSection, GeneratedCopy, ProductInput } from "@/lib/types/generate";
import { createClient } from "@/lib/supabase/server";
import { extractProductTheme } from "@/lib/color-extract";
import { getSlotImageRatio, getSlotTemplate, type SlotDefinition } from "@/lib/section-templates";
import { extractUrlSummary, type UrlSummaryResult } from "@/lib/url-crawler";
import { buildQAFixPrompt, runDetailPageQA } from "@/lib/detail-page-qa";
import { formatConceptCopyBlock, type ConceptBrief } from "@/lib/concept-brief";
import { generateConceptIcons } from "@/lib/concept-icons";
import { getCategoryTheme } from "@/lib/category-theme";

const CLAUDE_MODEL = "claude-sonnet-5";
const DEEPSEEK_MODEL = "deepseek-v4-flash";
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

// DeepSeek 토큰당 단가(USD / 1M tokens). 공식 pricing 문서 기준(2026-08-14 확인).
const DEEPSEEK_COST_PER_MILLION = {
  inputCacheHit: 0.0028,
  inputCacheMiss: 0.14,
  output: 0.28,
} as const;

function calculateDeepSeekCost(usage: unknown): number {
  if (!usage || typeof usage !== "object") return 0;
  const u = usage as Record<string, number | undefined>;

  const cacheHitTokens = u.prompt_cache_hit_tokens ?? 0;
  const inputTokens = u.input_tokens ?? u.prompt_tokens ?? 0;
  // cache_miss 토큰 수를 응답이 별도로 안 주면, 전체 입력 토큰에서 히트분을
  // 빼서 근사한다.
  const cacheMissTokens = u.prompt_cache_miss_tokens ?? Math.max(0, inputTokens - cacheHitTokens);
  const outputTokens = u.output_tokens ?? u.completion_tokens ?? 0;

  const inputCost =
    (cacheHitTokens / 1_000_000) * DEEPSEEK_COST_PER_MILLION.inputCacheHit +
    (cacheMissTokens / 1_000_000) * DEEPSEEK_COST_PER_MILLION.inputCacheMiss;
  const outputCost = (outputTokens / 1_000_000) * DEEPSEEK_COST_PER_MILLION.output;

  return inputCost + outputCost;
}

async function fetchImageAsBase64(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`이미지를 불러올 수 없습니다: ${url}`);
  }

  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const mediaType = contentType.includes("png") ? "image/png" : "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());

  return {
    mediaType: mediaType as "image/jpeg" | "image/png",
    data: buffer.toString("base64"),
  };
}

async function analyzeImagesWithClaude(
  anthropic: Anthropic,
  imageUrls: string[],
  productInfo: ProductInput,
) {
  const imageBlocks = await Promise.all(
    imageUrls.map(async (url) => {
      const { mediaType, data } = await fetchImageAsBase64(url);
      return {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: mediaType,
          data,
        },
      };
    }),
  );

  const isCosmetics = isCosmeticsCategory(productInfo.category);
  const cosmeticsNote = isCosmetics
    ? `\n\n${COSMETICS_AI_PROMPT}\n분석 시에도 의학적 효능·치료 표현은 사용하지 마세요.`
    : "";

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: [
          ...imageBlocks,
          {
            type: "text",
            text: `당신은 이커머스 상품 분석 전문가입니다. 첨부된 상품 사진을 분석해 주세요.

상품명: ${productInfo.productName}
카테고리: ${productInfo.category}
${productInfo.brandName ? `브랜드: ${productInfo.brandName}` : ""}
${productInfo.keyFeatures ? `사용자 입력 특징: ${productInfo.keyFeatures}` : ""}
${productInfo.ingredients ? `성분/소재: ${productInfo.ingredients}` : ""}

다음 항목을 한국어로 상세히 분석해 주세요:
1. 제품 색상 (정확한 색상명)
2. 질감/소재 (보이는 질감, 마감, 재질)
3. 시각적 특징 (형태, 디자인, 패턴, 포장 등)
4. 전반적인 인상 및 타겟 고객에게 어필할 포인트
5. 상세페이지에 강조하면 좋을 USP${cosmeticsNote}

각 사진이 몇 번째로 첨부되었는지(0부터 시작하는 순서)도 함께 기억해 두세요.
이후 상세페이지 섹션을 구성할 때 어떤 사진이 어떤 용도(전체샷/질감클로즈업/사용장면 등)로
적합한지 판단하는 데 사용됩니다.`,
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude Vision 분석 결과를 받지 못했습니다.");
  }

  return textBlock.text;
}

// 섹션 타입별 JSON 필드 형식. slot 값은 템플릿이 지정한 이름을 그대로 써야 한다.
const SECTION_TYPE_SHAPES: Record<DetailSection["type"], string> = {
  hero: `{ type: "hero", slot, headline, subheadline?, imageIndex }`,
  checklist: `{ type: "checklist", slot, heading, items[] }`,
  image_text: `{ type: "image_text", slot, heading, body, imageIndex, imagePosition: "left"|"right" }`,
  spec_table: `{ type: "spec_table", slot, heading, rows: [{label, value}] }`,
  usage_steps: `{ type: "usage_steps", slot, heading, steps[] }`,
  gallery: `{ type: "gallery", slot, heading, imageIndexes[] }`,
  caution: `{ type: "caution", slot, heading, body }`,
  cta_price: `{ type: "cta_price", slot, price, targetCustomer?, badges[]? }`,
  comparison_table: `{ type: "comparison_table", slot, heading, columns: [string,string], rows: [{label, values: [string,string]}] }`,
  color_variation: `{ type: "color_variation", slot, heading, options: [{label, colorHex, imageIndex}] }`,
};

// 카테고리별 고정 슬롯 순서를 프롬프트용 텍스트로 변환한다. AI는 레이아웃을
// 설계하지 않고, 이 순서/타입 그대로 콘텐츠(카피/이미지 선택)만 채운다.
function getAidaPhase(def: SlotDefinition): string {
  switch (def.type) {
    case "hero":
      return "AIDA-A (Attention): 시선을 끄는 훅 — 질문·숫자·강렬한 한 줄 헤드라인";
    case "checklist":
      return "AIDA-I (Interest): 타겟의 문제·니즈·불편을 구체적으로 환기";
    case "cta_price":
      return "AIDA-A (Action): 지금 구매/시도를 유도하는 명확한 행동 문구";
    case "usage_steps":
      return "AIDA-D (Desire): 사용하면 얻는 구체적 이득·기대 결과";
    case "caution":
    case "spec_table":
      return "신뢰 보조 (과장 없이 사실만, AIDA 흐름 유지)";
    default:
      return "AIDA-D (Desire): 제품이 주는 구체적 이득·차별점·사용 장면";
  }
}

function buildSlotInstructions(template: SlotDefinition[]): string {
  return template
    .map((def, i) => {
      const ratio = getSlotImageRatio(def);
      const ratioNote = ratio === "aspect-square" && !SECTION_TYPE_SHAPES[def.type].includes("imageIndex")
        ? ""
        : ` (이미지 비율 ${ratio.replace("aspect-[", "").replace("]", "").replace("aspect-square", "1:1")})`;
      const repeatNote = def.repeatable
        ? ` — 이 슬롯은 연속해서 ${def.minCount ?? 1}~${def.maxCount ?? 1}개까지 만들 수 있습니다. 각 섹션의 slot 값은 "${def.slot}"로 동일하게 유지하세요.`
        : "";
      const countNote =
        !def.repeatable && (def.minCount || def.maxCount)
          ? ` (이미지 ${def.minCount ?? def.maxCount}~${def.maxCount ?? def.minCount}장)`
          : "";
      const aidaNote = getAidaPhase(def);
      return `${i + 1}. slot="${def.slot}" / type="${def.type}" / ${def.required ? "필수" : "선택(불필요하면 생략 가능, 순서는 유지)"} — ${def.note}${ratioNote}${countNote}${repeatNote}\n   AIDA 역할: ${aidaNote}\n   형식: ${SECTION_TYPE_SHAPES[def.type]}`;
    })
    .join("\n");
}

// 자동 수집한 URL 요약을 프롬프트 블록으로 만든다. 실패한 경우 실패 사실을
// AI에게도 명시해 "URL은 있는데 내용이 없어" 혼란스러워하다 빈 응답을
// 내놓는 상황(과거 "DeepSeek API 응답이 비어 있습니다" 원인)을 막고, 대신
// notices에 사유를 남겨 호출부가 사용자에게 안내할 수 있게 한다.
function buildUrlReferenceBlock(
  label: string,
  result: UrlSummaryResult | null,
  notices: string[],
): string {
  if (!result) return "";

  if (result.ok) {
    return `\n\n## ${label} 참고 자료 (자동 수집 — 부정확할 수 있으니 표현을 그대로 베끼지 말고, 이 상품만의 차별화 포인트(USP)를 찾는 용도로만 참고)\n제목: ${result.title || "(제목 없음)"}\n내용: ${result.excerpt || "(본문 없음)"}`;
  }

  notices.push(`${label}(${result.url}) 자동 분석 실패 — ${result.reason} 이 URL은 자동 분석이 어렵습니다.`);
  return `\n\n## ${label} 참고 자료\n(입력된 URL은 자동으로 분석하지 못했습니다. 이 URL 내용은 추측하지 말고, 상품 정보만으로 분석하세요.)`;
}

// 1688/도매꾹은 봇 차단이 심해 크롤링이 자주 실패하므로, URL이 아니라
// 판매자가 원본 페이지에서 직접 복사해 붙여넣은 텍스트(상품명/스펙/설명)를
// 그대로 프롬프트에 넣는다. 크롤링이 아니라 사용자 입력이라 실패할 일이
// 없어 notices에 남길 것도 없다.
function buildPastedTextBlock(label: string, text: string | null | undefined): string {
  if (!text || !text.trim()) return "";
  return `\n\n## ${label} 참고 자료 (판매자가 원본 페이지에서 직접 붙여넣은 텍스트 — 표현을 그대로 베끼지 말고, 이 상품만의 차별화 포인트(USP)를 찾는 용도로만 참고)\n${text.trim()}`;
}

async function generateCopyWithDeepSeek(
  productInfo: ProductInput,
  imageAnalysis: string,
  imageCount: number,
  qaFixAppendix = "",
): Promise<{ copy: GeneratedCopy; cost: number; notices: string[] }> {
  const isCosmetics = isCosmeticsCategory(productInfo.category);
  const isFood = isFoodCategory(productInfo.category);
  const cosmeticsGuide = isCosmetics
    ? `\n\n## 식약처 화장품 광고 기준 (필수)\n${COSMETICS_AI_PROMPT}`
    : "";
  const foodGuide = isFood ? `\n\n## 식품 표시광고 기준 (필수)\n${FOOD_AI_PROMPT}` : "";

  const template = getSlotTemplate(productInfo.category);
  const slotInstructions = buildSlotInstructions(template);

  const competitorResult = productInfo.competitorUrl
    ? await extractUrlSummary(productInfo.competitorUrl)
    : null;

  const notices: string[] = [];
  const competitorBlock = buildUrlReferenceBlock("경쟁사 페이지", competitorResult, notices);
  const wholesaleBlock = buildPastedTextBlock(
    "위탁/도매 원본 상품 정보(1688·도매꾹)",
    productInfo.wholesaleUrl,
  );

  const conceptBlock = productInfo.conceptBrief
    ? `\n\n${formatConceptCopyBlock(productInfo.conceptBrief)}`
    : "";

  const prompt = `당신은 한국 이커머스 상세페이지 기획자 겸 카피라이터입니다.
이 서비스는 레이아웃을 AI가 즉흥적으로 설계하지 않고, 카테고리별로 검증된
"고정 슬롯 순서" 안에 콘텐츠(카피/이미지 선택)만 채우는 방식으로 운영됩니다.
아래 슬롯 목록의 순서와 종류를 절대 바꾸지 말고, 각 슬롯에 이 상품에 맞는
카피와 이미지 인덱스를 채우세요. 슬롯을 새로 만들거나 순서를 섞지 마세요.

## AIDA 카피 프레임워크 (구조 강제)
슬롯 순서/종류는 고정이지만, 전체 상세페이지는 아래 AIDA 흐름을 반드시 따르세요.
각 슬롯의 "AIDA 역할" 안내를 그대로 지키세요.

1. **Attention (주의)** — hero: 한눈에 끄는 훅 (질문·숫자·강렬한 한 줄). 상투적
   "최고의 상품" 같은 문구 금지.
2. **Interest (관심)** — checklist·초반 image_text: 타겟 고객의 문제·니즈·불편을
   구체적으로 환기 ("건조한 피부", "매일 아침 고민" 등).
3. **Desire (욕구)** — 중반 image_text·gallery·usage_steps: 제품이 주는 구체적
   이득·차별점·사용 장면 (추상적 형용사만 나열하지 말 것).
4. **Action (행동)** — cta_price: 지금 구매·시도를 유도하는 명확한 행동 문구.

카테고리별 톤(section-templates note)은 그대로 유지하되, 위 AIDA 구조만 강제합니다.

## 상품 정보
- 상품명: ${productInfo.productName}
- 카테고리: ${productInfo.category}
- 판매가: ₩${productInfo.price.toLocaleString()}
${productInfo.brandName ? `- 브랜드: ${productInfo.brandName}` : ""}
${productInfo.targetCustomer ? `- 타겟 고객: ${productInfo.targetCustomer}` : ""}
${productInfo.keyFeatures ? `- 핵심 특징: ${productInfo.keyFeatures}` : ""}
${productInfo.ingredients ? `- 성분/소재: ${productInfo.ingredients}` : ""}
${productInfo.certifications ? `- 인증/수상: ${productInfo.certifications}` : ""}
- 업로드된 사진 수: ${imageCount}장 (인덱스 0 ~ ${imageCount - 1})

## AI 이미지 분석 결과
${imageAnalysis}${competitorBlock}${wholesaleBlock}

## 고정 슬롯 순서 (이 순서/종류를 그대로 따르세요)
${slotInstructions}

imageIndex는 0 ~ ${imageCount - 1} 범위 안에서만 사용하고, 가능하면 여러 사진을 골고루
활용하세요. 사진이 ${imageCount}장뿐이라면 여러 슬롯에서 같은 인덱스를 재사용해도 됩니다.
표(spec_table 등) 항목은 상품 정보에 없는 수치를 지어내지 말고, 근거가 없으면
"판매자 확인 필요" 또는 공란으로 표시하세요.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.
{
  "sections": [ ...위 슬롯 순서 그대로, 각 항목은 지정된 type/slot 형식... ],
  "headlines": ["헤드라인1", "헤드라인2", "헤드라인3"],
  "description": "상품 설명 (2~3문단)",
  "features": ["특징1", "특징2", "특징3", "특징4"],
  "howToUse": "사용 방법 요약",
  "caution": "주의사항 요약"
}

headlines/description/features/howToUse/caution은 목록·검색 화면에 쓰이는 요약용이니
sections 안의 내용과 자연스럽게 일치하도록 작성하세요.${conceptBlock}${cosmeticsGuide}${foodGuide}${qaFixAppendix}`;

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
      temperature: 0.7,
    }),
  });

  const rawBody = await response.text();
  console.log(
    `[generateCopyWithDeepSeek] status=${response.status} bodyLength=${rawBody.length} body=${rawBody.slice(0, 4000)}`,
  );

  if (!response.ok) {
    throw new Error(`DeepSeek API 오류: ${rawBody}`);
  }

  const data = JSON.parse(rawBody) as {
    choices?: { message?: { content?: string } }[];
    usage?: unknown;
  };

  const deepSeekCost = calculateDeepSeekCost(data.usage);
  console.log(
    `[cost] generateCopyWithDeepSeek: $${deepSeekCost.toFixed(4)} usage=${JSON.stringify(data.usage)}`,
  );

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek API 응답이 비어 있습니다.");
  }

  const parsed = JSON.parse(content) as GeneratedCopy;

  if (
    !Array.isArray(parsed.sections) ||
    parsed.sections.length === 0 ||
    !Array.isArray(parsed.headlines) ||
    typeof parsed.description !== "string" ||
    !Array.isArray(parsed.features) ||
    typeof parsed.howToUse !== "string" ||
    typeof parsed.caution !== "string"
  ) {
    throw new Error("DeepSeek 응답 형식이 올바르지 않습니다.");
  }

  const clampIndex = (i: number) =>
    Number.isInteger(i) && i >= 0 && i < imageCount ? i : 0;

  parsed.sections = parsed.sections.map((section) => {
    if (section.type === "hero" || section.type === "image_text") {
      return { ...section, imageIndex: clampIndex(section.imageIndex) };
    }
    if (section.type === "gallery") {
      return {
        ...section,
        imageIndexes: section.imageIndexes
          .map(clampIndex)
          .filter((v, i, arr) => arr.indexOf(v) === i),
      };
    }
    if (section.type === "color_variation") {
      return {
        ...section,
        options: section.options.map((option) => ({
          ...option,
          imageIndex: clampIndex(option.imageIndex),
        })),
      };
    }
    if (section.type === "cta_price") {
      // DeepSeek가 가끔 price를 0이나 다른 값으로 잘못 반환하는 경우가 있어,
      // AI 출력을 신뢰하지 않고 서버가 이미 아는 실제 판매가로 강제한다.
      return { ...section, price: productInfo.price };
    }
    return section;
  });

  // AI가 슬롯 순서를 어겼거나 알 수 없는 slot을 만들었더라도, 최종 출력은
  // 항상 카테고리 고정 템플릿 순서를 따르도록 강제 재정렬한다. 레이아웃
  // 틀은 서버가 지키고, AI는 콘텐츠만 책임진다는 원칙을 코드로도 보장.
  parsed.sections = normalizeSectionsToTemplate(parsed.sections, template);

  if (!parsed.sections.some((section) => section.type === "hero")) {
    throw new Error("DeepSeek 응답에 필수 hero 섹션이 없습니다.");
  }

  return { copy: parsed, cost: deepSeekCost, notices };
}

// 파싱된 섹션들을 slot 이름 기준으로 템플릿 순서에 맞게 재배치한다.
// - 템플릿에 없는 slot/type 조합은 버린다 (AI의 즉흥 슬롯 생성 방지).
// - repeatable 슬롯은 최대 maxCount개까지, 그 외는 첫 번째 매치만 사용한다.
// - 필수인데 매치가 없으면 경고만 남기고 넘어간다 (전체 생성 실패보다
//   해당 슬롯만 비는 편이 낫다는 판단 — review/CHECKLIST.md에서 QA로 걸러낸다).
function normalizeSectionsToTemplate(
  sections: DetailSection[],
  template: SlotDefinition[],
): DetailSection[] {
  const bySlot = new Map<string, DetailSection[]>();
  for (const section of sections) {
    const slot = (section as { slot?: unknown }).slot;
    if (typeof slot !== "string" || !slot) continue;
    const arr = bySlot.get(slot) ?? [];
    arr.push(section);
    bySlot.set(slot, arr);
  }

  const ordered: DetailSection[] = [];
  for (const def of template) {
    const matches = (bySlot.get(def.slot) ?? []).filter((s) => s.type === def.type);
    if (matches.length === 0) {
      if (def.required) {
        console.warn(`[generate] 필수 슬롯 누락: ${def.slot}`);
      }
      continue;
    }
    if (def.repeatable) {
      ordered.push(...matches.slice(0, def.maxCount ?? matches.length));
    } else {
      ordered.push(matches[0]);
    }
  }
  return ordered;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." },
        { status: 500 },
      );
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: "DEEPSEEK_API_KEY가 설정되지 않았습니다." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as ProductInput;
    const wholesale = body.wholesaleUrl ?? "";
    console.log("[generate incoming wholesaleUrl]", {
      type: typeof body.wholesaleUrl,
      isNull: body.wholesaleUrl == null,
      length: wholesale.length,
      preview: wholesale.slice(0, 120),
    });

    if (!body.productName || !body.category || !body.price) {
      return NextResponse.json(
        { error: "필수 상품 정보가 누락되었습니다." },
        { status: 400 },
      );
    }

    if (!body.imageUrls?.length) {
      return NextResponse.json(
        { error: "상품 사진이 필요합니다." },
        { status: 400 },
      );
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const [imageAnalysis, theme] = await Promise.all([
      analyzeImagesWithClaude(anthropic, body.imageUrls.slice(0, 5), body),
      extractProductTheme(body.imageUrls).catch((err) => {
        console.warn("[generate] 상품 색상 추출 실패, 카테고리 기본 테마로 폴백", err);
        return null;
      }),
    ]);

    const {
      copy: generated,
      cost: deepSeekCost,
      notices: urlAnalysisNotices,
    } = await generateCopyWithDeepSeek(body, imageAnalysis, Math.min(body.imageUrls.length, 5));

    // 생성 직후 Haiku 비전/텍스트 QA — critical 이슈 시 카피만 1회 재생성
    let copyToSave = generated;
    let qaResult = await runDetailPageQA({
      imageUrls: body.imageUrls,
      sections: generated.sections,
      category: body.category,
      productName: body.productName,
    });

    const copyFixable = qaResult.issues.some(
      (i) =>
        i.severity === "critical" &&
        (i.category === "copy" || i.category === "text_overlap"),
    );

    let totalDeepSeekCost = deepSeekCost;

    if (!qaResult.pass && copyFixable) {
      console.log("[qa] critical 카피 이슈 — 1회 재생성 시도");
      const fixAppendix = buildQAFixPrompt(qaResult.issues);
      const retry = await generateCopyWithDeepSeek(
        body,
        imageAnalysis,
        Math.min(body.imageUrls.length, 5),
        fixAppendix,
      );
      copyToSave = retry.copy;
      totalDeepSeekCost += retry.cost;
      qaResult = await runDetailPageQA({
        imageUrls: body.imageUrls,
        sections: retry.copy.sections,
        category: body.category,
        productName: body.productName,
      });
      console.log(`[qa-retry] ${qaResult.summary}`);
    }

    const isCosmetics = isCosmeticsCategory(body.category);
    const isFood = isFoodCategory(body.category);
    const finalCopy = isCosmetics
      ? reviewCosmeticsCopy(copyToSave)
      : isFood
        ? reviewFoodCopy(copyToSave)
        : null;
    const savedCopy = finalCopy ? finalCopy.copy : copyToSave;
    const mfdsReviewed = finalCopy?.mfdsReviewed ?? false;
    const replacements = finalCopy?.replacements ?? [];

    // 컨셉 기반 원형 배지 아이콘 (checklist / usage_steps)
    let conceptIcons = undefined;
    let iconCost = 0;
    if (body.conceptBrief) {
      const checklistSection = savedCopy.sections.find((s) => s.type === "checklist");
      const usageSection = savedCopy.sections.find((s) => s.type === "usage_steps");
      const checklistItems =
        checklistSection?.type === "checklist" ? checklistSection.items : [];
      const usageSteps =
        usageSection?.type === "usage_steps" ? usageSection.steps : [];

      const iconTheme = theme
        ? { accent: theme.accent, deepAccent: theme.deepAccent }
        : getCategoryTheme(body.category);

      const iconResult = await generateConceptIcons(
        body.conceptBrief,
        iconTheme,
        checklistItems,
        usageSteps,
      );
      conceptIcons = iconResult.icons;
      iconCost = iconResult.cost;
    }

    const photoCostBreakdown = {
      ...body.photoCostBreakdown,
      icons: iconCost,
    };

    const generationCost =
      (body.photoProcessingCost ?? 0) + totalDeepSeekCost + iconCost;
    console.log(
      `[cost] product="${body.productName}" ` +
        `conceptBrief=$${(photoCostBreakdown.conceptBrief ?? 0).toFixed(4)} ` +
        `backdrop=$${(photoCostBreakdown.backdrop ?? 0).toFixed(4)} ` +
        `enhance=$${(photoCostBreakdown.enhance ?? 0).toFixed(4)} ` +
        `decor=$${(photoCostBreakdown.decor ?? 0).toFixed(4)} ` +
        `icons=$${iconCost.toFixed(4)} ` +
        `deepSeek=$${totalDeepSeekCost.toFixed(4)} ` +
        `total=$${generationCost.toFixed(4)}`,
    );

    const { data: savedProduct, error: insertError } = await supabase
      .from("products")
      .insert({
        user_id: user.id,
        category: body.category,
        product_name: body.productName,
        brand_name: body.brandName ?? null,
        price: body.price,
        target_customer: body.targetCustomer ?? null,
        key_features: body.keyFeatures ?? null,
        ingredients: body.ingredients ?? null,
        certifications: body.certifications ?? null,
        competitor_url: body.competitorUrl ?? null,
        wholesale_url: body.wholesaleUrl ?? null,
        image_urls: body.imageUrls,
        headlines: savedCopy.headlines,
        description: savedCopy.description,
        features: savedCopy.features,
        how_to_use: savedCopy.howToUse,
        caution: savedCopy.caution,
        image_analysis: imageAnalysis,
        mfds_reviewed: mfdsReviewed,
        replacements,
        sections: savedCopy.sections,
        generation_cost: generationCost,
      })
      .select("id")
      .single();

    if (insertError || !savedProduct) {
      console.error("[generate] product insert error", insertError);
      return NextResponse.json(
        { error: `상품 저장 실패: ${insertError?.message ?? "알 수 없는 오류"}` },
        { status: 500 },
      );
    }

    if (body.imagePaths?.length) {
      const { error: linkError } = await supabase
        .from("product_images")
        .update({ product_id: savedProduct.id })
        .eq("user_id", user.id)
        .in("storage_path", body.imagePaths);

      if (linkError) {
        console.error("[generate] product_images link error", linkError);
      }
    }

    return NextResponse.json({
      ...savedCopy,
      imageAnalysis,
      mfdsReviewed,
      replacements,
      productId: savedProduct.id as string,
      theme,
      urlAnalysisNotices,
      qaSummary: qaResult.summary,
      conceptIcons,
      photoCostBreakdown,
    });
  } catch (error) {
    console.error("[generate]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "상세페이지 생성 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
