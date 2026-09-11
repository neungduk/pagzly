/**
 * 164차 — matchCutoutSharpness() 검증. $0, sharp 합성 이미지만 사용(실측 API 호출 없음).
 */
import sharp from "sharp";
import { matchCutoutSharpness } from "../lib/photo-composite";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${msg}`);
  }
}

async function edgeIntensity(buf: Buffer): Promise<number> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const gray = new Uint8Array(w * h);
  const alpha = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i += 1) {
    const o = i * 4;
    gray[i] = Math.round(0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]);
    alpha[i] = data[o + 3];
  }
  let sum = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y += 2) {
    for (let x = 1; x < w - 1; x += 2) {
      const i = y * w + x;
      if (
        !(alpha[i] > 250 && alpha[i - 1] > 250 && alpha[i + 1] > 250 && alpha[i - w] > 250 && alpha[i + w] > 250)
      )
        continue;
      const gx = gray[i + 1] - gray[i - 1];
      const gy = gray[i + w] - gray[i - w];
      sum += Math.sqrt(gx * gx + gy * gy);
      n += 1;
    }
  }
  return n > 0 ? sum / n : 0;
}

async function makeSharpCheckerCutout(size: number): Promise<Buffer> {
  // 고주파(체커보드) 컷아웃 — 선명도 지표가 높게 나오도록.
  const cell = 8;
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#101010"/>
    ${Array.from({ length: Math.floor(size / cell) })
      .map((_, row) =>
        Array.from({ length: Math.floor(size / cell) })
          .map((__, col) =>
            (row + col) % 2 === 0
              ? `<rect x="${col * cell}" y="${row * cell}" width="${cell}" height="${cell}" fill="#f0f0f0"/>`
              : "",
          )
          .join(""),
      )
      .join("")}
  </svg>`;
  return sharp(Buffer.from(svg)).png().ensureAlpha().toBuffer();
}

async function makeSmoothGradientBackdrop(size: number): Promise<Buffer> {
  // 저주파(부드러운 그라디언트) 배경 — 소프트 포커스를 시뮬레이션.
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#dcdcdc"/><stop offset="100%" stop-color="#8a8a8a"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;
  const rendered = await sharp(Buffer.from(svg)).png().toBuffer();
  return sharp(rendered).blur(6).png().toBuffer();
}

async function makeSharpBackdrop(size: number): Promise<Buffer> {
  // 배경도 컷아웃만큼 고주파 — 매칭 불필요 케이스.
  return makeSharpCheckerCutout(size);
}

async function main() {
  // 케이스 1: 선명한 컷아웃 + 부드러운 배경 -> 블러가 적용되어 선명도가 낮아져야 함(과하지 않게).
  const sharpCutout = await makeSharpCheckerCutout(200);
  const smoothBackdrop = await makeSmoothGradientBackdrop(256);

  const before = await edgeIntensity(sharpCutout);
  const result = await matchCutoutSharpness(sharpCutout, smoothBackdrop);
  const after = await edgeIntensity(result);

  assert(before > 10, "synthetic checker cutout has high baseline sharpness");
  assert(
    after < before,
    `sharp cutout + soft backdrop: sharpness reduced (before=${before.toFixed(1)}, after=${after.toFixed(1)})`,
  );
  assert(
    after > before * 0.4,
    `blur stays conservative — does not destroy product detail (before=${before.toFixed(1)}, after=${after.toFixed(1)}, ratio=${(after / before).toFixed(2)})`,
  );

  // 케이스 2: 배경도 이미 선명 -> 변경 없어야 함(원본과 동일 버퍼 반환 또는 최소한 크게 달라지지 않음).
  const sharpBackdrop = await makeSharpBackdrop(256);
  const result2 = await matchCutoutSharpness(sharpCutout, sharpBackdrop);
  const after2 = await edgeIntensity(result2);
  assert(
    after2 > before * 0.85,
    `sharp cutout + sharp backdrop: no meaningful blur applied (before=${before.toFixed(1)}, after=${after2.toFixed(1)})`,
  );

  // 케이스 3: 알파 보존 확인 — 완전 투명 픽셀은 그대로 유지.
  const partialAlphaCutout = await sharp({
    create: { width: 120, height: 120, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: await makeSharpCheckerCutout(80), left: 20, top: 20 }])
    .png()
    .toBuffer();
  const result3 = await matchCutoutSharpness(partialAlphaCutout, smoothBackdrop);
  const { data: d3 } = await sharp(result3).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert(d3[3] === 0, "fully transparent corner pixel stays alpha=0 after sharpness matching");

  // 케이스 4: 작은/평탄한 컷아웃(선명도 신호 부족) -> 크래시 없이 원본 반환.
  const flatCutout = await sharp({
    create: { width: 30, height: 30, channels: 4, background: { r: 150, g: 150, b: 150, alpha: 255 } },
  })
    .png()
    .toBuffer();
  const result4 = await matchCutoutSharpness(flatCutout, smoothBackdrop);
  assert(result4.equals(flatCutout), "flat/low-signal cutout returned unchanged (insufficient sharpness signal)");

  if (process.exitCode === 1) {
    console.error("\n164차 sharpness-match verification FAILED");
    process.exit(1);
  } else {
    console.log("\n164차 sharpness-match verification PASSED (all assertions ok)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
