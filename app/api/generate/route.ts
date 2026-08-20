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
import { generateIllustrationBanner } from "@/lib/concept-illustration";
import { getCategoryTheme } from "@/lib/category-theme";
import { calculateClaudeCost, logClaudeCost } from "@/lib/claude-cost";
import { isTestMode } from "@/lib/test-mode";
import { isForceRegenerate } from "@/lib/force-regenerate";
import { assignDistinctSectionImages } from "@/lib/assign-section-images";
import { applyConceptOverlaysToProductImages } from "@/lib/concept-effects";
import { makeComparisonPair } from "@/lib/photo-composite";
import { uploadPngBuffer } from "@/lib/upload-png";
import {
  buildImageAnalysisCacheKey,
  readImageAnalysisCache,
  writeImageAnalysisCache,
} from "@/lib/image-analysis-cache";
import { HAIKU_VISION_MODEL } from "@/lib/vision-utils";

const CLAUDE_MODEL = "claude-sonnet-5";
const TEST_MODE_ANALYSIS_MAX_IMAGES = 2;
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

/** DeepSeek가 content 대신 reasoning_content에 JSON을 주거나, 제어문자/따옴표 오류를 섞어 줄 때 복구 */
function parseDeepSeekCopyJson(raw: string): GeneratedCopy {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  let text = (fenced?.[1] ?? raw).trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    text = text.slice(start, end + 1);
  }
  // JSON 문자열 안의 잘못된 제어문자(개행·탭 제외) 제거
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ");
  // DeepSeek가 trailing comma를 넣는 경우 복구 (예: "body": "...",\n    },)
  text = text.replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(text) as GeneratedCopy;
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
): Promise<{ analysis: string; cost: number }> {
  const testMode = isTestMode();
  const analysisUrls = testMode
    ? imageUrls.slice(0, TEST_MODE_ANALYSIS_MAX_IMAGES)
    : imageUrls;
  const model = testMode ? HAIKU_VISION_MODEL : CLAUDE_MODEL;

  const payloads = await Promise.all(analysisUrls.map((url) => fetchImageAsBase64(url)));

  if (testMode) {
    const cacheKey = buildImageAnalysisCacheKey({
      imagePayloads: payloads,
      category: productInfo.category,
      brandName: productInfo.brandName,
      keyFeatures: productInfo.keyFeatures,
      ingredients: productInfo.ingredients,
      imageCacheKey: productInfo.imageCacheKey,
    });
    const cached = readImageAnalysisCache(cacheKey);
    if (cached && !isForceRegenerate()) {
      console.log(
        `[image-analysis] TEST_MODE 캐시 히트 (${payloads.length}장, model=${cached.model}) — Claude 호출 생략`,
      );
      return { analysis: cached.analysis, cost: 0 };
    }
    if (cached && isForceRegenerate()) {
      console.log("[image-analysis] FORCE_REGENERATE — 캐시 무시, Claude 재분석");
    }
  }

  const imageBlocks = payloads.map((payload) => ({
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: payload.mediaType,
      data: payload.data,
    },
  }));

  const isCosmetics = isCosmeticsCategory(productInfo.category);
  const cosmeticsNote = isCosmetics
    ? `\n\n${COSMETICS_AI_PROMPT}\n분석 시에도 의학적 효능·치료 표현은 사용하지 마세요.`
    : "";

  if (testMode) {
    console.log(
      `[image-analysis] TEST_MODE — ${model}로 대표 이미지 ${payloads.length}장만 분석`,
    );
  }

  const message = await anthropic.messages.create({
    model,
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

  const cost = calculateClaudeCost(model, message.usage);
  logClaudeCost("imageAnalysis", model, cost);

  if (testMode) {
    const cacheKey = buildImageAnalysisCacheKey({
      imagePayloads: payloads,
      category: productInfo.category,
      brandName: productInfo.brandName,
      keyFeatures: productInfo.keyFeatures,
      ingredients: productInfo.ingredients,
      imageCacheKey: productInfo.imageCacheKey,
    });
    writeImageAnalysisCache(cacheKey, {
      analysis: textBlock.text,
      model,
      imageCount: payloads.length,
      createdAt: new Date().toISOString(),
    });
  }

  return { analysis: textBlock.text, cost };
}

// 섹션 타입별 JSON 필드 형식. slot 값은 템플릿이 지정한 이름을 그대로 써야 한다.
const SECTION_TYPE_SHAPES: Record<DetailSection["type"], string> = {
  hero: `{ type: "hero", slot, headline, subheadline?, imageIndex }`,
  checklist: `{ type: "checklist", slot, heading, items[], compactFollow?: boolean } — gallery/image_text 직후 checklist일 때만 true`,
  image_text: `{ type: "image_text", slot, heading, body, imageIndex, imagePosition: "left"|"right", layout?: "full"|"compact" } — quick_points는 layout:"compact" 필수`,
  spec_table: `{ type: "spec_table", slot, heading, rows: [{label, value}] }`,
  usage_steps: `{ type: "usage_steps", slot, heading, steps[] }`,
  gallery: `{ type: "gallery", slot, heading, imageIndexes[] }`,
  caution: `{ type: "caution", slot, heading, body }`,
  cta_price: `{ type: "cta_price", slot, price, targetCustomer?, badges[]? }`,
  comparison_table: `{ type: "comparison_table", slot, heading, columns: [string,string], rows: [{label, values: [string,string]}] }`,
  color_variation: `{ type: "color_variation", slot, heading, options: [{label, colorHex, imageIndex}] }`,
  stat_infographic: `{ type: "stat_infographic", slot, heading, metrics: [{label, value, percent: 0-100}] } — 입력에 실제 수치 근거가 있을 때만 포함. 근거 없으면 섹션 생략`,
  illustration_banner: `{ type: "illustration_banner", slot, heading?, body?, illustrationUrl: "" } — body는 분위기 1~2문장, illustrationUrl은 서버가 채우므로 빈 문자열`,
  faq: `{ type: "faq", slot, heading, items: [{question, answer}] } — 3~5개. 근거 없으면 슬롯 생략. 근거 없는 개별 질문은 답변을 "판매자에게 문의해주세요"`,
  target_persona: `{ type: "target_persona", slot, heading, personas[] } — 3~5개, 각 20자 내외. targetCustomer·keyFeatures 기반으로만`,
  brand_story: `{ type: "brand_story", slot, heading, body } — brandName이 없으면 슬롯 전체 생략. 없는 히스토리·수상 지어내지 말 것`,
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
    case "stat_infographic":
    case "faq":
      return "신뢰 보조 (과장 없이 사실만, AIDA 흐름 유지)";
    case "brand_story":
      return "AIDA-I (Interest): 입력된 브랜드명만으로 신뢰 맥락을 짧게 — 지어낸 히스토리 금지";
    case "target_persona":
      return "AIDA-I (Interest): 입력된 타겟·특징 기반으로 '이런 분께'를 짧게";
    case "illustration_banner":
      return "AIDA-D (Desire): 컨셉 분위기를 시각적으로 강화하는 장식 (카피는 heading만, 이미지는 서버 생성)";
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
          ? def.type === "faq"
            ? ` (항목 ${def.minCount ?? def.maxCount}~${def.maxCount ?? def.minCount}개)`
            : ` (이미지 ${def.minCount ?? def.maxCount}~${def.maxCount ?? def.minCount}장)`
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

## 카피 리듬·톤 (전문 상세페이지, 과장 금지)
- 문장 길이에 강약: 임팩트 구간(hero, checklist items)은 5~14자 짧은 문장 위주.
  image_text body·caution은 2~3문장 안에서 **짧은 문장 + 설명 문장**을 교차해 리듬을 만드세요.
- 신뢰감: 구체적 사실·사용 장면·성분/소재 근거. "~할 수 있습니다", "일상에서", "부담 없이" 등 담백한 표현.
- 금지: "최고", "완벽", "기적", "100% 효과" 등 근거 없는 최상급·과장.
- cta_price badges: 구매 결정에 도움이 되는 **짧은 사실 키워드** 2~4개 (용량·무향·인증·소재 등, 있을 때만).
- hero headline은 질문·숫자·한 줄 훅. subheadline은 상품명 또는 한 줄 보조 설명.
${isCosmetics ? `
## 화장품 카피 길이·컨셉 정합
- hero headline: 한 줄, 공백 포함 22자 이내, 핵심 효능 1개만.
- hero subheadline: 헤드라인을 보충하는 1문장. 상품명만 반복하지 말 것.
- ingredient_highlight body: 2~3문장.
- texture_feel body: 2문장.
- usage_steps: 각 단계 1문장, 앞에 STEP 01/02/03.
- checklist items: 각 14자 내외.
- quick_points: layout 반드시 "compact". heading 8자 내외, body 1문장. 사진은 텍스처/디테일 컷.
- compact layout은 사진이 작아지므로 텍스트도 짧게 (heading·body 모두 위 길이 준수).
- spec_table 값에 없는 % 수치를 만들지 말 것 (임상 막대용 가짜 데이터 금지).
- stat_infographic: keyFeatures·ingredients·certifications 등 **입력에 명시된 수치**만 metrics에 사용. 근거 없으면 stat_infographic 슬롯 전체를 생략. "판매자 확인 필요"나 임의 percent 금지.
- 시각 컨셉과 모순 금지: 쿨링/진정이면 따뜻·온기·골드 카피 금지. 수분이면 오일리·번들 표현 금지. 클렌징이면 보습 도포를 주효능처럼 쓰지 말 것.
` : ""}

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

imageIndex는 0 ~ ${imageCount - 1} 범위 안에서만 사용하세요.
- hero: 대표 컷 1장 (이 인덱스는 히어로에서만 반복해도 됩니다).
- image_text (ingredient_highlight, texture_feel, detail_zoom, feature_detail,
  material_feature, usage_scenario, package_contents 등): 사진이 2장 이상이면
  **서로 다른 imageIndex**를 쓰세요. 히어로와 같은 사진을 모든 POINT에 반복하지 마세요.
- gallery / model_multicut: 서로 다른 인덱스를 넣고, 히어로 컷을 그중 한 장만 포함해도 됩니다.
사진이 1장뿐일 때만 같은 인덱스를 재사용하세요.
표(spec_table 등) 항목은 상품 정보에 없는 수치를 지어내지 말고, 근거가 없으면
"판매자 확인 필요" 또는 공란으로 표시하세요.
stat_infographic 섹션은 keyFeatures·ingredients·certifications 등 입력에 **실제 수치 근거**가
있을 때만 포함하세요. 근거 없으면 해당 슬롯을 생략하고, 수치를 지어내거나
"판매자 확인 필요"를 metrics value로 쓰지 마세요.
illustration_banner의 illustrationUrl은 항상 빈 문자열("")로 두세요 (서버가 생성).
illustration_banner의 body는 이 섹션 분위기를 설명하는 1~2문장 카피입니다 (image_text body와 비슷한 톤).
quick_points 슬롯은 layout:"compact"로 2~4개 채우세요. heading 8자 내외, body 1문장, 사진은 작은 텍스처/디테일 컷.
compact layout은 사진이 작아지므로 텍스트도 짧게 작성하세요.
checklist의 compactFollow는 gallery 또는 image_text 섹션 **바로 다음**에 오는 checklist일 때만 true. 그 외에는 생략하거나 false.
brand_story는 brandName이 입력된 경우에만 포함하세요. 없으면 슬롯 전체를 생략하고, 브랜드 히스토리·설립연도·수상내역을 지어내지 마세요.
target_persona는 targetCustomer·keyFeatures 입력 기반으로만 3~5개 작성하세요. 근거가 없으면 슬롯을 생략하세요.
faq는 keyFeatures·ingredients·certifications 등 입력에 근거한 질문만 3~5개. 근거가 전혀 없으면 슬롯 전체를 생략하세요. 개별 질문에 근거가 없으면 답변을 "판매자에게 문의해주세요"로 두고, 효능·의학적 단정은 금지합니다.
shipping_info는 type:"spec_table"로 배송비/기간/교환·환불 행을 채우세요. 구체 수치가 없으면 값을 "판매자 정책을 확인해주세요"로 두세요.

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
    choices?: { message?: { content?: string; reasoning_content?: string } }[];
    usage?: unknown;
  };

  const deepSeekCost = calculateDeepSeekCost(data.usage);
  console.log(
    `[cost] generateCopyWithDeepSeek: $${deepSeekCost.toFixed(4)} usage=${JSON.stringify(data.usage)}`,
  );

  const firstMessage = data.choices?.[0]?.message;
  const content =
    firstMessage?.content?.trim() ||
    firstMessage?.reasoning_content?.trim() ||
    "";
  if (!content) {
    throw new Error("DeepSeek API 응답이 비어 있습니다.");
  }

  const parsed = parseDeepSeekCopyJson(content);

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
    if (section.type === "hero") {
      return { ...section, imageIndex: clampIndex(section.imageIndex) };
    }
    if (section.type === "image_text") {
      const layout =
        section.slot === "quick_points"
          ? "compact"
          : section.layout === "compact"
            ? "compact"
            : "full";
      return { ...section, imageIndex: clampIndex(section.imageIndex), layout };
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
    if (section.type === "stat_infographic") {
      return {
        ...section,
        metrics: section.metrics.map((metric) => ({
          ...metric,
          percent: Math.min(100, Math.max(0, Number(metric.percent) || 0)),
        })),
      };
    }
    if (section.type === "illustration_banner") {
      return { ...section, illustrationUrl: "" };
    }
    if (section.type === "faq") {
      return {
        ...section,
        items: Array.isArray(section.items) ? section.items.slice(0, 5) : [],
      };
    }
    if (section.type === "target_persona") {
      return {
        ...section,
        personas: Array.isArray(section.personas) ? section.personas.slice(0, 5) : [],
      };
    }
    return section;
  });

  // AI가 슬롯 순서를 어겼거나 알 수 없는 slot을 만들었더라도, 최종 출력은
  // 항상 카테고리 고정 템플릿 순서를 따르도록 강제 재정렬한다. 레이아웃
  // 틀은 서버가 지키고, AI는 콘텐츠만 책임진다는 원칙을 코드로도 보장.
  parsed.sections = normalizeSectionsToTemplate(parsed.sections, template);
  parsed.sections = assignDistinctSectionImages(parsed.sections, imageCount);
  console.log(
    `[images] assigned indexes: ${parsed.sections
      .map((section) => {
        if (section.type === "hero" || section.type === "image_text") {
          return `${section.slot}:${section.imageIndex}`;
        }
        if (section.type === "gallery") {
          return `${section.slot}:[${section.imageIndexes.join(",")}]`;
        }
        return null;
      })
      .filter(Boolean)
      .join(" ")} (imageCount=${imageCount})`,
  );

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

    const analysisImageLimit = isTestMode() ? TEST_MODE_ANALYSIS_MAX_IMAGES : 5;
    const [imageAnalysisResult, theme] = await Promise.all([
      analyzeImagesWithClaude(anthropic, body.imageUrls.slice(0, analysisImageLimit), body),
      extractProductTheme(body.imageUrls).catch((err) => {
        console.warn("[generate] 상품 색상 추출 실패, 카테고리 기본 테마로 폴백", err);
        return null;
      }),
    ]);
    const imageAnalysis = imageAnalysisResult.analysis;
    let claudeCost = imageAnalysisResult.cost + (body.photoCostBreakdown?.claude ?? 0);

    const {
      copy: generated,
      cost: deepSeekCost,
      notices: urlAnalysisNotices,
    } = await generateCopyWithDeepSeek(body, imageAnalysis, body.imageUrls.length);

    // 생성 직후 Haiku 비전/텍스트 QA — critical 이슈 시 카피만 1회 재생성
    let copyToSave = generated;
    let qaResult = await runDetailPageQA({
      imageUrls: body.imageUrls,
      sections: generated.sections,
      category: body.category,
      productName: body.productName,
    });
    claudeCost += qaResult.cost;

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
        body.imageUrls.length,
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
      claudeCost += qaResult.cost;
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

    let imageUrls = [...body.imageUrls];
    let imagePaths = [...(body.imagePaths ?? [])];
    const productImageCount = imageUrls.length;
    let effectsCost = 0;
    if (isCosmetics) {
      try {
        const heroSection = savedCopy.sections.find((section) => section.type === "hero");
        const heroIndex =
          heroSection?.type === "hero" ? heroSection.imageIndex : 0;
        const heroUrl = imageUrls[heroIndex] ?? imageUrls[0];
        if (heroUrl) {
          const heroRes = await fetch(heroUrl);
          if (heroRes.ok) {
            const pair = await makeComparisonPair(Buffer.from(await heroRes.arrayBuffer()));
            const stamp = Date.now();
            const pairIndexes: number[] = [];
            for (const item of [
              { kind: "before", buffer: pair.before },
              { kind: "after", buffer: pair.after },
            ] as const) {
              const comparePath = `${user.id}/${stamp}-compare-${item.kind}.png`;
              const uploaded = await uploadPngBuffer(supabase, comparePath, item.buffer);
              if ("error" in uploaded) {
                console.warn(
                  `[compare] 업로드 실패 (${item.kind}, ${item.buffer.length} bytes):`,
                  uploaded.error,
                );
                continue;
              }
              pairIndexes.push(imageUrls.length);
              imageUrls.push(uploaded.publicUrl);
              imagePaths.push(uploaded.path);
            }
            if (pairIndexes.length === 2) {
              savedCopy.sections = savedCopy.sections.map((section) =>
                section.type === "gallery"
                  ? { ...section, imageIndexes: pairIndexes }
                  : section,
              );
              console.log(
                `[gallery] before/after → [${pairIndexes.join(",")}] from hero[${heroIndex}]`,
              );
            }
          }
        }
      } catch (error) {
        console.warn("[compare] Before/After 생략", error);
      }
    }
    if (isCosmetics && body.conceptBrief) {
      try {
        const extraText = savedCopy.sections
          .flatMap((section) => {
            if (section.type === "hero") return [section.headline, section.subheadline ?? ""];
            if ("heading" in section) return [section.heading];
            return [];
          })
          .join(" ");
        const overlayResult = await applyConceptOverlaysToProductImages({
          imageUrls: imageUrls.slice(0, productImageCount),
          brief: body.conceptBrief,
          sections: savedCopy.sections,
          extraText,
          cosmeticsOnly: true,
        });
        effectsCost = overlayResult.cost;
        for (const overlay of overlayResult.overlays) {
          const basePath =
            imagePaths[overlay.imageIndex] ?? `${user.id}/${Date.now()}-${overlay.imageIndex}.png`;
          const fxPath = basePath.replace(/\.[^./]+$/, "") + `-fx-${overlay.specId}.png`;
          const uploaded = await uploadPngBuffer(supabase, fxPath, overlay.buffer);
          if ("error" in uploaded) {
            console.warn("[effects] 업로드 실패, 원본 유지:", uploaded.error);
            continue;
          }
          imageUrls[overlay.imageIndex] = uploaded.publicUrl;
          imagePaths[overlay.imageIndex] = uploaded.path;
        }
      } catch (error) {
        console.warn("[effects] 합성 생략 — 원본 이미지 유지", error);
      }
    }

    // 컨셉 기반 원형 배지 아이콘 (checklist / usage_steps)
    let conceptIcons = undefined;
    let iconCost = 0;
    let illustrationCost = 0;
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

      const bannerIndexes = savedCopy.sections
        .map((section, index) => (section.type === "illustration_banner" ? index : -1))
        .filter((index) => index >= 0);

      for (let i = 0; i < bannerIndexes.length; i++) {
        const sectionIndex = bannerIndexes[i];
        const section = savedCopy.sections[sectionIndex];
        if (section.type !== "illustration_banner") continue;
        if (isTestMode() && i > 0) {
          console.log("[concept-illustration] TEST_MODE — 추가 illustration_banner 생략");
          break;
        }
        try {
          const { dataUrl, cost } = await generateIllustrationBanner(
            body.conceptBrief,
            iconTheme,
            section.heading,
            section.body,
          );
          if (dataUrl) {
            savedCopy.sections[sectionIndex] = { ...section, illustrationUrl: dataUrl };
            illustrationCost += cost;
          }
        } catch (error) {
          console.warn("[concept-illustration] illustration_banner 생성 실패", error);
        }
      }
    }

    const photoCostBreakdown = {
      ...body.photoCostBreakdown,
      icons: iconCost,
      illustrations: illustrationCost,
      claude: claudeCost,
      effects: effectsCost,
    };

    const generationCost =
      (body.photoProcessingCost ?? 0) +
      totalDeepSeekCost +
      iconCost +
      illustrationCost +
      claudeCost +
      effectsCost;
    console.log(
      `[cost] product="${body.productName}"` +
        (isTestMode() ? " (TEST_MODE)" : "") +
        ` conceptBrief=$${(photoCostBreakdown.conceptBrief ?? 0).toFixed(4)} ` +
        `backdrop=$${(photoCostBreakdown.backdrop ?? 0).toFixed(4)} ` +
        `sectionBackdrops=$${(photoCostBreakdown.sectionBackdrops ?? 0).toFixed(4)} ` +
        `enhance=$${(photoCostBreakdown.enhance ?? 0).toFixed(4)} ` +
        `decor=$${(photoCostBreakdown.decor ?? 0).toFixed(4)} ` +
        `effects=$${effectsCost.toFixed(4)} ` +
        `icons=$${iconCost.toFixed(4)} ` +
        `illustrations=$${illustrationCost.toFixed(4)} ` +
        `claude=$${claudeCost.toFixed(4)} ` +
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
        image_urls: imageUrls,
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
      testMode: isTestMode(),
      imageUrls,
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
