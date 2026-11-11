/**
 * 508 — 세로 긴 이미지 타일 좌표(순수 계산, 캔버스 없음).
 */
import {
  OCR_LONG_EDGE_SPLIT_508,
  OCR_MAX_TILES_PER_JOB_508,
  OCR_TILE_HEIGHT_508,
  OCR_TILE_OVERLAP_508,
} from "@/lib/label-check/ocr/constants";

export type ImageTileRect508 = {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * 긴 변이 splitThreshold를 넘으면 세로로 tileH + overlap 조각.
 * 가로가 더 긴 이미지는 타일 1장(전체).
 */
export function computeVerticalTiles508(
  width: number,
  height: number,
  opts?: {
    splitThreshold?: number;
    tileHeight?: number;
    overlap?: number;
    maxTiles?: number;
  },
): { tiles: ImageTileRect508[]; truncated: boolean } {
  const splitAt = opts?.splitThreshold ?? OCR_LONG_EDGE_SPLIT_508;
  const tileH = opts?.tileHeight ?? OCR_TILE_HEIGHT_508;
  const overlap = opts?.overlap ?? OCR_TILE_OVERLAP_508;
  const maxTiles = opts?.maxTiles ?? OCR_MAX_TILES_PER_JOB_508;

  if (width < 1 || height < 1) {
    return { tiles: [], truncated: false };
  }

  const longEdge = Math.max(width, height);
  if (longEdge <= splitAt || height <= tileH) {
    return {
      tiles: [{ index: 0, x: 0, y: 0, width, height }],
      truncated: false,
    };
  }

  const step = Math.max(1, tileH - overlap);
  const tiles: ImageTileRect508[] = [];
  let y = 0;
  let index = 0;
  let truncated = false;
  while (y < height) {
    if (index >= maxTiles) {
      truncated = true;
      break;
    }
    const h = Math.min(tileH, height - y);
    tiles.push({ index, x: 0, y, width, height: h });
    index += 1;
    if (y + h >= height) break;
    y += step;
  }
  return { tiles, truncated };
}

/** 업로드 전 긴 변을 maxLong 이하로 맞출 때 목표 크기 */
export function fitLongEdge508(
  width: number,
  height: number,
  maxLong: number,
): { width: number; height: number; scale: number } {
  const long = Math.max(width, height);
  if (long <= maxLong || long < 1) {
    return { width, height, scale: 1 };
  }
  const scale = maxLong / long;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}

/**
 * 518 — 폭 기준으로 맞춤. 세로는 타일로 자르므로 제한하지 않음.
 * 가로로 긴 이미지(폭>높이)는 긴 변 상한도 함께 적용 가능.
 */
export function fitWidth518(
  width: number,
  height: number,
  targetWidth: number,
): { width: number; height: number; scale: number } {
  if (width < 1 || height < 1) return { width, height, scale: 1 };
  if (width <= targetWidth) return { width, height, scale: 1 };
  const scale = targetWidth / width;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}

/** PDF 렌더 scale: clamp(targetW / pageWidthPt, 1.5, 5) */
export function pdfRenderScale518(pageWidthPt: number, targetWidth = 1800): number {
  if (pageWidthPt < 1) return 1.5;
  const s = targetWidth / pageWidthPt;
  return Math.min(5, Math.max(1.5, s));
}

/** 목표 폭에서 예상 타일 수(세로 분할) */
export function estimateTileCount518(
  srcW: number,
  srcH: number,
  targetWidth: number,
  tileHeight: number,
  overlap: number,
  maxTiles: number,
): { fittedW: number; fittedH: number; tileCount: number; truncated: boolean } {
  const fitted = fitWidth518(srcW, srcH, targetWidth);
  const { tiles, truncated } = computeVerticalTiles508(fitted.width, fitted.height, {
    tileHeight,
    overlap,
    maxTiles,
  });
  return {
    fittedW: fitted.width,
    fittedH: fitted.height,
    tileCount: tiles.length,
    truncated,
  };
}

/**
 * 타일 상한 안에 들어오도록 폭 목표를 1800→1500→1200으로 낮춤.
 * 1200에서도 넘으면 truncated=true(앞에서 maxTiles만 사용).
 */
export function chooseTargetWidth518(
  srcW: number,
  srcH: number,
  widths: readonly number[],
  tileHeight: number,
  overlap: number,
  maxTiles: number,
): { targetWidth: number; fittedW: number; fittedH: number; tileCount: number; truncated: boolean } {
  let last = {
    targetWidth: widths[widths.length - 1] ?? 1200,
    fittedW: srcW,
    fittedH: srcH,
    tileCount: 1,
    truncated: false,
  };
  for (const tw of widths) {
    const est = estimateTileCount518(srcW, srcH, tw, tileHeight, overlap, maxTiles);
    last = {
      targetWidth: tw,
      fittedW: est.fittedW,
      fittedH: est.fittedH,
      tileCount: est.tileCount,
      truncated: est.truncated,
    };
    if (!est.truncated) return last;
  }
  return last;
}
