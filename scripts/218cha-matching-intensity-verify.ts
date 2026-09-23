/**
 * 218차 — 매칭 강도 보강 검증 (API 0, 순수 함수만).
 *   npx tsx scripts/218cha-matching-intensity-verify.ts
 *
 * - 극단 색역: 구(pre-218) 상수 vs 현 프로덕션 matchCutoutWhiteBalance 거리 비교 (≥30% 축소)
 * - 회귀: 유사색 조합에서 채널 오버슈트(역전) 없음
 * - 그레인: 거친 배경에서 알파 0.03~0.07
 */
import sharp from "sharp";
import {
  matchCutoutGrain,
  matchCutoutWhiteBalance,
} from "../lib/photo-composite";

type Rgb = { r: number; g: number; b: number };
type WbMixes = {
  colorMix: number;
  lumMix: number;
  contrastMix: number;
  scaleMin: number;
  scaleMax: number;
  contrastMin: number;
  contrastMax: number;
};

/** 218차 이전 프로덕션 상수 */
const LEGACY_MIXES: WbMixes = {
  colorMix: 0.22,
  lumMix: 0.14,
  contrastMix: 0.16,
  scaleMin: 0.82,
  scaleMax: 1.18,
  contrastMin: 0.88,
  contrastMax: 1.15,
};

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${msg}`);
  }
}

function luminance(c: Rgb): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

function distRgb(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function sampleCornerAverage(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
): Rgb {
  // lib/photo-composite.ts sampleCornerAverage와 동일 (patch=48, stride 2)
  const patch = 48;
  const origins: Array<[number, number]> = [
    [0, 0],
    [width - patch, 0],
    [0, height - patch],
    [width - patch, height - patch],
  ];
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (const [ox, oy] of origins) {
    for (let y = oy; y < oy + patch; y += 2) {
      for (let x = ox; x < ox + patch; x += 2) {
        const i = (y * width + x) * channels;
        r += data[i]!;
        g += data[i + 1]!;
        b += data[i + 2]!;
        n += 1;
      }
    }
  }
  return { r: r / n, g: g / n, b: b / n };
}

function sampleCornerLuminanceStats(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
): { mean: number; std: number } {
  const patch = 48;
  const origins: Array<[number, number]> = [
    [0, 0],
    [width - patch, 0],
    [0, height - patch],
    [width - patch, height - patch],
  ];
  let sum = 0;
  let sum2 = 0;
  let n = 0;
  for (const [ox, oy] of origins) {
    for (let y = oy; y < oy + patch; y += 2) {
      for (let x = ox; x < ox + patch; x += 2) {
        const i = (y * width + x) * channels;
        const lum = luminance({ r: data[i]!, g: data[i + 1]!, b: data[i + 2]! });
        sum += lum;
        sum2 += lum * lum;
        n += 1;
      }
    }
  }
  const mean = sum / Math.max(n, 1);
  const std = Math.sqrt(Math.max(0, sum2 / Math.max(n, 1) - mean * mean));
  return { mean, std };
}

/**
 * matchCutoutWhiteBalance와 동일 구조 — mixes만 주입 (구버전 상수 재현용).
 * 프로덕션 로직 변경이 아니라 테스트에서 이전 상수를 한 번 더 돌리기 위함.
 */
async function matchCutoutWhiteBalanceWithMixes(
  cutout: Buffer,
  backdrop: Buffer,
  mixes: WbMixes,
): Promise<Buffer> {
  const bg = await sharp(backdrop)
    .resize(256, 256, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const target = sampleCornerAverage(bg.data, bg.info.width, bg.info.height, bg.info.channels);
  const targetContrast = sampleCornerLuminanceStats(
    bg.data,
    bg.info.width,
    bg.info.height,
    bg.info.channels,
  );

  const { data, info } = await sharp(cutout).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let sn = 0;
  let sLum = 0;
  let sLum2 = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 200) continue;
    sr += data[i]!;
    sg += data[i + 1]!;
    sb += data[i + 2]!;
    sn += 1;
    const lum = luminance({ r: data[i]!, g: data[i + 1]!, b: data[i + 2]! });
    sLum += lum;
    sLum2 += lum * lum;
  }
  if (sn < 20) return cutout;
  const src = { r: sr / sn, g: sg / sn, b: sb / sn };
  const srcLumMean = sLum / sn;
  const srcLumStd = Math.sqrt(Math.max(0, sLum2 / sn - srcLumMean * srcLumMean));
  const { colorMix, lumMix, contrastMix } = mixes;
  const scaleR = 1 - colorMix + colorMix * (target.r / Math.max(src.r, 8));
  const scaleG = 1 - colorMix + colorMix * (target.g / Math.max(src.g, 8));
  const scaleB = 1 - colorMix + colorMix * (target.b / Math.max(src.b, 8));
  const lumScale =
    1 - lumMix + lumMix * (luminance(target) / Math.max(luminance(src), 8));
  const clampScale = (s: number) => Math.max(mixes.scaleMin, Math.min(mixes.scaleMax, s));
  const rawContrastRatio =
    srcLumStd > 4 ? targetContrast.std / Math.max(srcLumStd, 4) : 1;
  const contrastScale = 1 - contrastMix + contrastMix * rawContrastRatio;
  const clampContrast = (s: number) =>
    Math.max(mixes.contrastMin, Math.min(mixes.contrastMax, s));
  const finalContrastScale = clampContrast(contrastScale);

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const r1 = srcLumMean + (data[i]! - srcLumMean) * finalContrastScale;
    const g1 = srcLumMean + (data[i + 1]! - srcLumMean) * finalContrastScale;
    const b1 = srcLumMean + (data[i + 2]! - srcLumMean) * finalContrastScale;
    data[i] = Math.max(
      0,
      Math.min(255, Math.round(r1 * clampScale(scaleR) * clampScale(lumScale))),
    );
    data[i + 1] = Math.max(
      0,
      Math.min(255, Math.round(g1 * clampScale(scaleG) * clampScale(lumScale))),
    );
    data[i + 2] = Math.max(
      0,
      Math.min(255, Math.round(b1 * clampScale(scaleB) * clampScale(lumScale))),
    );
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function meanOpaqueRgb(buf: Buffer): Promise<Rgb & { n: number }> {
  const { data } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 200) continue;
    r += data[i]!;
    g += data[i + 1]!;
    b += data[i + 2]!;
    n += 1;
  }
  return { r: r / Math.max(n, 1), g: g / Math.max(n, 1), b: b / Math.max(n, 1), n };
}

async function backdropCornerMean(buf: Buffer): Promise<Rgb> {
  const bg = await sharp(buf)
    .resize(256, 256, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return sampleCornerAverage(bg.data, bg.info.width, bg.info.height, bg.info.channels);
}

async function measureBackdropGrain(buf: Buffer): Promise<number> {
  const bgResized = sharp(buf).resize(256, 256, { fit: "cover" }).grayscale();
  const bgSharp = await bgResized.clone().raw().toBuffer({ resolveWithObject: true });
  const bgBlur = await bgResized.clone().blur(1.2).raw().toBuffer({ resolveWithObject: true });
  let sum = 0;
  let n = 0;
  for (let i = 0; i < bgSharp.data.length; i += 1) {
    sum += Math.abs(bgSharp.data[i]! - bgBlur.data[i]!);
    n += 1;
  }
  return n > 0 ? sum / n : 0;
}

/** 216차 유사 — 어두운 중립 배경 */
async function darkNeutralBackdrop(size: number): Promise<Buffer> {
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: { r: 40, g: 40, b: 45 },
    },
  })
    .png()
    .toBuffer();
}

/** 파랑/주황 대각 그라디언트 컷아웃 — 극단 스튜디오 색역 */
async function blueOrangeCutout(size: number): Promise<Buffer> {
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ff7a18"/>
      <stop offset="100%" stop-color="#1a4cff"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).ensureAlpha().png().toBuffer();
}

async function smoothWarmGradient(size: number): Promise<Buffer> {
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e8e4dc"/><stop offset="100%" stop-color="#c4bbb0"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function softBeigeCutout(size: number): Promise<Buffer> {
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 210, g: 200, b: 185, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

async function roughTexture(size: number): Promise<Buffer> {
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

function channelOvershoots(before: Rgb, after: Rgb, target: Rgb, eps = 4): string | null {
  const channels: Array<keyof Rgb> = ["r", "g", "b"];
  for (const c of channels) {
    const b = before[c];
    const a = after[c];
    const t = target[c];
    if (b <= t && a > t + eps) return `${c}: before=${b.toFixed(1)} target=${t.toFixed(1)} after=${a.toFixed(1)} (past target+)`;
    if (b >= t && a < t - eps) return `${c}: before=${b.toFixed(1)} target=${t.toFixed(1)} after=${a.toFixed(1)} (past target-)`;
  }
  return null;
}

async function main() {
  console.log("[218] matching intensity verify — paid API: 0");

  // --- 1) 극단 색역: legacy mixes vs production (218) ---
  const darkBg = await darkNeutralBackdrop(256);
  const extremeCut = await blueOrangeCutout(120);
  const bgMean = await backdropCornerMean(darkBg);
  const beforeMean = await meanOpaqueRgb(extremeCut);

  const legacyOut = await matchCutoutWhiteBalanceWithMixes(extremeCut, darkBg, LEGACY_MIXES);
  const prodOut = await matchCutoutWhiteBalance(extremeCut, darkBg);
  const legacyMean = await meanOpaqueRgb(legacyOut);
  const prodMean = await meanOpaqueRgb(prodOut);

  const distBefore = distRgb(beforeMean, bgMean);
  const distLegacy = distRgb(legacyMean, bgMean);
  const distProd = distRgb(prodMean, bgMean);
  const reduction = (distLegacy - distProd) / Math.max(distLegacy, 1e-6);

  console.log(
    `[218] extreme WB dist before=${distBefore.toFixed(2)} legacy=${distLegacy.toFixed(2)} prod=${distProd.toFixed(2)} reduction=${(reduction * 100).toFixed(1)}%`,
  );
  assert(distLegacy < distBefore, `legacy WB reduces distance (${distLegacy.toFixed(2)} < ${distBefore.toFixed(2)})`);
  assert(distProd < distLegacy, `prod WB closer than legacy (${distProd.toFixed(2)} < ${distLegacy.toFixed(2)})`);
  assert(
    reduction >= 0.3,
    `prod reduces remaining distance vs legacy by ≥30% (got ${(reduction * 100).toFixed(1)}%)`,
  );

  // --- 2) 회귀: 유사색 — 오버슈트 없음 ---
  const warmBg = await smoothWarmGradient(256);
  const softCut = await softBeigeCutout(120);
  const warmTarget = await backdropCornerMean(warmBg);
  const softBefore = await meanOpaqueRgb(softCut);
  const softAfterBuf = await matchCutoutWhiteBalance(softCut, warmBg);
  const softAfter = await meanOpaqueRgb(softAfterBuf);
  const overshoot = channelOvershoots(softBefore, softAfter, warmTarget, 4);
  console.log(
    `[218] regression means before=(${softBefore.r.toFixed(1)},${softBefore.g.toFixed(1)},${softBefore.b.toFixed(1)}) ` +
      `after=(${softAfter.r.toFixed(1)},${softAfter.g.toFixed(1)},${softAfter.b.toFixed(1)}) ` +
      `target=(${warmTarget.r.toFixed(1)},${warmTarget.g.toFixed(1)},${warmTarget.b.toFixed(1)})`,
  );
  assert(overshoot === null, `no channel overshoot (${overshoot ?? "none"})`);
  const softDistBefore = distRgb(softBefore, warmTarget);
  const softDistAfter = distRgb(softAfter, warmTarget);
  assert(
    softDistAfter <= softDistBefore + 1,
    `similar-color WB does not increase distance (${softDistAfter.toFixed(2)} vs ${softDistBefore.toFixed(2)})`,
  );

  // --- 3) 그레인 알파 0.03~0.07 ---
  const rough = await roughTexture(256);
  const grayCut = await sharp({
    create: {
      width: 120,
      height: 120,
      channels: 4,
      background: { r: 140, g: 140, b: 140, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  const roughGrain = await measureBackdropGrain(rough);
  assert(roughGrain >= 2.2, `rough grain >= skipThreshold (got ${roughGrain.toFixed(3)})`);
  const grained = await matchCutoutGrain(grayCut, rough);
  assert(Buffer.compare(grained, grayCut) !== 0, "grain modifies cutout on rough backdrop");
  const t = Math.min(1, (roughGrain - 2.2) / 6);
  const alpha = 0.03 + t * 0.04;
  console.log(`[218] grain alpha=${alpha.toFixed(4)} (t=${t.toFixed(3)}, grain=${roughGrain.toFixed(3)})`);
  assert(alpha >= 0.03 && alpha <= 0.07, `grain alpha in 0.03~0.07 (got ${alpha.toFixed(4)})`);

  console.log("API generate: 0");
  if (process.exitCode) {
    console.error("VERIFY FAILED");
    process.exit(1);
  }
  console.log("VERIFY:0");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
