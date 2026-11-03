/**
 * 477차 C — 사진 지배형 블록 공용 부품 4종.
 * band=풀폭+하단 제목 띠 · scrim=사진 위 큰 제목 · rail=옆 좁은 설명 · split=위/아래 2분할.
 * 새 카피 없음. designV5On 경로에서만.
 */
import type { ArchetypeId } from "@/lib/page-archetype-v5";
import type { V4Palette } from "@/lib/palette-v4";
import { esc } from "@/lib/type-treatments";
import { chromeLabelRow } from "@/lib/block-chrome-v5";

export type PhotoBlockKind = "band" | "scrim" | "rail" | "split";

/** 아키타입 → 사진 중심 부품 */
export const PHOTO_BLOCK_V5: Record<ArchetypeId, PhotoBlockKind> = {
  catalog: "band",
  impact: "scrim",
  editorial: "rail",
  techsheet: "rail",
  softlife: "split",
  pop: "split",
  narrative: "scrim",
  luxe: "band",
};

/** 블록 종류별 비율·object-position */
export const PHOTO_RATIO_V5: Record<PhotoBlockKind, { ar: string; pos: string }> = {
  band: { ar: "4 / 5", pos: "50% 40%" },
  scrim: { ar: "3 / 4", pos: "50% 35%" },
  rail: { ar: "3 / 4", pos: "50% 40%" },
  split: { ar: "16 / 10", pos: "50% 45%" },
};

type Img = { url: string; pos?: string };

const imgTag = (im: Img, alt: string, pos: string, extra = "") =>
  `<img src="${esc(im.url)}" alt="${esc(alt)}" loading="lazy" decoding="async" style="display:block;width:100%;height:100%;object-fit:cover;object-position:${im.pos ?? pos};${extra}"/>`;

const frame = (im: Img, alt: string, ar: string, pos: string, bg: string, extra = "") =>
  `<div style="position:relative;aspect-ratio:${ar};overflow:hidden;background:${bg};${extra}">${imgTag(im, alt, pos)}</div>`;

/** (1) 풀폭 사진 + 하단 제목 띠 */
export function photoBlockBand(
  im: Img,
  alt: string,
  titleHtml: string,
  bodyHtml: string,
  p: V4Palette,
  ax: ArchetypeId,
): string {
  const { ar, pos } = PHOTO_RATIO_V5.band;
  const chrome = chromeLabelRow(ax, "#FFFFFF", { noMark: true });
  return (
    `<div data-pz-pb="band" style="margin:0 -24px">` +
    `<div style="position:relative">${frame(im, alt, ar, pos, p.tints[1])}` +
    `<div data-pz-scrim aria-hidden="true" style="position:absolute;left:0;right:0;bottom:0;height:42%;pointer-events:none;background:linear-gradient(0deg,rgba(10,10,10,.82),transparent)"></div>` +
    `<div style="position:absolute;left:24px;right:24px;bottom:22px;z-index:2;color:#fff;--pz-on-surface:#FAF8F3">${chrome}<div style="color:#fff">${titleHtml}</div>${bodyHtml}</div>` +
    `</div></div>`
  );
}

/** (2) 사진 위 큰 제목(스크림) */
export function photoBlockScrim(
  im: Img,
  alt: string,
  titleHtml: string,
  bodyHtml: string,
  p: V4Palette,
  ax: ArchetypeId,
): string {
  const { ar, pos } = PHOTO_RATIO_V5.scrim;
  const chrome = chromeLabelRow(ax, "#FFFFFF", { noMark: true });
  return (
    `<div data-pz-pb="scrim" style="margin:0 -24px;position:relative">` +
    frame(im, alt, ar, pos, p.tints[1]) +
    `<div data-pz-scrim aria-hidden="true" style="position:absolute;inset:0;pointer-events:none;background:linear-gradient(0deg,rgba(10,10,10,.75),rgba(10,10,10,.25) 50%,transparent)"></div>` +
    `<div style="position:absolute;left:24px;right:24px;bottom:28px;z-index:2;color:#fff;--pz-on-surface:#FAF8F3">${chrome}${titleHtml}${bodyHtml}</div></div>`
  );
}

/** (3) 사진 + 옆 좁은 설명 열 */
export function photoBlockRail(
  im: Img,
  alt: string,
  titleHtml: string,
  bodyHtml: string,
  p: V4Palette,
  ax: ArchetypeId,
  flip = false,
): string {
  const { ar, pos } = PHOTO_RATIO_V5.rail;
  const chrome = chromeLabelRow(ax, p.deep);
  const photo = `<div style="flex:1.35 1 0%;min-width:0">${frame(im, alt, ar, pos, p.tints[1], "border-radius:2px")}</div>`;
  const rail = `<div style="flex:0 0 34%;min-width:96px;box-sizing:border-box;padding:8px 0 8px 14px;display:flex;flex-direction:column;justify-content:center">${chrome}${titleHtml}${bodyHtml}</div>`;
  return `<div data-pz-pb="rail" style="display:flex;gap:0;align-items:stretch;flex-direction:${flip ? "row-reverse" : "row"}">${photo}${rail}</div>`;
}

/** (4) 사진 2장 분할(위/아래) — 같은 사진 다른 크롭 또는 2장 */
export function photoBlockSplit(
  imgs: Img[],
  alt: string,
  titleHtml: string,
  bodyHtml: string,
  p: V4Palette,
  ax: ArchetypeId,
): string {
  const { pos } = PHOTO_RATIO_V5.split;
  const a = imgs[0]!;
  const b = imgs[1] ?? { url: a.url, pos: "50% 70%" };
  const chrome = chromeLabelRow(ax, p.deep);
  return (
    `<div data-pz-pb="split">` +
    `<div style="display:grid;grid-template-rows:1fr 1fr;gap:6px;margin:0 -24px">` +
    frame(a, alt, "16 / 10", a.pos ?? pos, p.tints[1]) +
    frame(b, alt, "16 / 10", b.pos ?? "50% 70%", p.tints[1]) +
    `</div>` +
    `<div style="margin-top:18px;padding:0 4px">${chrome}${titleHtml}${bodyHtml}</div></div>`
  );
}

export function renderPhotoBlock(
  kind: PhotoBlockKind,
  imgs: Img[],
  alt: string,
  titleHtml: string,
  bodyHtml: string,
  p: V4Palette,
  ax: ArchetypeId,
  flip = false,
): string {
  const im = imgs[0];
  if (!im?.url) return "";
  if (kind === "band") return photoBlockBand(im, alt, titleHtml, bodyHtml, p, ax);
  if (kind === "scrim") return photoBlockScrim(im, alt, titleHtml, bodyHtml, p, ax);
  if (kind === "rail") return photoBlockRail(im, alt, titleHtml, bodyHtml, p, ax, flip);
  return photoBlockSplit(imgs, alt, titleHtml, bodyHtml, p, ax);
}
