/**
 * 반복 학습용 무브랜드 Pexels 스톡 (loop-01..03).
 * 크롤링 없음. Pexels License (상업 이용 허용).
 *
 * 실행: npx tsx scripts/download-test-images.ts
 */

import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "test-assets");

const BLOCKED =
  /apple|samsung|sony|jbl|beats|nike|gucci|chanel|logo|iphone|aukey|logitech|acer|razer|playstation|bose|airpods|xiaomi/i;

const JOBS = [
  {
    folder: "화장품-뷰티",
    copies: [
      { from: "01-pexels-18350885.jpeg", dest: "loop-01-pexels-18350885.jpeg" },
      { from: "02-pexels-8101529.jpeg", dest: "loop-02-pexels-8101529.jpeg" },
    ],
    queries: ["cream texture smear close up beige no label"],
    startIndex: 3,
  },
  {
    folder: "전자기기-액세서리",
    copies: [
      { from: "01-pexels-35599938.jpeg", dest: "loop-01-pexels-35599938.jpeg" },
    ],
    extraCopies: [
      {
        fromRel: ["전자제품", "05-pexels-1279107.jpeg"],
        dest: "loop-02-pexels-1279107.jpeg",
      },
    ],
    queries: ["usb charging cable coiled white table no brand"],
    startIndex: 3,
  },
  {
    folder: "리빙-소품",
    copies: [
      { from: "01-pexels-35082703.jpeg", dest: "loop-01-pexels-35082703.jpeg" },
      { from: "02-pexels-6634662.jpeg", dest: "loop-02-pexels-6634662.jpeg" },
    ],
    queries: ["ceramic mug coffee still life sunlight no logo"],
    startIndex: 3,
  },
] as const;

type PexelsPhoto = {
  id: number;
  url: string;
  alt?: string;
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

async function searchPexels(apiKey: string, query: string): Promise<PexelsPhoto[]> {
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "15");
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
    console.error(
      "PEXELS_API_KEY가 없습니다.\n" +
        "1) https://www.pexels.com/api/ 에서 무료 키 발급\n" +
        "2) .env.local 에 PEXELS_API_KEY=... 추가",
    );
    process.exit(1);
  }

  const sources: Array<{
    category: string;
    file: string;
    pexelsId: number | null;
    pexelsUrl: string;
    photographer: string;
    photographerUrl: string;
    query: string;
    license: string;
    note: string;
  }> = [];
  const usedIds = new Set<number>([18350885, 8101529, 35599938, 1279107, 35082703, 6634662]);

  for (const job of JOBS) {
    const dir = path.join(ROOT, job.folder);
    fs.mkdirSync(dir, { recursive: true });

    for (const copy of job.copies) {
      const src = path.join(dir, copy.from);
      const dest = path.join(dir, copy.dest);
      if (!fs.existsSync(src)) {
        console.warn(`skip copy missing ${job.folder}/${copy.from}`);
        continue;
      }
      fs.copyFileSync(src, dest);
      const idMatch = copy.dest.match(/pexels-(\d+)/);
      sources.push({
        category: job.folder,
        file: `scripts/test-assets/${job.folder}/${copy.dest}`,
        pexelsId: idMatch ? Number(idMatch[1]) : null,
        pexelsUrl: idMatch ? `https://www.pexels.com/photo/${idMatch[1]}/` : "",
        photographer: "(기존 검증분 재사용)",
        photographerUrl: "",
        query: "reuse",
        license: "Pexels License (free, commercial use allowed)",
        note: "이전 루프에서 로고 없음 확인 후 재사용",
      });
      console.log(`copy ${job.folder}/${copy.dest}`);
    }

    if ("extraCopies" in job && job.extraCopies) {
      for (const extra of job.extraCopies) {
        const src = path.join(ROOT, extra.fromRel[0], extra.fromRel[1]);
        const dest = path.join(dir, extra.dest);
        if (!fs.existsSync(src)) {
          console.warn(`skip extra missing ${extra.fromRel.join("/")}`);
          continue;
        }
        fs.copyFileSync(src, dest);
        const idMatch = extra.dest.match(/pexels-(\d+)/);
        sources.push({
          category: job.folder,
          file: `scripts/test-assets/${job.folder}/${extra.dest}`,
          pexelsId: idMatch ? Number(idMatch[1]) : null,
          pexelsUrl: idMatch ? `https://www.pexels.com/photo/${idMatch[1]}/` : "",
          photographer: "(기존 검증분 재사용)",
          photographerUrl: "",
          query: "reuse-electronics-unbranded",
          license: "Pexels License (free, commercial use allowed)",
          note: "로고 없는 스마트스피커 컷 재사용",
        });
        console.log(`copy ${job.folder}/${extra.dest}`);
      }
    }

    let index = job.startIndex;
    for (const query of job.queries) {
      const photos = await searchPexels(apiKey, query);
      const photo = photos.find((p) => !usedIds.has(p.id));
      if (!photo) {
        console.warn(`no photo for ${query}`);
        continue;
      }
      usedIds.add(photo.id);
      const ext = photo.src.original.match(/\.(jpe?g|png)/i)?.[1]?.toLowerCase() ?? "jpg";
      const filename = `loop-0${index}-pexels-${photo.id}.${ext}`;
      const dest = path.join(dir, filename);
      await downloadPhoto(photo, dest);
      sources.push({
        category: job.folder,
        file: `scripts/test-assets/${job.folder}/${filename}`,
        pexelsId: photo.id,
        pexelsUrl: photo.url,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        query,
        license: "Pexels License (free, commercial use allowed)",
        note: "신규 검색. 로고/워터마크는 다운로드 후 육안 확인",
      });
      console.log(`✓ ${job.folder}/${filename} — ${photo.photographer}`);
      index += 1;
    }
  }

  const manifestPath = path.join(__dirname, "..", "review", "test-images.json");
  fs.writeFileSync(manifestPath, JSON.stringify(sources, null, 2));
  console.log(`\n${sources.length}장. manifest: review/test-images.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
