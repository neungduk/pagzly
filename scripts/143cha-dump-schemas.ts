/**
 * 143차 — recraft-v4 / recraft-v4-svg / flux-dev OpenAPI Input 스키마 덤프
 *   npx tsx scripts/143cha-dump-schemas.ts
 *
 * 가격은 모델 API 응답의 공개 필드가 있으면 기록하고, 없으면 null
 * (Replicate pricing 위젯은 JS라 API에 없을 수 있음 — 그때는 예측 실행
 *  실측 비용으로 교차검증).
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review");

const MODELS = [
  { slug: "recraft-ai/recraft-v4", out: "143cha-recraft-v4-schema.json" },
  { slug: "recraft-ai/recraft-v4-svg", out: "143cha-recraft-v4-svg-schema.json" },
  { slug: "black-forest-labs/flux-dev", out: "143cha-flux-dev-schema.json" },
] as const;

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

async function dumpOne(token: string, model: (typeof MODELS)[number]) {
  const res = await fetch(`https://api.replicate.com/v1/models/${model.slug}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`\n=== ${model.slug} HTTP ${res.status}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${model.slug} fetch failed: ${res.status} ${body.slice(0, 400)}`);
  }
  const json = (await res.json()) as {
    name?: string;
    description?: string;
    url?: string;
    latest_version?: {
      id?: string;
      openapi_schema?: {
        components?: { schemas?: Record<string, unknown> };
        paths?: unknown;
      };
    };
  };
  const schemas = json.latest_version?.openapi_schema?.components?.schemas ?? {};
  const input = schemas.Input ?? schemas.input ?? null;
  const output = schemas.Output ?? schemas.output ?? null;
  const summary = {
    model: model.slug,
    name: json.name ?? null,
    url: json.url ?? `https://replicate.com/${model.slug}`,
    versionId: json.latest_version?.id ?? null,
    schemaKeys: Object.keys(schemas),
    Input: input,
    Output: output,
    // style / aspect_ratio enums if present as sibling schemas
    relatedEnums: Object.fromEntries(
      Object.entries(schemas).filter(([k]) =>
        /style|aspect|size|format|output/i.test(k),
      ),
    ),
    fetchedAt: new Date().toISOString(),
    note: "Pricing not always present on model API — confirm via prediction billing / official docs after runs.",
  };
  fs.mkdirSync(OUT, { recursive: true });
  const outPath = path.join(OUT, model.out);
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), "utf8");
  console.log(`wrote ${outPath}`);
  console.log("Input keys:", input && typeof input === "object" && "properties" in (input as object)
    ? Object.keys((input as { properties?: Record<string, unknown> }).properties ?? {})
    : "(no properties)");
  if (input) console.log("Input preview:", JSON.stringify(input, null, 2).slice(0, 1500));
  if (output) console.log("Output preview:", JSON.stringify(output, null, 2).slice(0, 600));
}

async function main() {
  const token = loadToken();
  for (const m of MODELS) {
    await dumpOne(token, m);
  }
  console.log("\n[143] schema dump done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
