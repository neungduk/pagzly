/**
 * 329차 — 갤러리 그리드에 같은 사진이 두 번 깔리지 않게 중복 제거(라이브·export 공용).
 * 업로드 파일명 `<타임스탬프>-<uuid>`가 같으면 -enhanced/-texture/-fx-* 같은 파생본도 같은 사진으로 본다.
 * 범위 밖·빈 URL 인덱스도 함께 걸러 그리드 칸 수를 실제 보이는 사진 수에 맞춘다.
 */
const SOURCE_ID = /\/(\d{10,}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[^/]*$/i;

function sourceKey(url: string): string {
  const path = url.split(/[?#]/)[0] ?? url;
  return SOURCE_ID.exec(path)?.[1] ?? path;
}

/** sourceOf[i] = i번 사진과 같은 원본인 첫 인덱스 (같은 URL·파생본을 한 소스로 센다) */
export function imageSourceGroups(imageUrls: readonly string[]): number[] {
  const first = new Map<string, number>();
  return imageUrls.map((url, i) => {
    if (!url) return i;
    const key = sourceKey(url);
    if (!first.has(key)) first.set(key, i);
    return first.get(key)!;
  });
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
