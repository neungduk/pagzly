import {
  CANVAS_TEXT_ROLE_STYLES,
  canvasElementBoxCss,
  resolveCanvasImageSrc,
  sortCanvasElements,
} from "@/lib/canvas-section-layout";
import { visibleCanvasElements } from "@/lib/canvas-section-mutations";
import type { CanvasSection } from "@/lib/types/generate";

export function renderCanvasSectionHtml(
  section: CanvasSection,
  imageUrls: string[],
  esc: (value: string) => string,
  anchorId?: string,
): string {
  const sectionIdAttr = anchorId ? ` id="${anchorId}"` : "";
  const bgColor = section.background?.color ?? "#f5f3ee";
  const paddingBottom = (section.frameHeight / section.frameWidth) * 100;
  const bgImage = section.background?.imageUrl
    ? `background-image:url(${esc(section.background.imageUrl)});background-size:cover;background-position:center;`
    : "";

  const elementsHtml = sortCanvasElements(
    visibleCanvasElements(section.elements, { hideIncompleteAi: true }),
  )
    .map((element) => {
      const box = canvasElementBoxCss(element);
      if (element.kind === "text") {
        const roleStyle = CANVAS_TEXT_ROLE_STYLES[element.role];
        const fontSize = element.fontSize ?? roleStyle.fontSize;
        const color = element.color ?? "#1B1B18";
        const align = element.align ?? "left";
        return `<div style="${box};display:flex;align-items:center;justify-content:${align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start"};font-size:${fontSize}px;font-weight:${roleStyle.fontWeight};line-height:${roleStyle.lineHeight};color:${esc(color)};text-align:${align};overflow:hidden"><span style="width:100%;white-space:pre-wrap">${esc(element.text)}</span></div>`;
      }
      if (element.kind === "image") {
        const src = resolveCanvasImageSrc(imageUrls, element);
        const radius = element.radius ?? 0;
        return `<div style="${box};overflow:hidden;border-radius:${radius}px">${src ? `<img src="${esc(src)}" alt="" style="width:100%;height:100%;object-fit:cover"/>` : ""}</div>`;
      }
      if (element.kind === "table") {
        const headerColor = esc(element.headerColor ?? "#F0EEEA");
        const borderColor = esc(element.borderColor ?? "#1B1B18");
        const rowsHtml = element.rows
          .map(
            (row) =>
              `<tr><td style="width:38%;padding:4px 6px;font-weight:600;background:${headerColor};border:1px solid ${borderColor}">${esc(row.label)}</td><td style="padding:4px 6px;border:1px solid ${borderColor}">${esc(row.value)}</td></tr>`,
          )
          .join("");
        return `<div style="${box};overflow:hidden"><table style="width:100%;height:100%;border-collapse:collapse;font-size:10px;line-height:1.3;border:1px solid ${borderColor}"><tbody>${rowsHtml}</tbody></table></div>`;
      }
      if (element.kind === "ai-image") {
        if (element.status !== "done" || !element.resultUrl) return "";
        const radius = element.radius ?? 0;
        return `<div style="${box};overflow:hidden;border-radius:${radius}px"><img src="${esc(element.resultUrl)}" alt="" style="width:100%;height:100%;object-fit:cover"/></div>`;
      }
      if (element.kind === "shape" && element.shape === "circle") {
        return `<div style="${box};border-radius:50%;background:${esc(element.fill ?? "transparent")}${element.stroke ? `;border:2px solid ${esc(element.stroke)}` : ""}"></div>`;
      }
      if (element.kind === "shape" && element.shape === "line") {
        const lineColor = esc(element.fill ?? element.stroke ?? "#1B1B18");
        return `<div style="${box};display:flex;align-items:center"><div style="width:100%;height:2px;background:${lineColor}"></div></div>`;
      }
      if (element.kind === "shape") {
        return `<div style="${box};border-radius:12px;background:${esc(element.fill ?? "transparent")}${element.stroke ? `;border:2px solid ${esc(element.stroke)}` : ""}"></div>`;
      }
      return "";
    })
    .join("");

  return `<section${sectionIdAttr} data-testid="canvas-section-export" style="padding:0;background:${esc(bgColor)}">
    <div style="position:relative;width:100%;height:0;padding-bottom:${paddingBottom}%;overflow:hidden;background:${esc(bgColor)};${bgImage}">
      ${elementsHtml}
    </div>
  </section>`;
}
