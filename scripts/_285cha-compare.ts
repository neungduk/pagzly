/** 285차 — before/after 스크린샷 나란히 (커밋 안 함). */
import path from "path";
import sharp from "sharp";

const R = path.join(__dirname, "..", "review");

async function pair(name: string, out: string, maxH = 5200) {
  const a = path.join(R, "285cha-before", name);
  const b = path.join(R, "285cha-after", name);
  const [ma, mb] = await Promise.all([sharp(a).metadata(), sharp(b).metadata()]);
  const W = Math.max(ma.width ?? 0, mb.width ?? 0);
  const H = Math.min(Math.max(ma.height ?? 0, mb.height ?? 0), maxH);
  const crop = async (f: string, h: number) =>
    sharp(f).extract({ left: 0, top: 0, width: (await sharp(f).metadata()).width!, height: Math.min(h, H) }).png().toBuffer();
  await sharp({ create: { width: W * 2 + 24, height: H, channels: 3, background: "#888" } })
    .composite([
      { input: await crop(a, ma.height!), left: 0, top: 0 },
      { input: await crop(b, mb.height!), left: W + 24, top: 0 },
    ])
    .png()
    .toFile(path.join(R, "285cha-after", out));
  console.log(out, W * 2 + 24, H);
}

(async () => {
  await pair("live-mock-electronics-390.png", "compare-live-electronics-390.png");
  await pair("live-mock-cosmetics-300.png", "compare-live-cosmetics-300.png");
  await pair("export-mock-food-390.png", "compare-export-food-390.png");
  await pair("live-session279-390.png", "compare-live-session279-390.png", 9000);
})();
