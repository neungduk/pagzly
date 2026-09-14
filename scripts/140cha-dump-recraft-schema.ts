/**
 * Dump recraft-v3 OpenAPI Input schema (no secrets printed).
 *   npx tsx scripts/140cha-dump-recraft-schema.ts
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");

function loadToken(): string {
  const envPath = path.join(ROOT, ".env.local");
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^REPLICATE_API_TOKEN=(.*)$/);
    if (!m) continue;
    return m[1]!.trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("REPLICATE_API_TOKEN missing");
}

async function main() {
  const token = loadToken();
  const res = await fetch("https://api.replicate.com/v1/models/recraft-ai/recraft-v3", {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("HTTP", res.status);
  const json = (await res.json()) as {
    latest_version?: { openapi_schema?: { components?: { schemas?: Record<string, unknown> } } };
  };
  const schemas = json.latest_version?.openapi_schema?.components?.schemas ?? {};
  console.log("schema keys", Object.keys(schemas));
  const input = schemas.Input ?? schemas.input;
  const outDir = path.join(ROOT, "review");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "140cha-recraft-v3-input-schema.json"), JSON.stringify(input, null, 2), "utf8");
  for (const key of ["style", "aspect_ratio", "size"] as const) {
    if (schemas[key]) {
      fs.writeFileSync(
        path.join(outDir, `140cha-recraft-v3-${key}-enum.json`),
        JSON.stringify(schemas[key], null, 2),
        "utf8",
      );
      console.log(key, JSON.stringify(schemas[key]).slice(0, 800));
    }
  }
  console.log("Input", JSON.stringify(input, null, 2).slice(0, 2000));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
