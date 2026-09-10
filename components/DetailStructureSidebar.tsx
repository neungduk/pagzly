"use client";

import PageStructureChat from "@/components/PageStructureChat";
import { slotDisplayLabel } from "@/components/GeneratingOverlay";
import { getSlotTemplate } from "@/lib/section-templates";
import { getSectionFrameworkLabel } from "@/lib/section-persuasion-labels";
import type { DetailSection } from "@/lib/types/generate";

function slotNoteFor(category: string, slot: string): string {
  const defs = getSlotTemplate(category);
  return defs.find((d) => d.slot === slot)?.note ?? slot;
}

function EyeIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 4.5c-3.8 0-7 2.4-8.5 5.5C3 13.1 6.2 15.5 10 15.5s7-2.4 8.5-5.5C17 6.9 13.8 4.5 10 4.5Zm0 9a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" />
      <path d="M10 8.25a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5Z" />
    </svg>
  );
}

function EyeOffIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06L3.28 2.22Z" />
      <path d="M7.1 5.04A8.7 8.7 0 0 1 10 4.5c3.8 0 7 2.4 8.5 5.5a10.4 10.4 0 0 1-2.36 3.05l-1.1-1.1A8.7 8.7 0 0 0 16.9 10C15.6 7.6 13 6 10 6c-.6 0-1.18.07-1.73.2L7.1 5.04ZM5.46 6.58 4.2 5.32A10.5 10.5 0 0 0 1.5 10c1.5 3.1 4.7 5.5 8.5 5.5 1.1 0 2.15-.2 3.12-.55l-1.25-1.25c-.58.2-1.21.3-1.87.3-3 0-5.6-1.6-6.9-4 .4-.75 1-1.45 1.66-2.02l-.3-.4Z" />
      <path d="M9.2 8.32a2.5 2.5 0 0 0 2.48 2.48l-2.48-2.48Z" />
    </svg>
  );
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
          const frameworkLabel = getSectionFrameworkLabel(section.type);
          return (
            <li
              key={`${section.type}-${section.slot}-${index}`}
              className={`rounded-lg border px-2 py-1.5 ${
                isHidden
                  ? "border-line/50 bg-line/10 opacity-55"
                  : active
                    ? "border-registration-red/30 bg-registration-red/10"
                    : "border-line bg-paper"
              }`}
            >
              <button
                type="button"
                className="flex w-full items-start gap-2 text-left"
                onClick={() => onSelectSection?.(index)}
              >
                <span className="mt-0.5 inline-flex w-5 shrink-0 items-center gap-1 font-mono text-[10px] text-ink/40">
                  {active ? (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-registration-red" />
                  ) : (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-transparent" />
                  )}
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="min-w-0 truncate text-xs font-medium text-ink">{title}</p>
                    {frameworkLabel ? (
                      <span
                        data-testid="section-framework-badge"
                        className="shrink-0 rounded bg-slate-blue/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-slate-blue"
                      >
                        {frameworkLabel}
                      </span>
                    ) : null}
                  </div>
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
                  {isHidden ? <EyeIcon /> : <EyeOffIcon />}
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
