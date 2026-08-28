/**
 * 컷아웃 합성 후처리: 페더, 색온도·명암 매칭, 실루엣 그림자, 통일 그레인.
 */

import sharp from "sharp";
import type { ShadowAnalysis } from "@/lib/vision-utils";

const DEFAULT_CANVAS_SIZE = 1200;

/** PNG 알파 채널에서 투명(α<16) 픽셀 비율 — cutout 품질 검증용 */
export async function measureTransparentRatio(buffer: Buffer): Promise<number> {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const total = info.width * info.height;
  if (total === 0) return 0;
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 16) transparent += 1;
  }
  return transparent / total;
}

/**
 * 네 모서리(각 ~12% 정사각)의 평균 알파.
 * rembg가 원본 프레임/어두운 플레이트를 남기면 모서리가 불투명해진다.
 * maxMeanAlpha가 높으면 "검은 박스" 합성으로 이어지므로 컷아웃을 폐기한다.
 */
export async function measureCornerMeanAlpha(
  buffer: Buffer,
  cornerFrac = 0.12,
): Promise<{ maxMeanAlpha: number; means: number[] }> {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  if (w === 0 || h === 0) return { maxMeanAlpha: 0, means: [0, 0, 0, 0] };
  const cw = Math.max(4, Math.floor(w * cornerFrac));
  const ch = Math.max(4, Math.floor(h * cornerFrac));
  const regions = [
    { left: 0, top: 0 },
    { left: w - cw, top: 0 },
    { left: 0, top: h - ch },
    { left: w - cw, top: h - ch },
  ];
  const means: number[] = [];
  for (const r of regions) {
    let sum = 0;
    let n = 0;
    for (let y = r.top; y < r.top + ch; y += 1) {
      for (let x = r.left; x < r.left + cw; x += 1) {
        sum += data[(y * w + x) * 4 + 3];
        n += 1;
      }
    }
    means.push(n > 0 ? sum / n : 0);
  }
  return { maxMeanAlpha: Math.max(...means), means };
}

/**
 * rembg가 원본 프레임을 남기는 경우 감지.
 * - softAlphaRatio: 불투명 픽셀 중 중간 알파(16~220) 비율
 * - opaqueAreaRatio: α≥16 픽셀 비율 — 원본 사각 플레이트를 통째로 남기면 큼
 * - bboxFill: 불투명 bbox가 이미지에서 차지하는 비율
 */
export async function measureCutoutPlateRisk(
  buffer: Buffer,
): Promise<{
  softAlphaRatio: number;
  opaqueAreaRatio: number;
  bboxFill: number;
  risky: boolean;
}> {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const total = w * h;
  if (total === 0) {
    return { softAlphaRatio: 0, opaqueAreaRatio: 0, bboxFill: 0, risky: false };
  }

  let opaque = 0;
  let soft = 0;
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const a = data[(y * w + x) * 4 + 3]!;
      if (a < 16) continue;
      opaque += 1;
      if (a < 220) soft += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  const opaqueAreaRatio = opaque / total;
  const softAlphaRatio = opaque > 0 ? soft / opaque : 0;
  const bboxFill =
    opaque > 0 ? ((maxX - minX + 1) * (maxY - minY + 1)) / total : 0;

  // 반투명 플레이트 OR 원본 프레임을 거의 통째로 남긴 경우(불투명 사각)
  const risky =
    (softAlphaRatio >= 0.12 && opaqueAreaRatio >= 0.2) ||
    opaqueAreaRatio >= 0.45 ||
    (bboxFill >= 0.55 && opaqueAreaRatio >= 0.32);
  return { softAlphaRatio, opaqueAreaRatio, bboxFill, risky };
}

/**
 * rembg 직후 투명 여백을 제거해 제품 bbox만 남긴다. 원본 프레임/플레이트 여백 제거에 유효.
 */
export async function trimCutoutToOpaqueBounds(input: Buffer, marginPx = 6): Promise<Buffer> {
  try {
    return await sharp(input)
      .trim({ threshold: 12, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: marginPx,
        bottom: marginPx,
        left: marginPx,
        right: marginPx,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
  } catch {
    return input;
  }
}

/**
 * 컷아웃 가장자리의 어두운 직사각 플레이트/원본 프레임 잔여를 알파로 제거.
 * rembg가 RGB는 남기고 알파만 반투명 처리한 경우를 정리한다.
 */
export async function purgeDarkPlateFringe(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  if (w === 0 || h === 0) return input;
  const border = Math.max(8, Math.floor(Math.min(w, h) * 0.1));
  const out = Buffer.from(data);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const onBorder = x < border || y < border || x >= w - border || y >= h - border;
      if (!onBorder) continue;
      const i = (y * w + x) * 4;
      const a = out[i + 3]!;
      if (a < 16) continue;
      const r = out[i]!;
      const g = out[i + 1]!;
      const b = out[i + 2]!;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < 58 || (lum < 95 && a < 235)) {
        out[i + 3] = 0;
      }
    }
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

/**
 * 알파 1px erode + 블러. 블러 반경은 컷아웃 크기 대비 캔버스 비율로 정규화
 * (고정 2.4면 큰 제품은 페더가 약하고 작은 제품은 과해짐).
 */
export async function featherCutout(
  input: Buffer,
  canvasSize = DEFAULT_CANVAS_SIZE,
): Promise<Buffer> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const channels = info.channels;
  const alpha = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    alpha[i] = data[i * channels + 3];
  }

  const eroded = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let minA = 255;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = Math.min(width - 1, Math.max(0, x + dx));
          const ny = Math.min(height - 1, Math.max(0, y + dy));
          minA = Math.min(minA, alpha[ny * width + nx]);
        }
      }
      eroded[y * width + x] = minA;
    }
  }

  const out = Buffer.from(data);
  for (let i = 0; i < width * height; i += 1) {
    const a = eroded[i];
    out[i * channels + 3] = a;
    if (a > 0 && a < 250) {
      const t = a / 255;
      out[i * channels] = Math.round(out[i * channels] * t);
      out[i * channels + 1] = Math.round(out[i * channels + 1] * t);
      out[i * channels + 2] = Math.round(out[i * channels + 2] * t);
    }
  }

  // 제품이 캔버스의 ~50% 스팬일 때 blur≈2.4 가 되도록 정규화
  const span = Math.max(width, height);
  const blurSigma = Math.max(1.2, Math.min(4.8, 2.4 * (span / (canvasSize * 0.5))));

  const joined = await sharp(out, { raw: { width, height, channels } })
    .png()
    .toBuffer();
  const blurredAlpha = await sharp(joined).extractChannel(3).blur(blurSigma).toBuffer();
  const rgb = await sharp(joined).removeAlpha().toBuffer();
  return sharp(rgb).joinChannel(blurredAlpha).png().toBuffer();
}

function sampleCornerAverage(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
): { r: number; g: number; b: number } {
  const patch = 48;
  const origins = [
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
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        n += 1;
      }
    }
  }
  return { r: r / n, g: g / n, b: b / n };
}

function luminance(c: { r: number; g: number; b: number }): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

/**
 * 배경 코너 평균에 맞춰 컷아웃 RGB·명암을 약하게 당긴다. 알파는 유지.
 * mix는 제품 고유 색(화장품 색조 등)이 과하게 왜곡되지 않도록 상한을 둔다.
 */
export async function matchCutoutWhiteBalance(
  cutout: Buffer,
  backdrop: Buffer,
): Promise<Buffer> {
  const bg = await sharp(backdrop)
    .resize(256, 256, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const target = sampleCornerAverage(bg.data, bg.info.width, bg.info.height, bg.info.channels);

  const { data, info } = await sharp(cutout).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let sn = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    sr += data[i];
    sg += data[i + 1];
    sb += data[i + 2];
    sn += 1;
  }
  if (sn < 20) return cutout;
  const src = { r: sr / sn, g: sg / sn, b: sb / sn };
  const colorMix = 0.22;
  const lumMix = 0.14;
  const scaleR = 1 - colorMix + colorMix * (target.r / Math.max(src.r, 8));
  const scaleG = 1 - colorMix + colorMix * (target.g / Math.max(src.g, 8));
  const scaleB = 1 - colorMix + colorMix * (target.b / Math.max(src.b, 8));
  const lumScale =
    1 - lumMix + lumMix * (luminance(target) / Math.max(luminance(src), 8));
  // 채널 스케일 상한 — 색조가 과도하게 틀어지지 않게
  const clampScale = (s: number) => Math.max(0.82, Math.min(1.18, s));

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    data[i] = Math.max(
      0,
      Math.min(255, Math.round(data[i] * clampScale(scaleR) * clampScale(lumScale))),
    );
    data[i + 1] = Math.max(
      0,
      Math.min(255, Math.round(data[i + 1] * clampScale(scaleG) * clampScale(lumScale))),
    );
    data[i + 2] = Math.max(
      0,
      Math.min(255, Math.round(data[i + 2] * clampScale(scaleB) * clampScale(lumScale))),
    );
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

/** 광원 반대 방향으로 그림자 오프셋 (px, 제품 크기 비율). */
function shadowOffsets(
  placement: { width: number; height: number },
  shadow: ShadowAnalysis,
): { ox: number; oy: number } {
  const w = placement.width;
  const h = placement.height;
  switch (shadow.lightFrom) {
    case "upper-right":
    case "right":
      return { ox: -w * 0.06, oy: h * 0.04 };
    case "top":
      return { ox: 0, oy: h * 0.055 };
    case "left":
      return { ox: w * 0.06, oy: h * 0.04 };
    case "upper-left":
    default:
      return { ox: w * 0.055, oy: h * 0.045 };
  }
}

/**
 * 컷아웃 알파 마스크를 투영·블러한 실루엣 그림자.
 * 타원 블롭보다 제품 윤곽을 반영해 합성 티를 줄인다.
 */
export async function buildSilhouetteShadowBuffer(
  cutoutResized: Buffer,
  canvasSize: number,
  placement: { left: number; top: number; width: number; height: number },
  shadow: ShadowAnalysis,
): Promise<Buffer> {
  const meta = await sharp(cutoutResized).metadata();
  const w = meta.width ?? placement.width;
  const h = meta.height ?? placement.height;
  const alpha = await sharp(cutoutResized).ensureAlpha().extractChannel(3).toBuffer();
  const blackRgb = await sharp({
    create: {
      width: w,
      height: h,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer();

  const opacity = Math.min(0.38, Math.max(0.14, shadow.shadowIntensity + 0.08));
  // 알파에 opacity 적용
  const { data: alphaRaw, info: aInfo } = await sharp(alpha)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const faded = Buffer.alloc(alphaRaw.length);
  for (let i = 0; i < alphaRaw.length; i += 1) {
    faded[i] = Math.round(alphaRaw[i] * opacity);
  }
  const silhouette = await sharp(blackRgb)
    .joinChannel(
      await sharp(faded, {
        raw: { width: aInfo.width, height: aInfo.height, channels: 1 },
      })
        .png()
        .toBuffer(),
    )
    .png()
    .toBuffer();

  const blurSigma = Math.max(6, Math.min(28, Math.min(w, h) * 0.055));
  const blurred = await sharp(silhouette).blur(blurSigma).png().toBuffer();

  const { ox, oy } = shadowOffsets(placement, shadow);
  const left = Math.round(placement.left + ox);
  const top = Math.round(placement.top + oy + h * 0.02);

  const empty = await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();

  return sharp(empty)
    .composite([{ input: blurred, left, top }])
    .png()
    .toBuffer();
}

/** 폴백용 타원 그림자 SVG (실루엣 생성 실패 시). */
export function buildProductShadowSvg(
  canvasSize: number,
  placement: { left: number; top: number; width: number; height: number },
  shadow: ShadowAnalysis,
): string {
  const cx = placement.left + placement.width * 0.5;
  const baseY = placement.top + placement.height * 0.92;
  const { ox, oy } = shadowOffsets(placement, shadow);
  const opacity = Math.min(0.32, Math.max(0.12, shadow.shadowIntensity + 0.06));
  const rx = placement.width * 0.34;
  const ry = Math.max(18, placement.height * 0.055);
  return `<svg width="${canvasSize}" height="${canvasSize}" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="shadow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#000000" stop-opacity="${opacity.toFixed(2)}"/><stop offset="100%" stop-color="#000000" stop-opacity="0"/></radialGradient></defs><ellipse cx="${cx + ox}" cy="${baseY + oy}" rx="${rx}" ry="${ry}" fill="url(#shadow)"/></svg>`;
}

/**
 * Bria 등 이미 합성된 결과물에 얹는 약한 접지 그림자 (재컷아웃 없이).
 * 하단 중앙 타원 — 실루엣 대신 저강도 블롭으로 "떠 있는" 느낌을 줄인다.
 */
export function buildSoftContactShadowSvg(
  canvasSize: number,
  shadow: ShadowAnalysis,
): string {
  const opacity = Math.min(0.22, Math.max(0.08, shadow.shadowIntensity * 0.7));
  const cx = canvasSize * 0.5;
  const cy = canvasSize * 0.78;
  const rx = canvasSize * 0.22;
  const ry = canvasSize * 0.04;
  return `<svg width="${canvasSize}" height="${canvasSize}" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="contact" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#000000" stop-opacity="${opacity.toFixed(2)}"/><stop offset="100%" stop-color="#000000" stop-opacity="0"/></radialGradient></defs><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#contact)"/></svg>`;
}

/**
 * 최종 합성 전체에 아주 미세한 그레인 — 제품·배경 선명도 차이를 시각적으로 완화.
 * 완전한 해상도 해결책은 아니지만 저비용으로 즉시 적용 가능.
 */
export async function unifyCompositeGrain(
  image: Buffer,
  canvasSize = DEFAULT_CANVAS_SIZE,
): Promise<Buffer> {
  const noiseSvg = Buffer.from(
    `<svg width="${canvasSize}" height="${canvasSize}" xmlns="http://www.w3.org/2000/svg">
      <filter id="n">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.045 0"/>
      </filter>
      <rect width="100%" height="100%" filter="url(#n)"/>
    </svg>`,
  );
  const noise = await sharp(noiseSvg).png().toBuffer();
  return sharp(image)
    .composite([{ input: noise, blend: "overlay" }])
    .png()
    .toBuffer();
}

/** 같은 구도의 사용 전(건조·매트) / 사용 후(촉촉 광택). 대비를 강하게 유지. */
export async function makeComparisonPair(
  heroBuffer: Buffer,
): Promise<{ before: Buffer; after: Buffer }> {
  const before = await sharp(heroBuffer)
    .modulate({ saturation: 0.58, brightness: 0.88 })
    .gamma(1.28)
    .linear(0.85, 12)
    .png()
    .toBuffer();

  const meta = await sharp(heroBuffer).metadata();
  const width = meta.width ?? 1200;
  const height = meta.height ?? 1200;
  const gloss = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .composite([
      {
        input: Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="g" cx="38%" cy="28%" r="48%"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="55%" stop-color="#c8e6ff" stop-opacity="0.18"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`),
        blend: "screen",
      },
    ])
    .png()
    .toBuffer();

  const after = await sharp(heroBuffer)
    .modulate({ saturation: 1.12, brightness: 1.06 })
    .composite([{ input: gloss, blend: "screen" }])
    .png()
    .toBuffer();

  return { before, after };
}
