"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

const WELCOME_MESSAGE =
  "안녕하세요! Pagzly 이용 방법, 기능, 요금제에 대해 궁금한 점을 물어보세요.";

/** **텍스트** 마크다운 볼드만 <strong>으로 변환 */
function renderBoldMarkdown(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    const match = /^\*\*(.+)\*\*$/.exec(part);
    if (match) {
      return <strong key={index}>{match[1]}</strong>;
    }
    return part;
  });
}

export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: WELCOME_MESSAGE },
  ]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "응답을 받지 못했습니다.");
      }

      setMessages([
        ...nextMessages,
        { role: "assistant", content: data.reply ?? "답변을 생성하지 못했습니다." },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="transition-colors hover:text-ink"
        data-testid="support-chat-trigger"
      >
        문의하기
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-end p-4 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-ink/20"
            aria-label="상담창 닫기"
            onClick={() => setOpen(false)}
          />
          <div
            className="relative flex h-[min(32rem,85svh)] w-full max-w-md flex-col border border-line bg-paper shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-chat-title"
            data-testid="support-chat-panel"
          >
            <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
              <div>
                <h2 id="support-chat-title" className="text-sm font-semibold text-ink">
                  Pagzly AI 상담
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-ink/55">
                  Pagzly AI 상담봇입니다. 서비스 이용 관련 질문에 답변해 드려요.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 px-2 py-1 font-mono text-lg text-ink/40 transition-colors hover:text-ink"
                aria-label="닫기"
              >
                ×
              </button>
            </header>

            <div
              ref={listRef}
              className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
              data-testid="support-chat-messages"
            >
              {messages.map((message, index) => {
                const isUser = message.role === "user";
                return (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] px-3 py-2 text-sm leading-relaxed ${
                        isUser
                          ? "bg-ink text-paper"
                          : "border border-line bg-white text-ink/80"
                      }`}
                    >
                      {renderBoldMarkdown(message.content)}
                    </div>
                  </div>
                );
              })}
              {loading && (
                <div className="flex justify-start">
                  <div className="border border-line bg-white px-3 py-2 text-sm text-ink/50">
                    답변 작성 중…
                  </div>
                </div>
              )}
            </div>

            {error && (
              <p className="px-4 pb-2 text-xs text-registration-red" role="alert">
                {error}
              </p>
            )}

            <footer className="border-t border-line p-3">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  placeholder="메시지를 입력하세요"
                  disabled={loading}
                  className="min-h-[2.75rem] flex-1 resize-none border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-ink/40 disabled:opacity-60"
                  data-testid="support-chat-input"
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={loading || !input.trim()}
                  className="shrink-0 bg-ink px-4 text-sm font-medium text-paper transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="support-chat-send"
                >
                  전송
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
