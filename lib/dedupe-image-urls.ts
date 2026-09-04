/**
 * image_urls / imagePaths 병렬 배열에서 동일 URL 중복을 제거한다.
 * 슬롯 수를 맞추려고 같은 사진을 복제해 넣지 않는다 (101차).
 */

export type DedupeImageUrlsResult = {
  urls: string[];
  paths: string[];
  /** 旧 index → 新 index (중복으로 제거된 슬롯은 첫 등장 index로 매핑) */
  indexMap: number[];
  removed: number;
};

export function filenameOfUrl(url: string): string {
  try {
    const path = url.split("?")[0] ?? url;
    const parts = path.split("/");
    return parts[parts.length - 1] || url;
  } catch {
    return url;
  }
}

export function dedupeImageUrlArrays(
  urls: string[],
  paths?: string[] | null,
): DedupeImageUrlsResult {
  const outUrls: string[] = [];
  const outPaths: string[] = [];
  const indexMap: number[] = [];
  const seen = new Map<string, number>();

  for (let i = 0; i < urls.length; i += 1) {
    const url = urls[i] ?? "";
    if (!url) {
      indexMap[i] = Math.max(0, outUrls.length - 1);
      continue;
    }
    const existing = seen.get(url);
    if (existing !== undefined) {
      indexMap[i] = existing;
      continue;
    }
    const next = outUrls.length;
    seen.set(url, next);
    indexMap[i] = next;
    outUrls.push(url);
    outPaths.push(paths?.[i] ?? "");
  }

  return {
    urls: outUrls,
    paths: outPaths,
    indexMap,
    removed: urls.length - outUrls.length,
  };
}

export function remapIndex(indexMap: number[], index: number | undefined): number {
  if (typeof index !== "number" || !Number.isInteger(index) || index < 0) return 0;
  if (index < indexMap.length) return indexMap[index] ?? 0;
  return Math.max(0, indexMap[indexMap.length - 1] ?? 0);
}

/** 섹션 imageIndex / imageIndexes를 dedupe indexMap에 맞게 재매핑 */
export function remapSectionImageIndexes<T extends { type: string }>(
  sections: T[],
  indexMap: number[],
): T[] {
  if (indexMap.length === 0) return sections;
  return sections.map((section) => {
    const s = section as T & {
      type: string;
      imageIndex?: number;
      imageIndexes?: number[];
      steps?: { imageIndex: number; [k: string]: unknown }[];
      options?: { imageIndex: number; [k: string]: unknown }[];
    };
    if (s.type === "hero" || s.type === "image_text") {
      return {
        ...s,
        imageIndex: remapIndex(indexMap, s.imageIndex),
      } as T;
    }
    if (s.type === "gallery" || (s.type === "spec_table" && Array.isArray(s.imageIndexes))) {
      return {
        ...s,
        imageIndexes: (s.imageIndexes ?? []).map((i) => remapIndex(indexMap, i)),
      } as T;
    }
    if (s.type === "step_card" && Array.isArray(s.steps)) {
      return {
        ...s,
        steps: s.steps.map((step) => ({
          ...step,
          imageIndex: remapIndex(indexMap, step.imageIndex),
        })),
      } as T;
    }
    if (s.type === "color_variation" && Array.isArray(s.options)) {
      return {
        ...s,
        options: s.options.map((opt) => ({
          ...opt,
          imageIndex: remapIndex(indexMap, opt.imageIndex),
        })),
      } as T;
    }
    if (s.type === "brand_story" && Array.isArray(s.imageIndexes)) {
      return {
        ...s,
        imageIndexes: s.imageIndexes.map((i) => remapIndex(indexMap, i)),
      } as T;
    }
    return section;
  });
}
