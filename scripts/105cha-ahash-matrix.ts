/**
 * 105차 — 로컬/URL 이미지 aHash 해밍 거리 행렬 ($0, sharp만)
 *
 *   npx tsx scripts/105cha-ahash-matrix.ts [url1 url2 ...]
 *   인자 없으면 픽스처 PNG 생성해 동일/유사/상이 거리를 검증
 */
import sharp from "sharp";
import {
  AHASH_SIMILAR_THRESHOLD,
  computeAHashFromBuffer,
  hammingDistanceHex,
} from "../lib/image-ahash";

async function patternedPng(
  kind: "A" | "A_noise" | "B",
): Promise<Buffer> {
  const size = 64;
  const raw = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 3;
      if (kind === "A") {
        raw[i] = x < 32 ? 220 : 40;
        raw[i + 1] = y < 32 ? 180 : 60;
        raw[i + 2] = 100;
      } else if (kind === "A_noise") {
        raw[i] = Math.min(255, (x < 32 ? 220 : 40) + ((x + y) % 7) - 3);
        raw[i + 1] = Math.min(255, (y < 32 ? 180 : 60) + ((x * 3) % 5) - 2);
        raw[i + 2] = 100 + ((y * 2) % 9) - 4;
      } else {
        raw[i] = y % 8 < 4 ? 30 : 200;
        raw[i + 1] = x % 8 < 4 ? 30 : 200;
        raw[i + 2] = 220;
      }
    }
  }
  return sharp(raw, { raw: { width: size, height: size, channels: 3 } })
    .png()
    .toBuffer();
}

async function main() {
  const urls = process.argv.slice(2);
  let labels: string[];
  let hashes: string[];

  if (urls.length >= 2) {
    labels = urls.map((u, i) => `u${i}`);
    const { computeAHashFromUrl } = await import("../lib/image-ahash");
    hashes = [];
    for (let i = 0; i < urls.length; i += 1) {
      const h = await computeAHashFromUrl(urls[i]!);
      if (!h) throw new Error(`hash fail ${urls[i]}`);
      hashes.push(h);
      console.log(`${labels[i]} ${h} ${urls[i]!.slice(-48)}`);
    }
  } else {
    const identical = await patternedPng("A");
    const near = await patternedPng("A_noise");
    const far = await patternedPng("B");
    const bufs = [identical, identical, near, far];
    labels = ["A", "A_copy", "A_near", "B_stripe"];
    hashes = [];
    for (let i = 0; i < bufs.length; i += 1) {
      hashes.push(await computeAHashFromBuffer(bufs[i]!));
      console.log(`${labels[i]} ${hashes[i]}`);
    }
  }

  console.log(`\nthreshold=${AHASH_SIMILAR_THRESHOLD}`);
  console.log("   " + labels.map((l) => l.padStart(10)).join(""));
  for (let i = 0; i < hashes.length; i += 1) {
    const row = labels.map((_, j) =>
      String(hammingDistanceHex(hashes[i]!, hashes[j]!)).padStart(10),
    );
    console.log(labels[i]!.padEnd(3) + row.join(""));
  }

  if (urls.length < 2) {
    const dSame = hammingDistanceHex(hashes[0]!, hashes[1]!);
    const dNear = hammingDistanceHex(hashes[0]!, hashes[2]!);
    const dFar = hammingDistanceHex(hashes[0]!, hashes[3]!);
    if (dSame !== 0) throw new Error(`identical should be 0, got ${dSame}`);
    if (dNear > AHASH_SIMILAR_THRESHOLD + 6) {
      throw new Error(`near should be small, got ${dNear}`);
    }
    if (dFar <= AHASH_SIMILAR_THRESHOLD) {
      throw new Error(`far should be > threshold, got ${dFar}`);
    }
    console.log("\n105cha aHash matrix OK");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
