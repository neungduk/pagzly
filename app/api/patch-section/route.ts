import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { DetailSection } from "@/lib/types/generate";
import { isCosmeticsCategory, reviewCosmeticsCopy } from "@/lib/cosmetics-compliance";
import { isFoodCategory, reviewFoodCopy } from "@/lib/food-compliance";

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_MODEL = "deepseek-v4-flash";

type Body = {
  section: DetailSection;
  instruction: string;
  category?: string;
  productName?: string;
};

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

    const prompt = `당신은 이커머스 상세페이지 카피 편집기입니다.
아래 JSON 섹션을 사용자 지시에 맞게 **같은 type/slot 구조로** 수정한 JSON만 반환하세요.
구조(키)를 바꾸거나 새 필드를 추가하지 마세요. imageIndex·gifUrl·price 등 숫자/URL은 지시가 없으면 유지하세요.
과장 효능·의료 단정 표현은 피하세요.

## 상품
- 카테고리: ${body.category ?? ""}
- 상품명: ${body.productName ?? ""}

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

    return NextResponse.json({ section: patched });
  } catch (error) {
    console.error("[patch-section]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "섹션 수정 실패" },
      { status: 500 },
    );
  }
}
