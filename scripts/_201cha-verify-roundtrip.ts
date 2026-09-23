/**
 * 201차 — pagzly-v2 업로드 왕복 + products count 검증 (생성 API 0).
 * 시크릿 미출력. 테스트 파일 1개 업로드 후 remove.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { createServiceRoleClient } from "../lib/supabase/service-role";
import { uploadPngBuffer } from "../lib/upload-png";

const ROOT = path.join(__dirname, "..");

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    let val = m[2]!.trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]!]) process.env[m[1]!] = val;
  }
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  console.log("target host:", url ? new URL(url).host : "(missing)");
  if (!url.includes("qnstsrplqzoqlndojuyw")) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not pagzly-v2 host");
  }

  const supabase = createServiceRoleClient();

  const { count, error: countErr } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });
  if (countErr) throw new Error(`products count failed: ${countErr.message}`);
  console.log("products count:", count);

  const png = await sharp({
    create: {
      width: 32,
      height: 32,
      channels: 3,
      background: { r: 40, g: 120, b: 200 },
    },
  })
    .png()
    .toBuffer();

  const storagePath = `_201cha-smoke/${Date.now()}-probe.png`;
  const up = await uploadPngBuffer(supabase, storagePath, png);
  if ("error" in up) throw new Error(`upload failed: ${up.error}`);

  console.log("upload path:", up.path);
  console.log("public host:", new URL(up.publicUrl).host);

  const res = await fetch(up.publicUrl);
  console.log("fetch status:", res.status, "bytes:", (await res.arrayBuffer()).byteLength);
  if (res.status !== 200) {
    throw new Error(`public fetch expected 200, got ${res.status}`);
  }

  const { error: rmErr } = await supabase.storage
    .from("images")
    .remove([storagePath]);
  if (rmErr) throw new Error(`cleanup remove failed: ${rmErr.message}`);
  console.log("cleanup remove: ok");
  console.log("API generate calls: 0");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
