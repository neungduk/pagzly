"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import SectionImage from "@/components/SectionImage";
import CanvasLayerPanel from "@/components/CanvasLayerPanel";
import CanvasThemePicker from "@/components/CanvasThemePicker";
import CanvasAiImagePanel, { type CanvasProductContext } from "@/components/CanvasAiImagePanel";
import CanvasTableEditPanel from "@/components/CanvasTableEditPanel";
import type { CategoryTheme } from "@/lib/category-theme";
import {
  CANVAS_TEXT_ROLE_STYLES,
  resolveCanvasImageSrc,
  sortCanvasElements,
} from "@/lib/canvas-section-layout";
import {
  createCanvasAiImageElement,
  createCanvasImageElement,
  createCanvasShapeElement,
  createCanvasTableElement,
  createCanvasTextElement,
  patchCanvasElement,
  visibleCanvasElements,
} from "@/lib/canvas-section-mutations";
import type { CanvasElement, CanvasSection } from "@/lib/types/generate";
import { useCanvasMobileEdit } from "@/lib/use-canvas-mobile-edit";

type CanvasSectionEditApi = {
  enabled: boolean;
  onChange: (section: CanvasSection) => void;
};

type CanvasSectionRendererProps = {
  section: CanvasSection;
  imageUrls: string[];
  productName?: string;
  theme?: CategoryTheme;
  productContext?: CanvasProductContext;
  edit?: CanvasSectionEditApi;
};

function clampPercent(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function CanvasElementContent({
  element,
  imageUrls,
  productName,
  editingText,
  onTextCommit,
}: {
  element: CanvasElement;
  imageUrls: string[];
  productName?: string;
  editingText?: boolean;
  onTextCommit?: (text: string) => void;
}) {
  if (element.kind === "text") {
    const roleStyle = CANVAS_TEXT_ROLE_STYLES[element.role];
    if (editingText && onTextCommit) {
      return (
        <textarea
          autoFocus
          defaultValue={element.text}
          className="h-full w-full resize-none border border-ink/30 bg-paper/95 p-1 text-sm outline-none"
          onBlur={(e) => onTextCommit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        />
      );
    }
    return (
      <div
        className="flex h-full w-full items-center overflow-hidden"
        style={{
          justifyContent:
            element.align === "center"
              ? "center"
              : element.align === "right"
                ? "flex-end"
                : "flex-start",
          fontSize: element.fontSize ?? roleStyle.fontSize,
          fontWeight: roleStyle.fontWeight,
          lineHeight: roleStyle.lineHeight,
          color: element.color ?? "#1B1B18",
          textAlign: element.align ?? "left",
        }}
      >
        <span className="w-full whitespace-pre-wrap">{element.text}</span>
      </div>
    );
  }

  if (element.kind === "image") {
    const src = resolveCanvasImageSrc(imageUrls, element);
    const radius = element.radius ?? 0;
    return (
      <div className="h-full w-full overflow-hidden" style={{ borderRadius: radius }}>
        {src ? (
          <SectionImage
            src={src}
            alt={productName ? `${productName} 캔버스 이미지` : "캔버스 이미지"}
            fallbackSrc={imageUrls[0]}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-line/30 text-[10px] text-ink/50">
            이미지 없음
          </div>
        )}
      </div>
    );
  }

  if (element.kind === "table") {
    const headerColor = element.headerColor ?? "#F0EEEA";
    const borderColor = element.borderColor ?? "#1B1B18";
    return (
      <table
        className="h-full w-full border-collapse text-[10px] leading-tight"
        style={{ border: `1px solid ${borderColor}` }}
      >
        <tbody>
          {element.rows.map((row) => (
            <tr key={row.label}>
              <td
                className="w-[38%] px-1.5 py-1 font-semibold"
                style={{ backgroundColor: headerColor, border: `1px solid ${borderColor}` }}
              >
                {row.label}
              </td>
              <td className="px-1.5 py-1" style={{ border: `1px solid ${borderColor}` }}>
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (element.kind === "ai-image") {
    const radius = element.radius ?? 0;
    if (element.status === "done" && element.resultUrl) {
      return (
        <div className="h-full w-full overflow-hidden" style={{ borderRadius: radius }}>
          <SectionImage
            src={element.resultUrl}
            alt={productName ? `${productName} AI 이미지` : "AI 생성 이미지"}
            className="h-full w-full object-cover"
          />
        </div>
      );
    }
    const label =
      element.status === "failed"
        ? "생성 실패 — 다시 시도"
        : element.status === "pending"
          ? "AI 이미지 생성 대기"
          : "AI 이미지";
    const tone =
      element.status === "failed"
        ? "border-registration-red/40 bg-registration-red/5 text-registration-red"
        : "border-dashed border-ink/25 bg-line/20 text-ink/50";
    return (
      <div
        className={`flex h-full w-full items-center justify-center border p-2 text-center text-[10px] leading-snug ${tone}`}
        style={{ borderRadius: radius }}
        data-testid={`canvas-ai-placeholder-${element.status}`}
      >
        {label}
      </div>
    );
  }

  if (element.kind === "shape" && element.shape === "circle") {
    return (
      <div
        className="h-full w-full"
        style={{
          borderRadius: "50%",
          backgroundColor: element.fill ?? "transparent",
          border: element.stroke ? `2px solid ${element.stroke}` : undefined,
        }}
      />
    );
  }

  if (element.kind === "shape" && element.shape === "line") {
    return (
      <div className="flex h-full w-full items-center">
        <div
          className="w-full"
          style={{
            height: "2px",
            backgroundColor: element.fill ?? element.stroke ?? "#1B1B18",
          }}
        />
      </div>
    );
  }

  if (element.kind === "shape") {
    return (
      <div
        className="h-full w-full"
        style={{
          borderRadius: 12,
          backgroundColor: element.fill ?? "transparent",
          border: element.stroke ? `2px solid ${element.stroke}` : undefined,
        }}
      />
    );
  }

  return null;
}

const StaticCanvasElement = memo(function StaticCanvasElement({
  element,
  imageUrls,
  productName,
}: {
  element: CanvasElement;
  imageUrls: string[];
  productName?: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${element.x}%`,
        top: `${element.y}%`,
        width: `${element.w}%`,
        height: `${element.h}%`,
        zIndex: element.z,
      }}
      data-testid={`canvas-element-${element.id}`}
    >
      <CanvasElementContent element={element} imageUrls={imageUrls} productName={productName} />
    </div>
  );
});

const EditableCanvasElement = memo(function EditableCanvasElement({
  element,
  frameSize,
  imageUrls,
  productName,
  selected,
  onSelect,
  onUpdate,
}: {
  element: CanvasElement;
  frameSize: { width: number; height: number };
  imageUrls: string[];
  productName?: string;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (patch: Partial<CanvasElement>) => void;
}) {
  const [editingText, setEditingText] = useState(false);
  const width = frameSize.width;
  const height = frameSize.height;

  if (element.hidden) return null;

  const xPx = (element.x / 100) * width;
  const yPx = (element.y / 100) * height;
  const wPx = (element.w / 100) * width;
  const hPx = (element.h / 100) * height;

  return (
    <Rnd
      size={{ width: wPx, height: hPx }}
      position={{ x: xPx, y: yPx }}
      bounds="parent"
      disableDragging={element.locked}
      enableResizing={!element.locked}
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDragStop={(_e, data) => {
        onUpdate({
          x: clampPercent((data.x / width) * 100),
          y: clampPercent((data.y / height) * 100),
        });
      }}
      onResizeStop={(_e, _dir, ref, _delta, position) => {
        onUpdate({
          x: clampPercent((position.x / width) * 100),
          y: clampPercent((position.y / height) * 100),
          w: clampPercent((ref.offsetWidth / width) * 100, 4),
          h: clampPercent((ref.offsetHeight / height) * 100, 4),
        });
      }}
      style={{ zIndex: element.z }}
      className={`${selected ? "ring-2 ring-registration-red ring-offset-1" : ""}`}
      data-testid={`canvas-element-${element.id}`}
    >
      <div
        className="h-full w-full"
        onDoubleClick={() => {
          if (element.kind === "text" && !element.locked) setEditingText(true);
        }}
      >
        <CanvasElementContent
          element={element}
          imageUrls={imageUrls}
          productName={productName}
          editingText={editingText}
          onTextCommit={(text) => {
            setEditingText(false);
            onUpdate({ text } as Partial<CanvasElement>);
          }}
        />
      </div>
    </Rnd>
  );
});

export default function CanvasSectionRenderer({
  section,
  imageUrls,
  productName,
  theme,
  productContext,
  edit,
}: CanvasSectionRendererProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isMobileEdit = useCanvasMobileEdit();

  const measureFrame = useCallback(() => {
    const el = frameRef.current;
    if (!el) return;
    setFrameSize({ width: el.clientWidth, height: el.clientHeight });
  }, []);

  useEffect(() => {
    measureFrame();
    const el = frameRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measureFrame());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureFrame]);

  const bgColor = section.background?.color ?? "#f5f3ee";
  const bgImage = section.background?.imageUrl;
  const editing = Boolean(edit?.enabled);
  const elements = editing
    ? section.elements
    : visibleCanvasElements(section.elements, { hideIncompleteAi: true });
  const sortedElements = useMemo(() => sortCanvasElements(elements), [elements]);
  const useInteractiveEdit = editing && !isMobileEdit && frameSize.width > 0;

  function commitSection(next: CanvasSection) {
    edit?.onChange(next);
  }

  function updateElement(elementId: string, patch: Partial<CanvasElement>) {
    commitSection(patchCanvasElement(section, elementId, patch));
  }

  function handleAddText() {
    const el = createCanvasTextElement("body", section.elements);
    commitSection({ ...section, elements: [...section.elements, el] });
    setSelectedId(el.id);
  }

  function handleAddImage() {
    const el = createCanvasImageElement(section.elements, 0);
    commitSection({ ...section, elements: [...section.elements, el] });
    setSelectedId(el.id);
  }

  function handleAddShape(shape: "rect" | "circle" | "line") {
    const el = createCanvasShapeElement(shape, section.elements, {
      fill: theme?.accentSoft,
      stroke: theme?.deepAccent,
    });
    commitSection({ ...section, elements: [...section.elements, el] });
    setSelectedId(el.id);
  }

  function handleAddTable() {
    const el = createCanvasTableElement(section.elements, {
      headerColor: theme?.accentSoft,
      borderColor: theme?.accent,
    });
    commitSection({ ...section, elements: [...section.elements, el] });
    setSelectedId(el.id);
  }

  function handleAddAiImage() {
    const el = createCanvasAiImageElement(section.elements);
    commitSection({ ...section, elements: [...section.elements, el] });
    setSelectedId(el.id);
  }

  const selectedElement = selectedId
    ? (section.elements.find((el) => el.id === selectedId) ?? null)
    : null;

  return (
    <section data-testid="canvas-section" className="w-full" style={{ backgroundColor: bgColor }}>
      {editing ? (
        <div className="mb-3 flex flex-wrap gap-2 px-1" data-testid="canvas-edit-toolbar">
          <button
            type="button"
            onClick={handleAddText}
            className="inline-flex h-8 items-center rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:bg-line/20"
            data-testid="canvas-add-text"
          >
            텍스트 추가
          </button>
          <button
            type="button"
            onClick={handleAddImage}
            className="inline-flex h-8 items-center rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:bg-line/20"
            data-testid="canvas-add-image"
          >
            이미지 추가
          </button>
          <button
            type="button"
            onClick={() => handleAddShape("rect")}
            className="inline-flex h-8 items-center rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:bg-line/20"
            data-testid="canvas-add-rect"
          >
            사각형
          </button>
          <button
            type="button"
            onClick={() => handleAddShape("circle")}
            className="inline-flex h-8 items-center rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:bg-line/20"
            data-testid="canvas-add-circle"
          >
            원
          </button>
          <button
            type="button"
            onClick={() => handleAddShape("line")}
            className="inline-flex h-8 items-center rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:bg-line/20"
            data-testid="canvas-add-line"
          >
            선
          </button>
          <button
            type="button"
            onClick={handleAddTable}
            className="inline-flex h-8 items-center rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:bg-line/20"
            data-testid="canvas-add-table"
          >
            표
          </button>
          <button
            type="button"
            onClick={handleAddAiImage}
            className="inline-flex h-8 items-center rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:bg-line/20"
            data-testid="canvas-add-ai-image"
          >
            AI 이미지
          </button>
        </div>
      ) : null}

      {editing &&
      productContext &&
      selectedElement?.kind === "ai-image" ? (
        <div className="mb-3 px-1">
          <CanvasAiImagePanel
            section={section}
            element={selectedElement}
            productContext={productContext}
            onChange={commitSection}
          />
        </div>
      ) : null}

      {editing && selectedElement?.kind === "table" ? (
        <div className="mb-3 px-1">
          <CanvasTableEditPanel
            section={section}
            element={selectedElement}
            onChange={commitSection}
          />
        </div>
      ) : null}

      {editing && isMobileEdit ? (
        <div
          className="mb-3 rounded-lg border border-line bg-line/15 px-3 py-2 text-[11px] leading-snug text-ink/65"
          data-testid="canvas-mobile-edit-hint"
        >
          모바일에서는 미리보기만 표시됩니다. 요소 배치·드래그 편집은 데스크톱(1024px 이상)에서
          이용해 주세요.
        </div>
      ) : null}

      {editing && theme ? (
        <div className="mb-3 px-1">
          <CanvasThemePicker
            theme={theme}
            section={section}
            selectedElement={selectedElement}
            onChange={commitSection}
          />
        </div>
      ) : null}

      <div
        ref={frameRef}
        className="relative mx-auto w-full overflow-hidden"
        style={{
          aspectRatio: `${section.frameWidth} / ${section.frameHeight}`,
          backgroundColor: bgColor,
          backgroundImage: bgImage ? `url(${bgImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        onMouseDown={() => {
          if (editing) setSelectedId(null);
        }}
        data-testid="canvas-frame"
      >
        {useInteractiveEdit
          ? sortedElements.map((element) => (
              <EditableCanvasElement
                key={element.id}
                element={element}
                frameSize={frameSize}
                imageUrls={imageUrls}
                productName={productName}
                selected={selectedId === element.id}
                onSelect={() => setSelectedId(element.id)}
                onUpdate={(patch) => updateElement(element.id, patch)}
              />
            ))
          : sortedElements.map((element) => (
              <StaticCanvasElement
                key={element.id}
                element={element}
                imageUrls={imageUrls}
                productName={productName}
              />
            ))}
      </div>

      {editing ? (
        <div className="mt-3">
          <CanvasLayerPanel
            section={section}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id)}
            onChange={commitSection}
          />
        </div>
      ) : null}
    </section>
  );
}
