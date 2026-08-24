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

type ImageSample = {
  hue: { h: number; weight: number } | null;
  // 상품 배경/그림자 영역(무채색 픽셀)의 평균 RGB. baseNeutral 계산용.
  neutral: { r: number; g: number; b: number; count: number } | null;
};

async function sampleImage(imageUrl: string): Promise<ImageSample> {
  const response = await fetch(imageUrl);
  if (!response.ok) return { hue: null, neutral: null };
  const buffer = Buffer.from(await response.arrayBuffer());

  const image = sharp(buffer);
  const meta = await image.metadata();
  if (!meta.width || !meta.height) return { hue: null, neutral: null };

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
  // 옅은 무채색(밝은 회색/아이보리) 픽셀 평균 — baseNeutral 후보.
  let lightNeutral = { r: 0, g: 0, b: 0, count: 0 };
  // 위 조건에 맞는 픽셀이 없을 때 쓰는 폭넓은 무채색 폴백.
  let anyNeutral = { r: 0, g: 0, b: 0, count: 0 };

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const { h, s, l } = rgbToHsl(r, g, b);

    if (s < 0.18) {
      if (l >= 0.05 && l <= 0.97) {
        anyNeutral = {
          r: anyNeutral.r + r,
          g: anyNeutral.g + g,
          b: anyNeutral.b + b,
          count: anyNeutral.count + 1,
        };
      }
      if (l >= 0.55 && l <= 0.95) {
        lightNeutral = {
          r: lightNeutral.r + r,
          g: lightNeutral.g + g,
          b: lightNeutral.b + b,
          count: lightNeutral.count + 1,
        };
      }
      // 채도가 낮은 흰색/회색/검정 픽셀은 스튜디오 배경·그림자일 확률이 높아
      // hue 버킷에서는 제외 (accentColor는 유채색 픽셀에서만 뽑는다).
      continue;
    }
    if (l > 0.93 || l < 0.07) continue;

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

  const neutral = lightNeutral.count > 0 ? lightNeutral : anyNeutral.count > 0 ? anyNeutral : null;

  return { hue: best, neutral };
}

// accentColor를 20~30% 어둡게 만든 deepAccent 계산 (텍스트/버튼 강조용).
function darken(hex: string, amount = 0.25): string {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const { h, s, l } = rgbToHsl(r, g, b);
  const [dr, dg, db] = hslToRgb(h, s, Math.max(0, l * (1 - amount)));
  return rgbToHex(dr, dg, db);
}

const HUE_NAME_BOUNDARIES: [number, string][] = [
  [15, "red"],
  [45, "orange"],
  [70, "amber"],
  [95, "yellow-green"],
  [150, "green"],
  [180, "teal"],
  [210, "cyan-blue"],
  [255, "blue"],
  [290, "indigo"],
  [320, "purple"],
  [345, "magenta"],
  [360, "red"],
];

function hueName(h: number): string {
  const hue = ((h % 360) + 360) % 360;
  for (const [max, name] of HUE_NAME_BOUNDARIES) {
    if (hue <= max) return name;
  }
  return "red";
}

// baseNeutral은 sampleImage()에서 채도(s) < 0.18인 픽셀만 모아 평균낸 값이라
// 원본 사진 배경이 흰색/회색 스튜디오면 거의 항상 순수 무채색에 가깝게
// 나온다. describeColorTone()의 기준(s < 0.12 → "neutral ivory/gray"류)보다
// 살짝 위인 채도 하한을 둬서, 상품 고유 색감을 지나치게 덮어쓰지 않으면서도
// spec_table/review_highlight 같은 패턴 A 섹션이 "무채색 회색"으로 읽히지
// 않고 은은한 웜톤(피치/아이보리)으로 보이게 한다. 밝기(lightness)는 원본을
// 그대로 유지해 원본 사진의 명도감은 보존한다.
const MIN_BASE_NEUTRAL_SATURATION = 0.14;

function ensureWarmNeutral(hex: string, hue: number): string {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const { s, l } = rgbToHsl(r, g, b);
  if (s >= MIN_BASE_NEUTRAL_SATURATION) return hex;
  const targetL = Math.min(0.97, Math.max(0.5, l));
  const [wr, wg, wb] = hslToRgb(hue, MIN_BASE_NEUTRAL_SATURATION, targetL);
  return rgbToHex(wr, wg, wb);
}

// hex 색상의 hue만 degrees만큼 회전한 변형색을 반환한다 (채도/명도는 유지).
// 아이콘 세트처럼 "브랜드 톤과 어울리면서도 항목마다 다른 색"이 필요할 때
// 쓴다 — 완전히 임의의 색이 아니라 같은 s/l를 공유하는 색상환 회전이라
// 스타일이 흐트러지지 않으면서도 시각적으로 다채로워진다.
export function hueShift(hex: string, degrees: number): string {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const { h, s, l } = rgbToHsl(r, g, b);
  const shifted = ((h + degrees) % 360 + 360) % 360;
  const [nr, ng, nb] = hslToRgb(shifted, s, l);
  return rgbToHex(nr, ng, nb);
}

// hex 색상을 이미지 생성 프롬프트에 넣기 좋은 영어 톤 표현으로 변환한다.
// (예: "#B45309" → "rich amber", "#FAF7F2" → "soft neutral ivory")
// 정확한 색상명이 아니라 생성형 이미지 모델이 이해할 대략적인 톤 힌트가
// 목적이므로, HSL 버킷팅 기반의 근사치로 충분하다.
export function describeColorTone(hex: string): string {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const { h, s, l } = rgbToHsl(r, g, b);

  if (s < 0.12) {
    if (l > 0.85) return "soft neutral ivory";
    if (l > 0.55) return "warm neutral gray";
    if (l > 0.25) return "muted charcoal gray";
    return "deep charcoal";
  }

  const name = hueName(h);
  const lightness = l > 0.75 ? "pale" : l > 0.5 ? "soft" : l > 0.3 ? "rich" : "deep";
  return `${lightness} ${name}`;
}

// 업로드된 상품 사진들 중 가장 채도가 강하게 드러난 색상대를 골라 테마를
// 만든다. 유채색 픽셀을 충분히 찾지 못하면(무채색 상품 등) null을 반환하고,
// 호출부는 카테고리 기본 테마로 폴백해야 한다.
export async function extractProductTheme(imageUrls: string[]): Promise<ExtractedTheme | null> {
  const samples = await Promise.all(
    imageUrls.slice(0, 3).map((url) => sampleImage(url).catch(() => null)),
  );

  let bestHue: number | null = null;
  let bestWeight = 0;
  const neutralTotal = { r: 0, g: 0, b: 0, count: 0 };

  for (const sample of samples) {
    if (!sample) continue;
    if (sample.hue && sample.hue.weight > bestWeight) {
      bestWeight = sample.hue.weight;
      bestHue = sample.hue.h;
    }
    if (sample.neutral) {
      neutralTotal.r += sample.neutral.r;
      neutralTotal.g += sample.neutral.g;
      neutralTotal.b += sample.neutral.b;
      neutralTotal.count += sample.neutral.count;
    }
  }

  if (bestHue === null) return null;

  const [ar, ag, ab] = hslToRgb(bestHue, 0.62, 0.32);
  const [sr, sg, sb] = hslToRgb(bestHue, 0.55, 0.96);
  const [tr, tg, tb] = hslToRgb(bestHue, 0.55, 0.26);
  const accent = rgbToHex(ar, ag, ab);

  const rawBaseNeutral =
    neutralTotal.count > 0
      ? rgbToHex(
          Math.round(neutralTotal.r / neutralTotal.count),
          Math.round(neutralTotal.g / neutralTotal.count),
          Math.round(neutralTotal.b / neutralTotal.count),
        )
      : rgbToHex(sr, sg, sb); // 배경/그림자에서 무채색 픽셀을 못 찾으면 accentSoft로 폴백.
  const baseNeutral = ensureWarmNeutral(rawBaseNeutral, bestHue);

  return {
    accent,
    accentSoft: rgbToHex(sr, sg, sb),
    accentText: rgbToHex(tr, tg, tb),
    heroScrimFrom: `rgba(${ar},${ag},${ab},0.72)`,
    baseNeutral,
    deepAccent: darken(accent, 0.25),
  };
}
