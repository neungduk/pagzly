/**
 * TEST_MODE 섹션 배경(성분/텍스처) 디스크 캐시 — flux-schnell 재호출 방지.
 */

import fs from "fs";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), ".cache", "section-backdrops");

export type SectionBackdropCache = {
  ingredientDataUrl: string;
  textureDataUrl: string;
};

function toDataUrl(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

export function readSectionBackdropCache(): SectionBackdropCache | null {
  const ingredientPath = path.join(CACHE_DIR, "ingredient.png");
  const texturePath = path.join(CACHE_DIR, "texture.png");
  if (!fs.existsSync(ingredientPath) || !fs.existsSync(texturePath)) {
    return null;
  }
  return {
    ingredientDataUrl: toDataUrl(ingredientPath),
    textureDataUrl: toDataUrl(texturePath),
  };
}

export async function writeSectionBackdropCache(
  ingredientUrl: string,
  textureUrl: string,
): Promise<void> {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const pairs: [string, string][] = [
    [ingredientUrl, "ingredient.png"],
    [textureUrl, "texture.png"],
  ];
  for (const [url, filename] of pairs) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`섹션 배경 캐시 저장 실패: ${url}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(path.join(CACHE_DIR, filename), buffer);
  }
  console.log("[section-backdrop-cache] ingredient + texture 저장 완료");
}
