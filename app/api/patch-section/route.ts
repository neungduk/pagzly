import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { DetailSection } from "@/lib/types/generate";
import { isCosmeticsCategory, reviewCosmeticsCopy } from "@/lib/cosmetics-compliance";
import { isFoodCategory, reviewFoodCopy } from "@/lib/food-compliance";
import {
  analyzeReferenceImage,
  formatReferencePromptBlock,
  type ReferenceAnalysis,
} from "@/lib/reference-analysis";

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_MODEL = "deepseek-v4-flash";

type Body = {
  section: DetailSection;
  instruction: string;
  category?: string;
  productName?: string;
  /** 96차 — 사용자가 클릭한 필드의 경로 (예: "headline", "cards[1].body") */
  elementPath?: string;
  /** 96차 — 첨부 이미지(base64, data URL 또는 raw base64) */
  referenceImageBase64?: string;
  referenceImageMediaType?: "image/jpeg" | "image/png" | "image/webp";
  /** 클라이언트가 이미 분석한 경우(선택) — 보통은 서버에서만 분석 */
  referenceAnalysis?: { colorHex: string[]; moodKeywords: string[] };
};

function parseDataUrl(dataUrl: string): { buffer: Buffer; mediaType: "image/jpeg" | "image/png" } | null {
  const m = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i);
  if (!m) return null;
  const rawType = m[1].toLowerCase();
  const mediaType: "image/jpeg" | "image/png" =
    rawType === "image/png" ? "image/png" : "image/jpeg";
  try {
    return { buffer: Buffer.from(m[2], "base64"), mediaType };
  } catch {
    return null;
  }
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

    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json({ error: "DEEPSEEK_API_KEY가 없습니다." }, { status: 500 });
    }

    const body = (await request.json()) as Body;
    const instruction = body.instruction?.trim();
    if (!body.section || !instruction) {
      return NextResponse.json(
        { error: "section과 instruction이 필요합니다." },
        { status: 400 },
      );
    }

    let referenceAnalysis: ReferenceAnalysis | null = body.referenceAnalysis
      ? {
          colorHex: body.referenceAnalysis.colorHex ?? [],
          moodKeywords: body.referenceAnalysis.moodKeywords ?? [],
        }
      : null;

    if (!referenceAnalysis && body.referenceImageBase64) {
      const parsed =
        body.referenceImageBase64.startsWith("data:")
          ? parseDataUrl(body.referenceImageBase64)
          : {
              buffer: Buffer.from(body.referenceImageBase64, "base64"),
              mediaType: (body.referenceImageMediaType === "image/png"
                ? "image/png"
                : "image/jpeg") as "image/jpeg" | "image/png",
            };
      if (parsed) {
        const analyzed = await analyzeReferenceImage(parsed.buffer, parsed.mediaType);
        referenceAnalysis = {
          colorHex: analyzed.colorHex,
          moodKeywords: analyzed.moodKeywords,
        };
        console.log(
          `[patch-section] referenceAnalysis colors=${analyzed.colorHex.length} mood=${analyzed.moodKeywords.length} cost=${analyzed.cost}`,
        );
      }
    }

    const elementBlock = body.elementPath
      ? `\n## 타겟 필드\n사용자가 화면에서 "${body.elementPath}" 필드를 클릭하고 지시했습니다. 이 필드를 우선 수정하고, 다른 필드는 지시와 명백히 관련된 경우가 아니면 원문 그대로 유지하세요.\n`
      : "";

    const referenceBlock = referenceAnalysis
      ? `\n${formatReferencePromptBlock(referenceAnalysis)}\n`
      : "";

    const prompt = `당신은 이커머스 상세페이지 카피 편집기입니다.
아래 JSON 섹션을 사용자 지시에 맞게 **같은 type/slot 구조로** 수정한 JSON만 반환하세요.
구조(키)를 바꾸거나 새 필드를 추가하지 마세요. imageIndex·gifUrl·price 등 숫자/URL은 지시가 없으면 유지하세요.
과장 효능·의료 단정 표현은 피하세요.

## 상품
- 카테고리: ${body.category ?? ""}
- 상품명: ${body.productName ?? ""}
${elementBlock}${referenceBlock}
## 지시
${instruction}

## 현재 섹션 JSON
${JSON.stringify(body.section)}`;

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
      return NextResponse.json(
        { error: `DeepSeek 오류: ${rawBody.slice(0, 200)}` },
        { status: 502 },
      );
    }

    let patched: DetailSection;
    try {
      const parsed = JSON.parse(rawBody) as { choices?: { message?: { content?: string } }[] };
      const content = parsed.choices?.[0]?.message?.content ?? rawBody;
      const start = content.indexOf("{");
      const end = content.lastIndexOf("}");
      patched = JSON.parse(content.slice(start, end + 1)) as DetailSection;
    } catch {
      return NextResponse.json({ error: "섹션 JSON 파싱에 실패했습니다." }, { status: 502 });
    }

    if (patched.type !== body.section.type || patched.slot !== body.section.slot) {
      patched = { ...patched, type: body.section.type, slot: body.section.slot } as DetailSection;
    }

    const category = body.category ?? "";
    if (isCosmeticsCategory(category)) {
      const reviewed = reviewCosmeticsCopy({
        sections: [patched],
        headlines: [],
        description: "",
        features: [],
        howToUse: "",
        caution: "",
      });
      patched = reviewed.copy.sections[0] ?? patched;
    } else if (isFoodCategory(category)) {
      const reviewed = reviewFoodCopy({
        sections: [patched],
        headlines: [],
        description: "",
        features: [],
        howToUse: "",
        caution: "",
      });
      patched = reviewed.copy.sections[0] ?? patched;
    }

    return NextResponse.json({
      section: patched,
      referenceAnalysis: referenceAnalysis ?? null,
    });
  } catch (error) {
    console.error("[patch-section]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "섹션 수정 실패" },
      { status: 500 },
    );
  }
}
