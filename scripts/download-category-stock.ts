/**
 * 카테고리 루프용 Pexels 스톡 2장씩 다운로드.
 * 상업 이용 가능(Pexels License). 브랜드 로고 상품컷은 쿼리에서 제외.
 *
 * 실행: npx tsx scripts/download-category-stock.ts
 */

import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "test-assets");

const CATEGORIES = [
  {
    folder: "화장품-뷰티",
    queries: ["skincare cream jar marble", "glass dropper bottle skincare"],
  },
  {
    folder: "패션-소품",
    queries: ["leather handbag product photography", "minimal gold jewelry necklace"],
  },
  {
    folder: "리빙-소품",
    queries: ["ceramic vase still life", "beige soy candle product"],
  },
  {
    folder: "전자기기-액세서리",
    queries: ["black wireless earbuds case", "over ear headphones product white"],
  },
] as const;

type PexelsPhoto = {
  id: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: { original: string; large2x: string; large: string };
};

function loadEnvLocal(): Record<string, string> {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

async function searchOne(apiKey: string, query: string): Promise<PexelsPhoto | null> {
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "8");
  url.searchParams.set("orientation", "portrait");

  const res = await fetch(url.toString(), { headers: { Authorization: apiKey } });
  if (!res.ok) {
    throw new Error(`Pexels search failed (${query}): ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { photos?: PexelsPhoto[] };
  const photos = data.photos ?? [];
  const blocked = /apple|samsung|nike|gucci|chanel|logo|iphone/i;
  return photos.find((p) => !blocked.test(p.url) && !blocked.test(p.src.original)) ?? photos[0] ?? null;
}

async function main() {
  const env = loadEnvLocal();
  const apiKey = process.env.PEXELS_API_KEY ?? env.PEXELS_API_KEY;
  if (!apiKey) {
    console.error("PEXELS_API_KEY가 없습니다.");
    process.exit(1);
  }

  const sources: Array<{
    category: string;
    file: string;
    pexelsId: number;
    pexelsUrl: string;
    photographer: string;
    photographerUrl: string;
    query: string;
    license: string;
  }> = [];
  const usedIds = new Set<number>();

  for (const cat of CATEGORIES) {
    const dir = path.join(ROOT, cat.folder);
    fs.mkdirSync(dir, { recursive: true });
    let index = 1;
    for (const query of cat.queries) {
      const photo = await searchOne(apiKey, query);
      if (!photo || usedIds.has(photo.id)) continue;
      usedIds.add(photo.id);
      const ext = photo.src.original.match(/\.(jpe?g|png)/i)?.[1]?.toLowerCase() ?? "jpg";
      const filename = `${String(index).padStart(2, "0")}-pexels-${photo.id}.${ext}`;
      const dest = path.join(dir, filename);
      const imgRes = await fetch(photo.src.large2x || photo.src.large);
      if (!imgRes.ok) throw new Error(`download failed ${photo.id}`);
      fs.writeFileSync(dest, Buffer.from(await imgRes.arrayBuffer()));
      sources.push({
        category: cat.folder,
        file: `scripts/test-assets/${cat.folder}/${filename}`,
        pexelsId: photo.id,
        pexelsUrl: photo.url,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        query,
        license: "Pexels License (free, commercial use allowed)",
      });
      console.log(`✓ ${cat.folder}/${filename} — ${photo.photographer}`);
      index++;
    }
  }

  const manifestPath = path.join(__dirname, "..", "review", "photo-sources-category-loop.json");
  fs.writeFileSync(manifestPath, JSON.stringify(sources, null, 2));
  console.log(`\n${sources.length}장. manifest: review/photo-sources-category-loop.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
