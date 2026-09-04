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
      <p className="text-xs leading-relaxed text-ink/55">
        섹션을 고르고 채팅처럼 지시하면 AI가 같은 구조로 카피를 수정합니다. 저장을 눌러야
        유지됩니다.
      </p>

      <label className="block text-xs font-medium text-ink/70">
        수정할 섹션
        <select
          data-testid="patch-section-index"
          className="mt-1 h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm"
          value={patchIndex}
          onChange={(e) => onPatchIndexChange(Number(e.target.value))}
        >
          {sections.map((s, index) => (
            <option key={`${s.slot}-${index}`} value={index}>
              {index + 1}. {sectionLabel(s, index)}
            </option>
          ))}
        </select>
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
          <p className="text-center text-xs text-ink/40">
            아래 추천을 누르거나, 원하는 수정을 입력해 보세요.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={`${msg.timestamp}-${i}`}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
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
          <div className="flex justify-start">
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
              className="rounded-full border border-line bg-paper px-3 py-1.5 text-xs text-ink/70 transition-colors hover:border-ink/30 hover:bg-line/30"
            >
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

      <div className="flex gap-2">
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
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-line px-3 text-xs font-medium text-ink/70 hover:bg-line/30 disabled:opacity-40"
          title="레퍼런스 이미지 첨부"
          data-testid="patch-reference-attach"
        >
          이미지
        </button>
        <textarea
          data-testid="patch-instruction"
          className="min-h-[44px] flex-1 resize-none rounded-xl border border-line bg-paper px-3 py-2 text-sm"
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
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-registration-red px-4 text-sm font-semibold text-paper hover:bg-registration-red/85 disabled:opacity-40"
        >
          전송
        </button>
      </div>
    </div>
  );
}
