/**
 * 447차 1 — PC 눈 검수 캡처(pc-verify 8단계). 저장 세션(있으면) + 합성 픽스처 21종을 390·750폭 export로 열어
 * 844px 단위 시트(390은 3장·750은 2장 가로)와 첫 화면 접촉 시트(전 세션·픽스처의 첫 화면을 한 장에)를 저장한다.
 *   npx tsx scripts/pc-verify-eye.ts [--out=review/pc-verify-날짜/eye] [--widths=390,750] [--only=id,id] [--offline]
 * 사진은 PC의 실제 주소를 불러온다(--offline이면 차단). 폰트는 public/fonts(없으면 `node scripts/build-detail-fonts.mjs`).
 */
import { assertHeavyEntry } from "./lib/heavy-guard";
assertHeavyEntry("pc-verify-eye", typeof module !== "undefined" ? require.main === module : true);
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { launch, openHtml } from "./eye-lib";
import { findSessions } from "./pc-sessions-find";

const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const OUT = arg("out", "review/pc-verify/eye");
const WIDTHS = arg("widths", "390,750").split(",").map(Number);
const ONLY = arg("only", "").split(",").filter(Boolean);
const OFFLINE = process.argv.includes("--offline");
const H = 844;

async function main() {
  const { corpus, exportHtmlOf } = await import("./design-corpus");
  const synth = corpus().filter(([id]) => id.startsWith("fx-"));
  const sessions = findSessions();
  const all: Array<[string, string]> = [...sessions, ...synth].filter(([id]) => !ONLY.length || ONLY.includes(id));
  const browser = await launch();
  const firsts: Array<{ id: string; buf: Buffer }> = [];
  for (const [id, file] of all) {
    const html = exportHtmlOf(file);
    for (const W of WIDTHS) {
      const ex = await openHtml(browser, html, W, undefined, !OFFLINE);
      await ex.page.addStyleTag({ content: ".pagzly-anchor-nav{display:none!important}" });
      const total = (await ex.page.evaluate("document.documentElement.scrollHeight")) as number;
      const n = Math.ceil(total / H);
      const slices: Buffer[] = [];
      for (let i = 0; i < n; i++) slices.push(await ex.page.screenshot({ clip: { x: 0, y: i * H, width: W, height: Math.min(H, total - i * H) }, fullPage: true }));
      const dir = path.join(OUT, id, `w${W}`);
      fs.mkdirSync(dir, { recursive: true });
      const per = W <= 500 ? 3 : 2;
      for (let s = 0; s * per < slices.length; s++) {
        const group = slices.slice(s * per, s * per + per);
        await sharp({ create: { width: group.length * W + (group.length - 1) * 8, height: H, channels: 3, background: "#7a7a7a" } }).composite(group.map((input, k) => ({ input, left: k * (W + 8), top: 0 }))).png().toFile(path.join(dir, `sheet-${String(s + 1).padStart(2, "0")}.png`));
      }
      if (W === 390 && slices[0]) firsts.push({ id, buf: slices[0] });
      await ex.close();
      console.log(`${id} w${W}: ${n}화면`);
    }
  }
  await browser.close();
  // 첫 화면 접촉 시트: 가로 6칸, 칸 폭 195(절반 축소)
  if (firsts.length) {
    const cols = 6, cw = 195, ch = 422, gap = 6;
    const rows = Math.ceil(firsts.length / cols);
    const tiles = await Promise.all(firsts.map(async (f, i) => ({ input: await sharp(f.buf).resize({ width: cw }).png().toBuffer(), left: (i % cols) * (cw + gap), top: Math.floor(i / cols) * (ch + gap) })));
    fs.mkdirSync(OUT, { recursive: true });
    await sharp({ create: { width: cols * (cw + gap), height: rows * (ch + gap), channels: 3, background: "#7a7a7a" } }).composite(tiles).png().toFile(path.join(OUT, "contact-first-screens.png"));
    fs.writeFileSync(path.join(OUT, "contact-first-screens.txt"), firsts.map((f, i) => `${Math.floor(i / cols) + 1}행 ${(i % cols) + 1}열: ${f.id}`).join("\n") + "\n");
  }
}
void main();
