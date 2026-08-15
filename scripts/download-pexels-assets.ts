// Pexels API로 카테고리별 상품 테스트 사진을 scripts/test-assets/에 다운로드한다.
//
// 사전 준비:
//   1. https://www.pexels.com/api/ 에서 무료 API 키 발급
//   2. .env.local 에 PEXELS_API_KEY=... 추가
//
// 실행: npx tsx scripts/download-pexels-assets.ts

import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "test-assets");

type CategorySpec = {
  folder: string;
  queries: string[];
  perQuery: number;
};

const CATEGORIES: CategorySpec[] = [
  {
    folder: "화장품-뷰티",
    queries: ["skincare cream product", "cosmetic serum bottle", "beauty product flat lay"],
    perQuery: 2,
  },
  {
    folder: "의류-패션",
    queries: ["clothing flat lay", "shirt product photo", "fashion apparel isolated"],
    perQuery: 2,
  },
  {
    folder: "식품",
    queries: ["packaged food product", "protein shake bottle", "snack food packaging"],
    perQuery: 2,
  },
  {
    folder: "전자제품",
    queries: ["wireless earbuds product", "electronics gadget white background", "smart speaker product"],
    perQuery: 2,
  },
  {
    folder: "생활용품",
    queries: ["home decor product", "candle product photo", "kitchen utensil product"],
    perQuery: 2,
  },
];

type PexelsPhoto = {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
  };
};

type PexelsSearchResponse = {
  photos: PexelsPhoto[];
};

type SourceRecord = {
  category: string;
  file: string;
  pexelsId: number;
  pexelsUrl: string;
  photographer: string;
  photographerUrl: string;
  query: string;
};

function loadEnvLocal(): Record<string, string> {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

async function searchPhotos(
  apiKey: string,
  query: string,
  perPage: number,
): Promise<PexelsPhoto[]> {
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("orientation", "portrait");

  const res = await fetch(url.toString(), {
    headers: { Authorization: apiKey },
  });
  if (!res.ok) {
    throw new Error(`Pexels search failed (${query}): ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as PexelsSearchResponse;
  return data.photos ?? [];
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${url} (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
}

async function main() {
  const env = loadEnvLocal();
  const apiKey = process.env.PEXELS_API_KEY ?? env.PEXELS_API_KEY;
  if (!apiKey) {
    console.error(
      "PEXELS_API_KEY가 없습니다.\n" +
        "https://www.pexels.com/api/ 에서 무료로 발급받아 .env.local에 추가하세요:\n" +
        "  PEXELS_API_KEY=your_key_here",
    );
    process.exit(1);
  }

  const sources: SourceRecord[] = [];
  const usedIds = new Set<number>();

  for (const cat of CATEGORIES) {
    const dir = path.join(ROOT, cat.folder);
    fs.mkdirSync(dir, { recursive: true });

    let index = 1;
    for (const query of cat.queries) {
      const photos = await searchPhotos(apiKey, query, cat.perQuery);
      for (const photo of photos) {
        if (usedIds.has(photo.id)) continue;
        usedIds.add(photo.id);

        const ext = photo.src.original.match(/\.(jpe?g|png)/i)?.[1]?.toLowerCase() ?? "jpg";
        const filename = `${String(index).padStart(2, "0")}-pexels-${photo.id}.${ext}`;
        const dest = path.join(dir, filename);

        await downloadFile(photo.src.large2x || photo.src.large, dest);
        sources.push({
          category: cat.folder,
          file: `scripts/test-assets/${cat.folder}/${filename}`,
          pexelsId: photo.id,
          pexelsUrl: photo.url,
          photographer: photo.photographer,
          photographerUrl: photo.photographer_url,
          query,
        });
        console.log(`✓ ${cat.folder}/${filename} (${photo.photographer})`);
        index++;
      }
    }
  }

  const manifestPath = path.join(__dirname, "..", "review", "photo-sources.json");
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(sources, null, 2));
  console.log(`\n${sources.length}장 다운로드 완료. manifest: review/photo-sources.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
