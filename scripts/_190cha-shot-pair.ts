/**
 * One-shot: patch constants → shot → restore (UTF-8 safe).
 *   npx tsx scripts/_190cha-shot-pair.ts
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const ROOT = path.join(__dirname, "..");
const budgetPath = path.join(ROOT, "lib", "section-display-budget.ts");

function run(tag: "before" | "after") {
  const r = spawnSync("npx", ["tsx", "scripts/190cha-export-verify.ts", tag], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const original = fs.readFileSync(budgetPath, "utf8");
if (!original.includes("MAX_EVIDENCE_LOW = 1") || !original.includes("\\uC0DD\\uD65C\\uC6A9\\uD488")) {
  console.error("budget file unexpected; abort");
  process.exit(1);
}

const as183 = original
  .replace("const MAX_EVIDENCE_LOW = 1;", "const MAX_EVIDENCE_LOW = 2;")
  .replace("const MAX_EXTRA_IMAGE_LOW = 0;", "const MAX_EXTRA_IMAGE_LOW = 1;");
fs.writeFileSync(budgetPath, as183, "utf8");
try {
  run("before");
} finally {
  fs.writeFileSync(budgetPath, original, "utf8");
}

run("after");

const check = fs.readFileSync(budgetPath, "utf8");
console.log(
  "final ok",
  original.includes("\\uC0DD\\uD65C\\uC6A9\\uD488"),
  /MAX_EVIDENCE_LOW = 1/.test(check),
  /MAX_EXTRA_IMAGE_LOW = 0/.test(check),
);
