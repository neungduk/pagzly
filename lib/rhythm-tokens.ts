/**
 * 408차 — 카테고리 여백 리듬을 px 숫자 토큰으로 낸다.
 * 원천은 getCategoryRhythm()의 클래스 문자열 한 곳(기본 화면 불변). export는 이 숫자로 `--pz-*` 변수를 만들고,
 * 라이브는 스타일 팩이 있을 때만 같은 숫자(getRhythmTokens)로 같은 이름의 변수를 루트에 얹는다.
 * padYScale(스타일 팩)은 위·아래 세로 여백에만 곱한다. 1이면 예전 값과 정확히 같다.
 */
import { getCategoryRhythm } from "@/lib/design-tokens";
import { designV4On } from "@/lib/design-v4";
import { SPACE_SNAP_BOUNDS, SPACE_V4 } from "@/lib/design-tokens-v4";

export type RhythmTokens = {
  heroX: number;
  heroB: number;
  padY: number;
  padTy: number;
  padCy: number;
  padX: number;
  heroMin: string;
  ptT: number;
  ptB: number;
  ptX: number;
};

const unit = (cls: string, re: RegExp, fallback: number) => Number(re.exec(cls)?.[1] ?? fallback) * 4;

export function getRhythmTokens(category: string, wide: boolean, padYScale = 1): RhythmTokens {
  const rhythm = getCategoryRhythm(category);
  // 442차 2-C — v4는 배율 뒤 좁은 폭 값을 3단(32·48·64)으로 스냅(64×0.875=56, 48×0.75=36 같은 중간값 제거). 경계값은 위 단으로(40→48, 56→64).
  // 넓은 폭은 그대로. 라이브(팩 변수 rhythmLiveVars)와 export가 이 함수 한 곳을 읽는다
  const snap3 = (v: number) => (wide || !designV4On() || v <= 8 ? v : v < SPACE_SNAP_BOUNDS[0] ? SPACE_V4.sm : v < SPACE_SNAP_BOUNDS[1] ? SPACE_V4.md : SPACE_V4.lg);
  const scaleY = (px: number) => snap3(padYScale === 1 ? px : Math.round(px * padYScale));
  const padY = (cls: string) => (wide ? unit(cls, /pz:py-(\d+)/, 28) : unit(cls, /(?:^|\s)py-(\d+)/, 16));
  const side = (cls: string, kind: "t" | "b" | "x", fallback: number) =>
    wide
      ? unit(cls, new RegExp(`pz:p${kind}-(\\d+)`), fallback)
      : unit(cls, new RegExp(`(?:^|\\s)p${kind}-(\\d+)`), fallback);
  const x = wide ? unit(rhythm.generousPadClass, /pz:px-(\d+)/, 10) : unit(rhythm.generousPadClass, /(?:^|\s)px-(\d+)/, 6);
  const heroMin = wide
    ? `${Number(/pz:min-h-\[(\d+)px\]/.exec(rhythm.heroMinClass)?.[1] ?? 760)}px`
    : `${Number(/(?:^|\s)min-h-\[(\d+)svh\]/.exec(rhythm.heroMinClass)?.[1] ?? 85)}svh`;
  const pt = rhythm.pointTextPadClass;
  // 401차 — 히어로 글 영역 여백도 라이브 heroOverlayClass(px-N pb-N / pz:px-N pz:pb-N)와 같게
  const hero = rhythm.heroOverlayClass;
  return {
    heroX: side(hero, "x", wide ? 10 : 6),
    heroB: side(hero, "b", wide ? 20 : 14),
    padY: scaleY(padY(rhythm.generousPadClass)),
    padTy: scaleY(padY(rhythm.trustPadClass)),
    padCy: scaleY(padY(rhythm.ctaPadClass)),
    padX: x,
    heroMin,
    ptT: scaleY(side(pt, "t", 10)),
    ptB: scaleY(side(pt, "b", 16)),
    ptX: side(pt, "x", 6),
  };
}

/** export `.pagzly-wrap` 변수 선언 — 예전 sectionPadVarsCss와 같은 문자열 */
export function rhythmVarsCss(category: string, wide: boolean, padYScale = 1): string {
  const t = getRhythmTokens(category, wide, padYScale);
  return `--pz-hero-x:${t.heroX}px;--pz-hero-b:${t.heroB}px;--pz-pad-y:${t.padY}px;--pz-pad-ty:${t.padTy}px;--pz-pad-cy:${t.padCy}px;--pz-pad-x:${t.padX}px;--pz-hero-min:${t.heroMin};--pz-pt-t:${t.ptT}px;--pz-pt-b:${t.ptB}px;--pz-pt-x:${t.ptX}px`;
}

/**
 * 라이브 루트 style — 스타일 팩이 있을 때만 호출한다(기본 팩은 호출하지 않아 예전 화면 그대로).
 * 좁은 칸(-b)과 넓은 칸(-w) 값을 모두 싣고, globals.css의 `[data-pz-pack]` 규칙이 칸 폭에 따라 고른다.
 */
export function rhythmLiveVars(category: string, padYScale: number): Record<string, string> {
  const b = getRhythmTokens(category, false, padYScale);
  const w = getRhythmTokens(category, true, padYScale);
  return {
    "--pz-pad-y-b": `${b.padY}px`,
    "--pz-pad-y-w": `${w.padY}px`,
    "--pz-pad-ty-b": `${b.padTy}px`,
    "--pz-pad-ty-w": `${w.padTy}px`,
    "--pz-pad-cy-b": `${b.padCy}px`,
    "--pz-pad-cy-w": `${w.padCy}px`,
    "--pz-pt-t-b": `${b.ptT}px`,
    "--pz-pt-t-w": `${w.ptT}px`,
    "--pz-pt-b-b": `${b.ptB}px`,
    "--pz-pt-b-w": `${w.ptB}px`,
  };
}
