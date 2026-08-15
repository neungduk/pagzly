import Anthropic from "@anthropic-ai/sdk";
import { HAIKU_VISION_MODEL } from "@/lib/vision-utils";
import type { DetailSection } from "@/lib/types/generate";

export type QAIssueCategory =
  | "label_clip"
  | "color_clash"
  | "text_overlap"
  | "shadow"
  | "copy";

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

/** 보정된 상품 이미지를 Haiku 비전으로 검수 (라벨 잘림·색상·그림자) */
async function reviewImagesWithVision(
  anthropic: Anthropic,
  imageUrls: string[],
  productName: string,
): Promise<QAIssue[]> {
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
  if (!textBlock || textBlock.type !== "text") return [];

  try {
    const fenced = textBlock.text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const parsed = JSON.parse((fenced?.[1] ?? textBlock.text).trim()) as {
      issues?: unknown;
    };
    return parseQAIssues(parsed.issues);
  } catch {
    return [];
  }
}

/** 섹션 카피 구조를 텍스트로 검수 (겹침·AIDA·과장 표현) */
async function reviewCopyStructure(
  anthropic: Anthropic,
  sections: DetailSection[],
  category: string,
): Promise<QAIssue[]> {
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

체크: 헤드라인/본문이 2·3줄 초과로 과장, 텍스트 겹침 위험(너무 긴 문장), AIDA 흐름 단절, 빈/undefined 텍스트.

섹션:
${JSON.stringify(sectionSummary, null, 2)}`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return [];

  try {
    const fenced = textBlock.text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const parsed = JSON.parse((fenced?.[1] ?? textBlock.text).trim()) as {
      issues?: unknown;
    };
    return parseQAIssues(parsed.issues);
  } catch {
    return [];
  }
}

export async function runDetailPageQA(params: {
  imageUrls: string[];
  sections: DetailSection[];
  category: string;
  productName: string;
}): Promise<QAResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { pass: true, issues: [], summary: "ANTHROPIC_API_KEY 없음 — QA 생략" };
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const [imageIssues, copyIssues] = await Promise.all([
    reviewImagesWithVision(anthropic, params.imageUrls, params.productName).catch((err) => {
      console.warn("[qa] 이미지 검수 실패", err);
      return [] as QAIssue[];
    }),
    reviewCopyStructure(anthropic, params.sections, params.category).catch((err) => {
      console.warn("[qa] 카피 검수 실패", err);
      return [] as QAIssue[];
    }),
  ]);

  const issues = [...imageIssues, ...copyIssues];
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

  return { pass, issues, summary };
}

export function buildQAFixPrompt(issues: QAIssue[]): string {
  if (issues.length === 0) return "";
  const lines = issues
    .filter((i) => i.category === "copy" || i.category === "text_overlap")
    .map((i) => `- [${i.slot ?? "general"}] ${i.message}`);
  if (lines.length === 0) return "";
  return `\n\n## QA 1차 검수 수정 요청 (반드시 반영)\n${lines.join("\n")}`;
}
