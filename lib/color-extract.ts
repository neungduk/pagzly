// 업로드된 상품 사진에서 실제 색상을 뽑아 CategoryTheme의 색상 필드를 만든다.
// lib/category-theme.ts의 카테고리별 고정 팔레트 대신(또는 그 위에 덮어써서)
// 상품 고유의 색감을 반영하기 위한 용도.

import sharp from "sharp";
import type { CategoryTheme } from "@/lib/category-theme";

export type ExtractedTheme = Omit<CategoryTheme, "icon">;

const SAMPLE_SIZE = 48;
// 상세페이지용 사진은 배경(스튜디오 백드롭)이 넓게 깔리고 상품은 중앙에
// 놓이는 경우가 많아, 중앙 영역만 크롭해서 배경보다 상품 색을 우선시한다.
const CENTER_CROP_RATIO = 0.6;

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;

  return { h: h * 360, s, l };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  return [
    Math.round((rgb[0] + m) * 255),
    Math.round((rgb[1] + m) * 255),
    Math.round((rgb[2] + m) * 255),
  ];
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

async function sampleDominantHue(imageUrl: string): Promise<{ h: number; weight: number } | null> {
  const response = await fetch(imageUrl);
  if (!response.ok) return null;
  const buffer = Buffer.from(await response.arrayBuffer());

  const image = sharp(buffer);
  const meta = await image.metadata();
  if (!meta.width || !meta.height) return null;

  const cropW = Math.max(1, Math.round(meta.width * CENTER_CROP_RATIO));
  const cropH = Math.max(1, Math.round(meta.height * CENTER_CROP_RATIO));
  const left = Math.round((meta.width - cropW) / 2);
  const top = Math.round((meta.height - cropH) / 2);

  const { data, info } = await image
    .extract({ left, top, width: cropW, height: cropH })
    .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  // 15도 단위로 색상(hue)을 버킷팅해서 가장 비중이 큰 색상대를 찾는다.
  const buckets = new Map<number, { weight: number; hueWeightedSum: number }>();

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const { h, s, l } = rgbToHsl(r, g, b);

    // 채도가 낮은 흰색/회색/검정 픽셀은 스튜디오 배경·그림자일 확률이 높아 제외.
    if (s < 0.18 || l > 0.93 || l < 0.07) continue;

    const bucketKey = Math.round(h / 15) * 15;
    const entry = buckets.get(bucketKey) ?? { weight: 0, hueWeightedSum: 0 };
    entry.weight += s;
    entry.hueWeightedSum += h * s;
    buckets.set(bucketKey, entry);
  }

  let best: { h: number; weight: number } | null = null;
  for (const entry of buckets.values()) {
    if (!best || entry.weight > best.weight) {
      best = { h: entry.hueWeightedSum / entry.weight, weight: entry.weight };
    }
  }
  return best;
}

// 업로드된 상품 사진들 중 가장 채도가 강하게 드러난 색상대를 골라 테마를
// 만든다. 유채색 픽셀을 충분히 찾지 못하면(무채색 상품 등) null을 반환하고,
// 호출부는 카테고리 기본 테마로 폴백해야 한다.
export async function extractProductTheme(imageUrls: string[]): Promise<ExtractedTheme | null> {
  const samples = await Promise.all(
    imageUrls.slice(0, 3).map((url) => sampleDominantHue(url).catch(() => null)),
  );

  let bestHue: number | null = null;
  let bestWeight = 0;
  for (const sample of samples) {
    if (sample && sample.weight > bestWeight) {
      bestWeight = sample.weight;
      bestHue = sample.h;
    }
  }

  if (bestHue === null) return null;

  const [ar, ag, ab] = hslToRgb(bestHue, 0.62, 0.32);
  const [sr, sg, sb] = hslToRgb(bestHue, 0.55, 0.96);
  const [tr, tg, tb] = hslToRgb(bestHue, 0.55, 0.26);

  return {
    accent: rgbToHex(ar, ag, ab),
    accentSoft: rgbToHex(sr, sg, sb),
    accentText: rgbToHex(tr, tg, tb),
    heroScrimFrom: `rgba(${ar},${ag},${ab},0.72)`,
  };
}
