/**
 * 202차 — curl cleanup-expired-images once (anon from .env.local, no secret log).
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");
const FN_URL =
  "https://qnstsrplqzoqlndojuyw.supabase.co/functions/v1/cleanup-expired-images";

function loadAnon(): string {
  const raw = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.trim().match(/^NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)$/);
    if (!m) continue;
    let v = m[1]!.trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    return v;
  }
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY missing");
}

async function main() {
  const anon = loadAnon();
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anon}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const text = await res.text();
  console.log("status", res.status);
  console.log("body", text.slice(0, 400));
  console.log("API generate: 0");
  if (res.status < 200 || res.status >= 300) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
