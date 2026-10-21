/**
 * 424차 1-5 — 뷰티 포인트색을 제품 주조색에서(서버 전용: color-extract가 fs·sharp를 쓴다).
 * 418·422차 뷰티 세션은 theme이 사진의 파란 스튜디오 배경에서 나와 제품(노랑·골드·블랙)과 어긋났다. 출처 우선순위는 beauty-style.ts의
 * chooseBeautyAccent(판매자 지정 > 제품 주조색 > theme > 사진 배경)를 따르되, 판매자 색 입력은 아직 폼에 없어 제품 > 기존 theme 두 단계만 쓴다.
 *  - 제품 주조색: **새 호출 없이** 이미 있는 이미지 분석 문장(imageAnalysis의 "제품 색상: …")에서 색 단어를 읽는다. 무채색(블랙·화이트·투명·유백색·실버)은 포인트색이 아니므로 건너뛴다.
 *  - 팔레트: 기존 buildThemeFromHueWithNeutral(색상별 대비 곡선, 12 hue 4.5:1 회귀 기준)로 만들어 대비 보장을 그대로 쓴다(밝은 노랑은 곡선이 진한 골드 톤으로 낮춘다).
 *  - 플래그: 서버 환경 변수 BEAUTY_ACCENT_FROM_PRODUCT. 지시서는 기본 켬이었으나 **기본 꺼짐으로 출하**한다(켜려면 =on).
 *    이유(424차 3안 캡처, review/424-verify/accent/): 노랑(hue 48)이 기존 팔레트 곡선에서 채도 낮은 올리브(#AA9540)가 되어 페이지가 탁해 보이고,
 *    띠 위 제목("이렇게 사용하세요")의 대비가 낮다. 팔레트 곡선을 노랑에 맞게 고친 뒤 켜는 것을 권한다. 뷰티가 아니거나 BEAUTY_STYLE이 꺼져 있으면 어떤 경우에도 건드리지 않는다.
 */
import { beautyStyleOn } from "@/lib/beauty-style";
import { STUDIO_NEUTRAL_SAMPLE, buildThemeFromHueWithNeutral, type ExtractedTheme } from "@/lib/color-extract";

export const beautyAccentFromProductEnabled = (env: Record<string, string | undefined> = process.env): boolean => env.BEAUTY_ACCENT_FROM_PRODUCT === "on";

/** 한국어 색 단어 → 대표 hue(도). 먼저 나온 유채색 단어가 이긴다 */
export const COLOR_WORD_HUES: ReadonlyArray<{ words: readonly string[]; hue: number; name: string }> = [
  { words: ["옐로우", "옐로", "노랑", "노란", "레몬", "머스타드", "골드", "황금", "금빛"], hue: 48, name: "yellow" },
  { words: ["오렌지", "주황", "귤"], hue: 28, name: "orange" },
  { words: ["코랄", "피치", "살구"], hue: 12, name: "coral" },
  { words: ["핑크", "분홍", "로즈", "장미"], hue: 338, name: "pink" },
  { words: ["레드", "빨강", "빨간", "와인", "버건디"], hue: 355, name: "red" },
  { words: ["퍼플", "보라", "바이올렛", "라벤더"], hue: 268, name: "purple" },
  { words: ["블루", "파랑", "파란", "하늘색", "네이비"], hue: 215, name: "blue" },
  { words: ["아쿠아", "청록", "민트", "터콰이즈"], hue: 178, name: "aqua" },
  { words: ["그린", "초록", "녹색", "올리브", "카키"], hue: 140, name: "green" },
  { words: ["베이지", "브라운", "갈색", "카멜", "황토"], hue: 30, name: "brown" },
];
const NEUTRAL_RE = /블랙|검정|검은|화이트|흰색|하얀|유백|투명|실버|은색|그레이|회색/;

/** 분석 문장에서 제품 색 구간("제품 색상: …")만 잘라낸다. 번호 목록이 아니면 전체 */
function colorSegment(analysis: string): string {
  const m = analysis.match(/제품\s*색상\s*[:：]?([\s\S]*?)(?=\n?\s*\d+\s*[.)]\s|$)/);
  return m?.[1]?.trim() ? m[1]! : analysis;
}

/** 이미지 분석 문장에서 제품 포인트 hue를 읽는다. 유채색 단어가 없으면 null */
export function productHueFromAnalysis(analysis: string | null | undefined): { hue: number; name: string; word: string } | null {
  if (!analysis) return null;
  for (const text of [colorSegment(analysis), analysis]) {
    let best: { index: number; hue: number; name: string; word: string } | null = null;
    for (const c of COLOR_WORD_HUES) {
      for (const w of c.words) {
        const i = text.indexOf(w);
        if (i >= 0 && (!best || i < best.index)) best = { index: i, hue: c.hue, name: c.name, word: w };
      }
    }
    if (best) return { hue: best.hue, name: best.name, word: best.word };
    if (NEUTRAL_RE.test(text) && text === colorSegment(analysis)) continue; // 제품 색 구간이 무채색뿐이면 전체 문장도 한 번 더 본다
  }
  return null;
}

export type AccentApplyInput = { category: string | null | undefined; imageAnalysis: string | null | undefined; enabled?: boolean; styleEnabled?: boolean };

/**
 * 제품 hue로 만든 팔레트를 기존 theme 위에 덮어 반환한다. 조건이 안 맞으면 **같은 객체**를 그대로 돌려준다(출력 불변).
 * theme이 없는 경우(카테고리 기본 테마로 폴백하는 경로)에도 제품 hue가 있으면 새 theme을 만든다.
 */
export function applyProductAccent(theme: ExtractedTheme | null | undefined, input: AccentApplyInput): { theme: ExtractedTheme | null | undefined; source: "product" | "theme" | "none"; hue?: number; word?: string } {
  const keep = { theme, source: (theme ? "theme" : "none") as "theme" | "none" };
  if (input.enabled === false || !(input.enabled ?? beautyAccentFromProductEnabled())) return keep;
  if (!beautyStyleOn(input.category, input.styleEnabled)) return keep;
  const p = productHueFromAnalysis(input.imageAnalysis);
  if (!p) return keep;
  const built = buildThemeFromHueWithNeutral(p.hue, STUDIO_NEUTRAL_SAMPLE);
  return { theme: { ...(theme ?? built), ...built }, source: "product", hue: p.hue, word: p.word };
}
