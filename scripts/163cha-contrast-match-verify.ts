/**
 * 163차 — matchCutoutWhiteBalance()의 콘트라스트(명암 대비) 매칭 확장 검증.
 * $0 합성 이미지(sharp create)만 사용, 실제 API 호출 없음.
 */
import sharp from "sharp";
import { matchCutoutWhiteBalance } from "../lib/photo-composite";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${msg}`);
  }
}

async function luminanceStats(buf: Buffer, onlyOpaque: boolean) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (onlyOpaque && data[i + 3] < 200) continue;
    const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    sum += lum;
    sumSq += lum * lum;
    n += 1;
  }
  const mean = n > 0 ? sum / n : 0;
  const variance = n > 0 ? Math.max(0, sumSq / n - mean * mean) : 0;
  return { mean, std: Math.sqrt(variance), n };
}

async function makeCheckerCutout(size: number, low: number, high: number): Promise<Buffer> {
  // 저대비(low~high 폭이 좁은) 체커보드 컷아웃, 알파 전체 불투명.
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="rgb(${low},${low},${low})"/>
    ${Array.from({ length: 8 })
      .map((_, i) =>
        i % 2 === 0
          ? `<rect x="${(i % 4) * (size / 4)}" y="${Math.floor(i / 4) * (size / 2)}" width="${size / 4}" height="${size / 2}" fill="rgb(${high},${high},${high})"/>`
          : "",
      )
      .join("")}
  </svg>`;
  return sharp(Buffer.from(svg)).png().ensureAlpha().toBuffer();
}

async function makeSolidBackdrop(size: number, low: number, high: number): Promise<Buffer> {
  // 고대비(low~high 폭이 넓은) 체커보드 배경.
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="rgb(${low},${low},${low})"/>
    <rect x="0" y="0" width="${size * 0.12}" height="${size * 0.12}" fill="rgb(${high},${high},${high})"/>
    <rect x="${size * 0.88}" y="0" width="${size * 0.12}" height="${size * 0.12}" fill="rgb(${high},${high},${high})"/>
    <rect x="0" y="${size * 0.88}" width="${size * 0.12}" height="${size * 0.12}" fill="rgb(${high},${high},${high})"/>
    <rect x="${size * 0.88}" y="${size * 0.88}" width="${size * 0.12}" height="${size * 0.12}" fill="rgb(${high},${high},${high})"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  // 케이스 1: 컷아웃은 저대비(회색 위주, 128 근방), 배경은 코너가 고대비(30 vs 220).
  const lowContrastCutout = await makeCheckerCutout(256, 118, 138);
  const highContrastBackdrop = await makeSolidBackdrop(256, 30, 220);

  const before = await luminanceStats(lowContrastCutout, true);
  const result = await matchCutoutWhiteBalance(lowContrastCutout, highContrastBackdrop);
  const after = await luminanceStats(result, true);

  assert(before.n > 20, "input cutout has enough opaque samples");
  assert(
    after.std > before.std,
    `contrast pulled toward higher-contrast backdrop (before std=${before.std.toFixed(2)}, after std=${after.std.toFixed(2)})`,
  );
  assert(
    after.std < before.std * 1.3,
    `contrast increase stays conservative/clamped (before=${before.std.toFixed(2)}, after=${after.std.toFixed(2)}, ratio=${(after.std / Math.max(before.std, 1e-6)).toFixed(2)})`,
  );

  // 케이스 2: 반대 방향 — 컷아웃이 고대비, 배경이 저대비 -> 대비가 줄어드는 방향으로 당겨져야 함.
  const highContrastCutout = await makeCheckerCutout(256, 20, 235);
  const lowContrastBackdrop = await makeSolidBackdrop(256, 120, 140);

  const before2 = await luminanceStats(highContrastCutout, true);
  const result2 = await matchCutoutWhiteBalance(highContrastCutout, lowContrastBackdrop);
  const after2 = await luminanceStats(result2, true);

  assert(
    after2.std < before2.std,
    `contrast pulled toward lower-contrast backdrop (before std=${before2.std.toFixed(2)}, after std=${after2.std.toFixed(2)})`,
  );
  assert(
    after2.std > before2.std * 0.8,
    `contrast decrease stays conservative/clamped (before=${before2.std.toFixed(2)}, after=${after2.std.toFixed(2)}, ratio=${(after2.std / Math.max(before2.std, 1e-6)).toFixed(2)})`,
  );

  // 케이스 3: 거의 단색(std가 매우 작은) 컷아웃 — 콘트라스트 보정이 불안정해지지 않아야 함(에러 없이 처리).
  const nearSolidCutout = await sharp({
    create: { width: 200, height: 200, channels: 4, background: { r: 150, g: 150, b: 150, alpha: 255 } },
  })
    .png()
    .toBuffer();
  const result3 = await matchCutoutWhiteBalance(nearSolidCutout, highContrastBackdrop);
  const meta3 = await sharp(result3).metadata();
  assert(meta3.width === 200 && meta3.height === 200, "near-solid cutout: no crash, dimensions preserved");

  // 케이스 4: 알파 보존 확인 — 투명 픽셀은 그대로 투명이어야 함.
  const partialAlphaCutout = await sharp({
    create: { width: 100, height: 100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      {
        input: await sharp({
          create: { width: 60, height: 60, channels: 4, background: { r: 200, g: 100, b: 50, alpha: 255 } },
        })
          .png()
          .toBuffer(),
        left: 20,
        top: 20,
      },
    ])
    .png()
    .toBuffer();
  const result4 = await matchCutoutWhiteBalance(partialAlphaCutout, highContrastBackdrop);
  const { data: d4, info: i4 } = await sharp(result4).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cornerIdx = 0; // (0,0) was fully transparent in source
  assert(d4[cornerIdx + 3] === 0, "fully transparent corner pixel stays alpha=0 after contrast matching");
  let centerOpaque = false;
  const cx = 50;
  const cy = 50;
  const ci = (cy * i4.width + cx) * 4;
  if (d4[ci + 3] > 200) centerOpaque = true;
  assert(centerOpaque, "product-region alpha stays opaque after contrast matching");

  // 케이스 5: 너무 작은 opaque 샘플(<20)이면 원본을 그대로 반환.
  const tinyCutout = await sharp({
    create: { width: 40, height: 40, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: { create: { width: 2, height: 2, channels: 4, background: { r: 100, g: 100, b: 100, alpha: 255 } } }, left: 0, top: 0 }])
    .png()
    .toBuffer();
  const tinyResult = await matchCutoutWhiteBalance(tinyCutout, highContrastBackdrop);
  assert(tinyResult.equals(tinyCutout), "tiny opaque-sample cutout (<20px) returned unchanged");

  if (process.exitCode === 1) {
    console.error("\n163차 contrast-match verification FAILED");
    process.exit(1);
  } else {
    console.log("\n163차 contrast-match verification PASSED (all assertions ok)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
