"use client";

import { useState } from "react";
import { TOKEN_COST_CANVAS_AI_IMAGE } from "@/lib/cost/saas-pricing-config";
import { patchCanvasElement } from "@/lib/canvas-section-mutations";
import type { CanvasElement, CanvasSection } from "@/lib/types/generate";

export type CanvasProductContext = {
  category: string;
  productName: string;
  imageUrls: string[];
};

type CanvasAiImagePanelProps = {
  section: CanvasSection;
  element: Extract<CanvasElement, { kind: "ai-image" }>;
  productContext: CanvasProductContext;
  onChange: (section: CanvasSection) => void;
};

export default function CanvasAiImagePanel({
  section,
  element,
  productContext,
  onChange,
}: CanvasAiImagePanelProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patchAi(patch: Partial<Extract<CanvasElement, { kind: "ai-image" }>>) {
    onChange(patchCanvasElement(section, element.id, patch));
  }

  async function handleGenerate() {
    const prompt = element.prompt.trim();
    if (!prompt) {
      setError("프롬프트를 입력해 주세요.");
      return;
    }

    setGenerating(true);
    setError(null);
    patchAi({ status: "pending", locked: true });

    try {
      const res = await fetch("/api/canvas-ai-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          refImageUrl: element.refImageUrl ?? null,
          category: productContext.category,
          productName: productContext.productName,
          elementId: element.id,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        balance?: number;
        required?: number;
        resultUrl?: string;
      };

      if (res.status === 402 && json.error === "insufficient_credits") {
        setError(`토큰이 부족합니다. (필요 ${json.required ?? TOKEN_COST_CANVAS_AI_IMAGE}토큰)`);
        patchAi({ status: "failed", locked: false });
        return;
      }

      if (!res.ok || !json.resultUrl) {
        throw new Error(json.error ?? "AI 이미지 생성에 실패했습니다.");
      }

      patchAi({
        resultUrl: json.resultUrl,
        status: "done",
        locked: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI 이미지 생성에 실패했습니다.";
      setError(message);
      patchAi({ status: "failed", locked: false });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div
      className="rounded-xl border border-line bg-line/10 p-3"
      data-testid="canvas-ai-image-panel"
    >
      <p className="text-xs font-semibold text-ink">AI 이미지 생성</p>
      <p className="mt-0.5 text-[11px] text-ink/50">
        프롬프트와 참조 사진으로 이미지를 만듭니다 · {TOKEN_COST_CANVAS_AI_IMAGE}토큰/장
      </p>

      <label className="mt-3 block text-[11px] font-medium text-ink/70">
        프롬프트
        <textarea
          value={element.prompt}
          onChange={(e) => patchAi({ prompt: e.target.value })}
          rows={3}
          className="mt-1 w-full resize-none rounded-lg border border-line bg-paper px-2 py-1.5 text-xs text-ink"
          placeholder="예: 부드러운 아침 햇살, 미니멀 스튜디오 배경"
          data-testid="canvas-ai-prompt-input"
          disabled={generating}
        />
      </label>

      {productContext.imageUrls.length > 0 ? (
        <label className="mt-2 block text-[11px] font-medium text-ink/70">
          참조 사진 (선택)
          <select
            value={element.refImageUrl ?? ""}
            onChange={(e) => patchAi({ refImageUrl: e.target.value || undefined })}
            className="mt-1 w-full rounded-lg border border-line bg-paper px-2 py-1.5 text-xs text-ink"
            data-testid="canvas-ai-ref-select"
            disabled={generating}
          >
            <option value="">참조 없음 (텍스트만)</option>
            {productContext.imageUrls.map((url, index) => (
              <option key={url} value={url}>
                상품 사진 {index + 1}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={generating}
          className="inline-flex h-8 items-center rounded-lg bg-ink px-3 text-xs font-semibold text-paper disabled:opacity-50"
          data-testid="canvas-ai-generate-btn"
        >
          {generating ? "생성 중…" : element.status === "failed" ? "다시 생성" : "이미지 생성"}
        </button>
        {element.status === "done" && element.resultUrl ? (
          <span className="inline-flex h-8 items-center text-[11px] text-ink/50">완료됨</span>
        ) : null}
      </div>

      {error ? (
        <p className="mt-2 text-[11px] text-registration-red" data-testid="canvas-ai-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
