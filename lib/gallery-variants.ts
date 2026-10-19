/**
 * 409차 — 갤러리 변형(lookbook-stack / lead-plus-two)의 공용 토큰. 라이브·export가 같은 숫자를 쓴다.
 * 사진 배정·순서(착용컷 우선, 405~406차)는 그대로고, 칸 모양만 바꾼다. 문구는 더하지 않는다.
 */
import type { GalleryVariant } from "@/lib/style-packs";

export const GALLERY_VARIANT = {
  /** 사진 사이 간격(px) — 4~8 */
  gapPx: 6,
  /** lead-plus-two의 나머지 사진 칸 비율(세로형, 위쪽 기준) — 라이브는 같은 값을 Tailwind aspect-[3/4] object-top으로 쓴다 */
  restRatio: "3 / 4",
  restPosition: "50% 0%",
} as const;

/** 한 칸의 모양 */
export type GalleryCell = { span: boolean; natural: boolean };

/** 변형별로 pos번째 사진 칸이 전폭인지·원본 비율인지(원본 비율 = 잘라 맞추지 않는다) */
export function galleryCell(variant: GalleryVariant, pos: number): GalleryCell {
  if (variant === "lookbook-stack") return { span: true, natural: true };
  if (variant === "lead-plus-two") return pos === 0 ? { span: true, natural: true } : { span: false, natural: false };
  return { span: false, natural: false };
}

export function galleryColumns(variant: GalleryVariant): number {
  return variant === "lookbook-stack" ? 1 : 2;
}
