/**
 * 224차 — 라이브·export POINT 카운터 패리티 검증 (API 0).
 *   npx tsx scripts/224cha-point-counter-parity-verify.ts
 *
 * 수정 전 라이브 조건(블리드 미제외) vs shouldUseSplitLayout(export/수정 후) 비교.
 */
import fs from "fs";
import path from "path";
import {
  resolveSplitFlexRatio,
  resolveSplitImageLeft,
  shouldUseEditorialBleed,
  shouldUseSplitLayout,
} from "../lib/detail-visual-rhythm";
import type { DetailSection, ImageTextSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");

/** 224차 수정 전 DetailSectionRenderer isFullPoint (버그 재현용) */
function isFullPointLegacyLive(section: DetailSection): boolean {
  return (
    section.type === "image_text" &&
    section.layout !== "compact" &&
    section.layout !== "callout" &&
    section.slot !== "quick_points" &&
    section.slot !== "feature_callout"
  );
}

/** export / 수정 후 라이브 */
function isFullPointFixed(section: DetailSection): boolean {
  return shouldUseSplitLayout(section);
}

function computePointIndexes(
  sections: DetailSection[],
  isFull: (s: DetailSection) => boolean,
): Array<number | undefined> {
  let imageTextCount = 0;
  return sections.map((section) => {
    const full = isFull(section);
    return full ? imageTextCount++ : undefined;
  });
}

function it(
  slot: string,
  layout: ImageTextSection["layout"] = "full",
): ImageTextSection {
  // imagePosition 미지정 → resolveSplitImageLeft가 pointIndex % 2 교대 적용
  return {
    type: "image_text",
    slot,
    layout,
    heading: slot,
    body: "body",
    imageIndex: 0,
  } as ImageTextSection;
}

const SYNTHETIC: DetailSection[] = [
  { type: "hero", slot: "hero", headline: "h", subheadline: "s", imageIndex: 0 } as DetailSection,
  it("feature_detail"),
  it("usage_scenario"), // editorial bleed
  it("material_detail"),
  { type: "checklist", slot: "checklist", heading: "c", items: ["a"] } as DetailSection,
  it("quality_detail"),
];

function describeRow(
  section: DetailSection,
  pointIndex: number | undefined,
): string {
  if (pointIndex == null) return "—";
  const badge = `POINT ${String(pointIndex + 1).padStart(2, "0")}`;
  const flex = resolveSplitFlexRatio(pointIndex);
  const left =
    section.type === "image_text"
      ? resolveSplitImageLeft(section, pointIndex)
      : true;
  return `${badge} cycle=${pointIndex % 3} flex=${flex.image}:${flex.text} img=${left ? "L" : "R"}`;
}

function assertEqual(
  label: string,
  a: Array<number | undefined>,
  b: Array<number | undefined>,
): boolean {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(ok ? "OK" : "FAIL", label, "\n  A", a, "\n  B", b);
  return ok;
}

function main() {
  let failed = 0;

  console.log("=== synthetic: legacy live vs fixed (수정 전 불일치 증명) ===");
  {
    const legacy = computePointIndexes(SYNTHETIC, isFullPointLegacyLive);
    const fixed = computePointIndexes(SYNTHETIC, isFullPointFixed);
    const differ = JSON.stringify(legacy) !== JSON.stringify(fixed);
    console.log(differ ? "OK" : "FAIL", "before≠after on bleed fixture");
    if (!differ) failed += 1;

    console.log("slot\tlegacy\tfixed");
    for (let i = 0; i < SYNTHETIC.length; i += 1) {
      const s = SYNTHETIC[i]!;
      const bleed = shouldUseEditorialBleed(s) ? " [BLEED]" : "";
      console.log(
        `${s.slot}${bleed}\t${describeRow(s, legacy[i])}\t${describeRow(s, fixed[i])}`,
      );
    }

    // 브리프 표 수치
    const expectLegacy = [undefined, 0, 1, 2, undefined, 3];
    const expectFixed = [undefined, 0, undefined, 1, undefined, 2];
    if (!assertEqual("legacy matches brief", legacy, expectLegacy)) failed += 1;
    if (!assertEqual("fixed matches brief/export", fixed, expectFixed)) failed += 1;

    // material_detail: legacy L vs fixed R
    const matSec = SYNTHETIC[3] as ImageTextSection;
    const matLegacy = resolveSplitImageLeft(matSec, legacy[3]);
    const matFixed = resolveSplitImageLeft(matSec, fixed[3]);
    const flip = matLegacy === true && matFixed === false;
    console.log(
      flip ? "OK" : "FAIL",
      "material_detail image side flips legacy→fixed",
      { matLegacy, matFixed },
    );
    if (!flip) failed += 1;
  }

  console.log("=== after fix: live === export (둘 다 shouldUseSplitLayout) ===");
  {
    const live = computePointIndexes(SYNTHETIC, isFullPointFixed);
    const exp = computePointIndexes(SYNTHETIC, shouldUseSplitLayout);
    if (!assertEqual("parity", live, exp)) failed += 1;
  }

  console.log("=== no-bleed fixture: legacy === fixed (회귀 없음) ===");
  {
    const noBleed: DetailSection[] = [
      { type: "hero", slot: "hero", headline: "h", subheadline: "s", imageIndex: 0 } as DetailSection,
      it("feature_detail"),
      it("material_detail"),
      it("quality_detail"),
      it("design_detail", "compact"),
      it("feature_callout", "callout"),
    ];
    const legacy = computePointIndexes(noBleed, isFullPointLegacyLive);
    const fixed = computePointIndexes(noBleed, isFullPointFixed);
    if (!assertEqual("no-bleed regression", legacy, fixed)) failed += 1;
  }

  console.log("=== real 181cha-live fixtures ===");
  const cats = ["electronics", "fashion", "beauty", "food", "living", "pet"] as const;
  for (const key of cats) {
    const p = path.join(ROOT, "review", "181cha-live", key, "session.json");
    if (!fs.existsSync(p)) {
      console.log("skip", key);
      continue;
    }
    const session = JSON.parse(fs.readFileSync(p, "utf8")) as {
      generated?: { sections?: DetailSection[] };
    };
    const sections = session.generated?.sections ?? [];
    const bleedCount = sections.filter((s) => shouldUseEditorialBleed(s)).length;
    const legacy = computePointIndexes(sections, isFullPointLegacyLive);
    const fixed = computePointIndexes(sections, isFullPointFixed);
    const differ = JSON.stringify(legacy) !== JSON.stringify(fixed);
    const parity = JSON.stringify(fixed) === JSON.stringify(computePointIndexes(sections, shouldUseSplitLayout));

    if (bleedCount > 0) {
      console.log(
        differ ? "OK" : "FAIL",
        key,
        `bleed=${bleedCount}`,
        "legacy≠fixed (expected diverge)",
      );
      if (!differ) failed += 1;
    } else {
      console.log(
        !differ ? "OK" : "FAIL",
        key,
        "bleed=0",
        "legacy===fixed (regression)",
      );
      if (differ) failed += 1;
    }
    if (!parity) {
      console.log("FAIL", key, "fixed≠export");
      failed += 1;
    } else {
      console.log("OK", key, "fixed===export");
    }
  }

  // DetailSectionRenderer source uses shouldUseSplitLayout for isFullPoint
  console.log("=== source wiring ===");
  {
    const src = fs.readFileSync(
      path.join(ROOT, "components", "DetailSectionRenderer.tsx"),
      "utf8",
    );
    const hasImport = /shouldUseSplitLayout,/.test(src) || /shouldUseSplitLayout\s*\}/.test(src);
    const usesShared = /const isFullPoint = shouldUseSplitLayout\(section\)/.test(src);
    const noLegacyBlock =
      !/section\.layout !== "compact" &&\s*section\.layout !== "callout" &&\s*section\.slot !== "quick_points"/.test(
        src,
      );
    console.log(hasImport && usesShared ? "OK" : "FAIL", "DetailSectionRenderer uses shared fn");
    console.log(noLegacyBlock ? "OK" : "FAIL", "legacy inline isFullPoint removed");
    if (!hasImport || !usesShared || !noLegacyBlock) failed += 1;

    const exportSrc = fs.readFileSync(
      path.join(ROOT, "lib", "export-detail-html.ts"),
      "utf8",
    );
    const exportUses = /const isFullPoint = shouldUseSplitLayout\(section\)/.test(exportSrc);
    console.log(exportUses ? "OK" : "FAIL", "export still uses shouldUseSplitLayout");
    if (!exportUses) failed += 1;
  }

  console.log(failed === 0 ? "\nALL PASS" : `\nFAILED: ${failed}`);
  console.log("API generate: 0");
  if (failed > 0) process.exit(1);
}

main();
