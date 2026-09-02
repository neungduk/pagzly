// 업로드된 상품 사진에서 실제 색상을 뽑아 CategoryTheme의 색상 필드를 만든다.
// lib/category-theme.ts의 카테고리별 고정 팔레트 대신(또는 그 위에 덮어써서)
// 상품 고유의 색감을 반영하기 위한 용도.

import fs from "fs";
import { fileURLToPath } from "url";
import sharp from "sharp";
import type { CategoryTheme } from "@/lib/category-theme";

export type ExtractedTheme = Omit<CategoryTheme, "icon">;

export type HueBucketEntry = { weight: number; hueWeightedSum: number };
export type HueBucketMap = Map<number, HueBucketEntry>;

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
  hueBuckets: HueBucketMap;
  // 상품 배경/그림자 영역(무채색 픽셀)의 평균 RGB. baseNeutral 계산용.
  neutral: { r: number; g: number; b: number; count: number } | null;
};

async function loadImageBuffer(imageUrl: string): Promise<Buffer | null> {
  if (imageUrl.startsWith("file:")) {
    try {
      return fs.readFileSync(fileURLToPath(imageUrl));
    } catch {
      return null;
    }
  }
  if (/^[A-Za-z]:\\/.test(imageUrl) || imageUrl.startsWith("/")) {
    try {
      return fs.readFileSync(imageUrl);
    } catch {
      return null;
    }
  }
  const response = await fetch(imageUrl);
  if (!response.ok) return null;
  return Buffer.from(await response.arrayBuffer());
}

async function sampleImage(imageUrl: string): Promise<ImageSample> {
  const buffer = await loadImageBuffer(imageUrl);
  if (!buffer) return { hueBuckets: new Map(), neutral: null };

  const image = sharp(buffer);
  const meta = await image.metadata();
  if (!meta.width || !meta.height) return { hueBuckets: new Map(), neutral: null };

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
  const buckets: HueBucketMap = new Map();
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

  const neutral = lightNeutral.count > 0 ? lightNeutral : anyNeutral.count > 0 ? anyNeutral : null;

  return { hueBuckets: buckets, neutral };
}

/** 여러 사진의 hue 버킷을 합산해 가장 누적 가중치가 큰 색상대를 반환한다. */
export function mergeHueBuckets(bucketMaps: HueBucketMap[]): { h: number; weight: number } | null {
  const merged: HueBucketMap = new Map();

  for (const buckets of bucketMaps) {
    for (const [key, entry] of buckets) {
      const existing = merged.get(key) ?? { weight: 0, hueWeightedSum: 0 };
      existing.weight += entry.weight;
      existing.hueWeightedSum += entry.hueWeightedSum;
      merged.set(key, existing);
    }
  }

  let best: { h: number; weight: number } | null = null;
  for (const entry of merged.values()) {
    if (!best || entry.weight > best.weight) {
      best = { h: entry.hueWeightedSum / entry.weight, weight: entry.weight };
    }
  }

  return best;
}

type SlPair = { s: number; l: number };

export type PaletteCurve = {
  accent: SlPair;
  accentSoft: SlPair;
  accentText: SlPair;
};

// hue(0~360) 구간별 accent/accentSoft/accentText S·L 앵커 — 인접 구간은 선형 보간.
const PALETTE_CURVE_ANCHORS: { hue: number; curve: PaletteCurve }[] = [
  {
    hue: 0,
    curve: {
      accent: { s: 0.62, l: 0.32 },
      accentSoft: { s: 0.55, l: 0.96 },
      accentText: { s: 0.55, l: 0.26 },
    },
  },
  {
    hue: 25,
    curve: {
      accent: { s: 0.5, l: 0.42 },
      accentSoft: { s: 0.42, l: 0.96 },
      accentText: { s: 0.48, l: 0.3 },
    },
  },
  {
    hue: 55,
    curve: {
      accent: { s: 0.44, l: 0.47 },
      accentSoft: { s: 0.38, l: 0.97 },
      accentText: { s: 0.46, l: 0.32 },
    },
  },
  {
    hue: 85,
    curve: {
      accent: { s: 0.48, l: 0.36 },
      accentSoft: { s: 0.42, l: 0.96 },
      accentText: { s: 0.5, l: 0.29 },
    },
  },
  {
    hue: 120,
    curve: {
      accent: { s: 0.5, l: 0.33 },
      accentSoft: { s: 0.44, l: 0.96 },
      accentText: { s: 0.52, l: 0.27 },
    },
  },
  {
    hue: 165,
    curve: {
      accent: { s: 0.54, l: 0.32 },
      accentSoft: { s: 0.48, l: 0.96 },
      accentText: { s: 0.54, l: 0.26 },
    },
  },
  {
    hue: 210,
    curve: {
      accent: { s: 0.6, l: 0.31 },
      accentSoft: { s: 0.54, l: 0.96 },
      accentText: { s: 0.55, l: 0.26 },
    },
  },
  {
    hue: 270,
    curve: {
      accent: { s: 0.55, l: 0.33 },
      accentSoft: { s: 0.48, l: 0.96 },
      accentText: { s: 0.52, l: 0.28 },
    },
  },
  {
    hue: 320,
    curve: {
      accent: { s: 0.58, l: 0.32 },
      accentSoft: { s: 0.5, l: 0.96 },
      accentText: { s: 0.54, l: 0.27 },
    },
  },
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpSl(a: SlPair, b: SlPair, t: number): SlPair {
  return { s: lerp(a.s, b.s, t), l: lerp(a.l, b.l, t) };
}

function lerpCurve(a: PaletteCurve, b: PaletteCurve, t: number): PaletteCurve {
  return {
    accent: lerpSl(a.accent, b.accent, t),
    accentSoft: lerpSl(a.accentSoft, b.accentSoft, t),
    accentText: lerpSl(a.accentText, b.accentText, t),
  };
}

/** hue(0~360)에 맞는 accent/accentSoft/accentText 채도·명도 커브를 반환한다. */
export function getPaletteCurve(hue: number): PaletteCurve {
  const h = ((hue % 360) + 360) % 360;
  const anchors = PALETTE_CURVE_ANCHORS;

  let lower = anchors[0];
  let upper = anchors[anchors.length - 1];

  for (let i = 0; i < anchors.length; i++) {
    const next = anchors[(i + 1) % anchors.length];
    const lo = anchors[i].hue;
    const hi = next.hue > lo ? next.hue : next.hue + 360;

    const hh = h < lo && i === anchors.length - 1 ? h + 360 : h;
    if (hh >= lo && hh <= hi) {
      lower = anchors[i];
      upper = next;
      const span = hi - lo;
      const t = span > 0 ? (hh - lo) / span : 0;
      return lerpCurve(lower.curve, upper.curve, t);
    }
  }

  return anchors[0].curve;
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
// 스튜디오 배경이 흰색/회색이면 거의 항상 무채색에 가깝다. ensureWarmNeutral이
// 제품 hue를 입혀 웜톤 캔버스를 만든다 (53차: sat 0.30, L 상한 0.90).
// 은은한 웜톤이면서도 제품 hue가 눈에 보이도록 채도·명도 상한을 조정 (53차).
const MIN_BASE_NEUTRAL_SATURATION = 0.3;
const MAX_BASE_NEUTRAL_LIGHTNESS = 0.9;
const READABLE_INK = "#1B1B18";

function relativeLuminance(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** 스튜디오 무채색에 제품 hue를 입히되, ink 본문 대비 4.5:1 이상 보장 */
function ensureReadableBaseNeutral(
  hex: string,
  hue: number,
  minSaturation: number,
  maxLightness: number,
): string {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const { s, l } = rgbToHsl(r, g, b);
  let sat = Math.max(s, minSaturation);
  let light = Math.min(maxLightness, Math.max(0.5, l));

  for (let i = 0; i < 12; i += 1) {
    const [wr, wg, wb] = hslToRgb(hue, sat, light);
    const candidate = rgbToHex(wr, wg, wb);
    if (contrastRatio(READABLE_INK, candidate) >= 4.5) return candidate;
    light = Math.min(0.95, light + 0.02);
  }

  const [wr, wg, wb] = hslToRgb(hue, sat, 0.95);
  return rgbToHex(wr, wg, wb);
}

function ensureWarmNeutral(hex: string, hue: number): string {
  return ensureReadableBaseNeutral(hex, hue, MIN_BASE_NEUTRAL_SATURATION, MAX_BASE_NEUTRAL_LIGHTNESS);
}

/** 53차 검증 — 스튜디오 무채색 배경 + hue별 baseNeutral (이전 상수 재현 가능) */
export function buildThemeFromHueWithNeutral(
  bestHue: number,
  neutralTotal: { r: number; g: number; b: number; count: number },
  options?: { minSaturation?: number; maxLightness?: number },
): ExtractedTheme {
  const minSat = options?.minSaturation ?? MIN_BASE_NEUTRAL_SATURATION;
  const maxL = options?.maxLightness ?? MAX_BASE_NEUTRAL_LIGHTNESS;

  const curve = getPaletteCurve(bestHue);
  const [ar, ag, ab] = hslToRgb(bestHue, curve.accent.s, curve.accent.l);
  const [sr, sg, sb] = hslToRgb(bestHue, curve.accentSoft.s, curve.accentSoft.l);
  const [tr, tg, tb] = hslToRgb(bestHue, curve.accentText.s, curve.accentText.l);
  const accent = rgbToHex(ar, ag, ab);

  const rawBaseNeutral =
    neutralTotal.count > 0
      ? rgbToHex(
          Math.round(neutralTotal.r / neutralTotal.count),
          Math.round(neutralTotal.g / neutralTotal.count),
          Math.round(neutralTotal.b / neutralTotal.count),
        )
      : rgbToHex(sr, sg, sb);

  const baseNeutral =
    minSat === MIN_BASE_NEUTRAL_SATURATION && maxL === MAX_BASE_NEUTRAL_LIGHTNESS
      ? ensureReadableBaseNeutral(rawBaseNeutral, bestHue, minSat, maxL)
      : (() => {
          const normalized = rawBaseNeutral.replace("#", "");
          const bigint = parseInt(normalized, 16);
          const r = (bigint >> 16) & 255;
          const g = (bigint >> 8) & 255;
          const b = bigint & 255;
          const { s, l } = rgbToHsl(r, g, b);
          if (s >= minSat) return rawBaseNeutral;
          const targetL = Math.min(maxL, Math.max(0.5, l));
          const [wr, wg, wb] = hslToRgb(bestHue, minSat, targetL);
          return rgbToHex(wr, wg, wb);
        })();

  return {
    accent,
    accentSoft: rgbToHex(sr, sg, sb),
    accentText: rgbToHex(tr, tg, tb),
    heroScrimFrom: `rgba(${ar},${ag},${ab},0.72)`,
    baseNeutral,
    deepAccent: darken(accent, 0.25),
  };
}

export const STUDIO_NEUTRAL_SAMPLE = { r: 235, g: 232, b: 227, count: 100 } as const;

function buildThemeFromHue(
  bestHue: number,
  neutralTotal: { r: number; g: number; b: number; count: number },
): ExtractedTheme {
  return buildThemeFromHueWithNeutral(bestHue, neutralTotal);
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

// 업로드된 상품 사진들에서 여러 장에 걸쳐 꾸준히 나타나는 색상대를 골라 테마를
// 만든다. 유채색 픽셀을 충분히 찾지 못하면(무채색 상품 등) null을 반환하고,
// 호출부는 카테고리 기본 테마로 폴백해야 한다.
export async function extractProductTheme(imageUrls: string[]): Promise<ExtractedTheme | null> {
  const samples = await Promise.all(
    imageUrls.slice(0, 3).map((url) => sampleImage(url).catch(() => null)),
  );

  const validSamples = samples.filter((s): s is ImageSample => s !== null);
  const mergedHue = mergeHueBuckets(validSamples.map((s) => s.hueBuckets));

  const neutralTotal = { r: 0, g: 0, b: 0, count: 0 };
  for (const sample of validSamples) {
    if (sample.neutral) {
      neutralTotal.r += sample.neutral.r;
      neutralTotal.g += sample.neutral.g;
      neutralTotal.b += sample.neutral.b;
      neutralTotal.count += sample.neutral.count;
    }
  }

  if (!mergedHue) return null;

  const theme = buildThemeFromHue(mergedHue.h, neutralTotal);
  if (process.env.COLOR_EXTRACT_DEBUG === "1") {
    console.log(
      `[color-extract] hue=${mergedHue.h.toFixed(1)}° weight=${mergedHue.weight.toFixed(2)} ` +
        `accent=${theme.accent} baseNeutral=${theme.baseNeutral}`,
    );
  }
  return theme;
}
