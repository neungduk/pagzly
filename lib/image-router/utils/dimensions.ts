import type { ImageAspectRatio, ImageResolution } from "@/lib/image-router/types";

export type ImageDimensions = {
  width: number;
  height: number;
  megapixels: number;
};

const ASPECT_RATIO_MAP: Record<ImageAspectRatio, { w: number; h: number }> = {
  "1:1": { w: 1, h: 1 },
  "4:3": { w: 4, h: 3 },
  "3:4": { w: 3, h: 4 },
  "16:9": { w: 16, h: 9 },
  "9:16": { w: 9, h: 16 },
  "3:2": { w: 3, h: 2 },
  "2:3": { w: 2, h: 3 },
};

function parseResolutionSide(resolution?: ImageResolution): number {
  const side = resolution ? Number.parseInt(resolution, 10) : 1024;
  if (!Number.isFinite(side) || side <= 0) return 1024;
  return Math.min(1536, Math.max(512, side));
}

export function resolveImageDimensions(params: {
  aspectRatio?: ImageAspectRatio;
  resolution?: ImageResolution;
}): ImageDimensions {
  const longSide = parseResolutionSide(params.resolution);
  const ratio = ASPECT_RATIO_MAP[params.aspectRatio ?? "1:1"];

  let width: number;
  let height: number;

  if (ratio.w >= ratio.h) {
    width = longSide;
    height = Math.round((longSide * ratio.h) / ratio.w);
  } else {
    height = longSide;
    width = Math.round((longSide * ratio.w) / ratio.h);
  }

  width = Math.max(256, width - (width % 8));
  height = Math.max(256, height - (height % 8));

  const megapixels = (width * height) / 1_000_000;
  return { width, height, megapixels };
}
