/**
 * 105차 — 이미지 aHash (8×8 평균 해시) + 해밍 거리
 * sharp만 사용, Replicate/Claude 없음.
 * BigInt 리터럴 없이 64비트 비트열을 hex로 보관 (ES2019 타겟 호환).
 *
 * 비트/해밍(클라이언트 안전)은 `image-ahash-bits.ts` — 이 파일은 sharp 계산 전용.
 */
import sharp from "sharp";
import {
  AHASH_SIMILAR_THRESHOLD,
  hammingDistanceHex,
} from "@/lib/image-ahash-bits";

export { AHASH_SIMILAR_THRESHOLD, hammingDistanceHex };

const HASH_SIZE = 8;

function bitsToHex(bits: boolean[]): string {
  let hex = "";
  for (let i = 0; i < 64; i += 4) {
    let nibble = 0;
    for (let j = 0; j < 4; j += 1) {
      if (bits[i + j]) nibble |= 1 << (3 - j);
    }
    hex += nibble.toString(16);
  }
  return hex;
}

/** 64비트 aHash를 hex 문자열로 */
export async function computeAHashFromBuffer(buffer: Buffer): Promise<string> {
  const raw = await sharp(buffer)
    .resize(HASH_SIZE, HASH_SIZE, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer();

  let sum = 0;
  for (let i = 0; i < raw.length; i += 1) sum += raw[i]!;
  const avg = sum / raw.length;

  const bits: boolean[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    bits.push(raw[i]! >= avg);
  }
  while (bits.length < 64) bits.push(false);
  return bitsToHex(bits.slice(0, 64));
}

export async function computeAHashFromUrl(url: string): Promise<string | null> {
  try {
    if (url.startsWith("data:")) {
      const b64 = url.split(",")[1];
      if (!b64) return null;
      return computeAHashFromBuffer(Buffer.from(b64, "base64"));
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    return computeAHashFromBuffer(Buffer.from(await res.arrayBuffer()));
  } catch {
    return null;
  }
}

/** 배정용 — URL 배열 병렬 aHash (실패 시 null) */
export async function computeAHashesFromUrls(
  urls: string[],
): Promise<Array<string | null>> {
  return Promise.all(urls.map((url) => computeAHashFromUrl(url)));
}
