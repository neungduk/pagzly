/**
 * 238차 — 사진 1장일 때 color_variation 생략 검증 (API 0).
 *   npx tsx scripts/238cha-single-photo-color-variation-verify.ts
 */
import { execSync } from "child_process";
import path from "path";
import { assignDistinctSectionImages } from "../lib/assign-section-images";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log("OK", msg);
}

function fashionFixture(): DetailSection[] {
  return [
    {
      type: "hero",
      slot: "hero",
      headline: "히어로",
      subheadline: "서브",
      imageIndex: 2,
    } as DetailSection,
    {
      type: "gallery",
      slot: "lookbook",
      heading: "룩북",
      imageIndexes: [1, 2, 3],
    } as DetailSection,
    {
      type: "step_card",
      slot: "how_to_wear",
      heading: "착용",
      steps: [
        { title: "1", body: "a", imageIndex: 1 },
        { title: "2", body: "b", imageIndex: 2 },
      ],
    } as DetailSection,
    {
      type: "color_variation",
      slot: "color_variation",
      heading: "컬러",
      options: [
        { label: "블랙", colorHex: "#111111", imageIndex: 0 },
        { label: "베이지", colorHex: "#C8B89A", imageIndex: 1 },
        { label: "네이비", colorHex: "#1B2A4A", imageIndex: 2 },
      ],
    } as DetailSection,
    {
      type: "spec_table",
      slot: "spec_table",
      heading: "스펙",
      rows: [{ label: "소재", value: "면" }],
      imageIndexes: [1, 2],
    } as DetailSection,
    {
      type: "image_text",
      slot: "material_feature",
      heading: "소재",
      body: "본문",
      imageIndex: 1,
      imagePosition: "left",
    } as DetailSection,
    {
      type: "cta_price",
      slot: "cta_price",
      price: 39000,
      badges: [],
    } as DetailSection,
  ];
}

function fashionWithoutColor(): DetailSection[] {
  return fashionFixture().filter((s) => s.type !== "color_variation");
}

function countType(sections: DetailSection[], type: string): number {
  return sections.filter((s) => s.type === type).length;
}

async function main() {
  execSync(
    `npx esbuild "lib/assign-section-images.ts" --bundle=false --format=esm --outfile=NUL`,
    { cwd: ROOT, stdio: "pipe", shell: true },
  );
  console.log("OK esbuild lib/assign-section-images.ts");

  const fixture = fashionFixture();
  assert(countType(fixture, "color_variation") === 1, "fixture has color_variation");

  // imageCount=1 → color_variation removed
  const one = assignDistinctSectionImages(fixture, 1, { category: "의류/패션" });
  assert(countType(one, "color_variation") === 0, "imageCount=1 removes color_variation");
  assert(countType(one, "hero") === 1, "hero kept at imageCount=1");
  assert(countType(one, "gallery") === 1, "gallery kept at imageCount=1");
  assert(countType(one, "step_card") === 1, "step_card kept at imageCount=1");
  assert(countType(one, "spec_table") === 1, "spec_table kept at imageCount=1");
  assert(countType(one, "image_text") === 1, "image_text kept at imageCount=1");
  assert(countType(one, "cta_price") === 1, "cta_price kept at imageCount=1");
  assert(one.length === fixture.length - 1, "exactly one section removed");

  const hero1 = one.find((s) => s.type === "hero") as { imageIndex: number };
  assert(hero1.imageIndex === 0, "hero imageIndex forced to 0");
  const gal1 = one.find((s) => s.type === "gallery") as { imageIndexes: number[] };
  assert(gal1.imageIndexes.every((i) => i === 0), "gallery indexes all 0");
  const steps1 = one.find((s) => s.type === "step_card") as {
    steps: { imageIndex: number }[];
  };
  assert(steps1.steps.every((s) => s.imageIndex === 0), "step_card indexes all 0");
  const spec1 = one.find((s) => s.type === "spec_table") as { imageIndexes: number[] };
  assert(spec1.imageIndexes.every((i) => i === 0), "spec_table indexes all 0");
  const it1 = one.find((s) => s.type === "image_text") as { imageIndex: number };
  assert(it1.imageIndex === 0, "image_text imageIndex forced to 0");

  // imageCount=2 → color_variation kept, options not all forced to 0
  const two = assignDistinctSectionImages(fixture, 2, { category: "의류/패션" });
  assert(countType(two, "color_variation") === 1, "imageCount=2 keeps color_variation");
  const cv2 = two.find((s) => s.type === "color_variation") as {
    options: { imageIndex: number }[];
  };
  assert(cv2.options.length === 3, "imageCount=2 keeps 3 color options");
  const allZero2 = cv2.options.every((o) => o.imageIndex === 0);
  // With 2 images and least-used assignment, not all options should stay stuck at 0
  // (unless algorithm legitimately picks 0 for all — check diversity of indexes used)
  const unique2 = new Set(cv2.options.map((o) => o.imageIndex));
  assert(
    unique2.size >= 1 && cv2.options.every((o) => o.imageIndex === 0 || o.imageIndex === 1),
    "imageCount=2 color indexes in [0,1]",
  );
  // Brief: "각 옵션의 imageIndex가 무조건 0으로 고정되지 않았음"
  // With 2+ images the multi-path assigner runs — at least one option should differ
  // from "all forced to 0" if we had enough placements. With 3 options and 2 images,
  // least-used should spread — unique size should be 2 ideally.
  assert(!allZero2 || unique2.size === 1, "imageCount=2 not the single-photo force-all-0 path");
  // Stronger: with 2 images, expect more than one distinct index across options
  assert(unique2.size >= 2, "imageCount=2 color options use ≥2 distinct indexes");

  const three = assignDistinctSectionImages(fixture, 3, { category: "의류/패션" });
  assert(countType(three, "color_variation") === 1, "imageCount=3 keeps color_variation");
  const cv3 = three.find((s) => s.type === "color_variation") as {
    options: { imageIndex: number }[];
  };
  const unique3 = new Set(cv3.options.map((o) => o.imageIndex));
  assert(unique3.size >= 2, "imageCount=3 color options use ≥2 distinct indexes");
  assert(
    !cv3.options.every((o) => o.imageIndex === 0),
    "imageCount=3 color options not all forced to 0",
  );

  // No color_variation fixture: other sections preserved order/count
  const base = fashionWithoutColor();
  const oneNoCv = assignDistinctSectionImages(base, 1, { category: "의류/패션" });
  assert(oneNoCv.length === base.length, "no-cv fixture length unchanged at imageCount=1");
  assert(
    oneNoCv.map((s) => s.type).join(",") === base.map((s) => s.type).join(","),
    "no-cv fixture type order unchanged",
  );
  assert(countType(oneNoCv, "color_variation") === 0, "no-cv still has no color_variation");

  console.log("API generate: 0");
  console.log("ALL PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
