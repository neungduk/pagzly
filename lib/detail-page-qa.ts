import Anthropic from "@anthropic-ai/sdk";
import { calculateClaudeCost, logClaudeCost } from "@/lib/claude-cost";
import { HAIKU_VISION_MODEL } from "@/lib/vision-utils";
import { isTestMode } from "@/lib/test-mode";
import { countAdjacentDuplicateImageTexts } from "@/lib/assign-section-images";
import type { DetailSection } from "@/lib/types/generate";

export type QAIssueCategory =
  | "label_clip"
  | "color_clash"
  | "text_overlap"
  | "shadow"
  | "copy"
  | "material_hallucination"
  | "image_repeat";

export type QAIssue = {
  severity: "critical" | "warning";
  category: QAIssueCategory;
  message: string;
  imageIndex?: number;
  slot?: string;
};

export type QAResult = {
  pass: boolean;
  issues: QAIssue[];
  summary: string;
  cost: number;
};

async function fetchImageBase64(url: string): Promise<{
  mediaType: "image/jpeg" | "image/png";
  data: string;
}> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`QA 이미지 fetch 실패: ${url}`);
  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const mediaType = contentType.includes("png") ? "image/png" : "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());
  return { mediaType, data: buffer.toString("base64") };
}

function parseQAIssues(raw: unknown): QAIssue[] {
  if (!Array.isArray(raw)) return [];
  const issues: QAIssue[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const message = String(o.message ?? "");
    if (!message) continue;
    issues.push({
      severity: o.severity === "warning" ? "warning" : "critical",
      category: String(o.category ?? "copy") as QAIssueCategory,
      message,
      ...(typeof o.imageIndex === "number" ? { imageIndex: o.imageIndex } : {}),
      ...(typeof o.slot === "string" ? { slot: o.slot } : {}),
    });
  }
  return issues;
}

/** 입력에 없는 구체적 소재·재질 단어가 카피에 등장하면 플래그 */
const MATERIAL_TERMS = [
  "유리",
  "글래스",
  "스테인리스",
  "스틸",
  "알루미늄",
  "실리콘",
  "플라스틱",
  "PET",
  "아크릴",
  "세라믹",
  "가죽",
  "린넨",
  "코튼",
  "나일론",
  "폴리에스터",
  "티타늄",
  "구리",
  "황동",
  "원목",
  "우드",
  "금속",
  "스웨이드",
  "캐시미어",
  "면 원단",
  "울 원단",
] as const;

const MATERIAL_SENSITIVE_SLOTS = new Set([
  "packaging_design",
  "ingredient_highlight",
  "fabric_composition",
  "material_detail",
  "design_detail",
  "texture_feel",
  "texture_closeup",
  "material_feature",
  "connectivity",
  "size_options",
  "how_it_works",
  "sourcing_story",
  "storage_tip",
  "care_tip",
]);

function sectionText(section: DetailSection): string {
  const parts: string[] = [];
  if ("heading" in section && section.heading) parts.push(section.heading);
  if ("body" in section && section.body) parts.push(section.body);
  if ("headline" in section && section.headline) parts.push(section.headline);
  if ("subheadline" in section && section.subheadline) parts.push(section.subheadline);
  if ("items" in section && Array.isArray(section.items)) {
    parts.push(...section.items.map(String));
  }
  return parts.join(" ");
}

export function detectMaterialHallucinations(params: {
  sections: DetailSection[];
  keyFeatures?: string | null;
  ingredients?: string | null;
  certifications?: string | null;
  brandName?: string | null;
}): QAIssue[] {
  const corpus = [
    params.keyFeatures,
    params.ingredients,
    params.certifications,
    params.brandName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const issues: QAIssue[] = [];
  for (const section of params.sections) {
    const slot = (section as { slot?: string }).slot ?? "";
    if (!MATERIAL_SENSITIVE_SLOTS.has(slot)) continue;
    const text = sectionText(section);
    for (const term of MATERIAL_TERMS) {
      if (!text.includes(term)) continue;
      if (corpus.includes(term.toLowerCase())) continue;
      issues.push({
        severity: "critical",
        category: "material_hallucination",
        message: `입력 정보에 없는 소재/재질 "${term}"이(가) ${slot} 슬롯에 등장했습니다. 입력에 근거가 없으면 재질 단정을 제거하고 외관·디자인만 묘사하세요.`,
        slot,
      });
      break;
    }
  }
  return issues;
}

/** 보정된 상품 이미지를 Haiku 비전으로 검수 (라벨 잘림·색상·그림자) */
async function reviewImagesWithVision(
  anthropic: Anthropic,
  imageUrls: string[],
  productName: string,
): Promise<{ issues: QAIssue[]; cost: number }> {
  const imageBlocks = await Promise.all(
    imageUrls.slice(0, 5).map(async (url, index) => {
      const { mediaType, data } = await fetchImageBase64(url);
      return [
        { type: "text" as const, text: `상품 이미지 ${index}:` },
        {
          type: "image" as const,
          source: { type: "base64" as const, media_type: mediaType, data },
        },
      ];
    }),
  );

  const flatBlocks = imageBlocks.flat();

  const message = await anthropic.messages.create({
    model: HAIKU_VISION_MODEL,
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: [
          ...flatBlocks,
          {
            type: "text",
            text: `"${productName}" 상품의 보정·합성 이미지를 QA하세요. JSON만 반환:

{
  "issues": [
    { "severity": "critical"|"warning", "category": "label_clip"|"color_clash"|"shadow", "message": "...", "imageIndex": 0 }
  ],
  "pass": true|false
}

체크: 라벨/로고/텍스트 잘림, 배경-상품 색상 충돌, 그림자 방향/강도 부자연스러움.
문제 없으면 issues: [], pass: true`,
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const cost = calculateClaudeCost(HAIKU_VISION_MODEL, message.usage);
  logClaudeCost("qaImageReview", HAIKU_VISION_MODEL, cost);

  if (!textBlock || textBlock.type !== "text") return { issues: [], cost };

  try {
    const fenced = textBlock.text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const parsed = JSON.parse((fenced?.[1] ?? textBlock.text).trim()) as {
      issues?: unknown;
    };
    return { issues: parseQAIssues(parsed.issues), cost };
  } catch {
    return { issues: [], cost };
  }
}

/** 섹션 카피 구조를 텍스트로 검수 (겹침·AIDA·과장 표현) */
async function reviewCopyStructure(
  anthropic: Anthropic,
  sections: DetailSection[],
  category: string,
): Promise<{ issues: QAIssue[]; cost: number }> {
  const sectionSummary = sections.map((s) => ({
    slot: (s as { slot?: string }).slot,
    type: s.type,
    preview: JSON.stringify(s).slice(0, 280),
  }));

  const message = await anthropic.messages.create({
    model: HAIKU_VISION_MODEL,
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `카테고리 "${category}" 상세페이지 섹션 JSON을 QA하세요. JSON만 반환:

{
  "issues": [
    { "severity": "critical"|"warning", "category": "text_overlap"|"copy", "message": "...", "slot": "hero" }
  ],
  "pass": true|false
}

체크:
1. 헤드라인/본문이 2·3줄 초과로 과장, 텍스트 겹침 위험(너무 긴 문장), AIDA 흐름 단절, 빈/undefined 텍스트.
2. **진부함/제네릭 카피**: 이 상품명·카테고리를 다른 아무 상품으로 바꿔도 문장이 그대로 말이 되면 진부한 카피입니다.
   "최고의 품질", "당신을 위한 선택", "고객들에게 사랑받는 이유", "특별한 순간" 같은 상품 무관 문구,
   구체적 장면·수치·사용 맥락 없이 형용사만 나열된 문장을 critical 이슈로 잡으세요(category: "copy").
   예: "뛰어난 성능을 경험해보세요" → 진부함(critical). "충전 10분에 2시간 재생" → 구체적(문제 없음).

섹션:
${JSON.stringify(sectionSummary, null, 2)}`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const copyCost = calculateClaudeCost(HAIKU_VISION_MODEL, message.usage);
  logClaudeCost("qaCopyReview", HAIKU_VISION_MODEL, copyCost);

  if (!textBlock || textBlock.type !== "text") return { issues: [], cost: copyCost };

  try {
    const fenced = textBlock.text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const parsed = JSON.parse((fenced?.[1] ?? textBlock.text).trim()) as {
      issues?: unknown;
    };
    return { issues: parseQAIssues(parsed.issues), cost: copyCost };
  } catch {
    return { issues: [], cost: copyCost };
  }
}

export async function runDetailPageQA(params: {
  imageUrls: string[];
  sections: DetailSection[];
  category: string;
  productName: string;
  keyFeatures?: string | null;
  ingredients?: string | null;
  certifications?: string | null;
  brandName?: string | null;
}): Promise<QAResult> {
  if (isTestMode()) {
    console.log("[qa] QA 스킵됨 (TEST_MODE)");
    return { pass: true, issues: [], summary: "QA 스킵됨 (TEST_MODE)", cost: 0 };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { pass: true, issues: [], summary: "ANTHROPIC_API_KEY 없음 — QA 생략", cost: 0 };
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const materialIssues = detectMaterialHallucinations({
    sections: params.sections,
    keyFeatures: params.keyFeatures,
    ingredients: params.ingredients,
    certifications: params.certifications,
    brandName: params.brandName,
  });

  const adjacentDupes = countAdjacentDuplicateImageTexts(params.sections);
  const adjacentIssues: QAIssue[] =
    adjacentDupes > 0
      ? [
          {
            severity: "critical",
            category: "image_repeat",
            message: `연속 image_text 섹션이 같은 사진을 ${adjacentDupes}회 반복합니다. 서로 다른 imageIndex로 나누세요.`,
          },
        ]
      : [];

  const [imageResult, copyResult] = await Promise.all([
    reviewImagesWithVision(anthropic, params.imageUrls, params.productName).catch((err) => {
      console.warn("[qa] 이미지 검수 실패", err);
      return { issues: [] as QAIssue[], cost: 0 };
    }),
    reviewCopyStructure(anthropic, params.sections, params.category).catch((err) => {
      console.warn("[qa] 카피 검수 실패", err);
      return { issues: [] as QAIssue[], cost: 0 };
    }),
  ]);

  const issues = [
    ...materialIssues,
    ...adjacentIssues,
    ...imageResult.issues,
    ...copyResult.issues,
  ];
  const cost = imageResult.cost + copyResult.cost;
  const critical = issues.filter((i) => i.severity === "critical");
  const pass = critical.length === 0;

  const summary = pass
    ? `PASS (${issues.length} warning)`
    : `FAIL — critical ${critical.length}건: ${critical.map((i) => i.message).join("; ")}`;

  console.log(`[qa] ${params.productName}: ${summary}`);
  for (const issue of issues) {
    console.log(
      `[qa] [${issue.severity}] ${issue.category}${issue.slot ? `@${issue.slot}` : ""}${issue.imageIndex !== undefined ? `#img${issue.imageIndex}` : ""}: ${issue.message}`,
    );
  }

  return { pass, issues, summary, cost };
}

export function buildQAFixPrompt(issues: QAIssue[]): string {
  if (issues.length === 0) return "";
  const lines = issues
    .filter(
      (i) =>
        i.category === "copy" ||
        i.category === "text_overlap" ||
        i.category === "material_hallucination" ||
        i.category === "image_repeat",
    )
    .map((i) => `- [${i.slot ?? "general"}] ${i.message}`);
  if (lines.length === 0) return "";
  return `\n\n## QA 1차 검수 수정 요청 (반드시 반영)\n${lines.join("\n")}`;
}
