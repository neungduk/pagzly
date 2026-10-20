/**
 * 409차 — 갤러리 변형(lookbook-stack / lead-plus-two)의 공용 토큰. 라이브·export가 같은 숫자를 쓴다.
 * 사진 배정·순서(착용컷 우선, 405~406차)는 그대로고, 칸 모양만 바꾼다. 문구는 더하지 않는다.
 */
import type { GalleryVariant } from "@/lib/style-packs";

export const GALLERY_VARIANT = {
  /** 사진 사이 간격(px) — 410차: 6/10/14 시험 → 8(10은 첫 3화면 사진 면적을 0.74 밑으로 깎음, 6은 사진이 서로 붙어 보임) */
  gapPx: 8,
  /** lead-plus-two의 나머지 사진 칸 비율(세로형, 위쪽 기준) — 라이브는 같은 값을 Tailwind aspect-[2/3] object-top으로 쓴다 */
  restRatio: "2 / 3",
  restPosition: "50% 0%",
  /** 긴 세로 컷 상한(원본 비율 칸의 최대 높이 px) — 폭의 1.5배(2:3). 좁은 칸 390 → 585, 넓은 칸 750 → 1125. 이보다 긴 컷만 위쪽 기준으로 잘린다 */
  capNarrowPx: 585,
  capWidePx: 1125,
  /** 413차 mosaic — 10열 격자: 첫 장 6열 × 2행, 오른쪽 쌓는 두 장 4열(정사각), 나머지 5열씩 */
  mosaicColumns: 10,
  mosaicLeadCols: 6,
  /** 415차: 작은 타일(오른쪽 쌓는 두 장) — 정사각 위쪽 기준이면 얼굴만 보였다(414차). 4:5로 세우고 가슴·몸판 쪽(세로 35%)을 중심으로 잘라 상품이 보이게 한다. 390폭에서 한 칸 약 154px */
  mosaicStackRatio: "4 / 5",
  mosaicStackPosition: "50% 35%",
} as const;

/**
 * 한 칸의 모양. span = 전폭(1 / -1), natural = 원본 비율.
 * 413차 mosaic: colSpan/rowSpan = 10열 격자에서 차지하는 칸 수, fill = 칸을 꽉 채우는 절대 배치(첫 장), ratio = 칸 비율(없으면 restRatio)
 */
export type GalleryCell = { span: boolean; natural: boolean; colSpan?: number; rowSpan?: number; fill?: boolean; ratio?: string };

/** 변형별로 pos번째 사진 칸이 전폭인지·원본 비율인지(원본 비율 = 잘라 맞추지 않는다). count는 갤러리 사진 수 — lead-plus-two에서 첫 장 뒤 나머지가 홀수(전체 짝수)면 마지막 장을 전폭으로 둬 빈 칸을 막는다(412차) */
export function galleryCell(variant: GalleryVariant, pos: number, count?: number): GalleryCell {
  if (variant === "lookbook-stack") return { span: true, natural: true };
  if (variant === "mosaic") {
    // 첫 장은 왼쪽에서 두 행을 차지하고, 다음 두 장이 오른쪽에 위아래로 쌓인다. 나머지는 2열, 홀수가 남으면 마지막 장 전폭(빈 칸 없음)
    if (pos === 0) return { span: false, natural: false, colSpan: GALLERY_VARIANT.mosaicLeadCols, rowSpan: 2, fill: true };
    if (pos <= 2) return { span: false, natural: false, colSpan: GALLERY_VARIANT.mosaicColumns - GALLERY_VARIANT.mosaicLeadCols, ratio: GALLERY_VARIANT.mosaicStackRatio };
    if (count !== undefined && (count - 3) % 2 === 1 && pos === count - 1) return { span: true, natural: true };
    return { span: false, natural: false, colSpan: GALLERY_VARIANT.mosaicColumns / 2 };
  }
  if (variant === "lead-plus-two") {
    if (pos === 0 || (count !== undefined && count % 2 === 0 && pos === count - 1)) return { span: true, natural: true };
    return { span: false, natural: false };
  }
  return { span: false, natural: false };
}

export function galleryColumns(variant: GalleryVariant): number {
  if (variant === "mosaic") return GALLERY_VARIANT.mosaicColumns;
  return variant === "lookbook-stack" ? 1 : 2;
}
