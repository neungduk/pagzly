import { parseProductHeightCm } from "@/lib/lifestyle-physical-scale";

/**
 * 124차 — 사용자 업로드 라이프스타일 합성 경로의 물리 스케일 게이트.
 * 높이(cm)를 파싱할 수 없으면 합성 시도 자체를 하지 않는다(옵션 1: 안전·지어내기 금지).
 */
export function resolveLifestyleCompositeScale(opts: {
  productSizeHint?: string | null;
  productHeightCm?: number | null;
}): {
  productHeightCm: number | null;
  shouldAttempt: boolean;
  skipReason?: "missing-product-height-cm";
} {
  const fromBody =
    typeof opts.productHeightCm === "number" &&
    Number.isFinite(opts.productHeightCm) &&
    opts.productHeightCm > 0
      ? opts.productHeightCm
      : null;
  const productHeightCm = fromBody ?? parseProductHeightCm(opts.productSizeHint);
  if (productHeightCm == null || !(productHeightCm > 0)) {
    return {
      productHeightCm: null,
      shouldAttempt: false,
      skipReason: "missing-product-height-cm",
    };
  }
  return { productHeightCm, shouldAttempt: true };
}
