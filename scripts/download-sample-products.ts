/**
 * Download Pexels stock photos into test-assets/sample-products/
 * npx tsx scripts/download-sample-products.ts
 */
import fs from "fs";
import path from "path";

const OUT = path.join(__dirname, "..", "test-assets", "sample-products");

const ITEMS = [
  {
    file: "beauty.jpg",
    query: "skincare cream jar product photography white background",
  },
  {
    file: "fashion.jpg",
    query: "fashion clothing model wearing linen shirt product",
  },
  {
    file: "food.jpg",
    query: "protein powder shake vanilla sachet packaging product photography no logo",
  },
  {
    file: "electronics.jpg",
    query: "wireless earbuds product photography white background",
  },
  {
    file: "home.jpg",
    query: "kitchen living home decor ceramic bowl product",
  },
] as const;

function loadEnvLocal(): Record<string, string> {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

async function main() {
  const env = loadEnvLocal();
  const apiKey = process.env.PEXELS_API_KEY ?? env.PEXELS_API_KEY;
  if (!apiKey) {
    console.error("PEXELS_API_KEY가 없습니다.");
    process.exit(1);
  }

  fs.mkdirSync(OUT, { recursive: true });

  const only = process.argv.find((a) => a.startsWith("--only="))?.slice("--only=".length);
  const targets = only ? ITEMS.filter((item) => item.file.startsWith(only)) : ITEMS;
  if (targets.length === 0) {
    console.error(`No items match --only=${only}`);
    process.exit(1);
  }

  for (const item of targets) {
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", item.query);
    url.searchParams.set("per_page", "10");
    url.searchParams.set("orientation", "portrait");

    const res = await fetch(url.toString(), { headers: { Authorization: apiKey } });
    if (!res.ok) {
      throw new Error(`${item.file} search failed: ${res.status}`);
    }
    const data = (await res.json()) as {
      photos?: Array<{
        id: number;
        photographer: string;
        src: { large2x: string; large: string };
      }>;
    };
    const photo = data.photos?.[0];
    if (!photo) throw new Error(`${item.file}: no photo`);

    const imgRes = await fetch(photo.src.large2x || photo.src.large);
    if (!imgRes.ok) throw new Error(`${item.file} download failed: ${imgRes.status}`);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    fs.writeFileSync(path.join(OUT, item.file), buf);
    console.log(`OK ${item.file} pexels#${photo.id} by ${photo.photographer} (${buf.length} bytes)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
