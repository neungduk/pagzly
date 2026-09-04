/**
 * 107차 — brand_story 미사용 컷만 배정
 *   npx tsx scripts/107cha-brand-story-assign-smoke.ts
 */
import {
  assignDistinctSectionImages,
  countImageIndexFrequency,
} from "../lib/assign-section-images";
import type { DetailSection } from "../lib/types/generate";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function baseSections(): DetailSection[] {
  return [
    { type: "hero", slot: "hero", headline: "히어로", imageIndex: 0 },
    {
      type: "brand_story",
      slot: "brand_story",
      heading: "브랜드",
      body: "한 줄\n\n두 줄",
    },
    {
      type: "image_text",
      slot: "ingredient_highlight",
      heading: "성분",
      body: "본문",
      imageIndex: 0,
      imagePosition: "left",
      layout: "full",
    },
    {
      type: "image_text",
      slot: "texture_feel",
      heading: "질감",
      body: "본문",
      imageIndex: 0,
      imagePosition: "right",
      layout: "full",
    },
    {
      type: "image_text",
      slot: "packaging_design",
      heading: "패키지",
      body: "본문",
      imageIndex: 0,
      imagePosition: "left",
      layout: "full",
    },
  ];
}

// 케이스 A: 이미지 충분 → brand_story에 미사용 컷
const withSpare = assignDistinctSectionImages(baseSections(), 6, {
  category: "화장품/뷰티",
  imageRoles: ["hero", "detail", "detail", "package", "other", "other"],
});
const storyA = withSpare.find((s) => s.type === "brand_story");
assert(storyA?.type === "brand_story", "story present");
const idxsA = storyA && storyA.type === "brand_story" ? storyA.imageIndexes : undefined;
assert(Array.isArray(idxsA) && idxsA.length >= 1 && idxsA.length <= 2, `spare imgs ${JSON.stringify(idxsA)}`);

const ing = withSpare.find(
  (s) => s.type === "image_text" && s.slot === "ingredient_highlight",
);
assert(ing?.type === "image_text", "ingredient");
if (ing?.type === "image_text" && idxsA) {
  assert(!idxsA.includes(ing.imageIndex), "story must not steal ingredient cut");
}

// 케이스 B: 이미지 1장만 → brand_story 텍스트 전용, 다른 슬롯은 그대로 배정 가능
const tight = assignDistinctSectionImages(baseSections(), 1, {
  category: "화장품/뷰티",
});
const storyB = tight.find((s) => s.type === "brand_story");
assert(
  storyB?.type === "brand_story" &&
    (!storyB.imageIndexes || storyB.imageIndexes.length === 0),
  "no unused → text only",
);
const freq = countImageIndexFrequency(tight);
assert(Object.keys(freq).length >= 1, "other slots still assigned");

console.log("107cha brand-story assign smoke OK", {
  spare: idxsA,
  tightImages: storyB && storyB.type === "brand_story" ? storyB.imageIndexes : null,
});
