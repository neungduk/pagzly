"use client";

import { useEffect, useRef, useState } from "react";
import type { DetailSection } from "@/lib/types/generate";
import {
  getPatchSuggestions,
  type PatchChatMessage,
} from "@/lib/patch-section-suggestions";

type SectionPatchChatProps = {
  sections: DetailSection[];
  patchIndex: number;
  onPatchIndexChange: (index: number) => void;
  messages: PatchChatMessage[];
  instruction: string;
  onInstructionChange: (value: string) => void;
  onSubmit: (opts?: { referenceImageDataUrl?: string | null }) => void;
  loading?: boolean;
  selectedElementPath?: string | null;
  onClearElementPath?: () => void;
};

function SparkleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 1.5 11.6 7.4 17.5 9 11.6 10.6 10 16.5 8.4 10.6 2.5 9l5.9-1.6L10 1.5Z" />
      <path d="M15.5 12.5 16.2 15l2.5.7-2.5.7-.7 2.5-.7-2.5-2.5-.7 2.5-.7.7-2.5Z" opacity=".7" />
    </svg>
  );
}

function WandIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M3.5 16.5 13 7l1.5 1.5-9.5 9.5H3.5v-1.5Zm10.8-11.2 1.4-1.4 1.4 1.4-1.4 1.4-1.4-1.4ZM12 4.5l.8-1.8L14.5 2l-1.7-.7L12 0l-.8 1.3L9.5 2l1.7.7L12 4.5Z" />
    </svg>
  );
}

function ChevronDownIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ImageIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M4 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Zm3 8 1.5-2 2 2.5L13 10l3 4H4l3-2Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SendIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M3.3 2.1a1 1 0 0 1 1.1-.15l13 6.5a1 1 0 0 1 0 1.8l-13 6.5a1 1 0 0 1-1.4-1.2L4.8 11 12 10 4.8 9 3 3.3a1 1 0 0 1 .3-1.2Z" />
    </svg>
  );
}

function AlertIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M8.26 3.1a2 2 0 0 1 3.48 0l6.1 10.9A2 2 0 0 1 16.1 17H3.9a2 2 0 0 1-1.74-3l6.1-10.9ZM10 7a1 1 0 0 0-1 1v3a1 1 0 1 0 2 0V8a1 1 0 0 0-1-1Zm0 8a1.25 1.25 0 1 0 0-2.5A1.25 1.25 0 0 0 10 15Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function sectionLabel(section: DetailSection, _index: number): string {
  if (section.type === "hero") return section.headline;
  if ("heading" in section && section.heading) return section.heading;
  return section.slot;
}

export default function SectionPatchChat({
  sections,
  patchIndex,
  onPatchIndexChange,
  messages,
  instruction,
  onInstructionChange,
  onSubmit,
  loading,
  selectedElementPath,
  onClearElementPath,
}: SectionPatchChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const section = sections[patchIndex];
  const suggestions = getPatchSuggestions(section);
  const showSuggestions = messages.length === 0 && !loading;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading && instruction.trim()) onSubmit({ referenceImageDataUrl: previewUrl });
    }
  }

  function applySuggestion(text: string) {
    onInstructionChange(text);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setPreviewUrl(null);
  }

  return (
    <div className="space-y-3 p-4" data-testid="panel-patch">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-registration-red to-registration-red/60 text-paper">
          <SparkleIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">AI 채팅 수정</p>
          <p className="text-[11px] text-ink/50">섹션을 고르고 말하듯 지시하세요</p>
        </div>
      </div>

      <label className="block text-xs font-medium text-ink/70">
        수정할 섹션
        <div className="relative mt-1 flex items-center gap-2">
          <span
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-registration-red text-[10px] font-bold text-paper"
            aria-hidden="true"
          >
            {patchIndex + 1}
          </span>
          <div className="relative min-w-0 flex-1">
            <select
              data-testid="patch-section-index"
              className="h-10 w-full appearance-none rounded-xl border border-line bg-paper py-2 pr-9 pl-3 text-sm"
              value={patchIndex}
              onChange={(e) => onPatchIndexChange(Number(e.target.value))}
            >
              {sections.map((s, index) => (
                <option key={`${s.slot}-${index}`} value={index}>
                  {index + 1}. {sectionLabel(s, index)}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink/40">
              <ChevronDownIcon />
            </span>
          </div>
        </div>
      </label>

      {selectedElementPath ? (
        <div
          className="flex items-center justify-between gap-2 rounded-lg border border-registration-red/30 bg-registration-red/5 px-3 py-2 text-xs"
          data-testid="patch-selected-element"
        >
          <span className="min-w-0 truncate text-ink/80">
            선택됨: <span className="font-mono font-medium">{selectedElementPath}</span>
          </span>
          {onClearElementPath ? (
            <button
              type="button"
              onClick={onClearElementPath}
              className="shrink-0 text-ink/50 hover:text-ink"
            >
              해제
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="max-h-52 min-h-[120px] space-y-2 overflow-y-auto rounded-xl border border-line bg-line/10 p-3"
        data-testid="patch-chat-messages"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl bg-paper px-3 py-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-mustard/15 text-mustard">
              <SparkleIcon className="h-4 w-4" />
            </div>
            <p className="text-center text-xs text-ink/40">
              아래 추천을 누르거나, 원하는 수정을 입력해 보세요.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={`${msg.timestamp}-${i}`}
            className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role !== "user" ? (
              msg.role === "error" ? (
                <div className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-registration-red/10 text-registration-red">
                  <AlertIcon />
                </div>
              ) : (
                <div className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-registration-red/10 text-registration-red">
                  <SparkleIcon className="h-3 w-3" />
                </div>
              )
            ) : null}
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
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
          <div className="flex justify-start gap-2">
            <div className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-registration-red/10 text-registration-red">
              <SparkleIcon className="h-3 w-3" />
            </div>
            <div className="rounded-2xl border border-line bg-paper px-3 py-2 text-sm text-ink/50">
              수정 중…
            </div>
          </div>
        )}
      </div>

      {showSuggestions && (
        <div className="flex flex-wrap gap-2" data-testid="patch-suggestions">
          {suggestions.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => applySuggestion(text)}
              className="inline-flex items-center gap-1.5 rounded-full bg-mustard/15 px-3 py-1.5 text-xs font-medium text-mustard transition-colors hover:bg-mustard/25"
            >
              <WandIcon className="h-[11px] w-[11px]" />
              {text}
            </button>
          ))}
        </div>
      )}

      {previewUrl ? (
        <div className="flex items-center gap-2" data-testid="patch-reference-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="레퍼런스 미리보기"
            className="h-14 w-14 rounded-lg border border-line object-cover"
          />
          <button
            type="button"
            onClick={clearImage}
            className="text-xs text-ink/60 hover:text-ink"
          >
            이미지 제거
          </button>
        </div>
      ) : null}

      <div className="flex items-end gap-2 rounded-2xl border border-line bg-paper p-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          data-testid="patch-reference-input"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink/60 hover:bg-line/30 disabled:opacity-40"
          title="레퍼런스 이미지 첨부"
          aria-label="레퍼런스 이미지 첨부"
          data-testid="patch-reference-attach"
        >
          <ImageIcon />
        </button>
        <textarea
          data-testid="patch-instruction"
          className="min-h-[40px] flex-1 resize-none border-none bg-transparent px-1 py-2 text-sm outline-none focus:ring-0"
          placeholder='예: "더 짧게", "숫자 강조"'
          rows={2}
          value={instruction}
          onChange={(e) => onInstructionChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          type="button"
          data-testid="patch-submit"
          disabled={loading || !instruction.trim()}
          onClick={() => onSubmit({ referenceImageDataUrl: previewUrl })}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-registration-red text-paper hover:bg-registration-red/85 disabled:opacity-40"
          aria-label="전송"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
