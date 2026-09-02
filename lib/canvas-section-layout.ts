import type { CanvasElement } from "@/lib/types/generate";

export const CANVAS_TEXT_ROLE_STYLES = {
  main: { fontSize: 24, fontWeight: 700, lineHeight: 1.2 },
  sub: { fontSize: 16, fontWeight: 600, lineHeight: 1.35 },
  body: { fontSize: 14, fontWeight: 400, lineHeight: 1.6 },
  custom: { fontSize: 14, fontWeight: 400, lineHeight: 1.5 },
} as const;

export function canvasElementBoxCss(el: Pick<CanvasElement, "x" | "y" | "w" | "h" | "z">): string {
  return `position:absolute;left:${el.x}%;top:${el.y}%;width:${el.w}%;height:${el.h}%;z-index:${el.z}`;
}

export function canvasFramePaddingBottom(frameWidth: number, frameHeight: number): number {
  return (frameHeight / frameWidth) * 100;
}

export function resolveCanvasImageSrc(
  imageUrls: string[],
  el: Extract<CanvasElement, { kind: "image" }>,
): string {
  if (el.url?.trim()) return el.url.trim();
  if (
    typeof el.imageIndex === "number" &&
    Number.isInteger(el.imageIndex) &&
    el.imageIndex >= 0 &&
    el.imageIndex < imageUrls.length
  ) {
    return imageUrls[el.imageIndex] ?? "";
  }
  return "";
}

export function sortCanvasElements(elements: CanvasElement[]): CanvasElement[] {
  return [...elements].sort((a, b) => a.z - b.z);
}
