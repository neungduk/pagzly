/** product_images orphan cleanup 대비 보호 윈도우 (30차). */

/** 업로드·생성 중 보호 시간. cleanup 코드는 3일이지만, 관측된 조기 삭제에 대비해 24h. */
export const PRODUCT_IMAGE_PROTECT_HOURS = 24;

export function productImageProtectedUntil(
  from: Date = new Date(),
  hours: number = PRODUCT_IMAGE_PROTECT_HOURS,
): string {
  return new Date(from.getTime() + hours * 60 * 60 * 1000).toISOString();
}
