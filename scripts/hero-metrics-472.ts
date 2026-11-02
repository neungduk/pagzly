/**
 * 472차 — 시각 시그니처·상품 히어로 색 계열 지표(문자열 전용).
 *  V1 7칸: bg(hue6×L3) · titleAlign · titlePos · frame · photoArea · priceShow · glance — 쌍 차이 ≥ 4
 *  V2 같은 상품 8아키타입 bg hue bin 고유 수 ≥ 5
 */
import { expandDedupedStyles } from "../lib/style-dedupe";
import { ARCHETYPE_IDS, type ArchetypeId } from "../lib/page-archetype-v5";
import { HERO_STACK, VISUAL_SIG_KEYS, recipeBgToken, visualSigDiff, visualSigOf, type VisualSig } from "../lib/hero-stack-v5";
import { heroFloorViolations, ghostStats, scenePairsWithoutInterlude, tallAdjacent } from "./hero-metrics-471";

export { heroFloorViolations, ghostStats, scenePairsWithoutInterlude, tallAdjacent };

const cssOf = (html: string): string => [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]!).join("\n");

/** HTML에서 시각 시그니처 추출(data-pz-vsig + CSS 변수 / 레시피 폴백) */
export function visualSig(html: string, arch?: ArchetypeId): VisualSig {
  const hero = /<section[^>]*data-hero-v2[\s\S]*?<\/section>/.exec(expandDedupedStyles(html))?.[0] ?? "";
  const id = (arch ?? (/data-pz-vsig="([a-z]+)"/.exec(hero)?.[1] as ArchetypeId | undefined)) ?? "catalog";
  const bgAttr = /data-pz-vsig-bg="([^"]+)"/.exec(hero)?.[1];
  const css = cssOf(html);
  const vsigRule = [...css.matchAll(new RegExp(`\\[data-pz-vsig="${id}"\\][^]{0,80}\\{([^}]*)\\}`, "g"))].map((m) => m[1]).join(";");
  const varOf = (k: string): string => new RegExp(`--pz-vsig-${k}:([^;]+)`).exec(vsigRule)?.[1]?.trim() ?? "";
  const fromCss: Partial<VisualSig> = {
    titleAlign: varOf("ta"),
    titlePos: varOf("tp"),
    frame: varOf("fr"),
    photoArea: varOf("pa"),
    priceShow: varOf("pr"),
    glance: varOf("gl"),
  };
  const base = visualSigOf(id, bgAttr ?? "h0L1");
  return {
    bg: bgAttr ?? base.bg,
    titleAlign: fromCss.titleAlign || base.titleAlign,
    titlePos: fromCss.titlePos || base.titlePos,
    frame: fromCss.frame || base.frame,
    photoArea: fromCss.photoArea || base.photoArea,
    priceShow: fromCss.priceShow || base.priceShow,
    glance: fromCss.glance || base.glance,
  };
}

export const vsigDiff = visualSigDiff;

/** 레시피 표만으로 쌍 차이(렌더 전 단위 검사) */
export function recipeVsigDiff(a: ArchetypeId, b: ArchetypeId): number {
  const token = (id: ArchetypeId): string => recipeBgToken(HERO_STACK[id].faceMode, HERO_STACK[id].hueShift);
  return visualSigDiff(visualSigOf(a, token(a)), visualSigOf(b, token(b)));
}

export function uniqueBgBins(sigs: VisualSig[]): number {
  // hue×명도 토큰 전체(흰/검은 면과 채색 면을 구분)
  return new Set(sigs.map((s) => s.bg)).size;
}

export { VISUAL_SIG_KEYS, ARCHETYPE_IDS };
