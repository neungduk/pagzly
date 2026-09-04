/**
 * 98차 — 빈 highlight_box 가드 스모크
 *   npx tsx scripts/98cha-empty-highlight-smoke.ts
 */
import {
  dropHollowHighlightBoxes,
  missingRequiredHighlightBox,
} from "../lib/highlight-box-guard";
import type { DetailSection } from "../lib/types/generate";

const hollow: DetailSection = {
  type: "highlight_box",
  slot: "highlight_box",
  heading: "핵심 포인트",
  cards: [],
};

const filled: DetailSection = {
  type: "highlight_box",
  slot: "highlight_box",
  heading: "핵심 포인트",
  cards: [
    { title: "보습", body: "촉촉하게" },
    { title: "진정", body: "자극 없이" },
    { title: "광채", body: "생기 있게" },
  ],
};

const hero: DetailSection = {
  type: "hero",
  slot: "hero",
  headline: "테스트",
  imageIndex: 0,
};

const dropped = dropHollowHighlightBoxes([hero, hollow, filled]);
if (dropped.length !== 2) {
  throw new Error(`expected 2 sections after drop, got ${dropped.length}`);
}
if (dropped.some((s) => s.type === "highlight_box" && s.heading === hollow.heading && s === hollow)) {
  throw new Error("hollow section should be dropped");
}

if (!missingRequiredHighlightBox([hero, hollow], "화장품/뷰티", "long")) {
  throw new Error("hollow required highlight_box should be missing");
}
if (missingRequiredHighlightBox([hero, filled], "화장품/뷰티", "long")) {
  throw new Error("filled highlight_box should not be missing");
}

console.log("OK drop hollow highlight_box");
console.log("OK missingRequiredHighlightBox");
