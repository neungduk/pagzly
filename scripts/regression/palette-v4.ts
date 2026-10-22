/**
 * 회귀 — 439차 2-5 컬러 시스템 v4: 톤 사다리(tint 5·shade 3) 단조, 면 역할별 글자 대비 ≥4.5(다양한 대표색·mood),
 * 그라데이션 프리셋 2종의 모든 색 위에서 잉크 대비 ≥4.5, 결정성. 호출 0.
 */
import { FACE_ROLES, MIN_TEXT_CONTRAST, gradientStops, v4Palette } from "../../lib/palette-v4";
import { contrastRatioToken, readableTextAccent, readableTextDeep } from "../../lib/design-tokens";
import { MOODS } from "../../lib/archetype-recipes";

export const name = "컬러 v4 — 톤 사다리 단조·면 역할 대비 ≥4.5·그라데이션 대비·결정성";

const ACCENTS = ["#2F9E8F", "#D9466F", "#5B9A5A", "#8A63C9", "#2F4A7A", "#E58A8A", "#2B2D3A", "#E3743A", "#B5651D", "#9C8F7E", "#F2D45C", "#FFFFFF", "#000000", "#7FD3F7"];
const lum = (hex: string) => contrastRatioToken(hex, "#000000");

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  for (const a of ACCENTS) {
    const theme = { accent: a, deepAccent: a, accentSoft: a, baseNeutral: "#F6F1EA" } as never;
    const base = { accent: readableTextAccent(theme, 3), deep: readableTextDeep(theme, 4.5) };
    for (const mood of [...Object.keys(MOODS), null]) {
      const p = v4Palette(base, mood);
      for (let i = 1; i < 5; i += 1) if (lum(p.tints[i]!) > lum(p.tints[i - 1]!) + 1e-9) fails.push(`${a}/${mood}: tint ${i} 더 밝음`);
      for (let i = 1; i < 3; i += 1) if (lum(p.shades[i]!) > lum(p.shades[i - 1]!) + 1e-9) fails.push(`${a}/${mood}: shade ${i} 더 밝음`);
      for (const r of FACE_ROLES) {
        const bg = p.faces[r];
        for (const k of ["text", "sub", "strong"] as const) {
          const c = contrastRatioToken(p.onFace[r][k], bg);
          if (c < MIN_TEXT_CONTRAST) fails.push(`${a}/${mood}: ${r}.${k} 대비 ${c.toFixed(2)}`);
        }
      }
      for (const g of p.gradients) for (const stop of gradientStops(g)) {
        const c = contrastRatioToken(p.onFace.emphasis.text, stop);
        if (c < MIN_TEXT_CONTRAST) fails.push(`${a}/${mood}: 그라데이션 색 ${stop} 위 글자 대비 ${c.toFixed(2)}`);
      }
      if (JSON.stringify(v4Palette(base, mood)) !== JSON.stringify(p)) fails.push(`${a}/${mood}: 결정성`);
    }
  }
  return fails;
}
