/**
 * 471차 — 첫 화면·장식 숫자·높이 리듬 지표(문자열 전용; 브라우저·네트워크 없음).
 *  H1 첫 화면 시그니처: [히어로 변형, 히어로 사진 비율 규칙, 가격 줄 규칙, 한눈에 보기 규칙, 탭 칩 규칙, 장식 숫자 위치 규칙] 중 아키타입 쌍이 다른 칸 수
 *     (히어로 변형은 마크업의 data-hero-v2, 나머지는 문서 CSS에서 해당 선택자의 규칙 글자 — 같은 글자면 같은 구성)
 *  H2 히어로 사진 하한: 사진 틀의 폭(컨테이너 750 기준 %, flex 비율·max-width 고려)이 70% 미만이고 높이가 360px 미만이면 위반
 *  H3 장식 숫자(고스트 글자): 음수 오프셋/우상단 고정(잘림 위험) 수, 위치 토큰
 *  H4 높이 리듬: 장면(min-height ≥ 640) 쌍 사이에 짧은 구간(추정 높이 ≤ 260px)이 있는가
 */
import { expandDedupedStyles } from "../lib/style-dedupe";
import { topSections } from "./variety-metrics-463";
import { estHeight } from "./dynamics-metrics-468";

const cssOf = (html: string): string => [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]!).join("\n");

/** 선택자에 key가 들어간 규칙들의 글자(순서 유지) */
function rulesWith(css: string, key: RegExp): string {
  const out: string[] = [];
  for (const r of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) if (key.test(r[1]!)) out.push(`${r[1]!.trim()}{${r[2]}}`);
  return out.join("");
}

export type HeroSig = { hero: string; ratio: string; strip: string; glance: string; nav: string; ghost: string };
export const SIG_KEYS: Array<keyof HeroSig> = ["hero", "ratio", "strip", "glance", "nav", "ghost"];

export function heroSig(html: string): HeroSig {
  const css = cssOf(html);
  // V5 첫 화면 규칙은 data-pz-hs 표식이 든 선택자 안에만 있다(기존 규칙과 구분)
  return {
    hero: /<section[^>]*data-hero-v2="(\w)"/.exec(html)?.[1] ?? "",
    ratio: rulesWith(css, /data-pz-hs="ratio"/),
    strip: rulesWith(css, /data-pz-hs="strip"/),
    glance: rulesWith(css, /data-pz-hs="glance"/),
    nav: rulesWith(css, /data-pz-hs="nav"/),
    ghost: (html.match(/data-pz-ghostpos="(\w+)"/)?.[1] ?? ""),
  };
}
export const sigDiff = (a: HeroSig, b: HeroSig): number => SIG_KEYS.filter((k) => a[k] !== b[k]).length;

/** 히어로 사진 틀 목록: [폭 비율(0~1), 높이 px] */
export function heroPhotos(html: string): Array<{ w: number; h: number; style: string }> {
  const hero = /<section[^>]*data-hero-v2[\s\S]*?<\/section>/.exec(expandDedupedStyles(html))?.[0] ?? "";
  const out: Array<{ w: number; h: number; style: string }> = [];
  for (const m of hero.matchAll(/<div[^>]*data-hero-photo[^>]*style="([^"]*)"/g)) {
    const st = m[1]!;
    const pct = /(?:^|;)width:(\d+(?:\.\d+)?)%/.exec(st)?.[1];
    const flex = /flex:0 0 (\d+)%/.exec(st)?.[1];
    const maxw = /max-width:(\d+)px/.exec(st)?.[1];
    let w = pct ? Number(pct) / 100 : flex ? Number(flex) / 100 : 1;
    if (maxw) w = Math.min(w, Number(maxw) / 750);
    const ar = /aspect-ratio:\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/.exec(st);
    const mh = /max-height:(\d+)px/.exec(st)?.[1];
    let h = ar ? (w * 750 * Number(ar[2])) / Number(ar[1]) : 0;
    if (mh) h = Math.min(h, Number(mh));
    out.push({ w, h, style: st });
  }
  return out;
}
export const heroFloorViolations = (html: string): number => {
  // E(타이포) 히어로의 사진은 flex 36%·max-width 180px 원형 — 구조상 하한 미달
  if (/<section[^>]*data-hero-v2="E"/.test(html) && /data-hero-photo/.test(html.slice(html.indexOf('data-hero-v2="E"'), html.indexOf('data-hero-v2="E"') + 6000))) return 1;
  // 히어로 본체 사진만(고스트 스티커 등 data-hero-photo 표식이 붙은 작은 span은 div가 아니라 제외됨)
  const ph = heroPhotos(html).filter((p) => p.h > 0 || p.w < 1);
  return ph.filter((p) => p.w < 0.7 && p.h < 360).length;
};

/** 고스트 글자: 잘림 위험 수(음수 오프셋·우상단 고정) */
export function ghostStats(html: string): { total: number; risky: number; topRight: number } {
  let total = 0; let risky = 0; let topRight = 0;
  for (const sec of topSections(expandDedupedStyles(html))) {
    for (const m of sec.matchAll(/<span([^>]*(?:data-pz-ghost|data-pz-ghostpos)[^>]*)>([^<]{1,12})<\/span>/g)) {
      const st = /style="([^"]*)"/.exec(m[1]!)?.[1] ?? "";
      const size = Number(/font-size:(\d+)px/.exec(st)?.[1] ?? 0);
      if (size < 36) continue;
      total += 1;
      const right = /right:(-?\d+)px/.exec(st)?.[1]; const left = /left:(-?\d+)px/.exec(st)?.[1]; const top = /top:(-?\d+)px/.exec(st)?.[1];
      if ((right && Number(right) < 0) || (left && Number(left) < 0) || (top && Number(top) < 0)) risky += 1;
      if (right !== undefined && top !== undefined && Number(top) <= 8) topRight += 1;
    }
  }
  return { total, risky, topRight };
}

/** 장면 쌍 사이에 짧은 구간이 없는 쌍 수 */
export function scenePairsWithoutInterlude(html: string): { pairs: number; missing: number } {
  const secs = topSections(expandDedupedStyles(html));
  const idx = secs.map((s, i) => (Math.max(0, ...[...s.matchAll(/min-height:\s*(\d+)px/g)].map((m) => Number(m[1]))) >= 640 ? i : -1)).filter((i) => i >= 0);
  let missing = 0;
  for (let k = 1; k < idx.length; k += 1) {
    const between = secs.slice(idx[k - 1]! + 1, idx[k]!);
    if (!between.some((s) => estHeight(s) <= 260)) missing += 1;
  }
  return { pairs: Math.max(0, idx.length - 1), missing };
}

/** 큰 블록(추정 높이 ≥ 450px)이 바로 이어지는 쌍 수 — 높이 리듬이 단조로운 정도 */
export function tallAdjacent(html: string): number {
  const hs = topSections(expandDedupedStyles(html)).map(estHeight);
  let n = 0;
  for (let i = 1; i < hs.length; i += 1) if (hs[i]! >= 450 && hs[i - 1]! >= 450) n += 1;
  return n;
}
