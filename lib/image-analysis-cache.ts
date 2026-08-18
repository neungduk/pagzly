import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const CACHE_DIR = path.join(process.cwd(), ".cache", "image-analysis");

export type ImageAnalysisCacheEntry = {
  analysis: string;
  model: string;
  imageCount: number;
  createdAt: string;
};

function ensureCacheDir(): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/** 이미지 바이트 + 분석에 영향을 주는 상품 맥락으로 캐시 키를 만든다. */
export function buildImageAnalysisCacheKey(params: {
  imagePayloads: Array<{ data: string }>;
  category: string;
  brandName?: string | null;
  keyFeatures?: string | null;
  ingredients?: string | null;
  /** 원본 파일명+크기 지문이 있으면 보정 전후와 무관하게 같은 키를 쓴다. */
  imageCacheKey?: string;
}): string {
  if (params.imageCacheKey) {
    const hash = createHash("sha256");
    hash.update(params.imageCacheKey);
    hash.update("\n");
    hash.update(
      JSON.stringify({
        category: params.category,
        brandName: params.brandName ?? "",
        keyFeatures: params.keyFeatures ?? "",
        ingredients: params.ingredients ?? "",
      }),
    );
    return hash.digest("hex");
  }

  const hash = createHash("sha256");
  for (const payload of params.imagePayloads) {
    hash.update(payload.data);
  }
  hash.update("\n");
  hash.update(
    JSON.stringify({
      category: params.category,
      brandName: params.brandName ?? "",
      keyFeatures: params.keyFeatures ?? "",
      ingredients: params.ingredients ?? "",
    }),
  );
  return hash.digest("hex");
}

export function readImageAnalysisCache(key: string): ImageAnalysisCacheEntry | null {
  try {
    const filePath = path.join(CACHE_DIR, `${key}.json`);
    if (!fs.existsSync(filePath)) return null;
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as ImageAnalysisCacheEntry;
    if (!parsed?.analysis) return null;
    return parsed;
  } catch (error) {
    console.warn("[image-analysis-cache] 읽기 실패, 캐시 무시", error);
    return null;
  }
}

export function writeImageAnalysisCache(key: string, entry: ImageAnalysisCacheEntry): void {
  try {
    ensureCacheDir();
    const filePath = path.join(CACHE_DIR, `${key}.json`);
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), "utf8");
  } catch (error) {
    console.warn("[image-analysis-cache] 쓰기 실패", error);
  }
}
