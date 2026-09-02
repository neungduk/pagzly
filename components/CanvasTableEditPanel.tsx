"use client";

import { patchCanvasElement } from "@/lib/canvas-section-mutations";
import type { CanvasElement, CanvasSection } from "@/lib/types/generate";

type CanvasTableEditPanelProps = {
  section: CanvasSection;
  element: Extract<CanvasElement, { kind: "table" }>;
  onChange: (section: CanvasSection) => void;
};

export default function CanvasTableEditPanel({
  section,
  element,
  onChange,
}: CanvasTableEditPanelProps) {
  function commitRows(rows: { label: string; value: string }[]) {
    onChange(patchCanvasElement(section, element.id, { rows }));
  }

  function updateRow(index: number, patch: Partial<{ label: string; value: string }>) {
    const next = element.rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    commitRows(next);
  }

  function removeRow(index: number) {
    if (element.rows.length <= 1) return;
    commitRows(element.rows.filter((_, i) => i !== index));
  }

  function addRow() {
    commitRows([...element.rows, { label: "새 항목", value: "" }]);
  }

  const canDelete = element.rows.length > 1;

  return (
    <div
      className="rounded-xl border border-line bg-line/10 p-3"
      data-testid="canvas-table-edit-panel"
    >
      <p className="text-xs font-semibold text-ink">표 내용 편집</p>
      <p className="mt-0.5 text-[11px] text-ink/50">라벨·값을 수정하거나 행을 추가·삭제합니다</p>

      <ul className="mt-3 space-y-2">
        {element.rows.map((row, index) => (
          <li
            key={`${element.id}-row-${index}`}
            className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-paper p-2"
            data-testid={`canvas-table-row-${index}`}
          >
            <label className="min-w-[7rem] flex-1 text-[11px] text-ink/60">
              라벨
              <input
                type="text"
                value={row.label}
                onChange={(e) => updateRow(index, { label: e.target.value })}
                className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-xs text-ink"
                data-testid={`canvas-table-label-${index}`}
              />
            </label>
            <label className="min-w-[7rem] flex-[2] text-[11px] text-ink/60">
              값
              <input
                type="text"
                value={row.value}
                onChange={(e) => updateRow(index, { value: e.target.value })}
                className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-xs text-ink"
                data-testid={`canvas-table-value-${index}`}
              />
            </label>
            <button
              type="button"
              onClick={() => removeRow(index)}
              disabled={!canDelete}
              className="inline-flex h-8 shrink-0 items-center rounded-md border border-line px-2 text-[11px] font-medium text-registration-red disabled:cursor-not-allowed disabled:opacity-40"
              data-testid={`canvas-table-delete-row-${index}`}
            >
              삭제
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={addRow}
        className="mt-3 inline-flex h-8 items-center rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:bg-line/20"
        data-testid="canvas-table-add-row"
      >
        행 추가
      </button>
    </div>
  );
}
