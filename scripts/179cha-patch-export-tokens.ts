import fs from "fs";
import path from "path";

const p = path.join(__dirname, "..", "lib", "export-detail-html.ts");
let s = fs.readFileSync(p, "utf8");

const reps: [string, string][] = [
  [
    "box-shadow:0 12px 32px -12px rgba(27,27,24,0.28);border:1px solid rgba(27,27,24,0.1)",
    "box-shadow:${ELEVATION.imageThumb};border:${ELEVATION.specThumbBorder}",
  ],
  ["border-radius:999px", "border-radius:${RADIUS.pill}px"],
  ["border-radius:9999px", "border-radius:${RADIUS.circle}px"],
  ["border-radius:16px", "border-radius:${RADIUS.card}px"],
  ["border-radius:12px", "border-radius:${RADIUS.media}px"],
  ["border-radius:6px", "border-radius:${RADIUS.chip}px"],
  ["border-radius:2px", "border-radius:${RADIUS.hairline}px"],
  [
    "box-shadow:0 12px 32px -12px rgba(27,27,24,0.28)",
    "box-shadow:${ELEVATION.imageThumb}",
  ],
  [
    "box-shadow:0 -8px 24px rgba(27,27,24,.15)",
    "box-shadow:${ELEVATION.ctaSticky}",
  ],
  [
    "box-shadow:0 20px 56px ${hexToRgba(theme.deepAccent, 0.14)}",
    "box-shadow:${ELEVATION.imageLiftExport(theme.deepAccent)}",
  ],
  [
    "box-shadow:0 16px 48px ${hexToRgba(theme.deepAccent, 0.12)}",
    "box-shadow:${ELEVATION.imageSoftExport(theme.deepAccent)}",
  ],
  [
    "box-shadow:inset 0 -2px 0 0 ${accent}8c",
    "box-shadow:${ELEVATION.certUnderlineExportHex(accent + \"8c\")}",
  ],
  [
    "box-shadow:inset 0 0 0 1px ${accent}33",
    "box-shadow:${ELEVATION.personaRingExportHex(accent + \"33\")}",
  ],
  [
    "box-shadow:0 0 0 1px ${accent}44",
    "box-shadow:${ELEVATION.swatchRing(accent + \"44\")}",
  ],
];

for (const [a, b] of reps) {
  const n = s.split(a).length - 1;
  console.log(`${n}\t${a.slice(0, 60)}`);
  if (n === 0) continue;
  s = s.split(a).join(b);
}

fs.writeFileSync(p, s);
console.log("wrote", p);
