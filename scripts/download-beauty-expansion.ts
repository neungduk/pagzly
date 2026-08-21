/**
 * 화장품 5종류(세럼/크림/미스트/클렌저/마스크팩) 무브랜드 Pexels 스톡.
 * 크롤링 없음. Pexels License (상업 이용 허용).
 *
 * 실행: npx tsx scripts/download-beauty-expansion.ts
 */

import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "test-assets", "화장품-확장");
const EXISTING_BEAUTY = path.join(__dirname, "test-assets", "화장품-뷰티");

const BLOCKED =
  /apple|samsung|sony|nike|gucci|chanel|dior|lancome|estee|clinique|theordinary|ordinary|laroche|cerave|innisfree|laneige|sulwhasoo|logo|watermark|sesderma|alchemist/i;

type PexelsPhoto = {
  id: number;
  url: string;
  alt?: string;
  photographer: string;
  photographer_url: string;
  src: { original: string; large2x: string; large: string };
};

type ManifestRow = {
  category: string;
  type: string;
  file: string;
  pexelsId: number | null;
  pexelsUrl: string;
  photographer: string;
  photographerUrl: string;
  query: string;
  license: string;
  note: string;
};

const JOBS: Array<{
  type: string;
  reuse?: Array<{ from: string; dest: string; pexelsId: number; photographer: string }>;
  queries: string[];
}> = [
  {
    type: "세럼",
    queries: [
      "glass dropper bottle skincare no label white background",
      "amber serum dropper bottle unbranded",
    ],
  },
  {
    type: "크림",
    reuse: [
      {
        from: "loop-01-pexels-18350885.jpeg",
        dest: "type-01-pexels-18350885.jpeg",
        pexelsId: 18350885,
        photographer: "Carlos Diaz",
      },
      {
        from: "loop-02-pexels-8101529.jpeg",
        dest: "type-02-pexels-8101529.jpeg",
        pexelsId: 8101529,
        photographer: "Polina",
      },
      {
        from: "loop-03-pexels-7233317.jpeg",
        dest: "type-03-pexels-7233317.jpeg",
        pexelsId: 7233317,
        photographer: "Artem Podrez",
      },
    ],
    queries: [],
  },
  {
    type: "미스트",
    queries: [
      "facial mist spray bottle no label",
      "transparent spray bottle skincare product",
    ],
  },
  {
    type: "클렌저",
    queries: [
      "foam cleanser bubbles close up white",
      "white pump bottle skincare no label",
    ],
  },
  {
    type: "마스크팩",
    queries: [
      "sheet face mask skincare unbranded",
      "clay mask texture close up beige",
    ],
  },
];

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

async function searchPexels(apiKey: string, query: string): Promise<PexelsPhoto[]> {
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "20");
  url.searchParams.set("orientation", "portrait");
  const res = await fetch(url.toString(), { headers: { Authorization: apiKey } });
  if (!res.ok) {
    throw new Error(`Pexels search failed (${query}): ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { photos?: PexelsPhoto[] };
  return (data.photos ?? []).filter(
    (p) => !BLOCKED.test(p.url) && !BLOCKED.test(p.alt ?? "") && !BLOCKED.test(p.src.original),
  );
}

async function downloadPhoto(photo: PexelsPhoto, dest: string) {
  const imgRes = await fetch(photo.src.large2x || photo.src.large);
  if (!imgRes.ok) throw new Error(`download failed ${photo.id}`);
  fs.writeFileSync(dest, Buffer.from(await imgRes.arrayBuffer()));
}

async function main() {
  const env = loadEnvLocal();
  const apiKey = process.env.PEXELS_API_KEY ?? env.PEXELS_API_KEY;
  if (!apiKey) {
    console.error("PEXELS_API_KEY가 없습니다.");
    process.exit(1);
  }

  const usedIds = new Set<number>([
    18350885, 8101529, 7233317, 35599938, 1279107, 1643753, 35082703, 6634662, 35970499,
  ]);
  const rows: ManifestRow[] = [];

  for (const job of JOBS) {
    const dir = path.join(ROOT, job.type);
    fs.mkdirSync(dir, { recursive: true });
    let index = 1;

    for (const reuse of job.reuse ?? []) {
      const src = path.join(EXISTING_BEAUTY, reuse.from);
      const dest = path.join(dir, reuse.dest);
      if (!fs.existsSync(src)) {
        console.warn(`skip reuse missing ${reuse.from}`);
        continue;
      }
      fs.copyFileSync(src, dest);
      rows.push({
        category: "화장품-확장",
        type: job.type,
        file: `scripts/test-assets/화장품-확장/${job.type}/${reuse.dest}`,
        pexelsId: reuse.pexelsId,
        pexelsUrl: `https://www.pexels.com/photo/${reuse.pexelsId}/`,
        photographer: reuse.photographer,
        photographerUrl: "",
        query: "reuse-existing-beauty-loop",
        license: "Pexels License (free, commercial use allowed)",
        note: "기존 무라벨 검증분 재사용",
      });
      usedIds.add(reuse.pexelsId);
      console.log(`copy ${job.type}/${reuse.dest}`);
      index += 1;
    }

    for (const query of job.queries) {
      const photos = await searchPexels(apiKey, query);
      const photo = photos.find((p) => !usedIds.has(p.id));
      if (!photo) {
        console.warn(`no photo for ${job.type} / ${query}`);
        continue;
      }
      usedIds.add(photo.id);
      const ext = photo.src.original.match(/\.(jpe?g|png)/i)?.[1]?.toLowerCase() ?? "jpg";
      const filename = `type-0${index}-pexels-${photo.id}.${ext}`;
      const dest = path.join(dir, filename);
      await downloadPhoto(photo, dest);
      rows.push({
        category: "화장품-확장",
        type: job.type,
        file: `scripts/test-assets/화장품-확장/${job.type}/${filename}`,
        pexelsId: photo.id,
        pexelsUrl: photo.url,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        query,
        license: "Pexels License (free, commercial use allowed)",
        note: "신규 검색. 로고/워터마크는 다운로드 후 육안 확인",
      });
      console.log(`✓ ${job.type}/${filename} — ${photo.photographer} — ${photo.alt ?? ""}`);
      index += 1;
    }
  }

  const outPath = path.join(__dirname, "..", "review", "test-images-beauty-expansion.json");
  fs.writeFileSync(outPath, JSON.stringify(rows, null, 2));
  console.log(`\n${rows.length}장. manifest: review/test-images-beauty-expansion.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
