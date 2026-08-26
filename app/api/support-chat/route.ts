import { NextResponse } from "next/server";
import {
  buildSupportChatSystemPrompt,
  SUPPORT_CONTACT_EMAIL,
} from "@/lib/support-chat-prompt";

const DEEPSEEK_MODEL = "deepseek-v4-flash";
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 2000;

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type SupportChatBody = {
  messages?: ChatMessage[];
};

function isValidMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const msg = value as Record<string, unknown>;
  const role = msg.role;
  const content = msg.content;
  return (
    (role === "user" || role === "assistant") &&
    typeof content === "string" &&
    content.trim().length > 0 &&
    content.length <= MAX_CONTENT_LENGTH
  );
}

export async function POST(request: Request) {
  try {
    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: "상담 서비스를 일시적으로 이용할 수 없습니다." },
        { status: 503 },
      );
    }

    let body: SupportChatBody;
    try {
      body = (await request.json()) as SupportChatBody;
    } catch {
      return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: "messages 배열이 필요합니다." }, { status: 400 });
    }

    if (body.messages.length > MAX_MESSAGES) {
      return NextResponse.json(
        { error: `대화는 최대 ${MAX_MESSAGES}개 메시지까지 가능합니다.` },
        { status: 400 },
      );
    }

    if (!body.messages.every(isValidMessage)) {
      return NextResponse.json({ error: "메시지 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const last = body.messages[body.messages.length - 1];
    if (last.role !== "user") {
      return NextResponse.json(
        { error: "마지막 메시지는 user 역할이어야 합니다." },
        { status: 400 },
      );
    }

    const systemPrompt = buildSupportChatSystemPrompt();
    const response = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...body.messages.map((m) => ({ role: m.role, content: m.content.trim() })),
        ],
        temperature: 0.3,
      }),
    });

    const rawBody = await response.text();
    if (!response.ok) {
      console.error("[support-chat] DeepSeek error:", rawBody.slice(0, 500));
      return NextResponse.json(
        { error: "AI 응답 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." },
        { status: 502 },
      );
    }

    const data = JSON.parse(rawBody) as {
      choices?: { message?: { content?: string; reasoning_content?: string } }[];
    };

    const firstMessage = data.choices?.[0]?.message;
    const reply =
      firstMessage?.content?.trim() ||
      firstMessage?.reasoning_content?.trim() ||
      "";

    if (!reply) {
      return NextResponse.json(
        {
          reply: `죄송합니다. 답변을 생성하지 못했습니다. 정확한 안내를 위해 ${SUPPORT_CONTACT_EMAIL}으로 문의해 주세요.`,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("[support-chat]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "알 수 없는 오류" },
      { status: 500 },
    );
  }
}
