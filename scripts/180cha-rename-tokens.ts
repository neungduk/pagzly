/**
 * One-shot rename RADIUS/ELEVATION call sites for 180차.
 * Run: npx tsx scripts/180cha-rename-tokens.ts
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");

const files = [
  "lib/export-detail-html.ts",
  "lib/spec-bento-grid.ts",
  "components/DetailSectionRenderer.tsx",
  "components/SpecBentoGrid.tsx",
  "scripts/179cha-assert-elevation-values.ts",
];

const reps: [string, string][] = [
  // radius (order matters — longer names first)
  ["RADIUS.circle", "RADIUS.pill"],
  ["RADIUS.bento", "RADIUS.lg"],
  ["RADIUS.card", "RADIUS.lg"],
  ["RADIUS.media", "RADIUS.md"],
  ["RADIUS.chip", "RADIUS.sm"],
  // elevation renames
  ["ELEVATION.imageLiftExport(", "ELEVATION.imageLift("],
  ["ELEVATION.imageSoftExport(", "ELEVATION.imageSoft("],
  ["ELEVATION.specThumbMultiLive", "ELEVATION.specThumbMulti"],
  ["ELEVATION.ctaButtonLive", "ELEVATION.ctaButton"],
  ["ELEVATION.ctaStickyLive", "ELEVATION.ctaSticky"],
  ["ELEVATION.imageLiftLive", "ELEVATION.imageLift"], // may need theme arg — check manually
  ["ELEVATION.imageSoftLive", "ELEVATION.imageSoft"],
  ["ELEVATION.twSpecThumbSolo", "ELEVATION.twImageThumb"],
];

for (const rel of files) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) {
    console.log("skip missing", rel);
    continue;
  }
  let s = fs.readFileSync(p, "utf8");
  const before = s;
  for (const [a, b] of reps) {
    const n = s.split(a).length - 1;
    if (n) console.log(`${rel}: ${n}× ${a} → ${b}`);
    s = s.split(a).join(b);
  }
  if (s !== before) fs.writeFileSync(p, s);
}

console.log("done");
