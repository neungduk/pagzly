/**
 * 99차 — 이미지 배정 다양성 스모크
 *   npx tsx scripts/99cha-assign-images-smoke.ts
 */
import {
  assignDistinctSectionImages,
  countAdjacentDuplicateImageTexts,
  countImageIndexFrequency,
  countPlacements,
  shouldWarnSparseProductImages,
} from "../lib/assign-section-images";
import type { DetailSection } from "../lib/types/generate";

function makeSections(imageTextCount: number): DetailSection[] {
  const sections: DetailSection[] = [
    {
      type: "hero",
      slot: "hero",
      headline: "히어로",
      subheadline: "",
      imageIndex: 0,
    },
  ];
  for (let i = 0; i < imageTextCount; i += 1) {
    sections.push({
      type: "image_text",
      slot: i === 0 ? "ingredient_highlight" : i === 1 ? "texture_feel" : `point_${i}`,
      heading: `섹션 ${i}`,
      body: "본문",
      imageIndex: 0,
      imagePosition: i % 2 === 0 ? "left" : "right",
      layout: "full",
    });
  }
  sections.push({
    type: "step_card",
    slot: "usage_steps_card",
    heading: "루틴",
    steps: [
      { title: "1", body: "a", imageIndex: 0 },
      { title: "2", body: "b", imageIndex: 0 },
      { title: "3", body: "c", imageIndex: 0 },
    ],
  });
  return sections;
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const many = makeSections(12);
const assigned5 = assignDistinctSectionImages(many, 5, { category: "화장품/뷰티" });
const freq5 = countImageIndexFrequency(assigned5);
const slots5 = countPlacements(assigned5);
const max5 = Math.max(...Object.values(freq5));
const unique5 = Object.keys(freq5).length;
const adj5 = countAdjacentDuplicateImageTexts(assigned5);
console.log("5 images:", { unique5, slots5, max5, adj5, freq5 });
assert(unique5 >= 4, `expected >=4 unique, got ${unique5}`);
assert(max5 <= Math.floor(slots5 / 2), `maxRepeat ${max5} exceeds half of ${slots5}`);
assert(adj5 === 0, `adjacent duplicates ${adj5}`);

const assigned2 = assignDistinctSectionImages(many, 2, { category: "화장품/뷰티" });
const freq2 = countImageIndexFrequency(assigned2);
const slots2 = countPlacements(assigned2);
const max2 = Math.max(...Object.values(freq2));
const adj2 = countAdjacentDuplicateImageTexts(assigned2);
console.log("2 images:", { slots2, max2, adj2, freq2 });
assert(adj2 === 0, `2-image adjacent duplicates ${adj2}`);
assert(max2 <= Math.ceil(slots2 / 2), `2-image maxRepeat ${max2} exceeds half`);
assert(shouldWarnSparseProductImages(2, slots2), "expected sparse warning for 2 images");

const assigned1 = assignDistinctSectionImages(many, 1);
const freq1 = countImageIndexFrequency(assigned1);
assert(Object.keys(freq1).length === 1, "1 image should stay unique=1");
assert(shouldWarnSparseProductImages(1, countPlacements(assigned1)), "sparse warn for 1");

console.log("99cha assign-images smoke OK");
