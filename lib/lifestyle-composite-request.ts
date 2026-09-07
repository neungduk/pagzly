import { resolveLifestyleCompositeScale } from "@/lib/lifestyle-composite-scale-gate";

/**
 * 125차 — UI/스냅샷 → /api/lifestyle-composite 요청 바디 조립.
 * 높이(cm) 숫자 또는 productSizeHint의 높이 문구가 있을 때만 body를 만든다.
 */
export function buildLifestyleCompositeRequestBody(opts: {
  lifestyleImageUrl: string;
  productImageUrl: string;
  category: string;
  productName: string;
  storageBasePath?: string | null;
  productHeightCm?: number | null;
  productSizeHint?: string | null;
}): {
  shouldAttempt: boolean;
  skipReason?: string;
  productHeightCm: number | null;
  body: {
    lifestyleImageUrl: string;
    productImageUrl: string;
    category: string;
    productName: string;
    storageBasePath?: string | null;
    productHeightCm: number;
    productSizeHint: string | null;
  } | null;
} {
  const scale = resolveLifestyleCompositeScale({
    productHeightCm: opts.productHeightCm,
    productSizeHint: opts.productSizeHint,
  });
  if (!scale.shouldAttempt || scale.productHeightCm == null) {
    return {
      shouldAttempt: false,
      skipReason: scale.skipReason,
      productHeightCm: null,
      body: null,
    };
  }
  return {
    shouldAttempt: true,
    productHeightCm: scale.productHeightCm,
    body: {
      lifestyleImageUrl: opts.lifestyleImageUrl,
      productImageUrl: opts.productImageUrl,
      category: opts.category,
      productName: opts.productName,
      storageBasePath: opts.storageBasePath ?? null,
      productHeightCm: scale.productHeightCm,
      productSizeHint: opts.productSizeHint ?? null,
    },
  };
}
