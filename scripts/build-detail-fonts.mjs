// 432차 — 상세페이지 폰트는 Noto Sans KR 하나(SIL OFL 1.1, @fontsource/noto-sans-kr)다. 한글 unicode-range 분할 woff2를 public/fonts 로 복사하고 noto-sans-kr.css 를 만든다.
// dev/build 전에 자동 실행(package.json predev/prebuild). public/fonts 는 .gitignore(바이너리는 저장소에 넣지 않는다). 외부 CDN 호출 없음.
// 굵기 파일은 400·500·700·900만 싣는다. 파일이 없는 굵기(300·600·800)가 합성 굵기로 지저분해지지 않도록 가까운 파일의 굵기 범위로 선언한다:
//   400 = 100~400 · 500 = 500 · 700 = 600~800 · 900 = 900  (font-face의 font-weight 범위 안이면 브라우저가 합성 굵기를 만들지 않는다)
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pkg = path.join(root, "node_modules", "@fontsource", "noto-sans-kr");
const out = path.join(root, "public", "fonts");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "noto-sans-kr"), { recursive: true });

const RANGE = { 400: "100 400", 500: "500", 700: "600 800", 900: "900" };
const keep = (c) => !/cyrillic|greek|vietnamese|math|symbols/i.test(c);
const lines = [];
let bytes = 0;
let files = 0;
for (const w of [400, 500, 700, 900]) {
  const css = fs.readFileSync(path.join(pkg, `${w}.css`), "utf8");
  const re = /\/\*([^*]*)\*\/\s*(@font-face\s*\{[^}]*\})/g;
  let m;
  while ((m = re.exec(css))) {
    if (!keep(m[1])) continue;
    const woff2 = m[2].match(/url\(([^)]+?\.woff2)\)/);
    if (!woff2) continue;
    const file = path.basename(woff2[1]);
    const src = path.join(pkg, woff2[1].replace(/^\.\//, ""));
    if (!fs.existsSync(src)) continue;
    fs.copyFileSync(src, path.join(out, "noto-sans-kr", file));
    bytes += fs.statSync(src).size;
    files += 1;
    const body = m[2]
      .replace(/src:[^;]*;/, `src: url(./noto-sans-kr/${file}) format('woff2');`)
      .replace(/font-weight:\s*\d+;/, `font-weight: ${RANGE[w]};`);
    // 용량 절감: 주석·공백을 접는다(브라우저 해석은 같다)
    lines.push(body.replace(/\s+/g, " ").replace(/ ?([{};:,]) ?/g, "$1"));
  }
}
const header = `/* Pagzly 상세페이지 폰트: Noto Sans KR(셀프 호스팅, SIL Open Font License 1.1 — 상업 이용·임베드 허용). 저작권자: The Noto Project Authors.
 * 라이선스 원문: @fontsource/noto-sans-kr/LICENSE, 정리: review/430-font-licenses.md. build-detail-fonts.mjs 가 생성한 파일이라 직접 수정하지 않는다. */\n`;
fs.writeFileSync(path.join(out, "noto-sans-kr.css"), header + lines.join("\n"));
fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify({ family: "Noto Sans KR", weights: [400, 500, 700, 900], files, totalMB: +(bytes / 1048576).toFixed(1) }, null, 1));
console.log(`[fonts] Noto Sans KR 400·500·700·900 (${files} files) · ${(bytes / 1048576).toFixed(1)}MB → public/fonts`);
