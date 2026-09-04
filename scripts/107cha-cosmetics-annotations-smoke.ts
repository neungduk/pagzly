/**
 * 107차 — 화장품 주석 콜아웃 필터·상한 스모크
 *   npx tsx scripts/107cha-cosmetics-annotations-smoke.ts
 */
import {
  filterPhysicalCosmeticAnnotations,
  isPhysicalCosmeticAnnotationLabel,
} from "../lib/cosmetics-annotation-labels";
import {
  MAX_COSMETICS_ANNOTATED_SECTIONS,
  pickCosmeticsAnnotationTargetIndexes,
} from "../lib/apply-cosmetics-annotations";
import { areAnnotationsReliable } from "../lib/product-annotations";
import type { DetailSection } from "../lib/types/generate";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// 1) 효능 라벨 필터
assert(isPhysicalCosmeticAnnotationLabel("미세 분사 노즐"), "nozzle ok");
assert(isPhysicalCosmeticAnnotationLabel("35mL 보틀"), "bottle ok");
assert(isPhysicalCosmeticAnnotationLabel("무광 블랙 캡"), "cap ok");
assert(!isPhysicalCosmeticAnnotationLabel("속건조 케어"), "efficacy reject");
assert(!isPhysicalCosmeticAnnotationLabel("24시간 보습"), "moisturize reject");
assert(!isPhysicalCosmeticAnnotationLabel("피부 장벽 강화"), "barrier reject");
assert(!isPhysicalCosmeticAnnotationLabel("주름 제거"), "compliance reject");

const mixed = filterPhysicalCosmeticAnnotations([
  { label: "오일층 경계", xPct: 40, yPct: 50 },
  { label: "속건조 케어", xPct: 60, yPct: 30 },
  { label: "프로스트 글라스", xPct: 55, yPct: 70 },
  { label: "미백 효과", xPct: 20, yPct: 20 },
]);
assert(mixed.length === 2, `physical keep 2 got ${mixed.length}`);
assert(areAnnotationsReliable(mixed), "remaining reliable");

const oneLeft = filterPhysicalCosmeticAnnotations([
  { label: "노즐", xPct: 40, yPct: 50 },
  { label: "24시간 보습", xPct: 60, yPct: 30 },
]);
assert(oneLeft.length === 1, "one physical");
assert(!areAnnotationsReliable(oneLeft), "need >=2 after filter");

// 2) 최대 2섹션 상한
const sections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "h",
    imageIndex: 0,
  },
  {
    type: "image_text",
    slot: "packaging_design",
    heading: "패키지",
    body: "본문",
    imageIndex: 1,
    imagePosition: "left",
    layout: "full",
  },
  {
    type: "image_text",
    slot: "texture_feel",
    heading: "질감",
    body: "본문",
    imageIndex: 2,
    imagePosition: "right",
    layout: "full",
  },
  {
    type: "image_text",
    slot: "feature_detail",
    heading: "디테일",
    body: "본문",
    imageIndex: 3,
    imagePosition: "left",
    layout: "full",
  },
  {
    type: "image_text",
    slot: "size_options",
    heading: "용량",
    body: "본문",
    imageIndex: 4,
    imagePosition: "right",
    layout: "full",
  },
];
const targets = pickCosmeticsAnnotationTargetIndexes(sections);
assert(targets.length === MAX_COSMETICS_ANNOTATED_SECTIONS, `max 2 got ${targets.length}`);
assert(
  (sections[targets[0]!] as { slot: string }).slot === "packaging_design",
  "first packaging",
);
assert(
  (sections[targets[1]!] as { slot: string }).slot === "texture_feel",
  "second texture",
);

console.log("107cha cosmetics-annotations smoke OK", {
  filtered: mixed.map((a) => a.label),
  targets: targets.map((i) => (sections[i] as { slot: string }).slot),
});
