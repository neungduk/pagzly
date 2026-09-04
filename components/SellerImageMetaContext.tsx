"use client";

import { createContext, useContext } from "react";
import type { ProductImageOrigin } from "@/lib/image-origins";

export type SellerImageMeta = {
  origins: ProductImageOrigin[];
  urls: string[];
  /** 편집/결과 미리보기 전용. 캡처·내보내기에서는 false */
  showBadges: boolean;
};

export const SellerImageMetaContext = createContext<SellerImageMeta>({
  origins: [],
  urls: [],
  showBadges: false,
});

export function useSellerImageMeta(): SellerImageMeta {
  return useContext(SellerImageMetaContext);
}

export function resolveImageOriginIndex(
  src: string,
  urls: string[],
  imageIndex?: number,
): number | undefined {
  if (typeof imageIndex === "number" && Number.isInteger(imageIndex) && imageIndex >= 0) {
    return imageIndex;
  }
  if (!src || urls.length === 0) return undefined;
  const bare = src.split("?")[0] ?? src;
  const i = urls.findIndex((u) => (u.split("?")[0] ?? u) === bare);
  return i >= 0 ? i : undefined;
}
