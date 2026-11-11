/**
 * 522 — vite build 산출물에서 eval / new Function 검출 시 실패.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(js|mjs|cjs|html|map)$/i.test(ent.name)) out.push(p);
  }
  return out;
}

const hits = [];
for (const file of walk(dist)) {
  const src = fs.readFileSync(file, "utf8");
  if (src.includes("eval(") || src.includes("new Function(")) {
    hits.push(path.relative(root, file));
  }
}

if (hits.length) {
  console.error("[scan-bundle-eval] eval/new Function 검출:");
  for (const h of hits) console.error(" -", h);
  process.exit(1);
}

process.stdout.write("[scan-bundle-eval] ok\n");
