/**
 * 480차 — 생성 직후 읽기 전용 점검.
 * 사용: PRODUCT_ID=<uuid> npx tsx scripts/verify-480.ts
 *   또는 인자 없이 최신 products 1건.
 * DB 쓰기/생성 API/재시도 없음. 키 값은 stdout에 찍지 않음.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

const PREFIX = "https://img.pagzly.com/";
const FOCUS_SLOTS = new Set(["hero", "points", "phototext", "bleed", "spec", "timeline", "purchase"]);

type Section = {
  type?: string;
  slot?: string;
  imageIndex?: number;
  imageIndexes?: number[];
  steps?: { imageIndex?: number }[];
  options?: { imageIndex?: number }[];
};

function loadEnv(name: string): string {
  const v = (process.env[name] ?? "").trim();
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

function urlPrefixOk(u: unknown): boolean {
  return typeof u === "string" && u.startsWith(PREFIX);
}

function hostOf(u: string): string {
  try {
    return new URL(u).host;
  } catch {
    return "(bad-url)";
  }
}

function collectIndexes(section: Section): number[] {
  const out: number[] = [];
  if (typeof section.imageIndex === "number") out.push(section.imageIndex);
  if (Array.isArray(section.imageIndexes)) out.push(...section.imageIndexes.filter((n) => typeof n === "number"));
  for (const st of section.steps ?? []) {
    if (typeof st.imageIndex === "number") out.push(st.imageIndex);
  }
  for (const opt of section.options ?? []) {
    if (typeof opt.imageIndex === "number") out.push(opt.imageIndex);
  }
  return out;
}

async function main() {
  const url = loadEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const wantId = (process.env.PRODUCT_ID || process.argv[2] || "").trim();
  let q = admin
    .from("products")
    .select(
      "id, category, product_name, image_urls, sections, created_at, photo_cost_breakdown, generation_cost, replacements, image_analysis",
    )
    .order("created_at", { ascending: false })
    .limit(1);
  if (wantId) {
    q = admin
      .from("products")
      .select(
        "id, category, product_name, image_urls, sections, created_at, photo_cost_breakdown, generation_cost, replacements, image_analysis",
      )
      .eq("id", wantId)
      .limit(1);
  }

  const { data: rows, error } = await q;
  if (error) {
    console.error("PRODUCT_READ_FAIL", error.code, error.message);
    process.exit(1);
  }
  const product = rows?.[0];
  if (!product) {
    console.error("NO_PRODUCT");
    process.exit(1);
  }

  const imageUrls: string[] = Array.isArray(product.image_urls)
    ? product.image_urls.filter((u: unknown): u is string => typeof u === "string")
    : [];

  const { data: uploads, error: upErr } = await admin
    .from("product_images")
    .select("id, image_url, storage_path, product_id, created_at")
    .eq("product_id", product.id);
  if (upErr) {
    console.error("PRODUCT_IMAGES_READ_FAIL", upErr.code, upErr.message);
    process.exit(1);
  }

  const uploadRows = uploads ?? [];
  const allUrls = [
    ...imageUrls,
    ...uploadRows.map((r) => r.image_url).filter((u): u is string => typeof u === "string"),
  ];
  const bad = allUrls.filter((u) => !urlPrefixOk(u));
  const hosts = [...new Set(allUrls.map(hostOf))];

  const sections = (Array.isArray(product.sections) ? product.sections : []) as Section[];
  const focus = sections
    .filter((s) => FOCUS_SLOTS.has(String(s.slot || "")) || FOCUS_SLOTS.has(String(s.type || "")))
    .map((s) => {
      const indexes = collectIndexes(s);
      return {
        type: s.type ?? null,
        slot: s.slot ?? null,
        indexes,
        resolvedHosts: indexes.map((i) => (imageUrls[i] ? hostOf(imageUrls[i]) : "(missing)")),
        allResolvedPrefixOk: indexes.every((i) => urlPrefixOk(imageUrls[i])),
      };
    });

  const breakdown =
    product.photo_cost_breakdown && typeof product.photo_cost_breakdown === "object"
      ? product.photo_cost_breakdown
      : null;
  const statusLike = {
    has_sections: sections.length > 0,
    section_count: sections.length,
    image_url_count: imageUrls.length,
    upload_row_count: uploadRows.length,
    generation_cost_present: product.generation_cost != null,
    photo_cost_breakdown_keys: breakdown ? Object.keys(breakdown as object).slice(0, 20) : [],
    replacements_present: product.replacements != null,
    image_analysis_present: product.image_analysis != null,
  };

  const report = {
    product_id: product.id,
    category: product.category,
    product_name_len: typeof product.product_name === "string" ? product.product_name.length : 0,
    created_at: product.created_at,
    supabase_host: hostOf(url),
    expected_image_prefix: PREFIX,
    image_urls_all_prefix_ok: imageUrls.length > 0 && imageUrls.every(urlPrefixOk),
    upload_urls_all_prefix_ok: uploadRows.length === 0 || uploadRows.every((r) => urlPrefixOk(r.image_url)),
    combined_all_prefix_ok: allUrls.length > 0 && bad.length === 0,
    bad_url_count: bad.length,
    distinct_hosts: hosts,
    upload_file_count: uploadRows.length,
    product_image_url_count: imageUrls.length,
    focus_section_assignments: focus,
    status_like: statusLike,
  };

  const outDir = path.join(root, "review");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "480-verify-latest.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log("WROTE", outPath);
}

main().catch((e) => {
  console.error(String(e?.message || e));
  process.exit(1);
});
