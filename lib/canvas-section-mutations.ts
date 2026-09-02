import type { CanvasElement, CanvasSection } from "@/lib/types/generate";

export type CanvasShapeDefaults = { fill?: string; stroke?: string };
export type CanvasTableDefaults = { headerColor?: string; borderColor?: string };

function nextZ(elements: CanvasElement[]): number {
  if (elements.length === 0) return 1;
  return Math.max(...elements.map((e) => e.z)) + 1;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function updateCanvasSection(
  section: CanvasSection,
  updater: (elements: CanvasElement[]) => CanvasElement[],
): CanvasSection {
  return { ...section, elements: updater(section.elements) };
}

export function patchCanvasElement(
  section: CanvasSection,
  elementId: string,
  patch: Partial<CanvasElement>,
): CanvasSection {
  return updateCanvasSection(section, (elements) =>
    elements.map((el) => (el.id === elementId ? ({ ...el, ...patch } as CanvasElement) : el)),
  );
}

export function removeCanvasElement(section: CanvasSection, elementId: string): CanvasSection {
  return updateCanvasSection(section, (elements) => elements.filter((el) => el.id !== elementId));
}

export function toggleCanvasElementHidden(
  section: CanvasSection,
  elementId: string,
): CanvasSection {
  const target = section.elements.find((el) => el.id === elementId);
  if (!target) return section;
  return patchCanvasElement(section, elementId, { hidden: !target.hidden });
}

export function toggleCanvasElementLocked(
  section: CanvasSection,
  elementId: string,
): CanvasSection {
  const target = section.elements.find((el) => el.id === elementId);
  if (!target) return section;
  return patchCanvasElement(section, elementId, { locked: !target.locked });
}

export function createCanvasTextElement(
  role: "main" | "sub" | "body" | "custom" = "body",
  elements: CanvasElement[],
): CanvasElement {
  const z = nextZ(elements);
  return {
    id: newId("text"),
    kind: "text",
    role,
    text: role === "main" ? "메인 카피" : role === "sub" ? "서브 카피" : "본문 텍스트",
    x: 10,
    y: 10 + (elements.length % 4) * 8,
    w: 40,
    h: 12,
    align: "left",
    z,
  };
}

export function createCanvasImageElement(
  elements: CanvasElement[],
  imageIndex = 0,
): CanvasElement {
  const z = nextZ(elements);
  return {
    id: newId("image"),
    kind: "image",
    imageIndex,
    x: 50,
    y: 20,
    w: 35,
    h: 40,
    radius: 8,
    z,
  };
}

export function createCanvasShapeElement(
  shape: "rect" | "circle" | "line",
  elements: CanvasElement[],
  defaults?: CanvasShapeDefaults,
): CanvasElement {
  const z = nextZ(elements);
  const offset = (elements.length % 5) * 6;
  return {
    id: newId("shape"),
    kind: "shape",
    shape,
    x: 12 + offset,
    y: 55 + offset,
    w: shape === "line" ? 50 : 18,
    h: shape === "line" ? 2 : 14,
    fill: defaults?.fill ?? (shape === "line" ? "#1B1B18" : "#ffffffcc"),
    stroke: defaults?.stroke,
    z,
  };
}

export function createCanvasTableElement(
  elements: CanvasElement[],
  defaults?: CanvasTableDefaults,
): CanvasElement {
  const z = nextZ(elements);
  return {
    id: newId("table"),
    kind: "table",
    rows: [
      { label: "용량", value: "50ml" },
      { label: "제형", value: "젤" },
      { label: "향", value: "무향" },
    ],
    x: 10,
    y: 62,
    w: 45,
    h: 28,
    headerColor: defaults?.headerColor ?? "#F0EEEA",
    borderColor: defaults?.borderColor ?? "#2F4858",
    z,
  };
}

export function createCanvasAiImageElement(elements: CanvasElement[]): CanvasElement {
  const z = nextZ(elements);
  const offset = (elements.length % 4) * 5;
  return {
    id: newId("ai-image"),
    kind: "ai-image",
    prompt: "부드러운 자연광 배경, 상품 연출 컷",
    x: 20 + offset,
    y: 18 + offset,
    w: 40,
    h: 32,
    radius: 8,
    z,
    status: "pending",
  };
}

export function applyCanvasThemeBackground(section: CanvasSection, color: string): CanvasSection {
  return {
    ...section,
    background: { ...section.background, color },
  };
}

export function patchCanvasElementColorFromTheme(
  section: CanvasSection,
  elementId: string,
  color: string,
): CanvasSection {
  const target = section.elements.find((el) => el.id === elementId);
  if (!target) return section;
  if (target.kind === "text") {
    return patchCanvasElement(section, elementId, { color });
  }
  if (target.kind === "shape") {
    return patchCanvasElement(
      section,
      elementId,
      target.shape === "line" ? { fill: color } : { fill: color },
    );
  }
  if (target.kind === "table") {
    return patchCanvasElement(section, elementId, { headerColor: color });
  }
  return section;
}

export function visibleCanvasElements(
  elements: CanvasElement[],
  options?: { hideIncompleteAi?: boolean },
): CanvasElement[] {
  return elements.filter((el) => {
    if (el.hidden) return false;
    if (
      options?.hideIncompleteAi &&
      el.kind === "ai-image" &&
      el.status !== "done"
    ) {
      return false;
    }
    return true;
  });
}

export function canvasElementLabel(element: CanvasElement): string {
  if (element.kind === "text") {
    const preview = element.text.trim().slice(0, 18);
    return preview ? `텍스트 · ${preview}` : "텍스트";
  }
  if (element.kind === "image") return "이미지";
  if (element.kind === "table") return "표";
  if (element.kind === "ai-image") {
    if (element.status === "pending") return "AI 이미지 · 대기";
    if (element.status === "failed") return "AI 이미지 · 실패";
    return "AI 이미지";
  }
  if (element.kind === "shape") return `도형 · ${element.shape}`;
  return "요소";
}
