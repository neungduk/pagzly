/**
 * 105차 3번 회귀 — circle 삽입 후 assign이 항상 도는지 (final 경로 시뮬레이션)
 * 실행: npx tsx scripts/105cha-circle-reassign-smoke.ts
 */
import assert from "node:assert/strict";
import { applyIngredientCircleVisual } from "../lib/apply-ingredient-circle-pair";
import { assignDistinctSectionImages } from "../lib/assign-section-images";
import type { DetailSection } from "../lib/types/generate";

const sections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "H",
    imageIndex: 0,
  },
  {
    type: "image_text",
    slot: "ingredient_highlight",
    heading: "성분",
    body: "히알루론산",
    imageIndex: 1,
    layout: "full",
    imagePosition: "left",
  },
  {
    type: "image_text",
    slot: "texture_feel",
    heading: "질감",
    body: "가벼운",
    imageIndex: 2,
    layout: "full",
    imagePosition: "right",
  },
  {
    type: "spec_table",
    slot: "spec_table",
    heading: "스펙",
    rows: [{ label: "용량", value: "35mL" }],
  },
];

const urls = [
  "https://ex/0.png",
  "https://ex/1.png",
  "https://ex/2.png",
  "https://ex/3.png",
];

let next = assignDistinctSectionImages(sections, urls.length, {
  category: "화장품/뷰티",
});
const beforeCircle = next.find(
  (s) => s.type === "image_text" && s.slot === "ingredient_highlight",
);
assert.ok(beforeCircle && beforeCircle.type === "image_text");

const pair = applyIngredientCircleVisual(next, urls, "히알루론산");
assert.equal(pair.applied, true);
next = pair.sections;

const hasCircle = next.some(
  (s) =>
    s.type === "image_text" &&
    (s.layout === "circle-solo" || s.layout === "circle-pair"),
);
assert.equal(hasCircle, true);

// 재배정 보장 (route final과 동일)
next = assignDistinctSectionImages(next, urls.length, {
  category: "화장품/뷰티",
});
const circle = next.find(
  (s) =>
    s.type === "image_text" &&
    (s.layout === "circle-solo" || s.layout === "circle-pair"),
);
assert.ok(circle && circle.type === "image_text");
assert.ok(
  Number.isInteger(circle.imageIndex) &&
    circle.imageIndex >= 0 &&
    circle.imageIndex < urls.length,
);

console.log("105cha-circle-reassign-smoke PASS", {
  circleLayout: circle.layout,
  circleIndex: circle.imageIndex,
  ingredientIndex: (beforeCircle as { imageIndex: number }).imageIndex,
});
