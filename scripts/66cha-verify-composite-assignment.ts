/**
 * 66차 — lifestyle-composite 이미지 슬롯 배정 단위 검증 (무료)
 *   npx tsx scripts/66cha-verify-composite-assignment.ts
 */

import { assignDistinctSectionImages } from "../lib/assign-section-images";
import type { DetailSection } from "../lib/types/generate";

const sections: DetailSection[] = [
  { type: "hero", slot: "hero", headline: "h", subheadline: "s", imageIndex: 0 },
  {
    type: "image_text",
    slot: "usage_scenario",
    heading: "데일리 루틴",
    body: "b",
    imageIndex: 1,
    imagePosition: "left",
  },
  {
    type: "image_text",
    slot: "customer_scenario",
    heading: "이런 분께",
    body: "b",
    imageIndex: 2,
    imagePosition: "right",
  },
];

const imageCount = 4;
const imagePaths = [
  "user/hero-enhanced.png",
  "user/detail-1.png",
  "user/detail-2.png",
  "user/abc/lifestyle-composite-1234567890.png",
];

const assigned = assignDistinctSectionImages(sections, imageCount, {
  category: "화장품/뷰티",
  imagePaths,
  imageRoles: ["hero", "detail", "detail", "lifestyle"],
});

const usage = assigned.find((s) => s.type === "image_text" && s.slot === "usage_scenario");
const customer = assigned.find((s) => s.type === "image_text" && s.slot === "customer_scenario");

if (!usage || usage.type !== "image_text" || usage.imageIndex !== 3) {
  throw new Error(`usage_scenario should use composite index 3, got ${usage?.type === "image_text" ? usage.imageIndex : "?"}`);
}

const anyComposite = assigned.some(
  (s) =>
    (s.type === "image_text" && s.imageIndex === 3) ||
    (s.type === "gallery" && s.imageIndexes?.includes(3)),
);
if (!anyComposite) {
  throw new Error("합성 이미지(index 3)가 어떤 섹션에도 배정되지 않음");
}

console.log(
  `[66cha] composite assignment ✓ usage_scenario→${usage.imageIndex}, customer_scenario→${customer?.type === "image_text" ? customer.imageIndex : "?"}`,
);
