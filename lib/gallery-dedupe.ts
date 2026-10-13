/**
 * 329차 — 갤러리 그리드에 같은 사진이 두 번 깔리지 않게 중복 제거(라이브·export 공용).
 * 업로드 파일명 `<타임스탬프>-<uuid>`가 같으면 -enhanced/-texture/-fx-* 같은 파생본도 같은 사진으로 본다.
 * 범위 밖·빈 URL 인덱스도 함께 걸러 그리드 칸 수를 실제 보이는 사진 수에 맞춘다.
 */
import { IMAGE_SOURCE_CAP } from "@/lib/design-tokens";
import { hammingDistanceHex } from "@/lib/image-ahash-bits";

const SOURCE_ID = /\/(\d{10,}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[^/]*$/i;

function sourceKey(url: string): string {
  const path = url.split(/[?#]/)[0] ?? url;
  return SOURCE_ID.exec(path)?.[1] ?? path;
}

export type ImageHashByUrl = Readonly<Record<string, string>>;

/**
 * 같은 촬영본 묶음 — keys(URL 또는 저장 경로)의 원본 키가 같거나 aHash 거리가 IMAGE_SOURCE_CAP.sameShotAhashMax 이하면 한 묶음.
 * 결과[i] = 그 묶음의 가장 앞 인덱스. 해시가 없는 사진은 원본 키로만 묶인다.
 */
export function sameShotGroups(
  keys: readonly string[],
  hashes: ReadonlyArray<string | null | undefined> = [],
): number[] {
  const parent = keys.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  const join = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
  };
  const first = new Map<string, number>();
  keys.forEach((key, i) => {
    if (!key) return;
    const k = sourceKey(key);
    if (first.has(k)) join(first.get(k)!, i);
    else first.set(k, i);
  });
  for (let i = 0; i < keys.length; i += 1) {
    const a = hashes[i];
    if (!keys[i] || !a) continue;
    for (let j = i + 1; j < keys.length; j += 1) {
      const b = hashes[j];
      if (keys[j] && b && hammingDistanceHex(a, b) <= IMAGE_SOURCE_CAP.sameShotAhashMax) join(i, j);
    }
  }
  return keys.map((_, i) => find(i));
}

/** sourceOf[i] = i번 사진과 같은 촬영본인 첫 인덱스 (같은 URL·파생본, 해시가 있으면 색보정·배경 교체본까지) */
export function imageSourceGroups(imageUrls: readonly string[], hashByUrl?: ImageHashByUrl): number[] {
  return sameShotGroups(imageUrls, hashByUrl ? imageUrls.map((url) => hashByUrl[url]) : []);
}

export function uniqueGalleryIndexes(indexes: readonly number[], imageUrls: readonly string[]): number[] {
  const seen = new Set<string>();
  const out: number[] = [];
  for (const idx of indexes) {
    if (!Number.isInteger(idx) || idx < 0 || idx >= imageUrls.length) continue;
    const url = imageUrls[idx] ?? "";
    if (!url) continue;
    const key = sourceKey(url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(idx);
  }
  return out;
}
