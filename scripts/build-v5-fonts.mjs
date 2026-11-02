/**
 * 474차 — V5 아키타입 서체 서브셋 복사(상업 OFL만).
 * public/fonts 는 gitignore. 외부 CDN 없음. 수정 없이 woff2 그대로.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, "public", "fonts");
fs.mkdirSync(out, { recursive: true });

/** @type {Array<{pkg:string,dir:string,name:string,weights:number[],license:string}>} */
const FONTS = [
  { pkg: "@fontsource/noto-serif-kr", dir: "noto-serif-kr", name: "Noto Serif KR", weights: [400, 700], license: "SIL OFL 1.1 — The Noto Project Authors" },
  { pkg: "@fontsource/gowun-batang", dir: "gowun-batang", name: "Gowun Batang", weights: [400, 700], license: "SIL OFL 1.1 — Yanghee Jung / Fontrix" },
  { pkg: "@fontsource/gowun-dodum", dir: "gowun-dodum", name: "Gowun Dodum", weights: [400], license: "SIL OFL 1.1 — Yanghee Jung / Fontrix" },
  { pkg: "@fontsource/black-han-sans", dir: "black-han-sans", name: "Black Han Sans", weights: [400], license: "SIL OFL 1.1 — Black Foundry / Sandoll" },
  { pkg: "@fontsource/do-hyeon", dir: "do-hyeon", name: "Do Hyeon", weights: [400], license: "SIL OFL 1.1 — BooGoo Design" },
  { pkg: "@fontsource/jua", dir: "jua", name: "Jua", weights: [400], license: "SIL OFL 1.1 — Woowa Brothers" },
];

/** 한글 분할 청크는 주석이 `[2]` 형태라 korean 문자열이 없다 — cyrillic 등만 제외 */
const keepChunk = (c) => !/cyrillic|greek|vietnamese|math|symbols|latin-ext/i.test(c);

let total = 0;
for (const f of FONTS) {
  const pkg = path.join(root, "node_modules", ...f.pkg.split("/"));
  if (!fs.existsSync(pkg)) {
    console.warn(`[v5-fonts] skip missing ${f.pkg}`);
    continue;
  }
  const dest = path.join(out, f.dir);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  const lines = [];
  let bytes = 0;
  let files = 0;
  for (const w of f.weights) {
    const cssPath = path.join(pkg, `${w}.css`);
    if (!fs.existsSync(cssPath)) continue;
    const css = fs.readFileSync(cssPath, "utf8");
    const re = /\/\*([^*]*)\*\/\s*(@font-face\s*\{[^}]*\})/g;
    let m;
    while ((m = re.exec(css))) {
      if (!keepChunk(m[1])) continue;
      const woff2 = m[2].match(/url\(([^)]+?\.woff2)\)/);
      if (!woff2) continue;
      const file = path.basename(woff2[1]);
      const src = path.join(pkg, "files", file);
      const alt = path.join(pkg, woff2[1].replace(/^\.\//, ""));
      const from = fs.existsSync(src) ? src : alt;
      if (!fs.existsSync(from)) continue;
      fs.copyFileSync(from, path.join(dest, file));
      bytes += fs.statSync(from).size;
      files += 1;
      const body = m[2]
        .replace(/src:[^;]*;/, `src:url(./${f.dir}/${file}) format('woff2');`)
        .replace(/font-display:[^;]*;/, "font-display:swap;");
      lines.push(body.replace(/\s+/g, " ").replace(/ ?([{};:,]) ?/g, "$1"));
    }
  }
  const header = `/* Pagzly V5: ${f.name} (${f.license}). 상업 이용·임베드 허용. docs/fonts-license-474.md. build-v5-fonts.mjs 생성 — 직접 수정 금지. */\n`;
  fs.writeFileSync(path.join(out, `${f.dir}.css`), header + lines.join("\n"));
  total += bytes;
  console.log(`[v5-fonts] ${f.name} ${files} files · ${(bytes / 1048576).toFixed(2)}MB`);
}
console.log(`[v5-fonts] total ${(total / 1048576).toFixed(2)}MB → public/fonts`);
