"use client";

import type { CanvasElement, CanvasSection } from "@/lib/types/generate";
import {
  canvasElementLabel,
  removeCanvasElement,
  toggleCanvasElementHidden,
  toggleCanvasElementLocked,
} from "@/lib/canvas-section-mutations";
import { sortCanvasElements } from "@/lib/canvas-section-layout";

type CanvasLayerPanelProps = {
  section: CanvasSection;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (section: CanvasSection) => void;
};

export default function CanvasLayerPanel({
  section,
  selectedId,
  onSelect,
  onChange,
}: CanvasLayerPanelProps) {
  const layers = [...section.elements].sort((a, b) => b.z - a.z);

  return (
    <div
      className="rounded-xl border border-line bg-paper p-3"
      data-testid="canvas-layer-panel"
    >
      <p className="text-xs font-semibold text-ink">캔버스 레이어</p>
      <p className="mt-0.5 text-[11px] text-ink/50">요소를 선택해 드래그·크기 조절</p>
      <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
        {layers.length === 0 ? (
          <li className="text-[11px] text-ink/45">요소가 없습니다. 아래에서 추가하세요.</li>
        ) : (
          layers.map((element) => {
            const active = selectedId === element.id;
            return (
              <li
                key={element.id}
                className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 ${
                  active ? "border-ink/30 bg-ink/5" : "border-line"
                }`}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-[11px] font-medium text-ink"
                  onClick={() => onSelect(element.id)}
                >
                  {canvasElementLabel(element)}
                </button>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-xs"
                  aria-label={element.hidden ? "표시" : "숨기기"}
                  data-testid={`canvas-layer-hide-${element.id}`}
                  onClick={() => onChange(toggleCanvasElementHidden(section, element.id))}
                >
                  {element.hidden ? "○" : "●"}
                </button>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-xs"
                  aria-label={element.locked ? "잠금 해제" : "잠금"}
                  data-testid={`canvas-layer-lock-${element.id}`}
                  onClick={() => onChange(toggleCanvasElementLocked(section, element.id))}
                >
                  {element.locked ? "🔒" : "🔓"}
                </button>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-xs text-registration-red"
                  aria-label="삭제"
                  data-testid={`canvas-layer-delete-${element.id}`}
                  onClick={() => {
                    onChange(removeCanvasElement(section, element.id));
                    if (selectedId === element.id) onSelect(null);
                  }}
                >
                  ×
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
