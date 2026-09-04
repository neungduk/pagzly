/**
 * 105차 — 기존 lifestyle-ai URL로 게이트 단독 호출 (생성 없음)
 *
 *   npx tsx scripts/105cha-lifestyle-gate-smoke.ts [productId]
 */
import fs from "fs";
import path from "path";
import { evaluateLifestyleShotGate } from "../lib/lifestyle-shot-quality-gate";

const DEFAULT_ID = "a4e33e41-2348-40b6-b6b8-2536ce17ac3e";

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const key = m[1]!;
    let val = m[2]!;
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

async function fetchProduct(id: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) throw new Error("supabase env missing");
  const url = `${base}/rest/v1/products?id=eq.${id}&select=image_urls`;
  const res = await fetch(url, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(await res.text());
  const rows = (await res.json()) as Array<{ image_urls: string[] | null }>;
  if (!rows[0]?.image_urls?.length) throw new Error("no urls");
  return rows[0].image_urls;
}

async function main() {
  loadEnvLocal();
  const id = process.argv[2] ?? DEFAULT_ID;
  const urls = await fetchProduct(id);
  const ref = urls.find((u) => !u.includes("lifestyle-ai")) ?? urls[0]!;
  const lifestyle = urls.filter((u) => u.includes("lifestyle-ai"));
  if (lifestyle.length === 0) {
    console.warn("no lifestyle-ai urls on product — skip gate assert");
    process.exit(0);
  }

  console.log(`ref=${ref.slice(-60)}`);
  for (const gen of lifestyle) {
    const result = await evaluateLifestyleShotGate({
      referenceUrl: ref,
      generatedUrl: gen,
    });
    console.log(
      JSON.stringify({
        file: gen.slice(-48),
        pass: result.pass,
        sim: Number(result.centerSimilarity.toFixed(3)),
        reasons: result.reasons,
      }),
    );
  }
  console.log("105cha lifestyle-gate smoke done (inspect pass/reasons above)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
