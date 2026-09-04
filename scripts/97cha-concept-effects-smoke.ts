/**
 * 97차 — pickOverlayAssignments 히어로 제외 스모크
 *   npx tsx scripts/97cha-concept-effects-smoke.ts
 */
import { pickOverlayAssignments } from "../lib/concept-effects";

const sections = [
  {
    type: "hero",
    slot: "hero",
    headline: "3중 히알루론, 촉촉",
    heading: "",
    imageIndex: 0,
  },
  {
    type: "image_text",
    slot: "ingredient_highlight",
    headline: "",
    heading: "성분",
    imageIndex: 1,
  },
  {
    type: "image_text",
    slot: "texture_feel",
    headline: "",
    heading: "질감 촉촉",
    imageIndex: 2,
  },
];

const a = pickOverlayAssignments(sections, ["moisture", "cooling"], 3);
console.log("assignments", JSON.stringify(a));
const moisture = a.find((x) => x.specIndex === 0);
const cooling = a.find((x) => x.specIndex === 1);
if (!moisture || moisture.imageIndex === 0) {
  throw new Error(`moisture must not be on hero, got ${JSON.stringify(moisture)}`);
}
if (!cooling || cooling.imageIndex !== 0) {
  throw new Error(`cooling should stay on hero, got ${JSON.stringify(cooling)}`);
}
console.log("OK moisture→", moisture.imageIndex, "cooling→", cooling.imageIndex);

const single = pickOverlayAssignments(
  [{ type: "hero", slot: "hero", headline: "촉촉 세럼", heading: "", imageIndex: 0 }],
  ["moisture"],
  1,
);
if (single.length !== 0) {
  throw new Error(`single-image should skip moisture, got ${JSON.stringify(single)}`);
}
console.log("OK single-image skip");
