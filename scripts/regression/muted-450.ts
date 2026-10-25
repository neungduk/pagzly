/**
 * 회귀 — 450차 1 소형 글자 대비 토큰. ① muted 단계(MUTED_V4 weak·normal·strong)가 면 키 전수(흰·종이·웜·12색상 옅은 틴트·액센트 틴트 14%)에서 4.5:1 이상,
 * ② 원래 알파가 단계 바닥보다 낮은 값만 올리고(높으면 그대로), ③ export 바닥 CSS는 `color:` 앞 구분자를 요구(border-color 등은 건드리지 않음)하고 라이브는 text-ink/NN 클래스를 덮음,
 * ④ readableOnFace가 면 위 4.5:1을 보장, ⑤ 합성 21종 export의 전수 픽셀 대비 위반 ≤ 6곳(448·449차 이전 69곳 → 4곳).
 */
import { MUTED_MAP, MUTED_V4, mutedFloorCssExport, mutedFloorCssLive, readableOnFace } from "../../lib/muted-v4";
import { BRAND, contrastRatioToken, hexToRgba, mixHex } from "../../lib/design-tokens";
import { collectExport } from "../contrast-sources";

export const name = "소형 글자 muted 토큰 — 단계×면 키 전수 4.5:1·바닥 CSS 선택자 안전·면 위 보정·21종 전수 위반 ≤6";

const hsl = (h: number, s: number, l: number): string => { const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2; const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0"); return `#${to(r)}${to(g)}${to(b)}`.toUpperCase(); };

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const faces = ["#FFFFFF", "#FAF8F3", "#F6F1EA", ...Array.from({ length: 12 }, (_, i) => hsl(i * 30, 0.6, 0.92)), ...Array.from({ length: 12 }, (_, i) => mixHex("#FAF8F3", hsl(i * 30, 0.7, 0.45), 0.14))];
  for (const [tier, a] of Object.entries(MUTED_V4)) {
    for (const f of faces) {
      const c = mixHex(f, BRAND.ink, a);
      const cr = contrastRatioToken(c, f);
      if (cr < 4.5) fails.push(`${tier}(${a}) × ${f}: ${cr.toFixed(2)} < 4.5`);
    }
  }
  if (!(MUTED_V4.weak < MUTED_V4.normal && MUTED_V4.normal < MUTED_V4.strong)) fails.push("단계가 단조 증가가 아님");
  for (const m of MUTED_MAP) if (m.to <= m.from) fails.push(`바닥 ${m.to}이 원래 ${m.from} 이하(올리지 않음)`);
  const ex = mutedFloorCssExport(".w");
  if (!ex.includes('[style^="color:rgba(27,27,24,.6)"]') || !ex.includes('[style*=";color:rgba(27,27,24,0.6)"]')) fails.push("export 바닥 CSS 선택자 형태");
  if (/\[style\*="color:rgba\(27,27,24/.test(ex)) fails.push("앞 구분자 없는 color: 선택자(border-color 오염)");
  if (ex.includes("{color:" + hexToRgba(BRAND.ink, MUTED_V4.normal) + "!important}") === false) fails.push("바닥 색값");
  if (!mutedFloorCssLive("[x]").includes(".text-ink\\/40{")) fails.push("라이브 바닥 CSS 클래스");
  for (const f of faces.slice(0, 6)) { const c = readableOnFace("#A85E1B", mixHex(f, "#A85E1B", 0.14), 4.6); if (contrastRatioToken(c, mixHex(f, "#A85E1B", 0.14)) < 4.5) fails.push(`readableOnFace ${f}`); }
  if (readableOnFace("#102030", "#FFFFFF") !== "#102030") fails.push("이미 충분하면 그대로여야 함");
  const hits = await collectExport();
  if (hits.length > 6) fails.push(`합성 21종 전수 글자 대비 위반 ${hits.length}곳 > 6: ${hits.slice(0, 4).map((h) => `${h.fixture}«${h.text}»${h.ratio.toFixed(2)}`).join(", ")}`);
  return fails;
}
