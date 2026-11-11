/**
 * 521 — 루트 pdfjs-dist 빌드를 toss-app/public 으로 복사(git 제외).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const tossRoot = path.resolve(here, "..");
const repoRoot = path.resolve(tossRoot, "..");
const srcDir = path.join(repoRoot, "node_modules", "pdfjs-dist", "build");
const destDir = path.join(tossRoot, "public", "label-check-pdfjs");

fs.mkdirSync(destDir, { recursive: true });
for (const name of ["pdf.min.js", "pdf.worker.min.js"]) {
  const from = path.join(srcDir, name);
  if (!fs.existsSync(from)) {
    console.error(`[toss-copy-pdfjs] missing ${from} — 루트에서 npm install 후 다시 시도`);
    process.exit(1);
  }
  fs.copyFileSync(from, path.join(destDir, name));
}
process.stdout.write("[toss-copy-pdfjs] public/label-check-pdfjs ready\n");
