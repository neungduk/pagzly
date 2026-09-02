const AUTOFILL_VISION_MAX_IMAGES = 4;

/** 폼 자동입력용 대표 사진 인덱스 (최대 4장, 앞·중간·뒤 분산) */
export function pickAutofillVisionIndices(count: number, max = AUTOFILL_VISION_MAX_IMAGES): number[] {
  if (count <= 0) return [];
  if (count <= max) return Array.from({ length: count }, (_, i) => i);
  const picks = new Set<number>([0, 1, count - 1]);
  if (max >= 4) picks.add(Math.floor(count / 2));
  return [...picks].sort((a, b) => a - b).slice(0, max);
}

/** 폼 자동입력용 대표 URL 선택 */
export function pickAutofillVisionUrls(urls: string[], max = AUTOFILL_VISION_MAX_IMAGES): string[] {
  const indices = pickAutofillVisionIndices(urls.length, max);
  return indices.map((i) => urls[i]).filter((url): url is string => Boolean(url?.trim()));
}

export { AUTOFILL_VISION_MAX_IMAGES };
