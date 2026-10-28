/**
 * 469차 — 지표 정정(문자열 전용: 말뭉치 export HTML을 읽을 뿐, 브라우저·네트워크 없음).
 *  ① 보이는 진한 면(정정): 468차 지표는 섹션 마크업의 인라인 배경만 봐서, 문서 CSS가 `!important`로 칠하는 정보 구간(`[data-info=…]` — points는 진한 면+사진 백드롭)을 놓쳤다.
 *     문서 `<style>`에서 구간별 마지막 배경 선언을 읽어 어두우면 그 섹션 전체를 진한 면으로 센다.
 *  ② 본문 글자: 읽히는 글 노드 중 글자 수 ≥ 20이고 12~20px인 것(문단급)의 크기 중앙값. 줄 글자 수 어림 = 576 ÷ (크기 × 0.95).
 *  ③ 화면 장악 장면: 섹션 선언 min-height ≥ 640px이고 읽히는 큰 글자(≥36px)가 있거나, 추정 높이 ≥ 700 + 큰 글자 ≥ 36 + 사진 ≤ 1.
 * 한계: 추정 높이는 문자·사진 수 어림. CSS 클래스가 정하는 글자 크기(정보 구간 p 16px 등)는 인라인이 아니면 보지 못한다.
 */
import { expandDedupedStyles } from "../lib/style-dedupe";
import { topSections } from "./variety-metrics-463";
import { DARK_LUM, bgLum } from "./variety-metrics-466";
import { bannerDark, estHeight, readableTexts } from "./dynamics-metrics-468";

const rootOf = (sec: string): string => sec.slice(0, sec.indexOf(">") + 1);

/** 문서 CSS에서 `[data-info="zone"]{…background:…}` 중 `!important`인 마지막 선언 → zone별 상대 휘도(없으면 null) */
export function infoZoneLum(html: string): Record<string, number | null> {
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]!).join("\n");
  const out: Record<string, number | null> = {};
  for (const r of css.matchAll(/([^{}]*)\{([^}]*)\}/g)) {
    const zm = /\[data-info="(\w+)"\]\s*$/.exec(r[1]!.trim().split(",").pop()!.trim());
    if (!zm) continue;
    const bg = /(?:^|;)\s*background(?:-color)?:\s*([^;]*?)\s*!important/.exec(r[2]!);
    if (!bg) continue;
    out[zm[1]!] = bgLum(bg[1]!);
  }
  return out;
}

/** 정보 구간 섹션이 문서 CSS로 어두운 면인지(null=판단 불가 → 인라인 기준) */
function infoZoneOf(sec: string): string | null {
  return /data-info="(\w+)"/.exec(rootOf(sec))?.[1] ?? null;
}

export function visibleDark2(html: string): number {
  const lum = infoZoneLum(html);
  let dark = 0; let all = 0;
  for (const sec of topSections(expandDedupedStyles(html))) {
    const h = estHeight(sec);
    all += h;
    const z = infoZoneOf(sec);
    if (/pagzly-illustration-banner/.test(rootOf(sec))) dark += h * bannerDark(sec);
    else if (z && lum[z] != null) dark += lum[z]! < DARK_LUM ? h : 0;
    else {
      const m = /(?:^|;)background:([^;"]+)/.exec(rootOf(sec));
      const l = m ? bgLum(m[1]!) : null;
      dark += l != null && l < DARK_LUM ? h : 0;
    }
  }
  return all ? dark / all : 0;
}

export function darkInfoZones(html: string): number {
  const lum = infoZoneLum(html);
  return topSections(expandDedupedStyles(html)).filter((s) => { const z = infoZoneOf(s); return !!z && lum[z] != null && lum[z]! < DARK_LUM; }).length;
}

/** 문단급 본문 글자 크기 목록 */
export function bodySizes(html: string): number[] {
  const out: number[] = [];
  for (const sec of topSections(expandDedupedStyles(html))) for (const t of readableTexts(sec)) if ([...t.text].length >= 20 && t.size >= 12 && t.size <= 20) out.push(t.size);
  return out;
}
export function bodyMedian(html: string): number {
  const a = bodySizes(html).sort((x, y) => x - y);
  return a.length ? a[Math.floor(a.length / 2)]! : 0;
}
export const charsPerLine = (size: number): number => 576 / (size * 0.95);

/** 화면 장악 장면 수 */
export function sceneCount(html: string): number {
  let n = 0;
  for (const sec of topSections(expandDedupedStyles(html))) {
    const mh = Math.max(0, ...[...sec.matchAll(/min-height:\s*(\d+)px/g)].map((m) => Number(m[1])));
    const big = Math.max(0, ...readableTexts(sec).map((t) => t.size).filter((s) => s < 140));
    const photos = (sec.match(/<img\b(?![^>]*aria-hidden="true")/g) ?? []).length;
    if ((mh >= 640 && big >= 36) || (estHeight(sec) >= 700 && big >= 36 && photos <= 1)) n += 1;
  }
  return n;
}
