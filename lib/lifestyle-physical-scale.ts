/**
 * 111차 — 라이프스타일 합성용 물리 스케일 (순수 함수).
 *
 * 성인 손 너비(손등) ≈ 8.5cm 기준:
 *   1cm당 px = handWidthPx / ADULT_HAND_WIDTH_CM
 *   제품 높이(px) = productHeightCm × (handWidthPx / ADULT_HAND_WIDTH_CM)
 *
 * 근거: ISO 7250 / anthropometric averages — adult hand breadth (metacarpale)
 * 약 8–9cm. 판매 페이지 스케일 일관성을 위해 8.5cm 상수 사용.
 */

import { parseDimensionCm } from "@/lib/size-comparison-diagram";
import type {
  HeldObjectPlacement,
  HeldObjectRegion,
} from "@/lib/detect-held-object-placement";

/** 성인 손 너비(손등, cm) — 하드코딩 금지 대신 이름 있는 상수 */
export const ADULT_HAND_WIDTH_CM = 8.5;

/** 제품이 프레임 높이의 이 비율을 넘으면 비현실적 → 거부 */
export const MAX_PRODUCT_FRAME_HEIGHT_RATIO = 0.8;

/** 최소 제품 높이(프레임 대비) — 너무 작으면 검출/합성 무의미 */
export const MIN_PRODUCT_FRAME_HEIGHT_RATIO = 0.02;

/**
 * productSizeHint에서 높이(cm) 파싱.
 * 예: "35mL, 높이 약 9cm" → 9
 * 높이 단서가 없으면 null (추정 합성 금지).
 */
export function parseProductHeightCm(hint: string | null | undefined): number | null {
  if (!hint?.trim()) return null;
  const text = hint.trim();

  // "높이 약 9cm", "height 9cm", "H: 9cm"
  const labeled = text.match(
    /(?:높이|세로|height|h)\s*[:：]?\s*(?:약\s*)?([\d.]+)\s*(cm|mm|m)\b/i,
  );
  if (labeled) {
    return parseDimensionCm(`${labeled[1]}${labeled[2]}`);
  }

  // 힌트에 cm/mm만 있고 ml과 구분
  const allDims = [...text.matchAll(/([\d.]+)\s*(cm|mm|m)\b/gi)];
  for (const m of allDims) {
    const cm = parseDimensionCm(`${m[1]}${m[2]}`);
    if (cm != null && cm >= 2 && cm <= 80) return cm;
  }

  return null;
}

export function computeProductHeightPx(opts: {
  handWidthPx: number;
  productHeightCm: number;
  handWidthCm?: number;
}): number | null {
  const { handWidthPx, productHeightCm } = opts;
  const handCm = opts.handWidthCm ?? ADULT_HAND_WIDTH_CM;
  if (!(handWidthPx > 0) || !(productHeightCm > 0) || !(handCm > 0)) return null;
  return productHeightCm * (handWidthPx / handCm);
}

export function isProductHeightSensible(
  productHeightPx: number,
  sceneHeightPx: number,
): boolean {
  if (!(sceneHeightPx > 0) || !(productHeightPx > 0)) return false;
  const ratio = productHeightPx / sceneHeightPx;
  return (
    ratio <= MAX_PRODUCT_FRAME_HEIGHT_RATIO && ratio >= MIN_PRODUCT_FRAME_HEIGHT_RATIO
  );
}

/** 검출된 손 영역 중 가장 넓은 손의 너비(px) */
export function estimateHandWidthPx(
  handRegions: HeldObjectRegion[],
  sceneWidthPx: number,
): number | null {
  if (!(sceneWidthPx > 0) || handRegions.length === 0) return null;
  let maxW = 0;
  for (const h of handRegions) {
    const w = (h.wPct / 100) * sceneWidthPx;
    if (w > maxW) maxW = w;
  }
  return maxW > 0 ? maxW : null;
}

/**
 * Vision placement의 크기를 물리 스케일로 덮어쓴다.
 * 실패 시 null → 해당 컷 폐기.
 */
export function applyPhysicalScaleToPlacement(opts: {
  placement: HeldObjectPlacement;
  handRegions: HeldObjectRegion[];
  productHeightCm: number;
  sceneWidthPx: number;
  sceneHeightPx: number;
  /** cutout width/height 비율 (없으면 placement 비율 유지) */
  cutoutAspectWH?: number;
}): HeldObjectPlacement | null {
  const handWidthPx = estimateHandWidthPx(opts.handRegions, opts.sceneWidthPx);
  if (handWidthPx == null) return null;

  const heightPx = computeProductHeightPx({
    handWidthPx,
    productHeightCm: opts.productHeightCm,
  });
  if (heightPx == null) return null;
  if (!isProductHeightSensible(heightPx, opts.sceneHeightPx)) return null;

  const hPct = (heightPx / opts.sceneHeightPx) * 100;
  const aspect =
    opts.cutoutAspectWH && opts.cutoutAspectWH > 0
      ? opts.cutoutAspectWH
      : opts.placement.wPct / Math.max(opts.placement.hPct, 0.01);
  const widthPx = heightPx * aspect;
  const wPct = (widthPx / opts.sceneWidthPx) * 100;

  if (wPct <= 0 || wPct > 90 || hPct <= 0) return null;

  // 중심 유지하며 크기만 조정
  const cx = opts.placement.xPct + opts.placement.wPct / 2;
  const cy = opts.placement.yPct + opts.placement.hPct / 2;

  return {
    ...opts.placement,
    wPct,
    hPct,
    xPct: cx - wPct / 2,
    yPct: cy - hPct / 2,
  };
}
