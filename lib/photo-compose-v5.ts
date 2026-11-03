/**
 * 474차 V5 — 사진 구도 5종(상자에서 나오게).
 * bleed=풀블리드+스크림 글 · hang=아래 섹션 걸침 · crop=확대 크롭 · mask=아치/원/물결/사선 · collage=2~3장 겹침.
 * clip-path·filter·mix-blend 금지(dynamics-v5). 틴트는 불투명 그라데이션 오버레이만. V5 켜짐에서만.
 */
import type { ArchetypeId } from "@/lib/page-archetype-v5";
import type { V4Palette } from "@/lib/palette-v4";
import { depthShadow } from "@/lib/palette-v4";
import { esc } from "@/lib/type-treatments";

/** compose-v5 BLEED와 동일(순환 import 방지) */
const BLEED = 24;

export type PhotoComposeKind = "bleed" | "hang" | "crop" | "mask" | "collage";

/** 아키타입 주 구도(페이지에 해당 표식이 ≥1 나오게 prefer와 맞춤) */
export const PHOTO_COMPOSE_V5: Record<ArchetypeId, PhotoComposeKind> = {
  impact: "bleed",
  editorial: "hang",
  catalog: "crop",
  // 479 D / 477 잔여 — softlife·luxe는 상자(mask 라운드·그림자) 없이 bleed 스크림
  softlife: "bleed",
  narrative: "hang",
  luxe: "bleed",
  pop: "collage",
  techsheet: "crop",
};

export const PHOTO_COMPOSE_KINDS: PhotoComposeKind[] = ["bleed", "hang", "crop", "mask", "collage"];

export type MaskShape = "arch" | "circle" | "wave" | "slash";

const maskRadius = (shape: MaskShape): string => {
  if (shape === "circle") return "50%";
  if (shape === "arch") return "999px 999px 18px 18px";
  if (shape === "wave") return "40% 40% 12px 12px/22% 22% 12px 12px";
  return "0 28% 0 18%";
};

type Img = { url: string; pos?: string };

/** 짧은 사진 칸 — 틴트는 CSS 변수 1장(페이지당)으로, 칸마다 오버레이 문자열 반복 안 함 */
const frame = (im: Img, alt: string, ar: string, extra: string, p: V4Palette, scale = 1): string => {
  const imgExtra = scale > 1 ? `transform:scale(${scale});transform-origin:50% 40%;` : "";
  return `<div style="position:relative;aspect-ratio:${ar};overflow:hidden;background:${p.tints[1]};${extra}"><img src="${esc(im.url)}" alt="${esc(alt)}" loading="lazy" decoding="async" style="display:block;width:100%;height:100%;object-fit:cover;object-position:${im.pos ?? "50% 40%"};${imgExtra}"/></div>`;
};

/** (1) 풀블리드 사진 위 스크림+글 — 어두운 스크림 위 밝은 글(대비) */
export function composeBleedScrim(im: Img, alt: string, cardInner: string, p: V4Palette, o: { ar?: string } = {}): string {
  return (
    `<div data-pz-pc="bleed" style="margin:0 -${BLEED}px;position:relative">` +
    frame(im, alt, o.ar ?? "4/5", "", p) +
    `<div data-pz-scrim aria-hidden="true" style="position:absolute;inset:0;pointer-events:none;background:linear-gradient(0deg,rgba(10,10,10,.78),rgba(10,10,10,.2) 55%,transparent)"></div>` +
    `<div style="position:absolute;left:24px;right:24px;bottom:28px;z-index:2;color:#fff">${cardInner}</div></div>`
  );
}

/** (2) 사진이 아래 섹션 위로 걸침 */
export function composeHang(im: Img, alt: string, p: V4Palette, o: { ar?: string; drop?: number } = {}): string {
  const drop = o.drop ?? 40; // 474 스케일(4…96)
  return `<div data-pz-pc="hang" style="margin:0 -${BLEED}px -${drop}px;position:relative;z-index:3">${frame(im, alt, o.ar ?? "16/10", `box-shadow:${depthShadow("float", p.ink)}`, p)}</div>`;
}

/** (3) 확대 크롭(질감) */
export function composeCrop(im: Img, alt: string, p: V4Palette, o: { ar?: string; scale?: number } = {}): string {
  return `<div data-pz-pc="crop">${frame(im, alt, o.ar ?? "4/5", "border-radius:4px", p, o.scale ?? 1.45)}</div>`;
}

/** (4) 마스크 모양 */
export function composeMask(im: Img, alt: string, p: V4Palette, shape: MaskShape, o: { ar?: string } = {}): string {
  const ar = shape === "circle" ? "1/1" : o.ar ?? "3/4";
  const w = shape === "circle" ? "78%" : "86%";
  const skew = shape === "slash" ? "transform:rotate(-6deg);" : "";
  return `<div data-pz-pc="mask" data-pz-mask="${shape}" style="width:${w};margin:0 auto;${skew}">${frame(im, alt, ar, `border-radius:${maskRadius(shape)};box-shadow:${depthShadow("soft", p.ink)}`, p)}</div>`;
}

/** (5) 콜라주 2~3장 */
export function composeCollage(imgs: Img[], alt: string, p: V4Palette, o: { flip?: boolean } = {}): string {
  const list = imgs.filter((x) => x?.url).slice(0, 3);
  if (list.length < 2) return "";
  const side = o.flip ? "right" : "left";
  const other = o.flip ? "left" : "right";
  const rot = o.flip ? -3 : 3;
  const big = `<div style="width:72%;margin-${side}:0">${frame(list[0]!, alt, "4/5", "border-radius:16px", p)}</div>`;
  const mid = `<div style="position:absolute;${other}:0;top:12%;width:46%;transform:rotate(${rot}deg);box-shadow:${depthShadow("float", p.ink)};border-radius:10px;overflow:hidden">${frame(list[1]!, alt, "1/1", "", p)}</div>`;
  const small = list[2]
    ? `<div style="position:absolute;${other}:6%;bottom:2%;width:36%;transform:rotate(${-rot}deg);border:4px solid #fff;border-radius:10px;overflow:hidden;box-shadow:${depthShadow("soft", p.ink)}">${frame(list[2], alt, "3/4", "", p)}</div>`
    : "";
  return `<div data-pz-pc="collage" data-pz-dyn-clip style="position:relative;overflow:hidden;padding:8px 4px 16px">${big}${mid}${small}</div>`;
}

/** 짧은 표식 CSS. 틴트는 스크림/면 색으로 처리(filter·mix-blend 없음) */
export function photoComposeCssV5(scope: string, id: ArchetypeId): string {
  return `${scope}[data-pz-bsig=${id}]{--pz-pc:${PHOTO_COMPOSE_V5[id]}}${scope} [data-pz-pc=hang]{isolation:isolate}`;
}
