/**
 * 50차 정적 검증 — API/생성 없이 코드 경로만 확인
 *   npx tsx scripts/verify-50cha-static.ts
 */

import { computePreviewCollapseEnd } from "../lib/detail-preview-collapse";
import { getSectionBackground } from "../lib/design-tokens";
import { insertSellerTrustEvidence } from "../lib/section-inserts";
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import type { DetailSection } from "../lib/types/generate";

const dummySections: DetailSection[] = [
  { type: "hero", slot: "hero", headline: "훅", subheadline: "서브", imageIndex: 0 },
  { type: "brand_story", slot: "brand_story", heading: "브랜드", body: "본문" },
  { type: "checklist", slot: "checklist", heading: "체크", items: ["a", "b"] },
  { type: "image_text", slot: "feature", heading: "포인트", body: "설명", imageIndex: 1, imagePosition: "left" },
  { type: "cta_price", slot: "cta_price", price: 10000, badges: [] },
];

const collapse = computePreviewCollapseEnd(dummySections);
console.log("[A] collapse end index:", collapse.collapsedAfterIndex, "hasMore:", collapse.hasMore);
if (!collapse.hasMore || collapse.collapsedAfterIndex !== 2) {
  throw new Error("Fix A: expected hero + 2 body sections visible by default");
}

const withoutEvidence = insertSellerTrustEvidence(dummySections, "");
const withEvidence = insertSellerTrustEvidence(dummySections, "올리브영 판매 1위");
console.log("[B] empty evidence sections:", withoutEvidence.length, "(same as input)");
console.log("[B] with evidence sections:", withEvidence.length, "+1 slot:", withEvidence[1]?.slot);
if (withoutEvidence.length !== dummySections.length) {
  throw new Error("Fix B: empty evidence must not add section");
}
if (withEvidence[1]?.slot !== "seller_trust_evidence") {
  throw new Error("Fix B: trust section not inserted after hero");
}

const fashionTheme = getCategoryTheme("의류/패션");
const fashionBgA = getSectionBackground(fashionTheme, "A", "의류/패션");
const beautyBgA = getSectionBackground(fashionTheme, "A", "화장품/뷰티");
if (fashionBgA === beautyBgA) {
  throw new Error("Fix D: fashion alpha should differ from other categories");
}
console.log("[D] fashion minimal A applied");

const exportSections: DetailSection[] = [
  { type: "hero", slot: "hero", headline: "루즈핏 스웨트", subheadline: "테스트", imageIndex: 0 },
  { type: "brand_story", slot: "brand_story", heading: "브랜드", body: "미니멀 배경 검증" },
];
const exportTheme = getCategoryTheme("의류/패션");
const fashionExportHtml = buildDetailPageHtml({
  productName: "테스트 스웨트",
  category: "의류/패션",
  sections: exportSections,
  imageUrls: ["/iteration-fixtures/01.jpg"],
  theme: exportTheme,
});
const beautyExportHtml = buildDetailPageHtml({
  productName: "테스트 세럼",
  category: "화장품/뷰티",
  sections: exportSections,
  imageUrls: ["/iteration-fixtures/01.jpg"],
  theme: exportTheme,
});
// brand_story → bodyIndex 0, offset 1 → pattern B
const fashionBgB = getSectionBackground(exportTheme, "B", "의류/패션");
const beautyBgB = getSectionBackground(exportTheme, "B", "화장품/뷰티");
const fashionHasMinimal = fashionExportHtml.includes(fashionBgB);
const beautyHasStandard = beautyExportHtml.includes(beautyBgB);
console.log("[D-export] fashion HTML has minimal B bg:", fashionHasMinimal);
console.log("[D-export] beauty HTML has standard B bg:", beautyHasStandard);
console.log("[D-export] fashion B sample:", fashionBgB.slice(0, 80));
if (!fashionHasMinimal) {
  throw new Error("Fix D export: fashion HTML missing minimal background gradient");
}
if (!beautyHasStandard) {
  throw new Error("Fix D export: beauty HTML missing standard background gradient");
}
if (fashionExportHtml.includes(beautyBgB)) {
  throw new Error("Fix D export: fashion HTML incorrectly contains beauty alpha gradient");
}

console.log("\n50차 static checks: PASS");
