import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..", "review", "180cha-pixel");
const keys = ["cosmetics", "fashion", "food", "electronics", "living", "pet"];

for (const key of keys) {
  const a = fs.readFileSync(path.join(ROOT, "before", `${key}-export.html`), "utf8");
  const b = fs.readFileSync(path.join(ROOT, "after", `${key}-export.html`), "utf8");
  const c9999a = (a.match(/border-radius:9999px/g) || []).length;
  const c9999b = (b.match(/border-radius:9999px/g) || []).length;
  const c14a = (a.match(/border-radius:14px/g) || []).length;
  const c14b = (b.match(/border-radius:14px/g) || []).length;
  const shaA = fs.readFileSync(path.join(ROOT, "before", `${key}-export.sha256`), "utf8");
  const shaB = fs.readFileSync(path.join(ROOT, "after", `${key}-export.sha256`), "utf8");
  console.log(
    JSON.stringify({
      key,
      htmlChanged: shaA !== shaB,
      "9999 before/after": [c9999a, c9999b],
      "14 before/after": [c14a, c14b],
      len: [a.length, b.length],
    }),
  );
}
