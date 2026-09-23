/**
 * 207차 — circle-pair texture_feel 폴백 smoke (API 0).
 *   npx tsx scripts/207cha-circle-pair-texture-fallback-smoke.ts
 */
import { applyIngredientCircleVisual } from "../lib/apply-ingredient-circle-pair";
import type { DetailSection, ImageTextSection } from "../lib/types/generate";

function baseSections(opts: {
  withTexture?: boolean;
  textureIndex?: number;
  ingredientIndex?: number;
}): DetailSection[] {
  const ingredientIndex = opts.ingredientIndex ?? 0;
  const textureIndex = opts.textureIndex ?? 1;
  const sections: DetailSection[] = [
    {
      type: "image_text",
      slot: "ingredient_highlight",
      heading: "주요 성분",
      body: "설명",
      imageIndex: ingredientIndex,
      imagePosition: "left",
    },
    {
      type: "spec_table",
      slot: "spec_table",
      heading: "스펙",
      rows: [{ label: "용량", value: "50ml" }],
    },
  ];
  if (opts.withTexture) {
    sections.splice(1, 0, {
      type: "image_text",
      slot: "texture_feel",
      heading: "질감",
      body: "촉촉",
      imageIndex: textureIndex,
      imagePosition: "left",
    });
  }
  return sections;
}

function findCirclePair(sections: DetailSection[]): ImageTextSection | undefined {
  return sections.find(
    (s): s is ImageTextSection =>
      s.type === "image_text" && s.layout === "circle-pair",
  );
}

function main() {
  let failed = 0;

  // 1) regression: texture_feel present → still uses texture index
  {
    const sections = baseSections({ withTexture: true, textureIndex: 1, ingredientIndex: 0 });
    const urls = ["https://a/ing.png", "https://a/tex.png", "https://a/other.png"];
    const { applied, sections: next } = applyIngredientCircleVisual(
      sections,
      urls,
      "나이아신아마이드, 히알루론산",
    );
    const pair = findCirclePair(next);
    const ok =
      applied === true &&
      pair?.imageIndex === 1 &&
      pair.circlePair?.[1]?.imageUrl === urls[1];
    console.log(ok ? "OK" : "FAIL", "regression texture_feel present", {
      applied,
      imageIndex: pair?.imageIndex,
    });
    if (!ok) failed += 1;
  }

  // 2) core fix: no texture_feel → still applied via alternate image
  {
    const sections = baseSections({ withTexture: false, ingredientIndex: 0 });
    const urls = ["https://a/ing.png", "https://a/alt.png"];
    const { applied, sections: next } = applyIngredientCircleVisual(
      sections,
      urls,
      "나이아신아마이드, 히알루론산",
    );
    const pair = findCirclePair(next);
    const ok =
      applied === true &&
      !!pair &&
      pair.circlePair?.length === 2 &&
      pair.imageIndex === 1 &&
      pair.circlePair[0]?.imageUrl === urls[0] &&
      pair.circlePair[1]?.imageUrl === urls[1];
    console.log(ok ? "OK" : "FAIL", "core fix no texture_feel", {
      applied,
      imageIndex: pair?.imageIndex,
      pairLen: pair?.circlePair?.length,
    });
    if (!ok) failed += 1;
  }

  // 3) guard: only 1 image → skip (no duplicate same image)
  {
    const sections = baseSections({ withTexture: false, ingredientIndex: 0 });
    const urls = ["https://a/only.png"];
    const { applied, sections: next } = applyIngredientCircleVisual(
      sections,
      urls,
      "나이아신아마이드, 히알루론산",
    );
    const pair = findCirclePair(next);
    const ok = applied === false && !pair;
    console.log(ok ? "OK" : "FAIL", "guard single image", { applied });
    if (!ok) failed += 1;
  }

  // 4) hasCircleVisual skip
  {
    const sections: DetailSection[] = [
      {
        type: "image_text",
        slot: "ingredient_circle_pair",
        layout: "circle-pair",
        heading: "",
        body: "",
        imageIndex: 1,
        imagePosition: "left",
        circlePair: [
          { imageUrl: "a", label: "A" },
          { imageUrl: "b", label: "B" },
        ],
      },
      {
        type: "image_text",
        slot: "ingredient_highlight",
        heading: "주요 성분",
        body: "설명",
        imageIndex: 0,
        imagePosition: "left",
      },
      {
        type: "spec_table",
        slot: "spec_table",
        heading: "스펙",
        rows: [{ label: "용량", value: "50ml" }],
      },
    ];
    const { applied } = applyIngredientCircleVisual(
      sections,
      ["https://a/1.png", "https://a/2.png"],
      "나이아신아마이드, 히알루론산",
    );
    const ok = applied === false;
    console.log(ok ? "OK" : "FAIL", "hasCircleVisual skip", { applied });
    if (!ok) failed += 1;
  }

  console.log("pickAlternateIndex: reused existing helper (no new function)");
  console.log("renderer/export: not modified this round");
  console.log("API generate: 0");

  if (failed > 0) {
    console.error("failed", failed);
    process.exit(1);
  }
  console.log("SMOKE:0");
}

main();
