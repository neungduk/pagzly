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
