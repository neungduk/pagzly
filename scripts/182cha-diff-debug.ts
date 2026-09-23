import crypto from "crypto";
import fs from "fs";
import path from "path";

const OUT = path.join(__dirname, "..", "review", "182cha-export");
const before = fs.readFileSync(path.join(OUT, "before-beauty.html"), "utf8");
const after = fs.readFileSync(path.join(OUT, "after-beauty.html"), "utf8");

let r = after;
r = r.replace(
  />NOTICE<\/p>\s*<h2 style="font-size:1\.5rem;margin:0"/,
  '>NOTICE</p>\n        <h2 style="font-size:1.25rem;margin:0"',
);
r = r.replace(
  /(>STORY<\/p>\s*<h2 class="pagzly-display-headline" style="[^"]*?)font-size:1\.5rem/,
  "$1font-size:1.35rem",
);

console.log({
  equal: r === before,
  lens: [before.length, after.length, r.length],
  sha: {
    before: crypto.createHash("sha256").update(before).digest("hex").slice(0, 12),
    reverted: crypto.createHash("sha256").update(r).digest("hex").slice(0, 12),
  },
});

let i = 0;
while (i < before.length && i < r.length && before[i] === r[i]) i++;
console.log("firstDiffAt", i);
console.log("BEFORE", JSON.stringify(before.slice(Math.max(0, i - 30), i + 60)));
console.log("REVERT", JSON.stringify(r.slice(Math.max(0, i - 30), i + 60)));

function collect(html: string) {
  const m: Record<string, number> = {};
  const re = /font-size:([^;"']+)/g;
  let x: RegExpExecArray | null;
  while ((x = re.exec(html))) m[x[1]] = (m[x[1]] || 0) + 1;
  return m;
}
const mb = collect(before);
const ma = collect(after);
for (const k of [...new Set([...Object.keys(mb), ...Object.keys(ma)])].sort()) {
  if (mb[k] !== ma[k]) console.log("count", k, "b", mb[k] || 0, "a", ma[k] || 0);
}
