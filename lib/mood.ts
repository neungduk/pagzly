/**
 * 436차 1-2·1-5 — mood 토큰 적용. 임팩트 블록 마크업은 지금 값(배율 1.0)으로 만들고, mood가 있으면 마지막에 이 함수가
 * 섹션 상하 여백·모서리 반경·그림자 세기·제목 굵기·자간을 토큰 배율로 바꾼다(문자열 후처리라 마크업 본문은 한 벌).
 * 라이브·export가 같은 impactHtml을 쓰므로 패리티가 유지된다. mood가 없으면(유형 미정·플래그 off) 입력을 그대로 돌려준다.
 *
 * 간격·반경·그림자 토큰 단계(1-5): 여백 조밀 0.85 · 보통 1 · 여유 1.2 / 반경 0.2~1.8배 / 그림자 0.5~1.4배 — mood가 단계를 고른다.
 */
import { MOODS, type MoodId, type MoodTokens } from "@/lib/archetype-recipes";
import { DETAIL_FONT_STACK } from "@/lib/detail-typography";
import { designV4On } from "@/lib/design-v4";

export const NEUTRAL_MOOD: MoodTokens = { pad: 1, r: 1, sh: 1, divider: "wave", titleWeight: 800, titleTracking: "-0.02em", illust: "solid" };

export function moodOf(id: string | undefined | null): MoodTokens {
  return id && id in MOODS ? MOODS[id as MoodId] : NEUTRAL_MOOD;
}

const TITLE_FF = `font-family:${DETAIL_FONT_STACK.sansDisplayHeadline}`;
const scaleRadius = (v: string, r: number): string =>
  v.replace(/(\d+(?:\.\d+)?)px/g, (m, n: string) => (Number(n) >= 100 || Number(n) === 0 ? m : `${Math.max(1, Math.round(snapRadius(Number(n)) * r))}px`));

/** 436차 1-5 — 토큰 단계: 임팩트 블록마다 제각각이던 값(여백 32/40/44/48/56/64, 반경 6/10/12/14/18/28, 그림자 알파 0.06~0.28)을 단계로 맞춘다 */
export const PAD_TIERS = [32, 48, 64] as const; // 조밀 · 보통 · 여유
export const RADIUS_TIERS = [8, 16, 24] as const; // 작게 · 보통 · 크게(알약 999px·원 50%는 그대로)
export const SHADOW_ALPHA_TIERS = [0.1, 0.18] as const; // 약 · 강
const snapPad = (n: number): number => (n <= 36 ? PAD_TIERS[0] : n <= 52 ? PAD_TIERS[1] : PAD_TIERS[2]);
/** 3단 중 가장 가까운 값(441차 v4 세로 리듬) */
export const nearestPad = (n: number): number => PAD_TIERS.reduce((best, t) => (Math.abs(t - n) < Math.abs(best - n) ? t : best), PAD_TIERS[0] as number);
const snapRadius = (n: number): number => (n <= 9 ? RADIUS_TIERS[0] : n <= 20 ? RADIUS_TIERS[1] : RADIUS_TIERS[2]);
const snapAlpha = (a: number): number => (a <= 0.12 ? SHADOW_ALPHA_TIERS[0] : SHADOW_ALPHA_TIERS[1]);

export function applyMood(html: string, k: MoodTokens): string {
  let out = html;
  {
    // 첫 태그(섹션)의 상하 여백만 배율 적용: padding:Apx Bpx(Cpx) 형태의 첫 값(상)과 마지막 값(하)
    out = out.replace(/^(<section[^>]*?style="[^"]*?padding:)(\d+)px(?: (\d+)px)?(?: (\d+)px)?(?: (\d+)px)?/, (_m, pre: string, a: string, b?: string, c?: string, d?: string) => {
      // 441차 1-6(v4) — 배율 뒤 3단 스케일로 다시 스냅(27~77px 12종 → 32·48·64). mood 개성은 단 이동으로만
      const sc = (v: string) => `${designV4On() ? nearestPad(snapPad(Number(v)) * k.pad) : Math.round(snapPad(Number(v)) * k.pad)}px`;
      return `${pre}${sc(a)}${b ? ` ${b}px` : ""}${c ? ` ${sc(c)}` : ""}${d ? ` ${d}px` : ""}`;
    });
  }
  out = out.replace(/border-radius:([^;"]+)/g, (_m, v: string) => `border-radius:${/%|999px/.test(v) ? v : scaleRadius(v, k.r)}`);
  // 그림자 알파를 약(0.10)·강(0.18) 두 단계로 맞춘 뒤 mood 세기를 곱한다(0.3 이상인 진한 그림자는 확대 배지 등 의도된 값이라 그대로)
  out = out.replace(/box-shadow:([^;"]+)/g, (_m, v: string) => `box-shadow:${v.replace(/rgba\(([^)]*?),\s*([\d.]+)\)/g, (x, rgb: string, a: string) => (Number(a) >= 0.3 || Number(a) === 0 ? x : `rgba(${rgb}, ${(snapAlpha(Number(a)) * k.sh).toFixed(3).replace(/0+$/, "").replace(/\.$/, "")})`))}`);
  // 제목 굵기·자간(굵기 700 이상인 제목 글꼴 요소만)
  if (k.titleWeight !== 800 || k.titleTracking !== "-0.02em") {
    const re = new RegExp(`(${TITLE_FF.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")};font-size:[^;]+;font-weight:)(\\d+)(;letter-spacing:)([^;"]+)`, "g");
    // 441차 1-1(DESIGN_V4) — 제목 굵기는 페이지 안에서 하나(800). 900(큰 숫자·인용)은 그대로, mood 개성은 자간·반경·여백으로만
    const weightOf = (w: number) => (designV4On() ? (w >= 900 ? w : 800) : k.titleWeight);
    out = out.replace(re, (_m, a: string, w: string, b: string, ls: string) => `${a}${Number(w) >= 700 ? weightOf(Number(w)) : w}${b}${Number(w) >= 700 ? k.titleTracking : ls}`);
  }
  return out;
}
