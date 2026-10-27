/**
 * 466차 — 아키타입 거시 차이 대리 지표(문자열 전용: export HTML을 읽을 뿐, 브라우저·네트워크 없음).
 * 465차의 서명 튜플 거리는 포화돼(0.97) 차이를 못 가렸다 → 눈에 보이는 큰 축을 직접 잰다:
 *  ① 진한 면 비율(본문 섹션 마크업 중 배경이 어두운 요소가 차지하는 문자 수 비율; 중첩된 어두운 요소는 한 번만 센다)
 *  ② 히어로 면이 어두운지 ③ 가운데 정렬 비율 ④ 계열별 변형 집합 ⑤ 평균 반경·그림자 유무 ⑥ 제목 크기/굵기 분포
 * 한계: 문자 수는 실제 높이가 아니다(사진·여백 단위 빠짐). 그라데이션은 첫 색 기준. 알파 < 0.6 배경은 어둡다고 보지 않는다.
 */
import { pageMetrics, signatureOf, topSections } from "./variety-metrics-463";

const VOID = new Set(["br", "img", "hr", "input", "meta", "link", "path", "circle", "rect", "line", "polyline", "use", "stop", "ellipse", "polygon", "source", "wbr"]);
export const DARK_LUM = 0.18;

function relLum(r: number, g: number, b: number): number {
  const c = [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}

/** 배경 선언 값에서 첫 색의 상대 휘도(알파 < 0.6이면 null) */
export function bgLum(value: string): number | null {
  const hex = /#([0-9a-f]{6})\b/i.exec(value);
  const rgb = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/i.exec(value);
  const hexAt = hex ? hex.index : Infinity;
  const rgbAt = rgb ? rgb.index : Infinity;
  if (hexAt === Infinity && rgbAt === Infinity) return null;
  if (hexAt < rgbAt) { const h = hex![1]!; return relLum(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)); }
  if (rgb![4] !== undefined && Number(rgb![4]) < 0.6) return null;
  return relLum(Number(rgb![1]), Number(rgb![2]), Number(rgb![3]));
}

function styleBg(attrs: string): number | null {
  const st = /style="([^"]*)"/.exec(attrs)?.[1];
  if (!st) return null;
  const m = /(?:^|;)\s*background(?:-color)?:\s*((?:linear-gradient\([^;]*\))|(?:radial-gradient\([^;]*\))|[^;]+)/.exec(st);
  return m ? bgLum(m[1]!) : null;
}

/** 한 섹션 마크업에서 어두운 배경 요소가 차지하는 문자 수 비율(0~1) */
export function darkShare(sec: string): number {
  const re = /<(\/?)([a-zA-Z0-9]+)([^>]*?)(\/?)>/g;
  const stack: Array<{ tag: string; start: number; dark: boolean }> = [];
  let darkChars = 0;
  let darkDepth = 0;
  for (let m = re.exec(sec); m; m = re.exec(sec)) {
    const [whole, close, tag, attrs, self] = m as unknown as [string, string, string, string, string];
    const t = tag.toLowerCase();
    if (VOID.has(t) || self) continue;
    if (!close) {
      const l = t === "svg" ? null : styleBg(attrs);
      const dark = l !== null && l < DARK_LUM;
      stack.push({ tag: t, start: m.index, dark });
      if (dark) darkDepth += 1;
    } else {
      const top = stack.pop();
      if (!top) continue;
      if (top.dark) { darkDepth -= 1; if (darkDepth === 0) darkChars += m.index + whole.length - top.start; }
    }
  }
  return sec.length ? Math.min(1, darkChars / sec.length) : 0;
}

export type MacroMetrics = {
  /** 본문 섹션(히어로 제외) 진한 면 비율 */
  darkRatio: number;
  heroDark: boolean;
  heroVariant: string;
  centerRatio: number;
  centerRun: number;
  flatZones: number;
  /** 계열 → 변형 목록 */
  variants: Record<string, string[]>;
  /** 평균 border-radius(px, 1~99), 그림자 있는 요소 비율 */
  avgRadius: number;
  shadowShare: number;
  /** 제목(font-size 22px 이상 선언)의 평균 굵기 */
  titleWeight: number;
};

export function heroOf(html: string): { dark: boolean; variant: string } {
  const h = /<section[^>]*pagzly-hero[^>]*>/.exec(html)?.[0] ?? "";
  const l = styleBg(h);
  const variant = /data-hero-v2="(\w)"/.exec(h)?.[1] ?? "?";
  return { dark: l !== null && l < DARK_LUM, variant };
}

export function macroMetrics(html: string): MacroMetrics {
  const secs = topSections(html);
  const pm = pageMetrics(html);
  const total = secs.reduce((a, s) => a + s.length, 0);
  const dark = secs.reduce((a, s) => a + darkShare(s) * s.length, 0);
  const variants: Record<string, string[]> = {};
  for (const s of secs) {
    const sig = signatureOf(s);
    const [fam, v] = sig.split(".");
    if (fam && v && /^(benefits|concern|story|spec|phototext|faq|proof|touch|steps|statement)$/.test(fam)) (variants[fam] ??= []).push(v);
  }
  const body = secs.join("");
  const radii = [...body.matchAll(/border-radius:\s*(\d+)px/g)].map((m) => Number(m[1])).filter((x) => x > 0 && x < 100);
  const shadows = [...body.matchAll(/box-shadow:\s*([^;"]+)/g)].filter((m) => !/^none/.test(m[1]!.trim())).length;
  const radiusN = [...body.matchAll(/border-radius:/g)].length;
  const weights = [...body.matchAll(/font-size:\s*(\d+)px[^"]*?font-weight:\s*(\d+)/g)].filter((m) => Number(m[1]) >= 22).map((m) => Number(m[2]));
  const hero = heroOf(html);
  return {
    darkRatio: total ? dark / total : 0, heroDark: hero.dark, heroVariant: hero.variant,
    centerRatio: pm.centerRatio, centerRun: pm.centerRun, flatZones: pm.flatZones, variants,
    avgRadius: radii.length ? radii.reduce((a, b) => a + b, 0) / radii.length : 0,
    shadowShare: radiusN ? shadows / radiusN : 0,
    titleWeight: weights.length ? weights.reduce((a, b) => a + b, 0) / weights.length : 0,
  };
}
