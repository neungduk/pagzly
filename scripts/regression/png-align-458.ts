/**
 * 회귀 — 458차 1 PNG 대조 정렬. 같은 그림이 세로로 12px 밀려 있으면(앱 PNG 재레이아웃의 누적 밀림) 원 상관은 낮고 정렬 후 상관은 ≥0.95여야 한다. 둘 다 단색인 꼬리 구간은 같은 것으로 본다.
 * 서버가 필요한 실제 대조는 pc-verify `--full`의 dev 단계(png-compare).
 */
import sharp from "sharp";
import { compareImages } from "../png-compare";

export const name = "PNG 대조 정렬 — 12px 밀린 같은 그림은 정렬 후 상관 ≥0.95·단색 꼬리 구간은 같음";

const W = 860, H = 1700;
function art(offset: number): Buffer {
  const px = Buffer.alloc(W * H * 3, 250);
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let i = 0; i < 260; i += 1) {
    const x0 = Math.floor(rnd() * (W - 200)), y0 = Math.floor(rnd() * (H - 60)) + offset, w = 40 + Math.floor(rnd() * 160), h = 6 + Math.floor(rnd() * 24), v = Math.floor(rnd() * 200);
    for (let y = Math.max(0, y0); y < Math.min(H, y0 + h); y += 1) for (let x = x0; x < x0 + w; x += 1) { const o = (y * W + x) * 3; px[o] = v; px[o + 1] = v; px[o + 2] = v; }
  }
  return px;
}
const png = (raw: Buffer): Promise<Buffer> => sharp(raw, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const app = await png(art(0));
  const shot = await png(art(12));
  const r = await compareImages(app, shot, W);
  const full = r.bands.filter((b) => b.y + 420 <= H - 100);
  const rawLow = full.filter((b) => b.corr < 0.9).length;
  const alignedLow = full.filter((b) => b.alignedCorr < 0.95).length;
  if (rawLow === 0) fails.push("합성 밀림 그림의 원 상관이 낮아지지 않음(검사 전제 깨짐)");
  if (alignedLow > 0) fails.push(`정렬 후에도 상관 <0.95 구간 ${alignedLow}개`);
  const flat = await sharp({ create: { width: W, height: 500, channels: 3, background: "#FAF8F3" } }).png().toBuffer();
  const flat2 = await sharp({ create: { width: W, height: 500, channels: 3, background: "#F8F6F1" } }).png().toBuffer();
  const rf = await compareImages(flat, flat2, W);
  if (rf.bands.some((b) => b.corr < 0.99)) fails.push("단색 구간 상관이 1이 아님");
  return fails;
}
