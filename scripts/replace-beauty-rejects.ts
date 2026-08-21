/**
 * 로고/문구/인물 컷 교체용. 실행: npx tsx scripts/replace-beauty-rejects.ts
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "test-assets", "화장품-확장");
const BLOCKED =
  /apple|samsung|chanel|dior|logo|watermark|sesderma|stain|penghilang/i;

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
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const USED = new Set<number>([
  18350885, 8101529, 7233317, 8054400, 7006153, 37187621, 14482303, 7630328,
  8217403, 6925512, 8063829, 35599938, 1279107, 1643753, 35082703, 6634662,
  35970499,
]);

async function search(apiKey: string, query: string) {
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "24");
  const res = await fetch(url.toString(), { headers: { Authorization: apiKey } });
  if (!res.ok) throw new Error(`${query} ${res.status}`);
  const data = (await res.json()) as { photos?: PexelsPhoto[] };
  return (data.photos ?? []).filter(
    (p) => !USED.has(p.id) && !BLOCKED.test(p.url) && !BLOCKED.test(p.alt ?? ""),
  );
}

async function save(photo: PexelsPhoto, dest: string) {
  const imgRes = await fetch(photo.src.large2x || photo.src.large);
  if (!imgRes.ok) throw new Error(`dl ${photo.id}`);
  fs.writeFileSync(dest, Buffer.from(await imgRes.arrayBuffer()));
}

async function pick(apiKey: string, queries: string[]) {
  for (const query of queries) {
    const photos = await search(apiKey, query);
    const photo = photos[0];
    if (photo) {
      USED.add(photo.id);
      return { photo, query };
    }
  }
  return null;
}

async function main() {
  const apiKey = process.env.PEXELS_API_KEY ?? loadEnvLocal().PEXELS_API_KEY;
  if (!apiKey) throw new Error("no key");

  const jobs = [
    {
      dest: path.join(ROOT, "미스트", "type-01-pexels-replace.jpeg"),
      queries: [
        "skincare spray bottle mockup no label white background",
        "toner mist bottle unlabelled glass",
        "cosmetic spray bottle blank label",
      ],
    },
    {
      dest: path.join(ROOT, "마스크팩", "type-01-pexels-replace.jpeg"),
      queries: [
        "sleeping pack cream jar no label",
        "cosmetic mask jar unbranded",
        "hydrogel eye patches skincare no brand",
        "face mask sachet packaging plain white",
      ],
    },
  ];

  const records = [];
  for (const job of jobs) {
    const picked = await pick(apiKey, job.queries);
    if (!picked) {
      console.warn("no replacement for", job.dest);
      continue;
    }
    const ext = picked.photo.src.original.match(/\.(jpe?g|png)/i)?.[1]?.toLowerCase() ?? "jpg";
    const finalDest = job.dest.replace(/replace\.jpeg$/, `${picked.photo.id}.${ext}`);
    await save(picked.photo, finalDest);
    records.push({
      file: finalDest,
      id: picked.photo.id,
      photographer: picked.photo.photographer,
      url: picked.photo.url,
      alt: picked.photo.alt,
      query: picked.query,
    });
    console.log(`✓ ${path.basename(finalDest)} — ${picked.photo.photographer} — ${picked.photo.alt}`);
  }
  fs.writeFileSync(
    path.join(__dirname, "..", "review", "test-images-beauty-replacements.json"),
    JSON.stringify(records, null, 2),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
