/**
 * 413차 — 스타일 스펙 오프라인 린트(글자 대비). 서버 전용 색 추출(color-extract → sharp)을 쓰므로 클라이언트 번들에서는 import하지 않는다.
 * 린트 스크립트·회귀만 쓴다.
 */
import { buildThemeFromHueWithNeutral, STUDIO_NEUTRAL_SAMPLE } from "@/lib/color-extract";
import { getCategoryTheme, type CategoryTheme } from "@/lib/category-theme";
import { contrastRatioToken, FLAT_PAPER, readableTextAccent, readableTextDeep } from "@/lib/design-tokens";
import { HERO_CAPTION } from "@/lib/hero-variants";
import { applyPackTone, packFromSpec, type SpecAxes } from "@/lib/style-packs";
import { infoColorsOf } from "@/lib/info-style";

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

/** 415차 — 인포 구간(info=bold|dramatic) 글자 대비: 스펙 × hue. info가 calm이면 점검 대상이 아니다 */
export function infoContrastLint(axes: SpecAxes, hue: number): string[] {
  if (axes.info === "calm") return [];
  const pack = packFromSpec(axes);
  const base = { ...getCategoryTheme("의류/패션"), ...buildThemeFromHueWithNeutral(hue, STUDIO_NEUTRAL_SAMPLE) } as CategoryTheme;
  const t = applyPackTone(base, pack);
  const c = infoColorsOf(t);
  const W = c.paper;
  const onDeep = blend([255, 255, 255, 0.92], c.deep);
  const checks: Array<[string, number, number]> = [
    ["인포 흰 글자 on 포인트색(비교 기둥·강조 카드)", contrastRatioToken(W, c.accent), 4.5],
    ["인포 흰 글자 on 진한 색(포인트 카드·반전 카드)", contrastRatioToken(W, c.deep), 4.5],
    ["인포 포인트 카드 본문 on 진한 색", contrastRatioToken(onDeep, c.deep), 4.5],
    ["인포 본문(잉크) on 흰 카드", contrastRatioToken(c.ink, W), 4.5],
    ["인포 본문(잉크) on 중립 띠", contrastRatioToken(c.ink, c.base), 4.5],
    ["인포 본문(잉크) on 연한 포인트 띠", contrastRatioToken(c.ink, c.soft), 4.5],
    ["인포 앞 절 굵은 글(진한 색) on 흰 카드", contrastRatioToken(c.deep, W), 4.5],
    ["인포 큰 숫자(포인트색) on 중립 띠", contrastRatioToken(c.accent, c.base), 3],
    ["인포 큰 숫자(포인트색) on 흰 카드", contrastRatioToken(c.accent, W), 3],
    ["인포 숫자 칸(진한 색) on 중립 띠", contrastRatioToken(c.deep, c.base), 4.5],
  ];
  return checks.filter(([, r, min]) => r < min).map(([label, r, min]) => `${label} ${r.toFixed(2)} < ${min} (hue ${hue})`);
}
