/**
 * 회귀 — 424차 1-5 뷰티 포인트색(제품 주조색). 이미지 분석 문장에서 색 단어 읽기(무채색 제외·첫 유채색), 플래그 기본 꺼짐(출하 기본값)·켜면 제품 팔레트·
 * 비대상(비뷰티·BEAUTY_STYLE 꺼짐)은 같은 객체 그대로, 사전의 모든 hue가 대비 4.5:1(가격·CTA·혜택 칩·퀵 제목·본문)을 지키는지. 호출 0.
 */
import { COLOR_WORD_HUES, applyProductAccent, beautyAccentFromProductEnabled, productHueFromAnalysis } from "../../lib/beauty-accent";
import { STUDIO_NEUTRAL_SAMPLE, buildThemeFromHueWithNeutral, type ExtractedTheme } from "../../lib/color-extract";
import { getCategoryTheme, type CategoryTheme } from "../../lib/category-theme";
import { infoColorsOf } from "../../lib/info-style";
import { applyPackTone } from "../../lib/style-packs";
import { contrastRatioToken } from "../../lib/design-tokens";

export const name = "뷰티 포인트색(제품 주조색) — 색 단어 읽기·플래그 기본 꺼짐·비대상 불변·전 hue 대비 4.5:1";

const A418 = "1. 제품 색상: 내용물은 연한 노란빛을 띠는 투명 액체로, 하단은 유백색, 상단은 선명한 옐로우 톤의 레이어드 컬러가 특징입니다. 용기는 반투명 프로스트 글라스에 블랙 캡으로 포인트를 주었습니다. 2. 질감/소재: 유리 재질";
const THEME: ExtractedTheme = { accent: "#20547E", accentSoft: "#EFF5FA", accentText: "#1E4667", heroScrimFrom: "rgba(32,84,126,0.72)", baseNeutral: "#A7BED0", deepAccent: "#183F5F" } as ExtractedTheme;

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => { if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); };

  // 색 단어 읽기
  eq("418 분석문 → 노랑", productHueFromAnalysis(A418)?.name, "yellow");
  eq("무채색만 → null", productHueFromAnalysis("1. 제품 색상: 블랙 캡과 화이트 라벨, 투명 용기. 2. 질감: 유리"), null);
  eq("분석 없음 → null", [productHueFromAnalysis(null), productHueFromAnalysis(""), productHueFromAnalysis(undefined)], [null, null, null]);
  eq("제품 색 구간의 첫 유채색", productHueFromAnalysis("1. 제품 색상: 핑크 용기에 골드 캡. 2. 배경: 파란 스튜디오")?.name, "pink");
  eq("제품 색 구간에 없으면 전체 문장에서", productHueFromAnalysis("제품 색상: 블랙과 화이트 조합. 분위기는 민트빛이 돕니다")?.name, "aqua");
  eq("사전 hue는 0~360", COLOR_WORD_HUES.every((c) => c.hue >= 0 && c.hue < 360), true);

  // 플래그: 출하 기본 꺼짐 → 같은 theme 객체
  eq("기본 꺼짐", [beautyAccentFromProductEnabled({}), beautyAccentFromProductEnabled({ BEAUTY_ACCENT_FROM_PRODUCT: "off" }), beautyAccentFromProductEnabled({ BEAUTY_ACCENT_FROM_PRODUCT: "on" })], [false, false, true]);
  const off = applyProductAccent(THEME, { category: "화장품/뷰티", imageAnalysis: A418 });
  if (process.env.BEAUTY_ACCENT_FROM_PRODUCT !== "on" && (off.theme !== THEME || off.source !== "theme")) fails.push("플래그 꺼짐인데 theme이 바뀜");
  // 켜면 제품 팔레트(accent·baseNeutral·deepAccent가 바뀌고 나머지 키는 유지)
  const on = applyProductAccent(THEME, { category: "화장품/뷰티", imageAnalysis: A418, enabled: true });
  eq("켜면 제품 출처·노랑 hue", [on.source, on.hue, on.word], ["product", 48, "노란"]);
  if (!on.theme || on.theme.accent === THEME.accent || on.theme.baseNeutral === THEME.baseNeutral) fails.push("제품 팔레트로 바뀌지 않음");
  const t0 = applyProductAccent(null, { category: "화장품/뷰티", imageAnalysis: A418, enabled: true });
  eq("theme이 없어도 제품 팔레트 생성", t0.source, "product");
  // 비대상은 같은 객체
  const fashion = applyProductAccent(THEME, { category: "의류/패션", imageAnalysis: A418, enabled: true });
  const styleOff = applyProductAccent(THEME, { category: "화장품/뷰티", imageAnalysis: A418, enabled: true, styleEnabled: false });
  const noColor = applyProductAccent(THEME, { category: "화장품/뷰티", imageAnalysis: "블랙 캡", enabled: true });
  eq("패션·BEAUTY_STYLE 꺼짐·무채색은 같은 객체", [fashion.theme === THEME, styleOff.theme === THEME, noColor.theme === THEME, fashion.source, noColor.source], [true, true, true, "theme", "theme"]);
  eq("enabled=false 명시", applyProductAccent(THEME, { category: "화장품/뷰티", imageAnalysis: A418, enabled: false }).theme === THEME, true);

  // 사전의 모든 hue: 뷰티 인포 대비 4.5:1(beauty-info 회귀와 같은 쌍)
  for (const c of COLOR_WORD_HUES) {
    const t = applyPackTone({ ...getCategoryTheme("화장품/뷰티"), ...buildThemeFromHueWithNeutral(c.hue, STUDIO_NEUTRAL_SAMPLE) } as CategoryTheme, null);
    const k = infoColorsOf(t);
    const pairs: Array<[string, string, string]> = [["가격·칩 흰 글자 on 포인트", k.paper, k.accent], ["CTA 흰 글자 on 진한 색", k.paper, k.deep], ["혜택 칩 진한 글자 on 흰", k.deep, k.paper], ["퀵 제목 진한 글자 on 흰", k.deep, k.paper], ["퀵 본문 ink on 흰", k.ink, k.paper]];
    for (const [label, fg, bg] of pairs) if (contrastRatioToken(fg, bg) < 4.5) fails.push(`${c.name}(hue ${c.hue}) ${label} 대비 ${contrastRatioToken(fg, bg).toFixed(2)} < 4.5`);
  }
  return fails;
}
