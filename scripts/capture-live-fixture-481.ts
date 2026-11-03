/**
 * 481차 A — 실사 product 행을 읽기 전용으로 가져와 scripts/fixtures/live-481.json 으로 만든다.
 * 유료 호출·쓰기 없음. 키/개인정보(user_id·이메일·전화)는 넣지 않는다.
 * 사용: PRODUCT_ID=e8c1c270-… npx tsx scripts/capture-live-fixture-481.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { displayStateOf } from "../lib/saved-display";

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

const PRODUCT_ID = (process.env.PRODUCT_ID || process.argv[2] || "e8c1c270-dc6a-435d-a915-efab06ab6dd1").trim();
const OUT = path.join(root, "scripts", "fixtures", "live-481.json");
const PREFIX = "https://img.pagzly.com/";

function loadEnv(name: string): string {
  const v = (process.env[name] ?? "").trim();
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** 공개 CDN만 남긴다(다른 호스트·서명 URL 제거) */
function publicUrls(urls: string[]): string[] {
  return urls.filter((u) => u.startsWith(PREFIX));
}

async function main() {
  const url = loadEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: rows, error } = await admin
    .from("products")
    .select(
      "id, category, product_name, brand_name, logo_url, price, target_customer, key_features, ingredients, certifications, image_urls, image_origins, image_roles, headlines, description, features, how_to_use, caution, image_analysis, theme, photo_cost_breakdown, sections, created_at, generation_cost, replacements, mfds_reviewed",
    )
    .eq("id", PRODUCT_ID)
    .limit(1);

  if (error) {
    console.error("PRODUCT_READ_FAIL", error.code, error.message);
    process.exit(1);
  }
  const row = rows?.[0];
  if (!row) {
    console.error("NO_PRODUCT", PRODUCT_ID);
    process.exit(1);
  }

  const imageUrls = publicUrls(strArr(row.image_urls));
  const display = displayStateOf(row.photo_cost_breakdown);
  const infoBackdrops = display?.infoBackdrops
    ? Object.fromEntries(
        Object.entries(display.infoBackdrops).filter(([, u]) => typeof u === "string" && u.startsWith(PREFIX)),
      )
    : undefined;
  const sceneImages = display?.sceneImages
    ? Object.fromEntries(
        Object.entries(display.sceneImages).filter(([, v]) => {
          const u = v && typeof v === "object" && "url" in v ? (v as { url?: string }).url : undefined;
          return typeof u === "string" && u.startsWith(PREFIX);
        }),
      )
    : undefined;

  // exportArgsOf / corpus 세션 형식(개인정보·키 없음)
  const fixture = {
    productId: row.id,
    category: row.category,
    productName: row.product_name,
    brandName: str(row.brand_name),
    logoUrl: typeof row.logo_url === "string" && row.logo_url.startsWith(PREFIX) ? row.logo_url : null,
    price: row.price != null ? Number(row.price) : null,
    targetCustomer: str(row.target_customer),
    keyFeatures: str(row.key_features),
    ingredients: str(row.ingredients),
    certifications: str(row.certifications),
    imageUrls,
    imageOrigins: Array.isArray(row.image_origins) ? row.image_origins : undefined,
    imageRoles: Array.isArray(row.image_roles) ? row.image_roles : undefined,
    theme: row.theme && typeof row.theme === "object" ? row.theme : undefined,
    infoBackdrops,
    sceneImages,
    sceneImagesOn: display?.sceneImagesOn ?? Boolean(sceneImages && Object.keys(sceneImages).length),
    stylePackId: display?.stylePackId ?? undefined,
    imageAnalysis: str(row.image_analysis),
    createdAt: row.created_at,
    synthetic: false,
    liveSource: "481-capture",
    generated: {
      sections: Array.isArray(row.sections) ? row.sections : [],
      headlines: strArr(row.headlines),
      description: str(row.description) ?? "",
      features: strArr(row.features),
      howToUse: str(row.how_to_use) ?? "",
      caution: str(row.caution) ?? "",
      imageAnalysis: str(row.image_analysis) ?? "",
      productId: row.id,
      mfdsReviewed: Boolean(row.mfds_reviewed),
      replacements: Array.isArray(row.replacements) ? row.replacements : [],
      imageUrls,
      theme: row.theme && typeof row.theme === "object" ? row.theme : undefined,
      imageRoles: Array.isArray(row.image_roles) ? row.image_roles : undefined,
      imageOrigins: Array.isArray(row.image_origins) ? row.image_origins : undefined,
    },
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(fixture, null, 2));
  const slots = (fixture.generated.sections as Array<{ type?: string; slot?: string }>).map(
    (s) => `${s.type ?? "?"}/${s.slot ?? "?"}`,
  );
  console.log(
    JSON.stringify(
      {
        wrote: OUT,
        product_id: row.id,
        category: row.category,
        product_name_len: typeof row.product_name === "string" ? row.product_name.length : 0,
        section_count: fixture.generated.sections.length,
        image_url_count: imageUrls.length,
        slots_sample: slots.slice(0, 12),
        has_info_backdrops: Boolean(infoBackdrops && Object.keys(infoBackdrops).length),
        has_scene_images: Boolean(sceneImages && Object.keys(sceneImages).length),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(String(e?.message || e));
  process.exit(1);
});
