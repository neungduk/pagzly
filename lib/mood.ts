/**
 * 436차 1-2·1-5 — mood 토큰 적용. 임팩트 블록 마크업은 지금 값(배율 1.0)으로 만들고, mood가 있으면 마지막에 이 함수가
 * 섹션 상하 여백·모서리 반경·그림자 세기·제목 굵기·자간을 토큰 배율로 바꾼다(문자열 후처리라 마크업 본문은 한 벌).
 * 라이브·export가 같은 impactHtml을 쓰므로 패리티가 유지된다. mood가 없으면(유형 미정·플래그 off) 입력을 그대로 돌려준다.
 *
 * 간격·반경·그림자 토큰 단계(1-5): 여백 조밀 0.85 · 보통 1 · 여유 1.2 / 반경 0.2~1.8배 / 그림자 0.5~1.4배 — mood가 단계를 고른다.
 */
import { MOODS, type MoodId, type MoodTokens } from "@/lib/archetype-recipes";
import { DETAIL_FONT_STACK } from "@/lib/detail-typography";

export const NEUTRAL_MOOD: MoodTokens = { pad: 1, r: 1, sh: 1, divider: "wave", titleWeight: 800, titleTracking: "-0.02em", illust: "solid" };

export function moodOf(id: string | undefined | null): MoodTokens {
  return id && id in MOODS ? MOODS[id as MoodId] : NEUTRAL_MOOD;
}

const TITLE_FF = `font-family:${DETAIL_FONT_STACK.sansDisplayHeadline}`;
const scaleRadius = (v: string, r: number): string =>
  v.replace(/(\d+(?:\.\d+)?)px/g, (m, n: string) => (Number(n) >= 100 ? m : `${Math.max(0, Math.round(Number(n) * r))}px`));

export function applyMood(html: string, k: MoodTokens): string {
  let out = html;
  if (k.pad !== 1) {
    // 첫 태그(섹션)의 상하 여백만 배율 적용: padding:Apx Bpx(Cpx) 형태의 첫 값(상)과 마지막 값(하)
    out = out.replace(/^(<section[^>]*?style="[^"]*?padding:)(\d+)px(?: (\d+)px)?(?: (\d+)px)?(?: (\d+)px)?/, (_m, pre: string, a: string, b?: string, c?: string, d?: string) => {
      const sc = (v: string) => `${Math.round(Number(v) * k.pad)}px`;
      return `${pre}${sc(a)}${b ? ` ${b}px` : ""}${c ? ` ${sc(c)}` : ""}${d ? ` ${d}px` : ""}`;
    });
  }
  if (k.r !== 1) out = out.replace(/border-radius:([^;"]+)/g, (_m, v: string) => `border-radius:${/%|999px/.test(v) ? v : scaleRadius(v, k.r)}`);
  if (k.sh !== 1) {
    out = out.replace(/box-shadow:([^;"]+)/g, (_m, v: string) => `box-shadow:${v.replace(/rgba\(([^)]*?),\s*([\d.]+)\)/g, (_x, rgb: string, a: string) => `rgba(${rgb}, ${Math.min(0.5, Number(a) * k.sh).toFixed(3).replace(/0+$/, "").replace(/\.$/, "")})`)}`);
  }
  // 제목 굵기·자간(굵기 700 이상인 제목 글꼴 요소만)
  if (k.titleWeight !== 800 || k.titleTracking !== "-0.02em") {
    const re = new RegExp(`(${TITLE_FF.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")};font-size:[^;]+;font-weight:)(\\d+)(;letter-spacing:)([^;"]+)`, "g");
    out = out.replace(re, (_m, a: string, w: string, b: string, ls: string) => `${a}${Number(w) >= 700 ? k.titleWeight : w}${b}${Number(w) >= 700 ? k.titleTracking : ls}`);
  }
  return out;
}
