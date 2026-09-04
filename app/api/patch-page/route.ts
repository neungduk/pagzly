import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { DetailSection } from "@/lib/types/generate";

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_MODEL = "deepseek-v4-flash";

type Body = {
  sections: DetailSection[];
  hiddenIndexes: number[];
  instruction: string;
};

type PageAction =
  | { type: "reorder"; from: number; to: number }
  | { type: "toggleHidden"; index: number };

type PageActionPlan = {
  actions: PageAction[];
  unsupportedNote?: string | null;
};

function sectionListLine(section: DetailSection, index: number, hidden: Set<number>): string {
  const label =
    section.type === "hero"
      ? `헤드라인: "${section.headline.slice(0, 40)}"`
      : "heading" in section && section.heading
        ? `heading: "${String(section.heading).slice(0, 40)}"`
        : `slot: ${section.slot}`;
  const hiddenNote = hidden.has(index) ? ", 현재 숨김" : "";
  return `${index}: ${section.type} (${label}${hiddenNote})`;
}

function validateActions(actions: unknown, sectionCount: number): PageAction[] {
  if (!Array.isArray(actions)) return [];
  const out: PageAction[] = [];
  for (const raw of actions.slice(0, 10)) {
    if (!raw || typeof raw !== "object") continue;
    const a = raw as Record<string, unknown>;
    if (a.type === "reorder") {
      const from = Number(a.from);
      const to = Number(a.to);
      if (!Number.isInteger(from) || !Number.isInteger(to)) continue;
      if (from < 0 || to < 0 || from >= sectionCount || to >= sectionCount) continue;
      if (from === to) continue;
      out.push({ type: "reorder", from, to });
    } else if (a.type === "toggleHidden") {
      const index = Number(a.index);
      if (!Number.isInteger(index)) continue;
      if (index < 0 || index >= sectionCount) continue;
      out.push({ type: "toggleHidden", index });
    }
  }
  return out;
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
    if (!Array.isArray(body.sections) || !instruction) {
      return NextResponse.json(
        { error: "sections와 instruction이 필요합니다." },
        { status: 400 },
      );
    }

    const hidden = new Set(body.hiddenIndexes ?? []);
    const listText = body.sections
      .map((s, i) => sectionListLine(s, i, hidden))
      .join("\n");

    const prompt = `당신은 이커머스 상세페이지 구조 편집기입니다.
아래는 현재 상세페이지의 섹션 순서입니다 (index는 0부터 시작):
${listText}

사용자 지시: "${instruction}"

이 지시를 아래 두 종류의 action으로만 표현해서 JSON으로 반환하세요:
- {"type":"reorder","from":<현재 index>,"to":<옮길 index>}
- {"type":"toggleHidden","index":<index>}

새로운 섹션을 만들거나, 섹션을 완전히 삭제하거나, 섹션 내용을 고치는 지시는 이 기능으로 처리할 수 없습니다.
그런 지시라면 actions는 빈 배열로 두고 unsupportedNote에 사용자에게 보여줄 짧은 안내 문장을 한국어로 쓰세요
(예: "죄송해요, 새 섹션 추가는 아직 지원하지 않아요. 섹션 순서 변경이나 숨기기만 가능해요.").

{"actions": [...], "unsupportedNote": "..." | null}`;

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
        temperature: 0.3,
      }),
    });

    const rawBody = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        { error: `DeepSeek 오류: ${rawBody.slice(0, 200)}` },
        { status: 502 },
      );
    }

    let plan: PageActionPlan;
    try {
      const parsed = JSON.parse(rawBody) as { choices?: { message?: { content?: string } }[] };
      const content = parsed.choices?.[0]?.message?.content ?? rawBody;
      const start = content.indexOf("{");
      const end = content.lastIndexOf("}");
      plan = JSON.parse(content.slice(start, end + 1)) as PageActionPlan;
    } catch {
      return NextResponse.json({ error: "페이지 액션 JSON 파싱에 실패했습니다." }, { status: 502 });
    }

    const validatedActions = validateActions(plan.actions, body.sections.length);

    return NextResponse.json({
      actions: validatedActions,
      unsupportedNote: plan.unsupportedNote ?? null,
    });
  } catch (error) {
    console.error("[patch-page]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "페이지 구조 수정 실패" },
      { status: 500 },
    );
  }
}
