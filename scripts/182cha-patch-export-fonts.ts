/**
 * 182 — one-shot patch: tokenize export font-size + Track A section title sizes.
 * Run: npx tsx scripts/182cha-patch-export-fonts.ts
 */
import fs from "fs";
import path from "path";

const p = path.join(__dirname, "..", "lib", "export-detail-html.ts");
let s = fs.readFileSync(p, "utf8");

// Track A placeholders before generic rem replace
// caution: NOTICE … h2 font-size:1.25rem → SECTION
s = s.replace(
  /(NOTICE<\/p>\s*<h2 style="font-size:)1\.25rem(;margin:0)">/,
  "$1__TRACK_A_SECTION__$2\">",
);
// brand_story dh2 font-size:1.35rem → SECTION
s = s.replace(
  /(STORY<\/p>\s*\$\{dh2\(category, esc\(section\.heading\), "font-size:)1\.35rem(;margin:0)"\}\)/,
  "$1__TRACK_A_SECTION__$2\"})",
);

const map: [string, string][] = [
  ["font-size:clamp(2.25rem,11vw,4rem)", "font-size:${FONT_SIZE.categoryKeyword}"],
  ["font-size:clamp(2rem,10vw,3.5rem)", "font-size:${FONT_SIZE.keywordClamp}"],
  ["font-size:clamp(1.5rem,8vw,2.25rem)", "font-size:${FONT_SIZE.keywordClampCard}"],
  ["font-size:0.6em", "font-size:${FONT_SIZE.footnoteSup}"],
  ["font-size:3rem", "font-size:${FONT_SIZE.statNumber}"],
  ["font-size:2.25rem", "font-size:${FONT_SIZE.price}"],
  ["font-size:2rem", "font-size:${FONT_SIZE.sectionXl}"],
  ["font-size:1.75rem", "font-size:${FONT_SIZE.sectionLg}"],
  ["font-size:1.5rem", "font-size:${FONT_SIZE.section}"],
  ["font-size:1.35rem", "font-size:${FONT_SIZE.sectionSm}"],
  ["font-size:1.25rem", "font-size:${FONT_SIZE.sectionXs}"],
  ["font-size:1rem", "font-size:${FONT_SIZE.seoH2}"],
  ["font-size:18px", "font-size:${FONT_SIZE.checkMark}"],
  ["font-size:16px", "font-size:${FONT_SIZE.bodyLg}"],
  ["font-size:15px", "font-size:${FONT_SIZE.body}"],
  ["font-size:14px", "font-size:${FONT_SIZE.bodySm}"],
  ["font-size:13px", "font-size:${FONT_SIZE.sm}"],
  ["font-size:12px", "font-size:${FONT_SIZE.xs}"],
  ["font-size:11px", "font-size:${FONT_SIZE.caption}"],
  ["font-size:10px", "font-size:${FONT_SIZE.label}"],
];

for (const [from, to] of map) {
  let n = 0;
  while (s.includes(from)) {
    s = s.replace(from, to);
    n += 1;
  }
  console.log(`${from} → ${n}`);
}

s = s.replace(/font-size:__TRACK_A_SECTION__/g, "font-size:${FONT_SIZE.section}");

const leftover = s.match(/font-size:(?!\$\{)[^;"'\s]+/g) || [];
console.log("leftover font-size literals:", leftover.slice(0, 30), "count=", leftover.length);

fs.writeFileSync(p, s);
console.log("patched", p);
