import fs from "fs";
import crypto from "crypto";

function sha(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

for (const k of ["food", "electronics", "fashion", "beauty"]) {
  const b = fs.readFileSync(`review/183cha-export/after-${k}.html`, "utf8");
  const a = fs.readFileSync(`review/184cha-export/after-${k}.html`, "utf8");
  console.log(k, "len", b.length, a.length, "same", b === a, sha(b).slice(0, 12), sha(a).slice(0, 12));
  if (b !== a) {
    let i = 0;
    while (i < b.length && i < a.length && b[i] === a[i]) i++;
    console.log(
      " firstDiff@",
      i,
      "\n  B:",
      JSON.stringify(b.slice(Math.max(0, i - 20), i + 60)),
      "\n  A:",
      JSON.stringify(a.slice(Math.max(0, i - 20), i + 60)),
    );
  }
}
