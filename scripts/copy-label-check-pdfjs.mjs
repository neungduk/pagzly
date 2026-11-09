/**
 * 499 — pdfjs-dist 브라우저 빌드를 public으로 복사(번들에 canvas/node:module 유입 방지).
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcDir = path.join(root, "node_modules", "pdfjs-dist", "build");
const destDir = path.join(root, "public", "label-check-pdfjs");

fs.mkdirSync(destDir, { recursive: true });
for (const name of ["pdf.min.js", "pdf.worker.min.js"]) {
  const from = path.join(srcDir, name);
  if (!fs.existsSync(from)) {
    console.error(`[copy-pdfjs] missing ${from}`);
    process.exit(1);
  }
  fs.copyFileSync(from, path.join(destDir, name));
}
console.log("[copy-pdfjs] public/label-check-pdfjs ready");
