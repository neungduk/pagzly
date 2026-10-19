/**
 * 회귀 — 409차 팩 × hue 12개(0~330) 글자 대비. 본문·제목·라벨·요약 띠 글자가 4.5:1(큰 글자 3:1) 이상. 유료 호출 0.
 */
import { buildThemeFromHueWithNeutral, STUDIO_NEUTRAL_SAMPLE } from "../../lib/color-extract";
import { getCategoryTheme, type CategoryTheme } from "../../lib/category-theme";
import { contrastRatioToken, FLAT_PAPER, readableTextAccent, readableTextDeep } from "../../lib/design-tokens";
import { applyPackTone, resolveStylePack } from "../../lib/style-packs";
import { HERO_CAPTION } from "../../lib/hero-variants";

export const name = "팩 × hue 12개 글자 대비(본문·제목 4.5:1, 큰 글자 3:1)";

const blend = (fg: [number, number, number, number], bg: string) => {
  const n = parseInt(bg.slice(1), 16);
  const b = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const c = [0, 1, 2].map((i) => Math.round(fg[i]! * fg[3] + b[i]! * (1 - fg[3])));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const rows: string[] = [];
  for (const id of ["classic", "mono-minimal", "editorial"]) {
    const pack = resolveStylePack("의류/패션", id);
    for (let hue = 0; hue < 360; hue += 30) {
      const base = { ...getCategoryTheme("의류/패션"), ...buildThemeFromHueWithNeutral(hue, STUDIO_NEUTRAL_SAMPLE) } as CategoryTheme;
      const t = applyPackTone(base, pack);
      const sub = blend([27, 27, 24, 0.7], t.baseNeutral);
      const checks: Array<[string, number, number]> = [
        ["요약 칩 글자(deepAccent/종이)", contrastRatioToken(t.deepAccent, FLAT_PAPER), 4.5],
        ["히어로 라벨(readableTextDeep/띠)", contrastRatioToken(readableTextDeep(t), t.baseNeutral), 4.5],
        ["히어로 라벨(readableTextDeep/흰 바탕)", contrastRatioToken(readableTextDeep(t), "#FFFFFF"), 4.5],
        ["캡션 제목(ink/띠)", contrastRatioToken(HERO_CAPTION.ink, t.baseNeutral), 4.5],
        ["캡션 부제(ink 70%/띠)", contrastRatioToken(sub, t.baseNeutral), 4.5],
        ["앵커 탭 글자(deepAccent/내비 바탕)", contrastRatioToken(t.deepAccent, t.baseNeutral), 4.5],
        ...(id === "mono-minimal" ? ([["소제목 순번 라벨(ink 68%/종이)", contrastRatioToken(blend([27, 27, 24, 0.68], FLAT_PAPER), FLAT_PAPER), 4.5]] as Array<[string, number, number]>) : []),
        ["강조 글자(readableTextAccent/종이, 큰 글자)", contrastRatioToken(readableTextAccent(t, 3), FLAT_PAPER), 3],
      ];
      for (const [label, ratio, min] of checks) {
        rows.push(`${id}\t${hue}\t${label}\t${ratio.toFixed(2)}\t${min}`);
        // classic은 캡션 히어로를 쓰지 않고 기존 값이라 기록만(기본 화면 불변 원칙). 팩(mono·editorial)만 합격선을 강제한다
        if (id !== "classic" && ratio < min) fails.push(`${id} hue ${hue}: ${label} ${ratio.toFixed(2)} < ${min}`);
      }
    }
  }
  if (process.env.CONTRAST_TSV) (await import("node:fs")).writeFileSync(process.env.CONTRAST_TSV, rows.join("\n") + "\n");
  return fails;
}
