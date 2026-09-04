/**
 * aHash 비트·해밍 거리 (sharp 없음 — 클라이언트 번들 안전)
 * sharp 기반 해시 계산은 `image-ahash.ts`에 둔다.
 */

function hexToBits(hex: string): boolean[] {
  const bits: boolean[] = [];
  const padded = hex.padStart(16, "0").slice(0, 16);
  for (let i = 0; i < 16; i += 1) {
    const n = parseInt(padded[i]!, 16);
    for (let j = 3; j >= 0; j -= 1) {
      bits.push(((n >> j) & 1) === 1);
    }
  }
  return bits;
}

export function hammingDistanceHex(a: string, b: string): number {
  try {
    const left = hexToBits(a);
    const right = hexToBits(b);
    let n = 0;
    for (let i = 0; i < 64; i += 1) {
      if (left[i] !== right[i]) n += 1;
    }
    return n;
  } catch {
    return 64;
  }
}

/** 해밍 거리 ≤ threshold 이면 시각적으로 유사 */
export const AHASH_SIMILAR_THRESHOLD = 10;
