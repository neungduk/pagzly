/**
 * Fix dh2(..., "font-size:${FONT_SIZE.x}") → backticks so values interpolate.
 */
import fs from "fs";
import path from "path";

const p = path.join(__dirname, "..", "lib", "export-detail-html.ts");
let s = fs.readFileSync(p, "utf8");

// Pattern: dh2(..., "....${FONT_SIZE....}...")
const re = /dh2\(([^,]+),\s*([^,]+),\s*"([^"]*\$\{FONT_SIZE\.[a-zA-Z]+\}[^"]*)"\)/g;
let n = 0;
s = s.replace(re, (_m, a, b, style) => {
  n += 1;
  return `dh2(${a}, ${b}, \`${style}\`)`;
});

fs.writeFileSync(p, s);
console.log("fixed dh2 calls:", n);

const leftover = s.match(/"[^"]*\$\{FONT_SIZE\.[a-zA-Z]+\}[^"]*"/g) || [];
console.log("remaining double-quoted FONT_SIZE embeds:", leftover.length, leftover.slice(0, 10));
