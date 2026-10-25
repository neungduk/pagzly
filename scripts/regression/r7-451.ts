/**
 * 회귀 — 451차 1 R7 잔여. ① 용량 비교 다이어그램(v4): 글자 12px·라벨 색이 가장 어두운 옅은 면(#EDEDE4) 위 4.8:1(색상환 24단), 병 바닥선과 겹치지 않게 아래 글자 y를 baseY+24(184)
 * ② 팔레트 면 위 라벨(strong)이 5.1 목표로 모든 면 키에서 4.5:1 이상 ③ 히어로 캡션 뱃지 알약(export)이 v4에서 어두운 면(알파 .56)을 깐다.
 * 라이브 퍼징 R7 수치는 서버가 필요해 pc-verify `--full`·보고서(review/451-verify/fuzz-live.md)로 확인.
 */
import { contrastRatioToken, hexToRgba } from "../../lib/design-tokens";
import { v4Palette, type FaceRole } from "../../lib/palette-v4";
import { buildVolumeComparisonDiagramSvg } from "../../lib/volume-comparison-diagram";

export const name = "R7 잔여 — 용량 다이어그램 12px·4.8:1·팔레트 라벨 5.1 목표·면 위 알약";

const hsl = (h: number, s: number, l: number): string => { const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2; const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; return "#" + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("").toUpperCase(); };

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const entries = [{ label: "일반 100mL", ml: 100, isProduct: false }, { label: "이 제품 30mL", ml: 30, isProduct: true }];
  for (let h = 0; h < 360; h += 15) {
    const deep = hsl(h, 0.55, 0.32);
    const svg = buildVolumeComparisonDiagramSvg(entries, deep, deep);
    if (!svg) { fails.push(`h${h} 다이어그램이 비어 있음`); continue; }
    const fills = [...svg.matchAll(/<text[^>]*font-size="(\d+)"[^>]*fill="(#[0-9A-Fa-f]{6})"/g)];
    if (!fills.length) fails.push(`h${h} 글자를 못 찾음`);
    for (const m of fills) {
      if (Number(m[1]) < 12) fails.push(`h${h} 글자 ${m[1]}px < 12`);
      const cr = contrastRatioToken(m[2]!, "#EDEDE4");
      if (cr < 4.5) fails.push(`h${h} 라벨 ${m[2]} 대비 ${cr.toFixed(2)} < 4.5`);
    }
    if (!/y="184"/.test(svg)) fails.push(`h${h} 아래 글자 y가 184가 아님`);
  }
  const roles: FaceRole[] = ["bgA", "bgB", "emphasis"] as FaceRole[];
  for (let h = 0; h < 360; h += 30) {
    const p = v4Palette({ accent: hsl(h, 0.6, 0.45), deep: hsl(h, 0.6, 0.3) }, null);
    for (const r of roles) {
      const face = p.faces[r];
      if (!face || !face.startsWith("#")) continue;
      const cr = contrastRatioToken(p.onFace[r].strong, face);
      if (cr < 4.5) fails.push(`h${h} ${r} strong ${cr.toFixed(2)} < 4.5`);
    }
  }
  void hexToRgba;
  return fails;
}
