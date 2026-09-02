"use client";

import type { CategoryTheme } from "@/lib/category-theme";
import {
  applyCanvasThemeBackground,
  patchCanvasElementColorFromTheme,
} from "@/lib/canvas-section-mutations";
import type { CanvasElement, CanvasSection } from "@/lib/types/generate";

type CanvasThemePickerProps = {
  theme: CategoryTheme;
  section: CanvasSection;
  selectedElement: CanvasElement | null;
  onChange: (section: CanvasSection) => void;
};

const SWATCHES: { key: keyof CategoryTheme; label: string }[] = [
  { key: "baseNeutral", label: "바탕" },
  { key: "accentSoft", label: "소프트" },
  { key: "accent", label: "포인트" },
  { key: "deepAccent", label: "딥" },
];

export default function CanvasThemePicker({
  theme,
  section,
  selectedElement,
  onChange,
}: CanvasThemePickerProps) {
  function applySwatch(color: string) {
    if (!selectedElement) {
      onChange(applyCanvasThemeBackground(section, color));
      return;
    }
    onChange(patchCanvasElementColorFromTheme(section, selectedElement.id, color));
  }

  return (
    <div className="rounded-xl border border-line bg-line/10 p-3" data-testid="canvas-theme-picker">
      <p className="text-xs font-semibold text-ink">색상 테마</p>
      <p className="mt-0.5 text-[11px] text-ink/50">
        {selectedElement ? "선택 요소에 색 적용" : "캔버스 배경에 색 적용"}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {SWATCHES.map((item) => {
          const color = theme[item.key];
          if (typeof color !== "string") return null;
          return (
            <button
              key={item.key}
              type="button"
              title={item.label}
              data-testid={`canvas-theme-swatch-${item.key}`}
              className="inline-flex flex-col items-center gap-1"
              onClick={() => applySwatch(color)}
            >
              <span
                className="h-8 w-8 rounded-full border border-line shadow-sm"
                style={{ backgroundColor: color }}
              />
              <span className="text-[9px] text-ink/50">{item.label}</span>
            </button>
          );
        })}
      </div>

      {selectedElement ? (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          <p className="text-[11px] font-medium text-ink/70">요소 색상 직접 입력</p>
          {selectedElement.kind === "text" ? (
            <label className="block text-[11px] text-ink/60">
              글자색
              <input
                type="color"
                value={selectedElement.color ?? "#1B1B18"}
                onChange={(e) =>
                  onChange(
                    patchCanvasElementColorFromTheme(section, selectedElement.id, e.target.value),
                  )
                }
                className="mt-1 h-8 w-full cursor-pointer rounded border border-line"
                data-testid="canvas-element-color-input"
              />
            </label>
          ) : null}
          {selectedElement.kind === "shape" ? (
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] text-ink/60">
                채우기
                <input
                  type="color"
                  value={selectedElement.fill ?? "#ffffff"}
                  onChange={(e) =>
                    onChange({
                      ...section,
                      elements: section.elements.map((el) =>
                        el.id === selectedElement.id && el.kind === "shape"
                          ? { ...el, fill: e.target.value }
                          : el,
                      ),
                    })
                  }
                  className="mt-1 h-8 w-full cursor-pointer rounded border border-line"
                />
              </label>
              <label className="block text-[11px] text-ink/60">
                테두리
                <input
                  type="color"
                  value={selectedElement.stroke ?? "#1B1B18"}
                  onChange={(e) =>
                    onChange({
                      ...section,
                      elements: section.elements.map((el) =>
                        el.id === selectedElement.id && el.kind === "shape"
                          ? { ...el, stroke: e.target.value }
                          : el,
                      ),
                    })
                  }
                  className="mt-1 h-8 w-full cursor-pointer rounded border border-line"
                />
              </label>
            </div>
          ) : null}
          {selectedElement.kind === "table" ? (
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] text-ink/60">
                헤더
                <input
                  type="color"
                  value={selectedElement.headerColor ?? theme.accentSoft}
                  onChange={(e) =>
                    onChange({
                      ...section,
                      elements: section.elements.map((el) =>
                        el.id === selectedElement.id && el.kind === "table"
                          ? { ...el, headerColor: e.target.value }
                          : el,
                      ),
                    })
                  }
                  className="mt-1 h-8 w-full cursor-pointer rounded border border-line"
                />
              </label>
              <label className="block text-[11px] text-ink/60">
                테두리
                <input
                  type="color"
                  value={selectedElement.borderColor ?? theme.accent}
                  onChange={(e) =>
                    onChange({
                      ...section,
                      elements: section.elements.map((el) =>
                        el.id === selectedElement.id && el.kind === "table"
                          ? { ...el, borderColor: e.target.value }
                          : el,
                      ),
                    })
                  }
                  className="mt-1 h-8 w-full cursor-pointer rounded border border-line"
                />
              </label>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
