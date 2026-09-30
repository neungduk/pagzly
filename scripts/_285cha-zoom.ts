/**
 * 285차 — 폰트 비율 측정용 확대 컷 (커밋 안 함).
 *   npx tsx scripts/_285cha-zoom.ts <key/n> <chunkIndex...>
 * 폭 520으로 정규화한 세로 스트립을 1300px 단위로 잘라 좌측에 1%(짧은)/5%(긴) 폭 눈금 표시.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const BENCH = path.join(__dirname, "..", "review", "285cha-bench");
const W = 520;
const H = 1300;

async function main() {
  const [rel, ...idx] = process.argv.slice(2);
  const dir = path.join(BENCH, rel);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8")) as { images: { file: string; w: number; h: number }[] };
  const imgs = meta.images.filter((i) => i.w >= 700 && i.h >= 900);
  const strips: { b: Buffer; h: number }[] = [];
  let total = 0;
  for (const im of imgs) {
    const b = await sharp(path.join(dir, im.file), { limitInputPixels: false }).resize({ width: W }).png().toBuffer();
    const h = Math.round((im.h * W) / im.w);
    strips.push({ b, h });
    total += h;
    if (total > H * 40) break;
  }
  const tall = await sharp({ create: { width: W, height: total, channels: 3, background: "#fff" }, limitInputPixels: false })
    .composite(strips.map((s, i) => ({ input: s.b, top: strips.slice(0, i).reduce((a, x) => a + x.h, 0), left: 0 })))
    .png()
    .toBuffer();
  const chunks = Math.ceil(total / H);
  console.log(rel, "chunks", chunks);
  const want = idx.length ? idx.map(Number) : [0, 1];
  for (const c of want) {
    if (c >= chunks) continue;
    const top = c * H;
    const h = Math.min(H, total - top);
    let svg = "";
    for (let p = 0; p * W * 0.01 < h; p++) {
      const y = p * W * 0.01;
      const len = p % 5 === 0 ? 14 : 5;
      svg += `<line x1="0" y1="${y}" x2="${len}" y2="${y}" stroke="#f00" stroke-width="1"/>`;
    }
    const piece = await sharp(tall, { limitInputPixels: false }).extract({ left: 0, top, width: W, height: h }).png().toBuffer();
    await sharp(piece)
      .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}">${svg}</svg>`), top: 0, left: 0 }])
      .png()
      .toFile(path.join(dir, `zoom-${c}.png`));
  }
}
main();
