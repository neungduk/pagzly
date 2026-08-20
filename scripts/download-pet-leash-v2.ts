/**
 * 반려동물 — 리드줄이 주 피사체인 Pexels 사진 3장 재소싱.
 * 실행: npx tsx scripts/download-pet-leash-v2.ts
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "test-assets", "반려동물");
const SOURCES_PATH = path.join(__dirname, "..", "review", "photo-sources.json");

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
  url.searchParams.set("per_page", "30");
  url.searchParams.set("orientation", "landscape");
  const res = await fetch(url.toString(), { headers: { Authorization: apiKey } });
  if (!res.ok) throw new Error(`Pexels search failed (${query}): ${res.status}`);
  const data = (await res.json()) as { photos?: PexelsPhoto[] };
  return data.photos ?? [];
}

function isLeashFocused(alt: string): boolean {
  if (!/\bleash\b/i.test(alt)) return false;

  const productPatterns = [
    /\bdog leash\b.*\b(lies|lying|resting|on|hanging|coiled|folded|showcasing|featuring|with|metal clip|carabiner|paved|path|floor|glass|surface|craftsmanship|durability)\b/i,
    /\b(high-quality|durable|black dog leash|impact dog leash)\b/i,
    /\bclose-up of a durable impact dog leash\b/i,
    /\bleash lies on\b/i,
  ];
  if (!productPatterns.some((p) => p.test(alt))) return false;

  const animalSubject = [
    /\b(dog|puppy|dogs|terrier|labrador|retriever|chihuahua|corgi|husky|bulldog|collie|dachshund)\b.*\b(on a leash|on leash|with a leash)\b/i,
    /\b(on a leash|on leash)\b.*\b(walk|walking|sitting|standing|looking|enjoying)\b/i,
    /\b(two|four|group of) dogs\b/i,
    /\bdogs on leashes\b/i,
    /\bchild\b|\bperson\b|\bowner\b|\bman\b|\bwoman\b|\bpeople\b/i,
    /\bpuppy\b|\bpuppies\b/i,
  ];
  return !animalSubject.some((p) => p.test(alt));
}

/** 검증된 리드줄 제품컷 (Pexels ID) */
const VERIFIED_LEASH_IDS = [28948931, 28948913, 28948917, 28948928];

async function downloadPhoto(photo: PexelsPhoto, dest: string) {
  const res = await fetch(photo.src.large2x || photo.src.large);
  if (!res.ok) throw new Error(`download failed ${photo.id}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  const env = loadEnvLocal();
  const apiKey = process.env.PEXELS_API_KEY ?? env.PEXELS_API_KEY;
  if (!apiKey) throw new Error("PEXELS_API_KEY 필요 (.env.local)");

  const queries = [
    "dog leash lies on path",
    "dog leash product photography",
    "pet leash hanging hook",
    "coiled dog leash table",
    "leash metal clip product",
    "durable dog leash paved",
  ];

  const usedIds = new Set<number>();
  const picked: Array<{ photo: PexelsPhoto; query: string; alt: string }> = [];

  // 검증된 ID 우선 사용
  for (const id of VERIFIED_LEASH_IDS) {
    if (picked.length >= 3) break;
    const res = await fetch(`https://api.pexels.com/v1/photos/${id}`, {
      headers: { Authorization: apiKey },
    });
    if (!res.ok) continue;
    const photo = (await res.json()) as PexelsPhoto;
    const alt = photo.alt ?? "";
    if (!isLeashFocused(alt)) continue;
    usedIds.add(id);
    picked.push({ photo, query: "verified", alt });
    console.log(`  verified ${id}: ${alt}`);
  }

  for (const query of queries) {
    if (picked.length >= 3) break;
    const photos = await searchPexels(apiKey, query);
    for (const photo of photos) {
      if (usedIds.has(photo.id)) continue;
      const alt = photo.alt ?? "";
      if (!isLeashFocused(alt)) {
        console.log(`  skip ${photo.id}: ${alt.slice(0, 80)}`);
        continue;
      }
      usedIds.add(photo.id);
      picked.push({ photo, query, alt });
      console.log(`  pick ${photo.id}: ${alt}`);
      if (picked.length >= 3) break;
    }
  }

  if (picked.length < 3) {
    throw new Error(`리드줄 주 피사체 사진 3장을 찾지 못함 (${picked.length}/3)`);
  }

  fs.mkdirSync(ROOT, { recursive: true });
  for (const f of fs.readdirSync(ROOT)) {
    if (/\.(jpe?g|png)$/i.test(f)) fs.unlinkSync(path.join(ROOT, f));
  }

  const newEntries: Array<Record<string, unknown>> = [];
  for (let i = 0; i < picked.length; i++) {
    const { photo, query, alt } = picked[i];
    const ext = "jpeg";
    const filename = `${String(i + 1).padStart(2, "0")}-pexels-${photo.id}.${ext}`;
    const dest = path.join(ROOT, filename);
    await downloadPhoto(photo, dest);
    console.log(`saved: ${dest}`);

    newEntries.push({
      category: "반려동물",
      file: `scripts/test-assets/반려동물/${filename}`,
      pexelsId: photo.id,
      pexelsUrl: photo.url,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      query,
      note: `product=강아지 리드줄; altVerified=${alt}`,
    });
  }

  const sources = JSON.parse(fs.readFileSync(SOURCES_PATH, "utf8")) as Array<{ category: string }>;
  const filtered = sources.filter((s) => s.category !== "반려동물");
  fs.writeFileSync(SOURCES_PATH, JSON.stringify([...filtered, ...newEntries], null, 2), "utf8");
  console.log(`photo-sources.json updated (${newEntries.length} pet entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
