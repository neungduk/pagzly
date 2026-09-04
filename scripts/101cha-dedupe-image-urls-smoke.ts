/**
 * 101차 — image_urls 중복 제거 스모크
 *   npx tsx scripts/101cha-dedupe-image-urls-smoke.ts
 */
import {
  dedupeImageUrlArrays,
  remapSectionImageIndexes,
} from "../lib/dedupe-image-urls";
import type { DetailSection } from "../lib/types/generate";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const urls = [
  "https://cdn.example/a-enhanced.png",
  "https://cdn.example/a-enhanced.png",
  "https://cdn.example/a-enhanced.png",
  "https://cdn.example/compare-before.png",
  "https://cdn.example/compare-after.png",
];
const paths = ["a", "a", "a", "cb", "ca"];
const d = dedupeImageUrlArrays(urls, paths);
assert(d.urls.length === 3, `want 3 got ${d.urls.length}`);
assert(d.removed === 2, `want removed 2 got ${d.removed}`);
assert(d.indexMap[0] === 0 && d.indexMap[1] === 0 && d.indexMap[2] === 0, "map dups to 0");
assert(d.indexMap[3] === 1 && d.indexMap[4] === 2, "compare indexes");

const sections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "h",
    imageIndex: 2,
  },
  {
    type: "image_text",
    slot: "ingredient_highlight",
    heading: "i",
    body: "b",
    imageIndex: 1,
    imagePosition: "left",
  },
  {
    type: "gallery",
    slot: "gallery",
    heading: "g",
    imageIndexes: [3, 4],
  },
];
const remapped = remapSectionImageIndexes(sections, d.indexMap);
assert(remapped[0]!.type === "hero" && remapped[0]!.imageIndex === 0, "hero→0");
assert(
  remapped[1]!.type === "image_text" && remapped[1]!.imageIndex === 0,
  "it→0",
);
assert(
  remapped[2]!.type === "gallery" &&
    remapped[2]!.imageIndexes[0] === 1 &&
    remapped[2]!.imageIndexes[1] === 2,
  "gallery compare",
);

console.log("101cha dedupe-image-urls smoke OK", d.urls.map((u) => u.split("/").pop()));
