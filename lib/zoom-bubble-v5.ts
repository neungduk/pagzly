/**
 * 477차 E — 확대 컷(zoom bubble) 2~4개. 같은 사진을 CSS scale+origin으로 크롭.
 * 라벨은 v5Label("detail")만. 사진 없으면 빈 문자열(호출측 폴백).
 */
import { esc } from "@/lib/type-treatments";
import { v5Label } from "@/lib/v5-labels";
import { hexToRgba } from "@/lib/design-tokens";

type Img = { url: string; pos?: string };

/** 버블 초점(object-position + transform-origin) — 입력 사진 재사용 */
const FOCI: Array<{ pos: string; origin: string; scale: number }> = [
  { pos: "30% 35%", origin: "30% 35%", scale: 2.6 },
  { pos: "70% 40%", origin: "70% 40%", scale: 2.4 },
  { pos: "50% 70%", origin: "50% 70%", scale: 2.5 },
  { pos: "45% 25%", origin: "45% 25%", scale: 2.8 },
];

export function zoomBubbleHtml(
  im: Img | undefined,
  alt: string,
  titleHtml: string,
  bodyHtml: string,
  ink: string,
  tint: string,
  count = 3,
): string {
  if (!im?.url) return "";
  const n = Math.max(2, Math.min(4, count));
  const bubbles = FOCI.slice(0, n)
    .map((f, i) => {
      const place =
        i === 0
          ? "left:14px;top:18%"
          : i === 1
            ? "right:14px;top:28%"
            : i === 2
              ? "left:18%;bottom:16px"
              : "right:16%;bottom:22px";
      const size = i === 0 ? 34 : 28;
      return (
        `<div data-pz-zb="${i}" style="position:absolute;${place};width:${size}%;aspect-ratio:1/1;overflow:hidden;border-radius:50%;border:3px solid #fff;box-sizing:border-box;box-shadow:0 8px 18px ${hexToRgba(ink, 0.28)};background:${tint}">` +
        `<img src="${esc(im.url)}" alt="" loading="lazy" decoding="async" style="display:block;width:100%;height:100%;object-fit:cover;object-position:${f.pos};transform:scale(${f.scale});transform-origin:${f.origin}"/>` +
        `</div>`
      );
    })
    .join("");
  const lab = v5Label("detail");
  const label = lab
    ? `<span data-pz-chip style="display:inline-block;padding:3px 8px;border-radius:999px;background:#0A0A0A;letter-spacing:0.08em;font-size:11px;font-weight:700;color:#FAF8F3">${lab}</span>`
    : "";
  return (
    `<div data-pz-zoom="multi" style="margin:0 -24px">` +
    `<div style="position:relative;width:100%;aspect-ratio:4/5;overflow:hidden;background:${tint}">` +
    `<img src="${esc(im.url)}" alt="${esc(alt)}" loading="lazy" decoding="async" style="display:block;width:100%;height:100%;object-fit:cover;object-position:${im.pos ?? "50% 40%"}"/>` +
    bubbles +
    `</div>` +
    `<div data-pz-on-light="1" style="padding:20px 24px;max-width:576px;margin:0 auto;background:#FAF8F3;color:#0A0A0A;--pz-on-surface:#0A0A0A">${label}<div style="margin-top:6px;color:#0A0A0A">${titleHtml}</div>${bodyHtml}</div>` +
    `</div>`
  );
}
