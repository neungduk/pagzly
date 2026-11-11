/**
 * 521 — 루트 pdfjs-dist 빌드를 toss-app/public 으로 복사(git 제외).
 * 521c — 토스 번들 검사가 `eval(` 을 찾아 반려했으므로, 복사본에서 eval·new Function 문자열을 무력화한다.
 *   - `eval("require")`: Node 전용 분기(브라우저에서는 실행되지 않음). 그냥 `require` 로 바꾼다.
 *   - `new Function(...)`: 글리프 컴파일 최적화용. 호출하면 예외를 던지게 바꿔 pdfjs 가 안 쓰는 쪽(해석 실행)으로 내려가게 한다.
 *   원본(루트 node_modules, 웹 사이트용 public)은 건드리지 않는다.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const tossRoot = path.resolve(here, "..");
const repoRoot = path.resolve(tossRoot, "..");
const srcDir = process.env.PDFJS_BUILD_DIR || path.join(repoRoot, "node_modules", "pdfjs-dist", "build");
const destDir = path.join(tossRoot, "public", "label-check-pdfjs");

const NO_FN = '(function(){throw new Error("eval_disabled")}).call(null,';

/** 복사본 소스에서 eval·new Function 을 없앤다. */
export function neutralizeEval(src) {
  return src.replace(/eval\("require"\)/g, "require").replace(/new Function\(/g, NO_FN);
}

fs.mkdirSync(destDir, { recursive: true });
for (const name of ["pdf.min.js", "pdf.worker.min.js"]) {
  const from = path.join(srcDir, name);
  if (!fs.existsSync(from)) {
    console.error(`[toss-copy-pdfjs] missing ${from} — 루트에서 npm install 후 다시 시도`);
    process.exit(1);
  }
  const out = neutralizeEval(fs.readFileSync(from, "utf8"));
  if (/\beval\s*\(/.test(out) || /new\s+Function\s*\(/.test(out)) {
    console.error(`[toss-copy-pdfjs] ${name} 에 eval/new Function 이 남아 있음 — 번들 검사에서 반려될 수 있음`);
    process.exit(1);
  }
  fs.writeFileSync(path.join(destDir, name), out);
}
process.stdout.write("[toss-copy-pdfjs] public/label-check-pdfjs ready (eval 제거본)\n");
