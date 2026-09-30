/**
 * 285차 — 수집한 긴 이미지 → 레이아웃 판독용 시트 (커밋 안 함).
 * 각 제품: 상세 이미지(폭 ≥ 700, 중복 제거)를 폭 260으로 세로 연결 → 높이 2200 단위 컬럼으로 잘라 가로 배치.
 * 좌측에 5% 폭 간격 눈금(가는 선) — 폰트 높이를 "폭 대비 %"로 읽기 위함.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const BENCH = path.join(__dirname, "..", "review", "285cha-bench");
const COL_W = 260;
const COL_H = 2200;
const GAP = 16;

function rulerSvg(w: number, h: number) {
  const step = w * 0.05;
  let lines = "";
  for (let y = 0; y < h; y += step) lines += `<line x1="0" y1="${y}" x2="6" y2="${y}" stroke="#f00" stroke-width="1"/>`;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${lines}</svg>`);
}

async function build(dir: string) {
  const metaPath = path.join(dir, "meta.json");
  if (!fs.existsSync(metaPath)) return;
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as { images: { file: string; w: number; h: number }[] };
  const imgs = meta.images.filter((i) => i.w >= 700 && i.h >= 900);
  const seen = new Set<string>();
  const strips: Buffer[] = [];
  let total = 0;
  for (const im of imgs) {
    const key = `${im.w}x${im.h}`;
    if (seen.has(key) && im.h === 2170) continue;
    seen.add(key);
    const b = await sharp(path.join(dir, im.file), { limitInputPixels: false }).resize({ width: COL_W }).png().toBuffer();
    strips.push(b);
    total += Math.round((im.h * COL_W) / im.w);
    if (total > COL_H * 10) break;
  }
  if (!strips.length) return;
  const tall = await sharp({ create: { width: COL_W, height: total, channels: 3, background: "#fff" } })
    .composite(
      await (async () => {
        let y = 0;
        const out = [];
        for (const s of strips) {
          const m = await sharp(s).metadata();
          out.push({ input: s, top: y, left: 0 });
          y += m.height ?? 0;
        }
        return out;
      })(),
    )
    .png()
    .toBuffer();
  const cols = Math.ceil(total / COL_H);
  const sheetW = cols * (COL_W + GAP);
  const comps = [];
  for (let c = 0; c < cols; c++) {
    const top = c * COL_H;
    const h = Math.min(COL_H, total - top);
    const piece = await sharp(tall).extract({ left: 0, top, width: COL_W, height: h }).png().toBuffer();
    comps.push({ input: piece, top: 0, left: c * (COL_W + GAP) });
    comps.push({ input: rulerSvg(COL_W, h), top: 0, left: c * (COL_W + GAP) });
  }
  await sharp({ create: { width: sheetW, height: COL_H, channels: 3, background: "#ddd" } })
    .composite(comps)
    .png()
    .toFile(path.join(dir, "sheet.png"));
  console.log(path.relative(BENCH, dir), `cols=${cols} totalPx@260=${total}`);
}

async function main() {
  for (const key of fs.readdirSync(BENCH)) {
    const kd = path.join(BENCH, key);
    if (!fs.statSync(kd).isDirectory()) continue;
    for (const n of fs.readdirSync(kd)) {
      const d = path.join(kd, n);
      if (fs.statSync(d).isDirectory()) await build(d).catch((e) => console.log(key, n, String(e).slice(0, 100)));
    }
  }
}
main();
