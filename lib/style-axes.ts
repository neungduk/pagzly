/**
 * 413차 — 스타일 스펙의 "재료": 서체 프리셋(Noto Sans/Serif 2종 안의 굵기·자간·크기 묶음), 연속 톤 파라미터, 글자 대비 점검.
 * 스타일 디렉터(lib/style-director.ts)와 오프라인 린트(scripts/_413cha-lint.ts)·회귀가 같은 값을 쓴다. 렌더러는 이 파일을 모른다 —
 * 렌더러가 보는 것은 SpecAxes(lib/style-packs.ts)뿐이다. 새 웹폰트 없음: layout.tsx가 이미 싣는 굵기만 쓴다
 * (Sans 400/500/600/700/900, Serif 400/600/700).
 */
import { buildThemeFromHueWithNeutral, STUDIO_NEUTRAL_SAMPLE } from "@/lib/color-extract";
import { getCategoryTheme, type CategoryTheme } from "@/lib/category-theme";
import { contrastRatioToken, FLAT_PAPER, readableTextAccent, readableTextDeep } from "@/lib/design-tokens";
import { HERO_CAPTION } from "@/lib/hero-variants";
import { applyPackTone, packFromSpec, type SpecAxes } from "@/lib/style-packs";

/** 제목 크기 묶음 — TITLE_SCALES(style-packs.ts)에 이 이름들이 들어 있다 */
export type TypePresetName = "base" | "serif-bold" | "serif-regular" | "serif-mid" | "sans-black" | "sans-medium" | "sans-semi";

export const TYPE_PRESETS: Record<TypePresetName, { headline: SpecAxes["headline"]; scale: string }> = {
  base: { headline: null, scale: "base" },
  "serif-mid": { headline: { kind: "serif", weight: 600, ls: -0.015 }, scale: "editorial" },
  "serif-bold": { headline: { kind: "serif", weight: 700, ls: -0.02 }, scale: "editorial" },
  "serif-regular": { headline: { kind: "serif", weight: 400, ls: -0.01 }, scale: "editorial" },
  "sans-black": { headline: { kind: "sans-display", weight: 900, ls: -0.04 }, scale: "bold" },
  "sans-semi": { headline: { kind: "sans-display", weight: 600, ls: -0.03 }, scale: "mono" },
  "sans-medium": { headline: { kind: "sans-display", weight: 500, ls: -0.02 }, scale: "mono" },
};

export type NeutralBand = "tinted" | "ivory" | "cool" | "plain";

/**
 * 연속 톤 파라미터 → ToneSpec. sat 0~1(채도 배율), depth 0~1(0 = 밝고 부드러운 포인트색, 1 = 깊은 포인트색),
 * neutral = 중립 띠 색(상품 hue는 항상 유지되고, 띠 색만 고정되는 옵션).
 * 범위는 대비 점검(contrastLint)을 통과하는 구간으로 제한한다.
 */
export function makeTone(sat: number, depth: number, neutral: NeutralBand): NonNullable<SpecAxes["tone"]> {
  const s = Math.min(1, Math.max(0.2, sat));
  const d = Math.min(1, Math.max(0, depth));
  const accentL = +(0.34 - 0.12 * d).toFixed(3); // 0.34(밝은 쪽) ~ 0.22(깊은 쪽)
  const deepL = +(0.17 - 0.07 * d).toFixed(3); // 0.17 ~ 0.10
  const tone: NonNullable<SpecAxes["tone"]> = {
    satMul: +s.toFixed(3),
    accentL,
    deepL,
    softL: 0.93,
    softSatMul: +(s * 0.5).toFixed(3),
    baseL: 0.95,
    baseSatMul: 0.3,
  };
  if (neutral === "ivory") Object.assign(tone, { baseHue: 40, baseSat: 0.45 });
  else if (neutral === "cool") Object.assign(tone, { baseHue: 215, baseSat: 0.22, baseL: 0.955 });
  else if (neutral === "plain") Object.assign(tone, { baseHue: 0, baseSat: 0, baseL: 0.96 });
  return tone;
}

const blend = (fg: [number, number, number, number], bg: string) => {
  const n = parseInt(bg.slice(1), 16);
  const b = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const c = [0, 1, 2].map((i) => Math.round(fg[i]! * fg[3] + b[i]! * (1 - fg[3])));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};

/** 스펙 × hue 하나의 글자 대비 점검 결과(실패한 항목 문장 목록, 비면 통과) */
export function contrastLint(axes: SpecAxes, hue: number): string[] {
  // 톤이 없으면(classic 색) 기존 화면 값이라 점검 대상이 아니다(기본 화면 불변 원칙)
  if (axes.tone === null) return [];
  const pack = packFromSpec(axes);
  const base = { ...getCategoryTheme("의류/패션"), ...buildThemeFromHueWithNeutral(hue, STUDIO_NEUTRAL_SAMPLE) } as CategoryTheme;
  const t = applyPackTone(base, pack);
  const sub = blend([27, 27, 24, 0.7], t.baseNeutral);
  const checks: Array<[string, number, number]> = [
    ["요약 칩 글자", contrastRatioToken(t.deepAccent, FLAT_PAPER), 4.5],
    ["강조 글자(큰 글자)", contrastRatioToken(readableTextAccent(t, 3), FLAT_PAPER), 3],
  ];
  if (axes.hero !== "bleed-bottom") {
    checks.push(
      ["히어로 라벨(띠)", contrastRatioToken(readableTextDeep(t), t.baseNeutral), 4.5],
      ["히어로 라벨(흰 바탕)", contrastRatioToken(readableTextDeep(t), "#FFFFFF"), 4.5],
      ["캡션 제목", contrastRatioToken(HERO_CAPTION.ink, t.baseNeutral), 4.5],
      ["캡션 부제", contrastRatioToken(sub, t.baseNeutral), 4.5],
    );
  }
  if (axes.anchor === "tabs") checks.push(["앵커 탭 글자", contrastRatioToken(t.deepAccent, t.baseNeutral), 4.5]);
  if (axes.heading === "left-eyebrow") checks.push(["소제목 순번 라벨", contrastRatioToken(blend([27, 27, 24, 0.68], FLAT_PAPER), FLAT_PAPER), 4.5]);
  return checks.filter(([, r, min]) => r < min).map(([label, r, min]) => `${label} ${r.toFixed(2)} < ${min} (hue ${hue})`);
}

export const HUES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330] as const;
