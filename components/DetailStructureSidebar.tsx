"use client";

import PageStructureChat from "@/components/PageStructureChat";
import { slotDisplayLabel } from "@/components/GeneratingOverlay";
import { getSlotTemplate } from "@/lib/section-templates";
import type { DetailSection } from "@/lib/types/generate";

function slotNoteFor(category: string, slot: string): string {
  const defs = getSlotTemplate(category);
  return defs.find((d) => d.slot === slot)?.note ?? slot;
}

type DetailStructureSidebarProps = {
  sections: DetailSection[];
  hiddenIndexes: number[];
  selectedIndex?: number;
  onSelectSection?: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  onToggleHidden: (index: number) => void;
  onAddCanvas?: () => void;
  category?: string;
};

export default function DetailStructureSidebar({
  sections,
  hiddenIndexes,
  selectedIndex,
  onSelectSection,
  onReorder,
  onToggleHidden,
  onAddCanvas,
  category,
}: DetailStructureSidebarProps) {
  const hidden = new Set(hiddenIndexes);
  const btn =
    "inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-xs font-semibold text-ink hover:bg-line/30 disabled:opacity-40";

  return (
    <div
      className="flex max-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border-2 border-ink/15 bg-paper shadow-sm"
      data-testid="desktop-structure-sidebar"
    >
      <div className="border-b border-line bg-line/20 px-3 py-2.5">
        <p className="text-xs font-semibold text-ink">섹션 목록</p>
        <p className="text-[11px] text-ink/50">클릭하면 미리보기로 이동</p>
      </div>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {sections.map((section, index) => {
          const isHidden = hidden.has(index);
          const slotLabel = slotDisplayLabel(
            section.slot,
            slotNoteFor(category ?? "기타", section.slot),
          );
          const title =
            section.type === "canvas"
              ? "자유 캔버스"
              : section.type === "hero"
              ? section.headline
              : "heading" in section && section.heading
                ? section.heading
                : slotLabel;
          const active = selectedIndex === index;
          return (
            <li
              key={`${section.type}-${section.slot}-${index}`}
              className={`rounded-lg border px-2 py-1.5 ${
                isHidden
                  ? "border-line/50 bg-line/10 opacity-55"
                  : active
                    ? "border-ink/30 bg-ink/5"
                    : "border-line bg-paper"
              }`}
            >
              <button
                type="button"
                className="flex w-full items-start gap-2 text-left"
                onClick={() => onSelectSection?.(index)}
              >
                <span className="mt-0.5 w-5 shrink-0 font-mono text-[10px] text-ink/40">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-ink">{title}</p>
                  <p className="truncate text-[10px] text-ink/45">{slotLabel}</p>
                </div>
              </button>
              <div className="mt-1 flex justify-end gap-1">
                <button
                  type="button"
                  className={btn}
                  disabled={index === 0}
                  onClick={() => onReorder(index, index - 1)}
                  aria-label="위로"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={btn}
                  disabled={index >= sections.length - 1}
                  onClick={() => onReorder(index, index + 1)}
                  aria-label="아래로"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className={btn}
                  onClick={() => onToggleHidden(index)}
                  aria-label={isHidden ? "표시" : "숨기기"}
                >
                  {isHidden ? "👁" : "−"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {sections.length > 0 ? (
        <PageStructureChat
          sections={sections}
          hiddenIndexes={hiddenIndexes}
          onReorder={onReorder}
          onToggleHidden={onToggleHidden}
        />
      ) : null}
      {onAddCanvas ? (
        <div className="border-t border-line p-2">
          <button
            type="button"
            onClick={onAddCanvas}
            className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-dashed border-line text-xs font-semibold text-ink hover:bg-line/20"
            data-testid="add-canvas-section"
          >
            자유 캔버스 추가
          </button>
        </div>
      ) : null}
    </div>
  );
}
