/**
 * 컷아웃 합성 후처리: 페더, 색온도 매칭, 광원 방향 그림자, Before/After 질감.
 */

import sharp from "sharp";
import type { ShadowAnalysis } from "@/lib/vision-utils";

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

export async function featherCutout(input: Buffer): Promise<Buffer> {
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

  const joined = await sharp(out, { raw: { width, height, channels } })
    .png()
    .toBuffer();
  const blurredAlpha = await sharp(joined).extractChannel(3).blur(2.4).toBuffer();
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

/** 배경 코너 평균에 맞춰 컷아웃 RGB를 약하게 당긴다. 알파는 유지. */
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
  const mix = 0.16;
  const scaleR = 1 - mix + mix * (target.r / Math.max(src.r, 8));
  const scaleG = 1 - mix + mix * (target.g / Math.max(src.g, 8));
  const scaleB = 1 - mix + mix * (target.b / Math.max(src.b, 8));

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    data[i] = Math.max(0, Math.min(255, Math.round(data[i] * scaleR)));
    data[i + 1] = Math.max(0, Math.min(255, Math.round(data[i + 1] * scaleG)));
    data[i + 2] = Math.max(0, Math.min(255, Math.round(data[i + 2] * scaleB)));
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

export function buildProductShadowSvg(
  canvasSize: number,
  placement: { left: number; top: number; width: number; height: number },
  shadow: ShadowAnalysis,
): string {
  const cx = placement.left + placement.width * 0.5;
  const baseY = placement.top + placement.height * 0.92;
  const offsetX =
    shadow.lightFrom === "upper-right" || shadow.lightFrom === "right"
      ? -placement.width * 0.08
      : shadow.lightFrom === "top"
        ? 0
        : placement.width * 0.08;
  const offsetY = shadow.lightFrom === "top" ? placement.height * 0.04 : placement.height * 0.05;
  const opacity = Math.min(0.32, Math.max(0.12, shadow.shadowIntensity + 0.06));
  const rx = placement.width * 0.34;
  const ry = Math.max(18, placement.height * 0.055);
  return `
    <svg width="${canvasSize}" height="${canvasSize}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(0,0,0,${opacity})" />
          <stop offset="100%" stop-color="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
      <ellipse cx="${cx + offsetX}" cy="${baseY + offsetY}" rx="${rx}" ry="${ry}" fill="url(#shadow)" />
    </svg>`;
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
        input: Buffer.from(`
          <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="g" cx="38%" cy="28%" r="48%">
                <stop offset="0%" stop-color="rgba(255,255,255,0.55)" />
                <stop offset="55%" stop-color="rgba(200,230,255,0.18)" />
                <stop offset="100%" stop-color="rgba(255,255,255,0)" />
              </radialGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#g)" />
          </svg>`),
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
