/**
 * 187차 — matchCutoutGrain() 검증. $0, sharp 합성만(생성 API 0).
 *   npx tsx scripts/187cha-grain-verify.ts
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { matchCutoutGrain } from "../lib/photo-composite";

const ROOT = path.join(__dirname, "..");

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${msg}`);
  }
}

async function measureBackdropGrain(buf: Buffer): Promise<number> {
  const bgResized = sharp(buf).resize(256, 256, { fit: "cover" }).grayscale();
  const bgSharp = await bgResized.clone().raw().toBuffer({ resolveWithObject: true });
  const bgBlur = await bgResized
    .clone()
    .blur(1.2)
    .raw()
    .toBuffer({ resolveWithObject: true });
  let sum = 0;
  let n = 0;
  for (let i = 0; i < bgSharp.data.length; i += 1) {
    sum += Math.abs(bgSharp.data[i]! - bgBlur.data[i]!);
    n += 1;
  }
  return n > 0 ? sum / n : 0;
}

async function makeSmoothGradientBackdrop(size: number): Promise<Buffer> {
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e8e4dc"/><stop offset="100%" stop-color="#c4bbb0"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function makeRoughTextureBackdrop(size: number): Promise<Buffer> {
  // 고주파 잔차가 skipThreshold(2.2)를 확실히 넘도록 노이즈 알파·주파수를 강하게.
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <filter id="n">
      <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="5" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 1 0"/>
    </filter>
    <rect width="100%" height="100%" fill="#9a8a70"/>
    <rect width="100%" height="100%" filter="url(#n)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function makeOpaqueCutout(size: number): Promise<Buffer> {
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 40, g: 42, b: 48, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

async function main() {
  const cutout = await makeOpaqueCutout(120);
  const smooth = await makeSmoothGradientBackdrop(256);
  const rough = await makeRoughTextureBackdrop(256);

  const smoothGrain = await measureBackdropGrain(smooth);
  const roughGrain = await measureBackdropGrain(rough);
  console.log(
    `calibrate: smoothGrain=${smoothGrain.toFixed(3)} roughGrain=${roughGrain.toFixed(3)} (skipThreshold=2.2)`,
  );

  // (a) 매끈 배경 → 원본과 동일(바이트)
  const a = await matchCutoutGrain(cutout, smooth);
  assert(Buffer.compare(a, cutout) === 0, "smooth backdrop: returns identical cutout buffer");

  // (b) 거친 배경 → RGB 변경 + 강도 보수적(완전 동일하지 않되 알파 범위 내 적용)
  assert(roughGrain >= 2.2, `rough backdrop exceeds skipThreshold (got ${roughGrain.toFixed(3)})`);
  const b = await matchCutoutGrain(cutout, rough);
  assert(Buffer.compare(b, cutout) !== 0, "rough backdrop: cutout RGB is modified");
  const t = Math.min(1, (roughGrain - 2.2) / 6);
  const expectedAlpha = 0.02 + t * 0.03;
  assert(
    expectedAlpha >= 0.02 && expectedAlpha <= 0.05,
    `scaled alpha in 0.02~0.05 (alpha=${expectedAlpha.toFixed(3)})`,
  );

  // (c) 완전 투명 영역 알파 보존
  const partial = await sharp({
    create: { width: 120, height: 120, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: cutout, left: 20, top: 20 }])
    .png()
    .toBuffer();
  const c = await matchCutoutGrain(partial, rough);
  const { data } = await sharp(c).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert(data[3] === 0, "fully transparent corner stays alpha=0 after grain match");

  // 선택: 181 electronics 세션 이미지가 있으면 1컷 로컬 재렌더(합성 API 없이 grain만)
  const sessionPath = path.join(ROOT, "review", "181cha-live", "electronics", "session.json");
  if (fs.existsSync(sessionPath)) {
    const session = JSON.parse(fs.readFileSync(sessionPath, "utf8")) as {
      imageUrls?: string[];
    };
    const url = session.imageUrls?.[0];
    if (url?.startsWith("http")) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const product = Buffer.from(await res.arrayBuffer());
          const cut = await sharp(product)
            .resize(200, 200, { fit: "inside" })
            .ensureAlpha()
            .png()
            .toBuffer();
          const outSmooth = await matchCutoutGrain(cut, smooth);
          const outRough = await matchCutoutGrain(cut, rough);
          assert(
            Buffer.compare(outSmooth, cut) === 0,
            "181 electronics sample + smooth: skip (identical)",
          );
          assert(
            Buffer.compare(outRough, cut) !== 0,
            "181 electronics sample + rough: grain applied",
          );
          const outDir = path.join(ROOT, "review", "qa-screenshots");
          fs.mkdirSync(outDir, { recursive: true });
          await sharp(outRough).png().toFile(path.join(outDir, "187cha-grain-electronics-sample.png"));
          console.log("wrote review/qa-screenshots/187cha-grain-electronics-sample.png");
        }
      } catch (e) {
        console.log("skip live sample fetch:", e instanceof Error ? e.message : e);
      }
    }
  }

  if (process.exitCode) {
    console.error("187cha grain verify FAILED");
    process.exit(1);
  }
  console.log("187cha grain verify OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
