"use client";

import { useEffect, useRef, useState } from "react";
import type { DetailSection } from "@/lib/types/generate";
import type { PatchChatMessage } from "@/lib/patch-section-suggestions";

type PageAction =
  | { type: "reorder"; from: number; to: number }
  | { type: "toggleHidden"; index: number };

type PageStructureChatProps = {
  sections: DetailSection[];
  hiddenIndexes: number[];
  onReorder: (from: number, to: number) => void;
  onToggleHidden: (index: number) => void;
};

function sectionShortLabel(section: DetailSection, index: number): string {
  if (section.type === "hero") return section.headline.slice(0, 24) || "히어로";
  if ("heading" in section && section.heading) return String(section.heading).slice(0, 24);
  return section.slot || `섹션 ${index + 1}`;
}

function summarizeActions(actions: PageAction[], sections: DetailSection[]): string {
  if (actions.length === 0) return "변경 사항이 없어요.";
  const parts = actions.map((a) => {
    if (a.type === "reorder") {
      const s = sections[a.from];
      const label = s ? sectionShortLabel(s, a.from) : `${a.from + 1}번`;
      return `「${label}」을(를) ${a.to + 1}번째로 옮김`;
    }
    const s = sections[a.index];
    const label = s ? sectionShortLabel(s, a.index) : `${a.index + 1}번`;
    return `「${label}」 표시/숨김 토글`;
  });
  if (parts.length === 1) return parts[0];
  return `${actions.length}개 변경 적용됨: ${parts.join("; ")}`;
}

export default function PageStructureChat({
  sections,
  hiddenIndexes,
  onReorder,
  onToggleHidden,
}: PageStructureChatProps) {
  const [instruction, setInstruction] = useState("");
  const [messages, setMessages] = useState<PatchChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function handleSubmit() {
    const text = instruction.trim();
    if (!text || loading) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", text, timestamp: Date.now() },
    ]);
    setInstruction("");
    setLoading(true);

    try {
      const res = await fetch("/api/patch-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections, hiddenIndexes, instruction: text }),
      });
      const data = (await res.json()) as {
        actions?: PageAction[];
        unsupportedNote?: string | null;
        error?: string;
      };

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "error",
            text: data.error ?? "구조 수정에 실패했습니다.",
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      const actions = data.actions ?? [];
      for (const action of actions) {
        if (action.type === "reorder") onReorder(action.from, action.to);
        else if (action.type === "toggleHidden") onToggleHidden(action.index);
      }

      if (data.unsupportedNote) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.unsupportedNote!, timestamp: Date.now() },
        ]);
      }

      if (actions.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: summarizeActions(actions, sections),
            timestamp: Date.now(),
          },
        ]);
      } else if (!data.unsupportedNote) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "적용할 변경을 찾지 못했어요. 순서 변경이나 숨기기만 가능해요.",
            timestamp: Date.now(),
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "error",
          text: err instanceof Error ? err.message : "요청 실패",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading && instruction.trim()) void handleSubmit();
    }
  }

  return (
    <div className="space-y-3 border-t border-line p-3" data-testid="panel-page-structure-chat">
      <p className="text-xs font-semibold text-ink">페이지 구조 AI</p>
      <p className="text-[11px] leading-relaxed text-ink/55">
        섹션 순서 변경·숨기기/다시 보이기를 채팅으로 지시할 수 있어요. 카피 수정은 섹션 AI를
        이용하세요.
      </p>

      <div
        ref={scrollRef}
        className="max-h-40 min-h-[72px] space-y-2 overflow-y-auto rounded-xl border border-line bg-line/10 p-2.5"
      >
        {messages.length === 0 && (
          <p className="text-center text-[11px] text-ink/40">
            예: &quot;리뷰 섹션을 맨 위로&quot;, &quot;비교표 숨겨줘&quot;
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={`${msg.timestamp}-${i}`}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] rounded-2xl px-2.5 py-1.5 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-ink text-paper"
                  : msg.role === "error"
                    ? "border border-registration-red/30 bg-registration-red/10 text-registration-red"
                    : "border border-line bg-paper text-ink/80"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-line bg-paper px-2.5 py-1.5 text-xs text-ink/50">
              해석 중…
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <textarea
          data-testid="page-structure-instruction"
          className="min-h-[40px] flex-1 resize-none rounded-xl border border-line bg-paper px-2.5 py-2 text-xs"
          placeholder='예: "리뷰를 히어로 바로 다음으로"'
          rows={2}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          type="button"
          data-testid="page-structure-submit"
          disabled={loading || !instruction.trim() || sections.length === 0}
          onClick={() => void handleSubmit()}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-registration-red px-3 text-xs font-semibold text-paper hover:bg-registration-red/85 disabled:opacity-40"
        >
          전송
        </button>
      </div>
    </div>
  );
}
