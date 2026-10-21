// 430차 — 상세페이지용 셀프 호스팅 폰트 빌드: node_modules의 OFL 폰트(woff2, 한글 unicode-range 분할)를 public/fonts 로 복사하고 detail-fonts.css 를 만든다.
// dev/build 전에 자동 실행(package.json predev/prebuild). public/fonts 는 .gitignore(바이너리는 저장소에 넣지 않는다). 외부 CDN 호출 없음.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const nm = (p) => path.join(root, "node_modules", p);
const out = path.join(root, "public", "fonts");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

/** @font-face 블록 목록: { comment, body } */
function blocks(css) {
  const res = [];
  const re = /\/\*([^*]*)\*\/\s*(@font-face\s*\{[^}]*\})/g;
  let m;
  while ((m = re.exec(css))) res.push({ comment: m[1].trim(), body: m[2] });
  return res;
}
const keep = (c) => !/cyrillic|greek|vietnamese|math|symbols/i.test(c);

/** 패밀리 CSS 파일(slug.css) → 줄 목록. 상세페이지는 고른 폰트 조합의 파일만 링크한다(전체 CSS는 수백 KB라 한 파일로 싣지 않는다) */
const cssBySlug = new Map();
let bytes = 0;
const families = [];

function addFamily(dirName, family, entries, slug = dirName.replace(/-(400|700)$/, "")) {
  const lines = cssBySlug.get(slug) ?? [];
  cssBySlug.set(slug, lines);
  const dest = path.join(out, dirName);
  fs.mkdirSync(dest, { recursive: true });
  let n = 0;
  for (const { css, base, filter } of entries) {
    for (const b of blocks(fs.readFileSync(css, "utf8"))) {
      if (!keep(b.comment) || (filter && !filter(b))) continue;
      const m = b.body.match(/url\(([^)]+?\.woff2)\)/);
      if (!m) continue;
      const file = path.basename(m[1]);
      const src = path.join(base, m[1].replace(/^\.\//, ""));
      if (!fs.existsSync(src)) continue;
      fs.copyFileSync(src, path.join(dest, file));
      bytes += fs.statSync(src).size;
      const rewritten = b.body.replace(/src:[^;]*;/, `src: url(./${dirName}/${file}) format('woff2');`);
      lines.push(`/* ${b.comment} */\n${rewritten}\n`);
      n += 1;
    }
  }
  families.push({ family, files: n });
}

// Pretendard(본문·고딕 제목): 400~800, 한글 동적 서브셋
{
  const base = nm("pretendard/dist/web/static");
  addFamily("pretendard", "Pretendard", [{
    css: path.join(base, "pretendard-dynamic-subset.css"),
    base,
    filter: (b) => /font-weight:\s*(400|500|700|800)\b/.test(b.body),
  }]);
}
// 한글 디스플레이·명조(가변 또는 정적)
addFamily("hahmlet", "Hahmlet", [{ css: nm("@fontsource-variable/hahmlet/index.css"), base: nm("@fontsource-variable/hahmlet") }]);
for (const w of [400, 700]) addFamily(`gowun-batang-${w}`, "Gowun Batang", [{ css: nm(`@fontsource/gowun-batang/${w}.css`), base: nm("@fontsource/gowun-batang") }]);
addFamily("black-han-sans", "Black Han Sans", [{ css: nm("@fontsource/black-han-sans/400.css"), base: nm("@fontsource/black-han-sans") }]);
addFamily("do-hyeon", "Do Hyeon", [{ css: nm("@fontsource/do-hyeon/400.css"), base: nm("@fontsource/do-hyeon") }]);
addFamily("jua", "Jua", [{ css: nm("@fontsource/jua/400.css"), base: nm("@fontsource/jua") }]);
// 영문·숫자 라벨(가변): 라틴만
for (const [dir, fam, pkg] of [["playfair-display", "Playfair Display", "playfair-display"], ["montserrat", "Montserrat", "montserrat"]]) {
  addFamily(dir, fam, [{ css: nm(`@fontsource-variable/${pkg}/index.css`), base: nm(`@fontsource-variable/${pkg}`), filter: (b) => /latin/i.test(b.comment) }]);
}

const header = `/* Pagzly 상세페이지 폰트(셀프 호스팅, 전부 SIL Open Font License 1.1 — 상업 이용·임베드 허용).
 * Pretendard © Kil Hyung-jin · Hahmlet © The Hahmlet Project Authors · Gowun Batang © The Gowun Batang Project Authors · Black Han Sans © The Black Han Sans Project Authors
 * Do Hyeon © The Do Hyeon Project Authors · Jua © The BM JUA Project Authors · Playfair Display © The Playfair Display Project Authors · Montserrat © The Montserrat Project Authors
 * 라이선스 원문: review/430-font-licenses.md 에 정리, 각 npm 패키지의 LICENSE. build-detail-fonts.mjs 가 생성한 파일이라 직접 수정하지 않는다. */\n`;
for (const [slug, lines] of cssBySlug) fs.writeFileSync(path.join(out, `${slug}.css`), header + lines.join("\n"));
fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify({ families, totalMB: +(bytes / 1048576).toFixed(1) }, null, 1));
console.log(`[fonts] ${families.map((f) => `${f.family}(${f.files})`).join(" ")} · ${(bytes / 1048576).toFixed(1)}MB → public/fonts`);
