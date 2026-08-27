import type { GenerateImageResult } from "@/lib/image-router/types";

type IdempotencyKey = string;

const cache = new Map<IdempotencyKey, GenerateImageResult>();

export function buildIdempotencyCacheKey(params: {
  userId?: string;
  idempotencyKey?: string | null;
}): IdempotencyKey | null {
  if (!params.idempotencyKey?.trim()) return null;
  const user = params.userId ?? "anonymous";
  return `${user}:${params.idempotencyKey.trim()}`;
}

export function getIdempotentResult(key: IdempotencyKey): GenerateImageResult | null {
  return cache.get(key) ?? null;
}

export function setIdempotentResult(key: IdempotencyKey, result: GenerateImageResult): void {
  cache.set(key, result);
}

/** 테스트·E2E용 */
export function clearIdempotencyCache(): void {
  cache.clear();
}
