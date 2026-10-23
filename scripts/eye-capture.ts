/**
 * 444차 1 — 정적 export 눈 검수 캡처(서버·외부 네트워크 없음). 합성 픽스처의 export HTML을 Playwright route로 서빙해 연다:
 * 페이지 HTML·/qa-fixtures·/fonts는 저장소 파일로 채우고 Google Fonts CSS는 로컬 Noto Sans KR로 대신 채운다(그 밖의 요청은 모두 막는다).
 * 폰트 파일은 `node scripts/build-detail-fonts.mjs`가 만든 public/fonts(gitignore)를 쓴다 — 없으면 시스템 폴백이라 글자 폭 판단이 달라진다.
 *   npx tsx scripts/eye-capture.ts [--widths=390,750] [--out=review/444-verify/eye] [--only=id,id] [--first-only]
 * 결과: <out>/<픽스처>/w390/sheet-NN.png(844px 화면 3장을 가로로), <out>/first-screens-18.png(첫 화면 접촉 시트).
 * 브라우저 리비전이 안 맞으면 PLAYWRIGHT_BROWSERS_PATH를 설치된 chromium 링크 폴더로 바꿔 실행한다(저장소 변경 없음).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { corpus, exportHtmlOf } from "./design-corpus";
import { launch, openHtml } from "./eye-lib";

const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const WIDTHS = arg("widths", "390,750").split(",").map(Number);
const OUT = arg("out", "review/444-verify/eye");
const ONLY = arg("only", "").split(",").filter(Boolean);
const FIRST_ONLY = process.argv.includes("--first-only");
const H = 844;

async function main() {
  const browser = await launch();
  const firsts: Array<{ id: string; buf: Buffer }> = [];
  for (const [id, file] of corpus({ only: ONLY })) {
    const html = exportHtmlOf(file);
    for (const W of WIDTHS) {
      const { page, close } = await openHtml(browser, html, W);
      const total = await page.evaluate("document.documentElement.scrollHeight") as number;
      const n = Math.ceil(total / H);
      const dir = path.join(OUT, id, `w${W}`);
      fs.mkdirSync(dir, { recursive: true });
      const slices: Buffer[] = [];
      for (let i = 0; i < (FIRST_ONLY ? 1 : n); i++) {
        slices.push(await page.screenshot({ clip: { x: 0, y: i * H, width: W, height: Math.min(H, total - i * H) }, fullPage: true }));
      }
      if (W === 390) firsts.push({ id, buf: slices[0]! });
      if (!FIRST_ONLY) {
        const per = W <= 500 ? 3 : 2;
        for (let s = 0; s * per < slices.length; s++) {
          const group = slices.slice(s * per, s * per + per);
          const gap = 8;
          const composite = group.map((input, k) => ({ input, left: k * (W + gap), top: 0 }));
          await sharp({ create: { width: group.length * W + (group.length - 1) * gap, height: H, channels: 3, background: "#7a7a7a" } })
            .composite(composite)
            .png()
            .toFile(path.join(dir, `sheet-${String(s + 1).padStart(2, "0")}.png`));
        }
      }
      console.log(`${id} w${W}: ${total}px = ${n}화면`);
      await close();
    }
  }
  if (firsts.length && !ONLY.length) {
    const cols = 6;
    const scale = 0.5;
    const tw = Math.round(390 * scale);
    const th = Math.round(H * scale);
    const rows = Math.ceil(firsts.length / cols);
    const tiles = await Promise.all(firsts.map(async (f, i) => ({ input: await sharp(f.buf).resize(tw, th).png().toBuffer(), left: (i % cols) * (tw + 6), top: Math.floor(i / cols) * (th + 6) })));
    fs.mkdirSync(OUT, { recursive: true });
    await sharp({ create: { width: cols * (tw + 6), height: rows * (th + 6), channels: 3, background: "#7a7a7a" } }).composite(tiles).png().toFile(path.join(OUT, "first-screens-18.png"));
    fs.writeFileSync(path.join(OUT, "first-screens-18.txt"), firsts.map((f, i) => `${i + 1}행${Math.floor(i / cols) + 1}열${(i % cols) + 1}: ${f.id}`).join("\n"));
  }
  await browser.close();
}
void main();
