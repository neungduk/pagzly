"use client";

import type { PhotoCostBreakdown } from "@/lib/types/generate";

export type GenerationCostStripProps = {
  photoCostBreakdown?: PhotoCostBreakdown;
  photoProcessingCost?: number;
  generationCost?: number;
  compact?: boolean;
};

function sumBreakdown(b: PhotoCostBreakdown | undefined): number {
  if (!b) return 0;
  return Object.values(b).reduce<number>((s, v) => s + (typeof v === "number" ? v : 0), 0);
}

function formatUsd(v: number): string {
  return `$${v.toFixed(4)}`;
}

export default function GenerationCostStrip({
  photoCostBreakdown,
  photoProcessingCost,
  generationCost,
  compact = false,
}: GenerationCostStripProps) {
  const photoTotal =
    photoProcessingCost != null && photoProcessingCost > 0
      ? photoProcessingCost
      : sumBreakdown(photoCostBreakdown);
  const textCost = generationCost != null && generationCost > photoTotal ? generationCost - photoTotal : 0;
  const total = (generationCost ?? 0) > 0 ? generationCost! : photoTotal + textCost;

  if (total <= 0 && photoTotal <= 0) return null;

  const parts: string[] = [];
  if ((photoCostBreakdown?.backdrop ?? 0) > 0) {
    parts.push(`배경 ${formatUsd(photoCostBreakdown!.backdrop!)}`);
  }
  if ((photoCostBreakdown?.sectionBackdrops ?? 0) > 0) {
    parts.push(`섹션배경 ${formatUsd(photoCostBreakdown!.sectionBackdrops!)}`);
  }
  if ((photoCostBreakdown?.enhance ?? 0) > 0) {
    parts.push(`보정 ${formatUsd(photoCostBreakdown!.enhance!)}`);
  }
  if ((photoCostBreakdown?.claude ?? 0) > 0) {
    parts.push(`카피 ${formatUsd(photoCostBreakdown!.claude!)}`);
  }
  if (textCost > 0.0001) {
    parts.push(`조립 ${formatUsd(textCost)}`);
  }

  return (
    <div
      className={`rounded-lg border border-line bg-line/20 ${
        compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"
      }`}
      data-testid="generation-cost-strip"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/45">
          AI 비용
        </span>
        <span className="font-semibold text-ink">{formatUsd(total)}</span>
        {!compact && photoTotal > 0 && generationCost != null && generationCost > photoTotal && (
          <span className="text-ink/55">이미지 {formatUsd(photoTotal)}</span>
        )}
      </div>
      {parts.length > 0 && (
        <p className={`mt-1 text-ink/55 ${compact ? "text-[11px]" : "text-xs"}`}>
          {parts.join(" · ")}
        </p>
      )}
    </div>
  );
}
