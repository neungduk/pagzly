/**
 * 105차 — 저장된 상품으로 assign 재실행 (이미지 생성 $0)
 *
 *   npx tsx scripts/105cha-replay-assign.ts [productId]
 *
 * 기본 productId: a4e33e41-2348-40b6-b6b8-2536ce17ac3e
 */
import fs from "fs";
import path from "path";
import {
  assignDistinctSectionImages,
  countAdjacentDuplicateImageTexts,
  countImageIndexFrequency,
  countPlacements,
} from "../lib/assign-section-images";
import { applyIngredientCircleVisual } from "../lib/apply-ingredient-circle-pair";
import { computeAHashesFromUrls } from "../lib/image-ahash";
import { normalizeImageRoles, type ProductImageRole } from "../lib/image-roles";
import { detectRoleShortages } from "../lib/role-shortage";
import type { DetailSection } from "../lib/types/generate";

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

function filenameOf(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/");
    return parts[parts.length - 1] || url.slice(-40);
  } catch {
    return url.slice(-40);
  }
}

function sectionHeading(section: DetailSection): string {
  if ("heading" in section && typeof section.heading === "string") {
    return section.heading.slice(0, 28);
  }
  if (section.type === "hero") return section.headline?.slice(0, 28) ?? "hero";
  return section.type;
}

function preferSlotList(): string[] {
  return [
    "ingredient_highlight",
    "texture_feel",
    "packaging_design",
    "detail_zoom",
    "macro_detail",
    "ingredient_story",
    "feature_callout",
    "how_it_works",
    "size_options",
    "usage_scenario",
    "lifestyle_shot",
  ];
}

type PreferAudit = {
  slot: string;
  heading: string;
  imageIndex: number;
  file: string;
  role: ProductImageRole | "-";
  unmetPrefer: boolean;
  reason?: string;
};

async function fetchProduct(id: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY 필요");
  }
  const url =
    `${base}/rest/v1/products?id=eq.${id}` +
    `&select=id,product_name,category,image_urls,image_roles,ingredients,sections`;
  const res = await fetch(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`supabase ${res.status}: ${await res.text()}`);
  }
  const rows = (await res.json()) as Array<{
    id: string;
    product_name: string;
    category: string;
    image_urls: string[] | null;
    image_roles: unknown;
    ingredients: string | null;
    sections: DetailSection[] | null;
  }>;
  if (!rows[0]) throw new Error(`product not found: ${id}`);
  return rows[0];
}

function auditPrefers(
  sections: DetailSection[],
  roles: ProductImageRole[],
  urls: string[],
): PreferAudit[] {
  const packageIndexes = roles
    .map((r, i) => (r === "package" ? i : -1))
    .filter((i) => i >= 0);
  const detailIndexes = roles
    .map((r, i) => (r === "detail" ? i : -1))
    .filter((i) => i >= 0);
  const out: PreferAudit[] = [];

  for (const section of sections) {
    if (section.type !== "image_text") continue;
    if (!preferSlotList().includes(section.slot)) continue;
    const idx = section.imageIndex;
    const role = roles[idx] ?? "-";
    let unmet = false;
    let reason: string | undefined;
    if (section.layout === "text_only") {
      out.push({
        slot: section.slot,
        heading: sectionHeading(section),
        imageIndex: idx,
        file: "(text_only)",
        role,
        unmetPrefer: false,
        reason: "text_only fallback",
      });
      continue;
    }
    if (section.slot === "packaging_design") {
      unmet = role !== "package" && packageIndexes.length > 0;
      if (unmet) reason = `want package got ${role}`;
    }
    if (
      section.slot === "ingredient_highlight" ||
      section.slot === "texture_feel" ||
      section.slot === "detail_zoom" ||
      section.slot === "macro_detail"
    ) {
      unmet = role !== "detail" && detailIndexes.length > 0;
      if (unmet) reason = `want detail got ${role}`;
    }
    out.push({
      slot: section.slot,
      heading: sectionHeading(section),
      imageIndex: idx,
      file: urls[idx] ? filenameOf(urls[idx]!) : "(none)",
      role,
      unmetPrefer: unmet,
      reason,
    });
  }
  return out;
}

function printTable(
  sections: DetailSection[],
  urls: string[],
  roles: ProductImageRole[],
  title: string,
) {
  console.log(`\n=== ${title} ===`);
  console.log(
    "idx".padEnd(4) +
      "type".padEnd(16) +
      "slot".padEnd(24) +
      "img".padEnd(5) +
      "role".padEnd(12) +
      "file / heading",
  );
  sections.forEach((section, i) => {
    const indexes: number[] = [];
    if (section.type === "image_text" && section.layout === "text_only") {
      console.log(
        String(i).padEnd(4) +
          section.type.padEnd(16) +
          (section.slot ?? "").padEnd(24) +
          "-".padEnd(5) +
          "text_only".padEnd(12) +
          sectionHeading(section),
      );
      return;
    }
    if (section.type === "hero" || section.type === "image_text") {
      indexes.push(section.imageIndex);
    } else if (section.type === "gallery") {
      indexes.push(...(section.imageIndexes ?? []));
    } else if (section.type === "step_card") {
      indexes.push(...section.steps.map((s) => s.imageIndex));
    } else if (section.type === "spec_table" && section.imageIndexes) {
      indexes.push(...section.imageIndexes);
    } else {
      return;
    }
    for (const img of indexes) {
      const role = roles[img] ?? "-";
      const file = urls[img] ? filenameOf(urls[img]!) : "?";
      console.log(
        String(i).padEnd(4) +
          section.type.padEnd(16) +
          (section.slot ?? "").padEnd(24) +
          String(img).padEnd(5) +
          String(role).padEnd(12) +
          `${file} | ${sectionHeading(section)}`,
      );
    }
  });
}

async function main() {
  loadEnvLocal();
  const productId = process.argv[2] ?? DEFAULT_ID;
  const product = await fetchProduct(productId);
  const urls = product.image_urls ?? [];
  const roles = normalizeImageRoles(product.image_roles, urls.length);
  const sections = (product.sections ?? []) as DetailSection[];

  console.log(
    `\nProduct: ${product.product_name} (${product.id})\n` +
      `category=${product.category} images=${urls.length} sections=${sections.length}`,
  );
  console.log(`image_roles=${JSON.stringify(roles)}`);

  const shortage = detectRoleShortages({ roles, category: product.category });
  console.log(
    `role-shortage: ${shortage ? shortage.message : "(none)"} textOnly=${JSON.stringify(shortage?.preferTextOnlySlots ?? [])}`,
  );

  printTable(sections, urls, roles, "DB 저장본 (before replay)");

  const beforeFreq = countImageIndexFrequency(sections);
  const beforeAdj = countAdjacentDuplicateImageTexts(sections);
  const beforeAudit = auditPrefers(sections, roles, urls);

  console.log("computing aHash…");
  const imageHashes = await computeAHashesFromUrls(urls);

  let replayed = assignDistinctSectionImages(sections, urls.length, {
    category: product.category,
    imageRoles: roles,
    imagePaths: urls.map((u) => {
      try {
        return new URL(u).pathname;
      } catch {
        return u;
      }
    }),
    imageHashes,
    textOnlySlots: shortage?.preferTextOnlySlots ?? [],
  });
  const circle = applyIngredientCircleVisual(replayed, urls, product.ingredients);
  replayed = circle.sections;

  printTable(replayed, urls, roles, "replay assign + circle (after)");

  const afterFreq = countImageIndexFrequency(replayed);
  const afterAdj = countAdjacentDuplicateImageTexts(replayed);
  const afterSlots = countPlacements(replayed);
  const afterAudit = auditPrefers(replayed, roles, urls);

  const uniqueBefore = Object.keys(beforeFreq).length;
  const uniqueAfter = Object.keys(afterFreq).length;
  const maxBefore = Math.max(0, ...Object.values(beforeFreq), 0);
  const maxAfter = Math.max(0, ...Object.values(afterFreq), 0);

  console.log("\n=== SUMMARY ===");
  console.log(
    JSON.stringify(
      {
        unique: { before: uniqueBefore, after: uniqueAfter },
        maxRepeat: { before: maxBefore, after: maxAfter },
        adjacentDupImageText: { before: beforeAdj, after: afterAdj },
        placements: afterSlots,
        circleApplied: circle.applied,
        preferUnmetBefore: beforeAudit.filter((a) => a.unmetPrefer),
        preferUnmetAfter: afterAudit.filter((a) => a.unmetPrefer),
        textOnlySlots: replayed
          .filter((s) => s.type === "image_text" && s.layout === "text_only")
          .map((s) => (s.type === "image_text" ? s.slot : null)),
        galleryIndexes: replayed
          .filter((s) => s.type === "gallery")
          .map((s) => (s.type === "gallery" ? s.imageIndexes : [])),
        circleSections: replayed
          .filter(
            (s) =>
              s.type === "image_text" &&
              (s.layout === "circle-solo" || s.layout === "circle-pair"),
          )
          .map((s) =>
            s.type === "image_text"
              ? { slot: s.slot, imageIndex: s.imageIndex, layout: s.layout }
              : null,
          ),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
