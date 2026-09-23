/**
 * 243차 — image_text preferForSlot 카피 매칭 확장 검증 (API 0).
 *   npx tsx scripts/243cha-image-text-copy-match-verify.ts
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import {
  assignDistinctSectionImages,
  pickBestIndexByCopy,
} from "../lib/assign-section-images";
import type { ProductImageRole } from "../lib/image-roles";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log("OK", msg);
}

function imageText(
  slot: string,
  heading: string,
  body: string,
  imageIndex = 0,
): DetailSection {
  return {
    type: "image_text",
    slot,
    heading,
    body,
    imageIndex,
    imagePosition: "left",
  } as DetailSection;
}

async function main() {
  execSync(
    `npx esbuild "lib/assign-section-images.ts" --bundle=false --format=esm --outfile=NUL`,
    { cwd: ROOT, stdio: "pipe", shell: true },
  );
  console.log("OK esbuild lib/assign-section-images.ts");

  // --- unit: pickBestIndexByCopy ---
  assert(
    pickBestIndexByCopy({
      candidates: [],
      fallback: 7,
      sectionText: "면 소재",
      imageTags: [],
      imageReasons: [],
    }) === 7,
    "(a) empty candidates → fallback",
  );
  assert(
    pickBestIndexByCopy({
      candidates: [3],
      fallback: 0,
      sectionText: "면 소재",
      imageTags: [["가죽"]],
      imageReasons: [],
    }) === 3,
    "(b) single candidate → that index",
  );
  assert(
    pickBestIndexByCopy({
      candidates: [1, 2],
      fallback: 1,
      sectionText: "",
      imageTags: [
        [],
        ["면", "직조"],
        ["가죽"],
      ],
      imageReasons: [],
    }) === 1,
    "(c) empty sectionText → first candidate",
  );
  assert(
    pickBestIndexByCopy({
      candidates: [1, 2],
      fallback: 1,
      sectionText: "면 소재 디테일과 코튼 텍스처",
      imageTags: [
        [],
        ["가죽가방", "지퍼"],
        ["면소재", "코튼", "텍스처"],
      ],
      imageReasons: [],
    }) === 2,
    "(d) copy overlap picks better-tagged candidate",
  );
  assert(
    pickBestIndexByCopy({
      candidates: [1, 2],
      fallback: 1,
      sectionText: "완전무관문구xyzabc",
      imageTags: [
        [],
        ["가죽가방", "지퍼"],
        ["면소재", "직조"],
      ],
      imageReasons: [],
    }) === 1,
    "(e) all zero score → first candidate fallback",
  );

  // --- assign: DETAIL_SLOT_PRIORITY path unchanged (queued wins) ---
  const detailRoles: ProductImageRole[] = [
    "hero",
    "detail",
    "detail",
    "lifestyle",
  ];
  const detailSections: DetailSection[] = [
    {
      type: "hero",
      slot: "hero",
      headline: "히어로",
      subheadline: "서브",
      imageIndex: 0,
    } as DetailSection,
    imageText("ingredient_highlight", "성분 하이라이트", "핵심 성분 설명"),
    imageText("feature_callout", "피처", "기능 강조"),
    {
      type: "cta_price",
      slot: "cta_price",
      price: 10000,
      badges: [],
    } as DetailSection,
  ];
  const detailTags = [
    ["히어로"],
    ["성분", "추출"],
    ["매크로", "클로즈업"],
    ["일상"],
  ];
  const a = assignDistinctSectionImages(detailSections, 4, {
    category: "화장품/뷰티",
    imageRoles: detailRoles,
    imageTags: detailTags,
    imageReasons: [],
  });
  const b = assignDistinctSectionImages(detailSections, 4, {
    category: "화장품/뷰티",
    imageRoles: detailRoles,
    imageTags: detailTags,
    imageReasons: [],
  });
  const snap = (secs: DetailSection[]) =>
    secs
      .filter((s) => s.type === "image_text")
      .map((s) => `${s.slot}:${(s as { imageIndex: number }).imageIndex}`)
      .join("|");
  assert(snap(a) === snap(b), "DETAIL_SLOT path deterministic snapshot");

  // --- assign: non-DETAIL slots use copy match among lifestyle ---
  // roles: 0 hero, 1 lifestyle(가죽룩), 2 lifestyle(면/코디), 3 package
  const lifeRoles: ProductImageRole[] = [
    "hero",
    "lifestyle",
    "lifestyle",
    "package",
  ];
  const lifeTags = [
    ["제품컷"],
    ["가죽가방", "레더"],
    ["면소재", "코튼", "데일리룩"],
    ["패키지박스"],
  ];
  const lifeSections: DetailSection[] = [
    {
      type: "hero",
      slot: "hero",
      headline: "히어로",
      subheadline: "서브",
      imageIndex: 0,
    } as DetailSection,
    imageText(
      "usage_scenario",
      "면소재 코튼 데일리룩",
      "면소재 티셔츠를 활용한 일상 코디",
    ),
    imageText("coordination", "가죽가방 레더 매치", "가죽가방 액세서리와 함께"),
    {
      type: "cta_price",
      slot: "cta_price",
      price: 39000,
      badges: [],
    } as DetailSection,
  ];
  const lifeAssigned = assignDistinctSectionImages(lifeSections, 4, {
    category: "의류/패션",
    imageRoles: lifeRoles,
    imageTags: lifeTags,
    imageReasons: [],
  });
  const usage = lifeAssigned.find((s) => s.type === "image_text" && s.slot === "usage_scenario") as {
    imageIndex: number;
  };
  const coord = lifeAssigned.find((s) => s.type === "image_text" && s.slot === "coordination") as {
    imageIndex: number;
  };
  console.log("usage_scenario →", usage.imageIndex, "coordination →", coord.imageIndex);
  assert(usage.imageIndex === 2, "usage_scenario prefers cotton/lifestyle tag match (2)");
  assert(coord.imageIndex === 1, "coordination prefers leather lifestyle tag match (1)");
  assert(usage.imageIndex !== coord.imageIndex, "two lifestyle slots got distinct images");

  // --- small inventory: 1 photo per role → same as first-index ---
  const smallRoles: ProductImageRole[] = ["hero", "detail", "lifestyle", "package"];
  const smallSections: DetailSection[] = [
    {
      type: "hero",
      slot: "hero",
      headline: "히어로",
      subheadline: "서브",
      imageIndex: 9,
    } as DetailSection,
    imageText("usage_scenario", "면 데일리", "면 소재", 9),
    imageText("quick_points", "포인트", "요약", 9),
    imageText("packaging_design", "패키지", "박스", 9),
    {
      type: "gallery",
      slot: "lookbook",
      heading: "갤러리",
      imageIndexes: [1, 2],
    } as DetailSection,
    {
      type: "cta_price",
      slot: "cta_price",
      price: 10000,
      badges: [],
    } as DetailSection,
  ];
  const smallTags = [["a"], ["b"], ["면"], ["박스"]];
  const s1 = assignDistinctSectionImages(smallSections, 4, {
    category: "의류/패션",
    imageRoles: smallRoles,
    imageTags: smallTags,
    imageReasons: [],
  });
  const s2 = assignDistinctSectionImages(smallSections, 4, {
    category: "의류/패션",
    imageRoles: smallRoles,
    imageTags: [
      ["완전다른1"],
      ["완전다른2"],
      ["완전다른3"],
      ["완전다른4"],
    ],
    imageReasons: [],
  });
  // With one candidate per role, tags cannot change the prefer winner
  const idxOf = (secs: DetailSection[], slot: string) =>
    (secs.find((s) => s.type === "image_text" && s.slot === slot) as { imageIndex: number })
      .imageIndex;
  assert(
    idxOf(s1, "usage_scenario") === idxOf(s2, "usage_scenario"),
    "single lifestyle candidate: tags don't change usage_scenario",
  );
  assert(
    idxOf(s1, "packaging_design") === idxOf(s2, "packaging_design"),
    "single package candidate: tags don't change packaging_design",
  );
  assert(idxOf(s1, "usage_scenario") === 2, "usage_scenario still lifestyle index 2");
  assert(idxOf(s1, "packaging_design") === 3, "packaging_design still package index 3");

  // --- texture_feel special branch still picks details[1] when 2+ details ---
  const texRoles: ProductImageRole[] = ["hero", "detail", "detail", "lifestyle"];
  const texSections: DetailSection[] = [
    {
      type: "hero",
      slot: "hero",
      headline: "히어로",
      subheadline: "서브",
      imageIndex: 0,
    } as DetailSection,
    // texture_feel is in DETAIL_SLOT_PRIORITY so goes through allocatePreferQueue —
    // verify source still has details[1] direct branch for preferForSlot path.
    // Use a non-queued scenario: force by checking source text.
  ];
  void texSections;
  void texRoles;
  const src = fs.readFileSync(path.join(ROOT, "lib", "assign-section-images.ts"), "utf8");
  assert(
    /if \(slot === "texture_feel"\) \{[\s\S]*?if \(details\.length > 1\) return details\[1\];/.test(
      src,
    ),
    "texture_feel still returns details[1] when length>1",
  );
  assert(
    src.includes("sectionCopyText(section)") &&
      src.includes("options?.imageTags ?? []") &&
      src.includes("pickBestIndexByCopy"),
    "preferForSlot call site passes copy + tags",
  );

  console.log("API generate: 0");
  console.log("ALL PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
