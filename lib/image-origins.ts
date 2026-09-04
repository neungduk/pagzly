/**
 * 106차 — 이미지 출처 플래그 (파일명 접미사 의존 금지)
 */
export type ProductImageOrigin =
  | "original"
  | "enhanced"
  | "ai-lifestyle"
  | "composite"
  | "fx"
  | "compare"
  | "other";

const ORIGINS = new Set<ProductImageOrigin>([
  "original",
  "enhanced",
  "ai-lifestyle",
  "composite",
  "fx",
  "compare",
  "other",
]);

export function isProductImageOrigin(value: unknown): value is ProductImageOrigin {
  return typeof value === "string" && ORIGINS.has(value as ProductImageOrigin);
}

export function normalizeImageOrigins(
  raw: unknown,
  length: number,
  fallback: ProductImageOrigin = "original",
): ProductImageOrigin[] {
  const list = Array.isArray(raw) ? raw : [];
  return Array.from({ length }, (_, i) =>
    isProductImageOrigin(list[i]) ? list[i] : fallback,
  );
}

export function hasAiLifestyleOrigin(origins: ProductImageOrigin[] | undefined | null): boolean {
  return (origins ?? []).some((o) => o === "ai-lifestyle");
}

/** indexMap에 맞춰 origins 재배열 (dedupe 후) */
export function remapOriginsByIndexMap(
  origins: ProductImageOrigin[] | undefined | null,
  indexMap: number[],
  outLength: number,
): ProductImageOrigin[] {
  const src = origins ?? [];
  const out: ProductImageOrigin[] = Array.from({ length: outLength }, () => "original");
  for (let old = 0; old < indexMap.length; old += 1) {
    const next = indexMap[old];
    if (next === undefined || next < 0 || next >= outLength) continue;
    if (isProductImageOrigin(src[old])) {
      // 첫 등장 유지 — 이미 채워진 슬롯은 덮지 않음
      if (out[next] === "original" || old === next) {
        out[next] = src[old]!;
      }
    }
  }
  return out;
}
